/**
 * REST API client for the Telemed ZM PHP backend.
 *
 * Base URL: local XAMPP by default; VITE_API_BASE_URL selects the deployed API.
 *
 * Authentication: HTTP-only cookie set by the PHP /auth/login endpoint.
 * For Socket.IO we additionally store the JWT in localStorage because
 * the chat server can't read HTTP-only cookies.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL || '/telemed-platform/api').replace(/\/$/, '');

async function request(path, opts = {}) {
    const { method = 'GET', body, query } = opts;
    let url = BASE + path;
    if (query) {
        const qs = new URLSearchParams(query).toString();
        if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    const init = {
        method,
        credentials: 'include',
        headers: { Accept: 'application/json' },
    };
    const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('telemed_token');
    if (token) init.headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);
    let data = null;
    try { data = await res.json(); } catch (_) { /* non-JSON response */ }

    if (!res.ok) {
        const msg = (data && (data.error || data.detail)) || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.body = data;
        throw err;
    }
    return data;
}

export const API = {
    get:   (p, query) => request(p, { method: 'GET', query }),
    post:  (p, body)  => request(p, { method: 'POST', body }),
    patch: (p, body)  => request(p, { method: 'PATCH', body }),
    del:   (p)        => request(p, { method: 'DELETE' }),

    register: (data) => request('/auth/register', { method: 'POST', body: data }),
    login:    (data) => request('/auth/login',    { method: 'POST', body: data }),
    logout:   ()     => request('/auth/logout',   { method: 'POST' }),
    me:       ()     => request('/auth/me'),

    BASE,
};

export const CHAT_SERVER_URL = (() => {
    if (typeof window === 'undefined') return 'http://localhost:4310';
    if (import.meta.env.VITE_CHAT_SERVER_URL) return import.meta.env.VITE_CHAT_SERVER_URL;
    const chatPort = import.meta.env.VITE_CHAT_PORT || '4310';
    if (import.meta.env.DEV) {
        // Vite proxies Socket.IO locally. This keeps camera access and signaling
        // on the same browser origin, including phones using HTTPS over Wi-Fi.
        return window.location.origin;
    }

    return `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:${chatPort}`;
})();
