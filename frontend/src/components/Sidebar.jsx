import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sidebarVariants, navListVariants, navItemVariants, activeNavBounce } from '../lib/animations.js';
import { useAuth } from '../hooks/useAuth.jsx';
import {
    BrandIcon, HomeIcon, PlusCircleIcon, MessageIcon, ClipboardIcon, PillIcon,
    RefreshIcon, ActivityIcon, HospitalIcon, BellIcon, UserIcon, BookIcon,
    ClockIcon, UsersIcon, SearchIcon, InboxIcon, CheckCircleIcon, LogoutIcon,
} from './Icons.jsx';

const NAV_BY_ROLE = {
    patient: [
        { section: 'Care' },
        { key: 'overview',     label: 'Overview',          Icon: HomeIcon,        to: '/overview' },
        { key: 'consult-new',  label: 'New consultation',  Icon: PlusCircleIcon,  to: '/consultation-new' },
        { key: 'consultations',label: 'My consultations',  Icon: MessageIcon,     to: '/consultations' },
        { section: 'Medications' },
        { key: 'prescriptions',label: 'Prescriptions',     Icon: PillIcon,        to: '/prescriptions' },
        { key: 'refills',      label: 'Refill requests',   Icon: RefreshIcon,     to: '/refills' },
        { key: 'allergies',    label: 'Allergies',         Icon: ActivityIcon,    to: '/allergies' },
        { section: 'Appointments' },
        { key: 'referrals',    label: 'Referrals',         Icon: HospitalIcon,    to: '/referrals' },
        { section: 'Account' },
        { key: 'notifications',label: 'Notifications',     Icon: BellIcon,        to: '/notifications' },
        { key: 'profile',      label: 'Profile & settings',Icon: UserIcon,        to: '/profile' },
        { key: 'records',      label: 'Medical record',    Icon: ClipboardIcon,   to: '/records' },
        { key: 'help',         label: 'FAQs',              Icon: BookIcon,        to: '/help' },
    ],
    doctor: [
        { section: 'Clinical' },
        { key: 'overview',     label: 'Overview',          Icon: HomeIcon,        to: '/overview' },
        { key: 'queue',        label: 'Patient queue',     Icon: ClockIcon,       to: '/queue' },
        { key: 'consultations',label: 'My consultations',  Icon: MessageIcon,     to: '/consultations' },
        { key: 'patients',     label: 'My patients',       Icon: UsersIcon,       to: '/patients' },
        { section: 'Records' },
        { key: 'prescriptions',label: 'Prescriptions',     Icon: PillIcon,        to: '/prescriptions' },
        { key: 'referrals',    label: 'Referrals',         Icon: HospitalIcon,    to: '/referrals' },
        { key: 'refills',      label: 'Refill requests',   Icon: RefreshIcon,     to: '/refills' },
        { section: 'Account' },
        { key: 'notifications',label: 'Notifications',     Icon: BellIcon,        to: '/notifications' },
        { key: 'profile',      label: 'Profile & settings',Icon: UserIcon,        to: '/profile' },
        { key: 'help',         label: 'FAQs',              Icon: BookIcon,        to: '/help' },
    ],
    pharmacist: [
        { section: 'Pharmacy' },
        { key: 'overview',     label: 'Overview',          Icon: HomeIcon,        to: '/overview' },
        { key: 'incoming',     label: 'Incoming',          Icon: InboxIcon,       to: '/incoming' },
        { key: 'dispensed',    label: 'Dispensed',         Icon: CheckCircleIcon, to: '/dispensed' },
        { key: 'prescriptions',label: 'All prescriptions', Icon: PillIcon,        to: '/prescriptions' },
        { key: 'refills',      label: 'Refill requests',   Icon: RefreshIcon,     to: '/refills' },
        { section: 'Account' },
        { key: 'notifications',label: 'Notifications',     Icon: BellIcon,        to: '/notifications' },
        { key: 'profile',      label: 'Profile & settings',Icon: UserIcon,        to: '/profile' },
        { key: 'help',         label: 'FAQs',              Icon: BookIcon,        to: '/help' },
    ],
    admin: [
        { section: 'Administration' },
        { key: 'overview',     label: 'Dashboard',         Icon: HomeIcon,        to: '/admin' },
        { key: 'hospitals',    label: 'Hospitals',         Icon: HospitalIcon,    to: '/admin/hospitals' },
        { key: 'audit',        label: 'Audit log',         Icon: SearchIcon,      to: '/audit' },
        { section: 'Account' },
        { key: 'profile',      label: 'Profile & settings',Icon: UserIcon,        to: '/profile' },
        { key: 'help',         label: 'FAQs',              Icon: BookIcon,        to: '/help' },
    ],
};


export default function Sidebar({ unreadNotifications = 0, isOpen, onClose }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const items = (user && NAV_BY_ROLE[user.role]) || [];
    const activeKey = items.find(it => it.to && location.pathname.startsWith(it.to))?.key;
    console.log('[Sidebar] user:', user, 'items:', items, 'pathname:', location.pathname);

    return (
        <motion.aside
            className={`app-sidebar ${isOpen ? 'open' : ''}`}
            variants={sidebarVariants}
            initial="initial"
            animate="animate"
        >
            <div className="sidebar-brand">
                <div className="logo"><BrandIcon size={22} /></div>
                <div className="name">
                    Telemed ZM
                    <small>Healthcare without the journey</small>
                </div>
            </div>

            <motion.nav className="sidebar-nav" variants={navListVariants} initial="initial" animate="animate">
                {items.map((item, i) =>
                    item.section ? (
                        <motion.div key={'sec-' + i} className="sidebar-section" variants={navItemVariants}>
                            {item.section}
                        </motion.div>
                    ) : (
                        <motion.div
                            key={item.key}
                            variants={navItemVariants}
                            animate={item.key === activeKey ? activeNavBounce.animate : undefined}
                        >
                            <Link
                                to={item.to}
                                className={item.key === activeKey ? 'active' : ''}
                                onClick={() => isOpen && onClose && onClose()}
                            >
                                <span className="icon"><item.Icon size={18} /></span>
                                <span className="label">{item.label}</span>
                                {item.key === 'notifications' && unreadNotifications > 0 && (
                                    <span className="nav-badge">{unreadNotifications}</span>
                                )}
                            </Link>
                        </motion.div>
                    )
                )}
                <a
                    href="#"
                    style={{ marginTop: '24px' }}
                    onClick={(e) => { e.preventDefault(); logout(); }}
                >
                    <span className="icon"><LogoutIcon size={18} /></span>
                    <span className="label">Sign out</span>
                </a>
            </motion.nav>

            <div className="sidebar-footer">
                <div style={{ color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>
                    Telemed ZM Prototype
                </div>
                Aligned with HPCZ Guidelines &amp; SI 43 of 2023
            </div>
        </motion.aside>
    );
}
