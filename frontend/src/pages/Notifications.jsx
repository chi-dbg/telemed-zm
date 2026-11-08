import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Empty from '../components/Empty.jsx';
import { BellIcon, MessageIcon, PillIcon, HospitalIcon, InfoIcon } from '../components/Icons.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';

const ICON = {
    consultation: MessageIcon,
    prescription: PillIcon,
    referral:     HospitalIcon,
    system:       InfoIcon,
};

export default function Notifications() {
    const [items, setItems] = useState([]);

    function load() {
        API.get('/notifications').then(r => setItems(r.notifications || []));
    }

    useEffect(() => { load(); }, []);

    async function markRead(id) {
        await API.post(`/notifications/${id}/read`);
        window.dispatchEvent(new Event('telemed:notifications-changed'));
        load();
    }

    return (
        <>
            <PageHeader title="Notifications" lead="Updates on consultations, prescriptions and referrals." />

            {items.length === 0 ? (
                <Empty Icon={BellIcon} title="You're all caught up" message="New notifications will appear here." />
            ) : (
                <motion.div variants={staggerContainer} initial="initial" animate="animate">
                    {items.map(n => {
                        const NIcon = ICON[n.type] || BellIcon;
                        return (
                            <motion.div key={n.notification_id} variants={staggerItem}>
                                <Card style={n.is_read ? {} : { borderLeft: '4px solid var(--primary)' }}>
                                    <div className="card-title-row">
                                        <div className="gap-sm">
                                            <span style={{ display: 'inline-flex', color: 'var(--primary)' }}><NIcon size={20} /></span>
                                            <strong>{n.title}</strong>
                                        </div>
                                        <span className="muted small">{fmtDateTime(n.created_at)}</span>
                                    </div>
                                    <p style={{ margin: '8px 0 0 36px' }}>{n.message}</p>
                                    {!n.is_read && (
                                        <div style={{ marginTop: 12, marginLeft: 36 }}>
                                            <button className="btn-ghost btn-sm" onClick={() => markRead(n.notification_id)}>Mark as read</button>
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </>
    );
}
