/**
 * Telemedicine real-time chat server (Node.js + Socket.IO)
 * ----------------------------------------------------------
 * Runs alongside the PHP REST API and provides the realtime
 * patient<->doctor chat channel for an active consultation.
 *
 * Implements FR-P-05 / FR-D-04 (real-time messaging) and the
 * NFR-Performance target of message delivery within 1 second.
 *
 * Architecture: each consultation is a Socket.IO "room" identified
 * by `consult-{id}`. Only the patient assigned to the consultation
 * and the accepting doctor may join the room (verified against PostgreSQL).
 *
 * Auth: clients send the JWT (issued by PHP /auth/login) when
 * connecting. The token is verified using the same shared secret as
 * the PHP backend (HS256).
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Match the PHP API's local .env behaviour without adding a dotenv dependency.
const localEnvPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(localEnvPath)) {
    for (const rawLine of fs.readFileSync(localEnvPath, 'utf8').split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || !line.includes('=')) continue;
        const [key, ...rest] = line.split('=');
        if (!(key in process.env)) process.env[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
}

// -----------------------------------------------------------------------
// Configuration (must match the PHP api/config.php values)
// -----------------------------------------------------------------------
const PORT       = Number(process.env.PORT || process.env.CHAT_PORT || 4311);
const HOST       = process.env.CHAT_HOST || '0.0.0.0';
const DB_DRIVER  = process.env.DB_DRIVER || (process.env.APP_ENV === 'production' ? 'pgsql' : 'mysql');
const JWT_SECRET = process.env.JWT_SECRET || '';
if (process.env.APP_ENV === 'production' && !JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured in production.');
}
const TOKEN_SECRET = JWT_SECRET || 'change-me-to-a-long-random-string-in-production-please-do-it';
const DB_CONFIG  = {
    host:     DB_DRIVER === 'mysql' ? (process.env.MYSQL_HOST || '127.0.0.1') : (process.env.DB_HOST || '127.0.0.1'),
    port:     Number(DB_DRIVER === 'mysql' ? (process.env.MYSQL_PORT || 3306) : (process.env.DB_PORT || 5432)),
    user:     DB_DRIVER === 'mysql' ? (process.env.MYSQL_USER || 'root') : (process.env.DB_USER || 'postgres'),
    password: DB_DRIVER === 'mysql' ? (process.env.MYSQL_PASSWORD || '') : (process.env.DB_PASSWORD || ''),
    database: DB_DRIVER === 'mysql' ? (process.env.MYSQL_DB || 'telemed_db') : (process.env.DB_NAME || 'postgres'),
    ssl:      process.env.DB_SSLMODE === 'require' ? { rejectUnauthorized: true } : false,
    max:      10,
};

// -----------------------------------------------------------------------
// JWT verification (matches the PHP implementation in helpers.php)
// -----------------------------------------------------------------------
function base64urlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = str.length % 4;
    if (pad) str += '='.repeat(4 - pad);
    return Buffer.from(str, 'base64');
}
function base64urlEncode(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function verifyJwt(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const expected = base64urlEncode(
        crypto.createHmac('sha256', TOKEN_SECRET).update(`${h}.${p}`).digest()
    );
    if (expected !== s) return null;
    let payload;
    try { payload = JSON.parse(base64urlDecode(p).toString()); } catch { return null; }
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
}

// -----------------------------------------------------------------------
// HTTP + Socket.IO setup
// -----------------------------------------------------------------------
const app = express();
const localOrigins = 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174';
const allowedOrigins = ((process.env.CORS_ALLOWED_ORIGINS || '') +
    (process.env.APP_ENV === 'production' ? '' : `,${localOrigins}`))
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

function isPrivateDevelopmentOrigin(origin) {
    if (process.env.APP_ENV === 'production') return false;
    try {
        const { hostname } = new URL(origin);
        return hostname === 'localhost' || hostname === '127.0.0.1' ||
            /^10(?:\.\d{1,3}){3}$/.test(hostname) ||
            /^192\.168(?:\.\d{1,3}){2}$/.test(hostname) ||
            /^172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(hostname);
    } catch {
        return false;
    }
}
const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || isPrivateDevelopmentOrigin(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
};
app.use(cors(corsOptions));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'telemed-chat-server' }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions,
});

// JWT handshake middleware
io.use((socket, next) => {
    const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        // also accept it from Cookie (browser default)
        (socket.handshake.headers.cookie || '')
            .split(';')
            .map(s => s.trim())
            .find(c => c.startsWith('telemed_token='))?.split('=')[1];

    const payload = verifyJwt(token);
    if (!payload) return next(new Error('unauthorized'));
    socket.user = payload;
    next();
});

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
let pool;
async function getPool() {
    if (!pool) {
        pool = DB_DRIVER === 'mysql'
            ? require('mysql2/promise').createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 10 })
            : new (require('pg').Pool)(DB_CONFIG);
    }
    return pool;
}

/** Verify the user is allowed to join a consultation room. */
async function userBelongsToConsultation(userId, consultationId) {
    const conn = await getPool();
    const sql = `SELECT c.consultation_id, c.status, pu.user_id AS pUid, du.user_id AS dUid
         FROM consultations c
         JOIN patients p   ON p.patient_id = c.patient_id
         JOIN users    pu  ON pu.user_id   = p.user_id
         LEFT JOIN doctors d ON d.doctor_id = c.doctor_id
         LEFT JOIN users   du ON du.user_id = d.user_id
         WHERE c.consultation_id = ${DB_DRIVER === 'mysql' ? '?' : '$1'}`;
    const rows = DB_DRIVER === 'mysql'
        ? (await conn.execute(sql, [consultationId]))[0]
        : (await conn.query(sql, [consultationId])).rows;
    if (!rows.length) return false;
    const r = rows[0];
    if (!['assigned', 'in_progress'].includes(r.status)) return false;
    return Number(r.pUid) === Number(userId) || Number(r.dUid) === Number(userId);
}

