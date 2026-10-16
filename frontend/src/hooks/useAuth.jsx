import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API } from '../api/client.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const r = await API.me();
            setUser(r.user);
            console.log('[Auth] refresh -> user:', r.user);
            return r.user;
        } catch (_) {
            setUser(null);
            console.log('[Auth] refresh -> user cleared');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const login = useCallback(async (creds) => {
        const r = await API.login(creds);
        if (r.token) localStorage.setItem('telemed_token', r.token);
        setUser(r.user);
        console.log('[Auth] login -> user:', r.user);
        return r.user;
    }, []);

    const register = useCallback(async (data) => {
        const r = await API.register(data);
        if (r.token) localStorage.setItem('telemed_token', r.token);
        setUser(r.user);
        console.log('[Auth] register -> user:', r.user);
        return r.user;
    }, []);

    const logout = useCallback(async () => {
        try { await API.logout(); } catch (_) {}
        localStorage.removeItem('telemed_token');
        setUser(null);
        console.log('[Auth] logout -> user cleared');
    }, []);

    return (
        <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
            {children}
        </AuthCtx.Provider>
    );
}

export function useAuth() {
    const v = useContext(AuthCtx);
    if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
    return v;
}

export function useRequireAuth(allowedRoles) {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            navigate('/login', { replace: true, state: { from: location.pathname } });
            return;
        }
        if (allowedRoles && !allowedRoles.includes(user.role)) {
            navigate('/overview', { replace: true });
        }
    }, [user, loading, allowedRoles, navigate, location.pathname]);

    return { user, loading };
}
