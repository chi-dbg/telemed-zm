import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { headerVariants } from '../lib/animations.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { initialsOf } from '../lib/helpers.js';
import { BellIcon, MenuIcon, SearchIcon } from './Icons.jsx';

export default function Header({ title, subtitle, unreadCount = 0, onMobileToggle }) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const onSearch = (e) => {
        if (e.key === 'Enter') {
            const q = e.target.value.trim();
            if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
        }
    };

    return (
        <motion.header className="app-header" variants={headerVariants} initial="initial" animate="animate">
            <div className="gap-md">
                <button className="mobile-toggle" onClick={onMobileToggle} title="Menu" aria-label="Open menu">
                    <MenuIcon size={20} />
                </button>
                <div className="page-title">
                    {subtitle && <span className="crumb">{subtitle} ·</span>} {title}
                </div>
            </div>
            <div className="header-actions">
                {user?.role !== 'admin' && (
                    <>
                        <div className="search-box">
                            <span className="search-icon" aria-hidden="true"><SearchIcon size={16} /></span>
                            <input type="search" placeholder="Search prescriptions, patients, referrals..." onKeyDown={onSearch} />
                        </div>
                        <button className="icon-btn mobile-search-btn" title="Search" aria-label="Search" onClick={() => navigate('/search')}>
                            <SearchIcon size={18} />
                        </button>
                    </>
                )}
                <button className="icon-btn notification-btn" title="Notifications" aria-label="Notifications" onClick={() => navigate('/notifications')}>
                    <BellIcon size={18} />
                    {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </button>
                <div className="user-menu" onClick={() => navigate('/profile')}>
                    <div className="user-avatar">{initialsOf(user?.full_name)}</div>
                    <div className="user-info">
                        <div className="name">{user?.full_name}</div>
                        <div className="role">{user?.role}</div>
                    </div>
                </div>
            </div>
        </motion.header>
    );
}