/** Persist a chat message so it shows up on the next page load. */
async function persistMessage(consultationId, senderUserId, role, text) {
    const conn = await getPool();
    const values = [consultationId, senderUserId, role, text];
    if (DB_DRIVER === 'mysql') {
        const [result] = await conn.execute(
            'INSERT INTO chat_messages (consultation_id, sender_user_id, sender_role, message_text) VALUES (?, ?, ?, ?)',
            values
        );
        return Number(result.insertId);
    }
    const { rows } = await conn.query(
        'INSERT INTO chat_messages (consultation_id, sender_user_id, sender_role, message_text) VALUES ($1, $2, $3, $4) RETURNING message_id',
        values
    );
    return Number(rows[0].message_id);
}

// -----------------------------------------------------------------------
// Socket events
// -----------------------------------------------------------------------
io.on('connection', (socket) => {
    const { uid, role, email } = socket.user;
    console.log(`[chat] connected uid=${uid} role=${role} email=${email}`);

    socket.on('join', async ({ consultationId, purpose = 'chat' }) => {
        if (!consultationId) return socket.emit('error', { error: 'consultationId required' });
        try {
            const allowed = await userBelongsToConsultation(uid, consultationId);
            if (!allowed) return socket.emit('error', { error: 'not authorised for this consultation' });
            const room = `consult-${consultationId}`;
            socket.join(room);
            socket.data.consultationId = consultationId;
            socket.data.room = room;
            socket.data.purpose = purpose === 'video' ? 'video' : 'chat';
            socket.emit('joined', { room, consultationId, purpose: socket.data.purpose });
            if (socket.data.purpose === 'video') {
                // A participant who already started media re-announces readiness
                // when the other participant arrives, avoiding a missed first signal.
                socket.to(room).emit('video-peer-joined', { from: { uid, role, email } });
            } else {
                socket.to(room).emit('peer-joined', { uid, role });
            }
        } catch (e) {
            console.error(e);
            socket.emit('error', { error: 'join failed' });
        }
    });

    socket.on('message', async ({ message }) => {
        const room = socket.data.room;
        const cid  = socket.data.consultationId;
        if (!room || !cid)   return socket.emit('error', { error: 'not in a room' });
        if (!message || typeof message !== 'string') return;
        if (!['patient', 'doctor'].includes(role)) {
            return socket.emit('error', { error: 'role not permitted to chat' });
        }
        try {
            const id = await persistMessage(cid, uid, role, message);
            const payload = {
                message_id: id,
                consultation_id: cid,
                sender_user_id: uid,
                sender_role: role,
                message_text: message,
                sent_at: new Date().toISOString(),
            };
            io.to(room).emit('message', payload);
        } catch (e) {
            console.error('persist failed', e);
            socket.emit('error', { error: 'message persistence failed' });
        }
    });

    socket.on('typing', ({ isTyping }) => {
        const room = socket.data.room;
        if (room) socket.to(room).emit('typing', { uid, role, isTyping: !!isTyping });
    });

    function forwardVideoEvent(eventName) {
        socket.on(eventName, (payload = {}) => {
            const room = socket.data.room;
            if (!room) return socket.emit('video-error', { error: 'join consultation room first' });
            if (!['patient', 'doctor'].includes(role)) {
                return socket.emit('video-error', { error: 'role not permitted to use video calls' });
            }
            socket.to(room).emit(eventName, {
                ...payload,
                from: { uid, role, email },
            });
        });
    }

    [
        'video-ready',
        'video-offer',
        'video-answer',
        'video-ice-candidate',
        'video-end',
        'video-state',
    ].forEach(forwardVideoEvent);

    socket.on('disconnect', () => {
        console.log(`[chat] disconnected uid=${uid}`);
    });
});

// -----------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------
function getLanUrls(port) {
    const urls = [];
    for (const addresses of Object.values(os.networkInterfaces())) {
        for (const address of addresses || []) {
            if (address.family === 'IPv4' && !address.internal) {
                urls.push(`http://${address.address}:${port}`);
            }
        }
    }
    return urls;
}

server.listen(PORT, HOST, () => {
    console.log(`telemed-chat-server listening on http://localhost:${PORT}`);
    if (HOST === '0.0.0.0') {
        getLanUrls(PORT).forEach(url => console.log(`telemed-chat-server LAN URL: ${url}`));
    }
});
