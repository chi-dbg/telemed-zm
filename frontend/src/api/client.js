/**
 * REST API client for the Telemed ZM PHP backend.
 *
 * Base URL: /telemed-platform/api (relative). The Vite dev server proxies
 * this to your local XAMPP; the production build runs on the same host
 * as Apache so the request hits PHP directly.
 *
 * Authentication: HTTP-only cookie set by the PHP /auth/login endpoint.
 * For Socket.IO we additionally store the JWT in localStorage because
 * the chat server can't read HTTP-only cookies.
 */

const BASE = '/telemed-platform/api';

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
    if (typeof window === 'undefined') return 'http://localhost:3001';
    if (import.meta.env.VITE_CHAT_SERVER_URL) return import.meta.env.VITE_CHAT_SERVER_URL;
    if (import.meta.env.DEV) {
        if (window.location.protocol === 'https:') return window.location.origin;
        return `http://${window.location.hostname}:3001`;
    }

    return `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:3001`;
})();
