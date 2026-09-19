/**
 * Misc display helpers.
 */

export function fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(d)) return iso;
    return d.toLocaleString();
}

export function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString();
}

export function initialsOf(fullName) {
    return (fullName || '')
        .split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function safe(s) {
    return s == null ? '' : String(s);
}

export function truncate(s, n = 100) {
    s = safe(s);
    return s.length > n ? s.slice(0, n) + '…' : s;
}

export function statusLabel(status) {
    return safe(status).replaceAll('_', ' ');
}
