import { createServer } from 'vite';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function argValue(name, fallback) {
    const index = process.argv.indexOf(name);
    if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
    const inline = process.argv.find(arg => arg.startsWith(`${name}=`));
    return inline ? inline.slice(name.length + 1) : fallback;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const chatServerDir = resolve(projectRoot, 'chat-server');

const host = argValue('--host', process.env.VITE_HOST || '0.0.0.0');
const port = Number(argValue('--port', process.env.VITE_PORT || '5173'));
const strictPort = process.argv.includes('--strictPort') || process.env.VITE_STRICT_PORT === '1';
const chatPort = Number(process.env.CHAT_PORT || '3001');
const autoChatServer = process.env.VITE_AUTO_CHAT_SERVER !== '0';
let chatProcess = null;
let shuttingDown = false;

function portIsOpen(portToCheck, hostToCheck = '127.0.0.1', timeoutMs = 800) {
    return new Promise(resolve => {
        const socket = net.createConnection({ host: hostToCheck, port: portToCheck });
        let settled = false;

        function finish(isOpen) {
            if (settled) return;
            settled = true;
            socket.destroy();
            resolve(isOpen);
        }

        socket.setTimeout(timeoutMs);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
    });
}

async function waitForPort(portToCheck, retries = 20) {
    for (let attempt = 0; attempt < retries; attempt += 1) {
        if (await portIsOpen(portToCheck)) return true;
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    return false;
}

async function ensureChatServer() {
    if (!autoChatServer) return;

    if (await portIsOpen(chatPort)) {
        console.log(`[telemed] chat/video service already running on port ${chatPort}`);
        return;
    }

    console.log(`[telemed] starting chat/video service on port ${chatPort}`);
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
            console.warn(`[telemed] chat/video service stopped (${signal || `code ${code}`})`);
        }
    });

    if (!(await waitForPort(chatPort))) {
        console.warn(`[telemed] chat/video service did not open port ${chatPort}. Chat and video will be unavailable until it is running.`);
    }
}

await ensureChatServer();

const server = await createServer({
    server: {
        host,
        port,
        strictPort,
    },
});

await server.listen();
server.printUrls();

const keepAlive = setInterval(() => {}, 2147483647);

async function shutdown() {
    shuttingDown = true;
    clearInterval(keepAlive);
    await server.close();
    if (chatProcess && !chatProcess.killed) {
        chatProcess.kill();
    }
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
