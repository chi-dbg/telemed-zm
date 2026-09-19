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
 * and the accepting doctor may join the room (verified against MySQL).
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
const mysql = require('mysql2/promise');

// -----------------------------------------------------------------------
// Configuration (must match the PHP api/config.php values)
// -----------------------------------------------------------------------
const PORT       = process.env.CHAT_PORT || 3001;
const HOST       = process.env.CHAT_HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-long-random-string-in-production-please-do-it';
const DB_CONFIG  = {
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'telemed_db',
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
        crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest()
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
app.use(cors({ origin: true, credentials: true }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'telemed-chat-server' }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: true, credentials: true },
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
    if (!pool) pool = mysql.createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 10 });
    return pool;
}

/** Verify the user is allowed to join a consultation room. */
async function userBelongsToConsultation(userId, consultationId) {
    const conn = await getPool();
    const [rows] = await conn.execute(
        `SELECT c.consultation_id, c.status, pu.user_id AS pUid, du.user_id AS dUid
         FROM consultations c
         JOIN patients p   ON p.patient_id = c.patient_id
         JOIN users    pu  ON pu.user_id   = p.user_id
         LEFT JOIN doctors d ON d.doctor_id = c.doctor_id
         LEFT JOIN users   du ON du.user_id = d.user_id
         WHERE c.consultation_id = ?`,
        [consultationId]
    );
    if (!rows.length) return false;
    const r = rows[0];
    if (!['assigned', 'in_progress'].includes(r.status)) return false;
    return Number(r.pUid) === Number(userId) || Number(r.dUid) === Number(userId);
}

/** Persist a chat message so it shows up on the next page load. */
async function persistMessage(consultationId, senderUserId, role, text) {
    const conn = await getPool();
    const [result] = await conn.execute(
        `INSERT INTO chat_messages (consultation_id, sender_user_id, sender_role, message_text)
         VALUES (?, ?, ?, ?)`,
        [consultationId, senderUserId, role, text]
    );
    return Number(result.insertId);
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
            if (socket.data.purpose !== 'video') {
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
