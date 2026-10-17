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
    const location = useLocation();

    useEffect(() => {
        if (!user) return;
        API.get('/notifications')
            .then(r => setUnread(r.notifications.filter(n => !n.is_read).length))
            .catch(() => {});
    }, [user, location.pathname]);

    useEffect(() => {
        console.log('[Layout] pathname ->', location.pathname);
    }, [location.pathname]);

    useEffect(() => {
        console.log('[Layout] mobileOpen ->', mobileOpen);
    }, [mobileOpen]);

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
        <div className={`app role-${user.role}`}>
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
