import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Empty from '../components/Empty.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { FileSearchIcon } from '../components/Icons.jsx';

export default function Audit() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);

    useEffect(() => {
        API.get('/audit').then(r => setItems(r.entries || []));
    }, []);

    return (
        <>
            <PageHeader
                title="Audit log"
                lead="Immutable trail of significant events. Implements FR-S-04 and supports SI 43 of 2023 traceability requirements."
            />

            <div className="banner">
                <strong>What you see here:</strong>{' '}
                {user?.role === 'patient'
                    ? 'every action involving your records — consultations, prescriptions, referrals, profile changes.'
                    : user?.role === 'doctor'
                    ? 'every action you have personally taken on the platform.'
                    : 'every action you have taken plus prescription events at your pharmacy.'}
            </div>

            {items.length === 0 ? (
                <Empty Icon={FileSearchIcon} title="No audit entries yet" message="Events will appear here as you use the platform." />
            ) : (
                <motion.div className="table-wrap" variants={staggerContainer} initial="initial" animate="animate">
                    <table>
                        <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Actor</th><th>Details</th></tr></thead>
                        <tbody>
                            {items.map(e => (
                                <motion.tr key={e.audit_id} variants={staggerItem}>
                                    <td>{fmtDateTime(e.created_at)}</td>
                                    <td><span className="tag primary">{e.action.replaceAll('.', ' / ').replaceAll('_', ' ')}</span></td>
                                    <td>{e.entity_type}{e.entity_id ? ' #' + e.entity_id : ''}</td>
                                    <td>{e.actor_name || '—'} <span className="muted small">({e.actor_role || ''})</span></td>
                                    <td>{e.details || ''}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            )}
        </>
    );
}
