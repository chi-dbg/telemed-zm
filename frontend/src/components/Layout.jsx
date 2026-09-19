import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { API } from '../api/client.js';
import { useAuth, useRequireAuth } from '../hooks/useAuth.jsx';
import { pageVariants } from '../lib/animations.js';

export default function Layout({ title, subtitle, allowedRoles }) {
    const { user, loading } = useRequireAuth(allowedRoles);
    const [unread, setUnread] = useState(0);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [compactShell, setCompactShell] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const query = window.matchMedia('(max-width: 1180px), (pointer: coarse)');
        const updateCompactShell = () => setCompactShell(query.matches);

        updateCompactShell();

        if (query.addEventListener) {
            query.addEventListener('change', updateCompactShell);
            return () => query.removeEventListener('change', updateCompactShell);
        }

        query.addListener(updateCompactShell);
        return () => query.removeListener(updateCompactShell);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!user) return;
        API.get('/notifications')
            .then(r => setUnread(r.notifications.filter(n => !n.is_read).length))
            .catch(() => {});
    }, [user, location.pathname]);

    if (loading || !user) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--muted)',
            }}>
                Loading...
            </div>
        );
    }

    return (
        <div className={['app', compactShell ? 'compact-shell' : '', user?.role ? `role-${user.role}` : '', mobileOpen ? 'menu-open' : ''].filter(Boolean).join(' ')}>
            <Sidebar
                unreadNotifications={unread}
                isOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
            />
            <Header
                title={title}
                subtitle={subtitle}
                unreadCount={unread}
                onMobileToggle={() => setMobileOpen(o => !o)}
            />

            <main className="app-main">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            {mobileOpen && (
                <div
                    className="sidebar-overlay show"
                    onClick={() => setMobileOpen(false)}
                />
            )}
        </div>
    );
}
