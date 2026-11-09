import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'fs';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const chatServerDir = resolve(projectRoot, 'chat-server');
const certPath = resolve(__dirname, '../certs/telemed-dev-cert.pem');
const keyPath = resolve(__dirname, '../certs/telemed-dev-key.pem');
const devHttps = process.env.VITE_DEV_HTTPS === '1' && existsSync(certPath) && existsSync(keyPath)
    ? { cert: readFileSync(certPath), key: readFileSync(keyPath) }
    : undefined;
const chatPort = Number(process.env.CHAT_PORT || '4311');
const autoChatServer = process.env.VITE_AUTO_CHAT_SERVER !== '0';

function portIsOpen(port, host = '127.0.0.1', timeoutMs = 700) {
    return new Promise(resolve => {
        const socket = net.createConnection({ host, port });
        let settled = false;

        function finish(open) {
            if (settled) return;
            settled = true;
            socket.destroy();
            resolve(open);
        }

        socket.setTimeout(timeoutMs);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
    });
}

function chatServerHealthy(timeoutMs = 900) {
    return new Promise(resolve => {
        const req = http.get({
            host: '127.0.0.1',
            port: chatPort,
            path: '/health',
            timeout: timeoutMs,
        }, res => {
            res.resume();
            resolve(res.statusCode === 200);
        });

        req.once('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.once('error', () => resolve(false));
    });
}

async function waitForChatServer(retries = 24) {
    for (let attempt = 0; attempt < retries; attempt += 1) {
        if (await chatServerHealthy()) return true;
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    return false;
}

function telemedChatServerPlugin() {
    let chatProcess = null;
    let shuttingDown = false;

    return {
        name: 'telemed-chat-server',
        apply: 'serve',
        async configureServer(server) {
            if (!autoChatServer) return;

            if (await chatServerHealthy()) {
                server.config.logger.info(`[telemed] chat/video service ready on port ${chatPort}`);
                return;
            }

            if (await portIsOpen(chatPort)) {
                server.config.logger.warn(`[telemed] port ${chatPort} is already in use, but /health did not respond. Chat/video may fail until that port is freed.`);
                return;
            }

            server.config.logger.info(`[telemed] starting chat/video service on port ${chatPort}`);
            chatProcess = spawn(process.execPath, ['server.js'], {
                cwd: chatServerDir,
                env: {
                    ...process.env,
                    CHAT_HOST: process.env.CHAT_HOST || '0.0.0.0',
                    CHAT_PORT: String(chatPort),
                },
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true,
            });

            chatProcess.stdout.on('data', chunk => process.stdout.write(`[chat] ${chunk}`));
            chatProcess.stderr.on('data', chunk => process.stderr.write(`[chat] ${chunk}`));
            chatProcess.on('exit', (code, signal) => {
                if (!shuttingDown) {
                    server.config.logger.warn(`[telemed] chat/video service stopped (${signal || `code ${code}`})`);
                }
            });

            chatProcess.on('error', err => {
                server.config.logger.error(`[telemed] could not start chat/video service: ${err.message}`);
            });

            if (!(await waitForChatServer())) {
                server.config.logger.warn(`[telemed] chat/video service did not become ready on port ${chatPort}.`);
            }

            const stopChatServer = () => {
                shuttingDown = true;
                if (chatProcess && !chatProcess.killed) chatProcess.kill();
            };

            server.httpServer?.once('close', stopChatServer);
        },
    };
}

const socketProxy = devHttps
    ? {
        '/socket.io': {
            target: `http://127.0.0.1:${chatPort}`,
            ws: true,
            changeOrigin: true,
        },
    }
    : {};

/**
 * Vite config for the Telemed ZM React app.
 *
 *  - Builds into ../public so XAMPP can serve from xampp/htdocs/telemed-platform/public/
 *  - Uses HashRouter (no .htaccess SPA fallback needed)
 *  - Dev server proxies /telemed-platform/api to the local Apache/PHP backend
 *  - base "./" so the build works regardless of subfolder mount path
 */
export default defineConfig({
    // `scripts/dev-server.mjs`, which backs the root `npm run dev` command,
    // owns the local chat process. Starting it again from this Vite config
    // races for port 4310 and leaves chat/video unavailable.
    plugins: [react()],

    // Relative asset paths so the app works under any subfolder mount point
    base: './',

    // Build output to ../public (replaces old static HTML)
    build: {
        outDir: resolve(__dirname, '../public'),
        emptyOutDir: true,
        sourcemap: false,
        chunkSizeWarningLimit: 1500,
    },

    // Dev server (npm run dev) — proxies API calls to your local XAMPP
    server: {
        host: '0.0.0.0',
        port: 5174,
        https: devHttps,
        allowedHosts: ['.trycloudflare.com'],
        proxy: {
            '/telemed-platform/api': {
                target: 'http://localhost',
                changeOrigin: true,
            },
            ...socketProxy,
        },
    },

    preview: {
        host: '0.0.0.0',
        port: 4173,
        https: devHttps,
    },
});
