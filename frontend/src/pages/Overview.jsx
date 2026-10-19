import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import PageHeader from '../components/PageHeader.jsx';
import KpiCard from '../components/KpiCard.jsx';
import Card from '../components/Card.jsx';
import Pill from '../components/Pill.jsx';
import Empty from '../components/Empty.jsx';
import {
    MessageIcon, PillIcon, HospitalIcon, ShieldIcon, MailIcon,
} from '../components/Icons.jsx';
import { fmtDateTime, truncate, safe } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';

const ICON_MAP = {
    consultation: MessageIcon,
    prescription: PillIcon,
    referral:     HospitalIcon,
};

const HEAD_LEAD = {
    patient:    'Your active care, at a glance.',
    doctor:     'Patients waiting, prescriptions to issue, referrals to follow up.',
    pharmacist: "Today's dispensing workload and recent activity.",
};

const KPI_ROUTES = {
    patient: {
        'Active consultations': '/consultations',
        'Total prescriptions': '/prescriptions',
        'Pending at pharmacy': '/prescriptions',
        'Upcoming referrals': '/referrals',
    },
    doctor: {
        'In queue (system-wide)': '/queue',
        'My active consultations': '/consultations',
        'Prescriptions issued': '/prescriptions',
        'Patients seen': '/patients',
    },
    pharmacist: {
        'Pending dispensing': '/incoming',
        'Dispensed total': '/dispensed',
        'Marked unavailable': '/prescriptions',
        'Unique patients served': '/prescriptions',
    },
};

function routeForKpi(role, label) {
    return KPI_ROUTES[role]?.[label] || null;
}

export default function Overview() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        API.get('/stats').then(setStats).catch(() => {});
    }, []);

    if (!stats || !user) return null;

    const QuickActions = {
        patient: (
            <>
                <Link to="/consultation-new" className="btn">+ New consultation</Link>
                <Link to="/prescriptions" className="btn-ghost">View prescriptions</Link>
                <Link to="/records" className="btn-ghost">My medical record</Link>
            </>
        ),
        doctor: (
            <>
                <Link to="/queue" className="btn">Open patient queue</Link>
                <Link to="/consultations" className="btn-ghost">My consultations</Link>
            </>
        ),
        pharmacist: (
            <>
                <Link to="/incoming" className="btn">Incoming prescriptions</Link>
                <Link to="/prescriptions" className="btn-ghost">All prescriptions</Link>
            </>
        ),
    };

    return (
        <>
            <PageHeader
                title={`Hello, ${user.full_name.split(' ')[0]}`}
                lead={HEAD_LEAD[user.role]}
                actions={QuickActions[user.role]}
            />

            <motion.div className="grid grid-4 responsive-tile-grid" variants={staggerContainer} initial="initial" animate="animate">
                {stats.cards.map((c, i) => (
                    <KpiCard
                        key={i}
                        icon={c.icon}
                        label={c.label}
                        value={c.value}
                        tone={c.tone}
                        to={routeForKpi(user.role, c.label)}
                    />
                ))}
            </motion.div>

            <div style={{ height: 12 }} />

            <div className="grid split-2">
                <Card>
                    <div className="card-title-row">
                        <h2>Recent activity</h2>
                        <Link to="/consultations" className="btn-ghost btn-sm">See all →</Link>
                    </div>
                    {stats.recent && stats.recent.length ? (
                        <motion.div variants={staggerContainer} initial="initial" animate="animate">
                            {stats.recent.map((r, i) => {
                                const ActivityIconComp = ICON_MAP[r.t] || MessageIcon;
                                return (
                                    <motion.div className="activity-row" key={i} variants={staggerItem}>
                                        <div className="activity-icon"><ActivityIconComp size={18} /></div>
                                        <div className="activity-body">
                                            <div className="title">
                                                {safe(r.t).charAt(0).toUpperCase() + safe(r.t).slice(1)}: {truncate(r.detail, 90)}
                                            </div>
                                            <div className="meta">
                                                {fmtDateTime(r.at)} · {safe(r.who) || '—'}
                                                {r.triage ? ' · triage ' + r.triage : ''}
                                            </div>
                                        </div>
                                        <Pill status={r.status} />
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    ) : (
                        <Empty Icon={MailIcon} title="No recent activity" message="Once you start using the platform, your recent consultations, prescriptions and referrals will appear here." />
                    )}
                </Card>

                <div>
                    <Card style={{ background: 'var(--primary-tint)', border: '1px solid var(--primary-soft)' }}>
                        <h3 style={{ color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldIcon size={18} /> Your security
                        </h3>
                        <p className="small muted">All sessions expire after 30 minutes of inactivity. Your password is hashed with bcrypt. Every prescription event is recorded in an immutable audit log per HPCZ guidelines.</p>
                    </Card>
                </div>
            </div>
        </>
    );
}
