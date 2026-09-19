import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pill from '../components/Pill.jsx';
import Empty from '../components/Empty.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { RefreshIcon } from '../components/Icons.jsx';

const STATUS_PILL_MAP = {
    approved: 'dispensed',
    denied: 'unavailable',
    pending: 'pending',
    dispensed: 'completed',
};

export default function Refills() {
    const { user } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState([]);

    function load() {
        API.get('/refills').then(r => setItems(r.refills || [])).catch(() => {});
    }

    useEffect(() => { load(); }, []);

    async function decide(id, decision) {
        try {
            await API.post(`/refills/${id}/decision`, { decision });
            toast('Decision recorded', 'success');
            load();
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    return (
        <>
            <PageHeader
                title="Refill requests"
                lead={user?.role === 'patient' ? 'Track refills you have requested. Approved refills are sent straight to your pharmacy.' :
                      user?.role === 'doctor' ? 'Patients have asked to refill prescriptions you previously issued. Review and approve or deny.' :
                      'Refills approved by doctors that will appear as new pending prescriptions in your pharmacy.'}
                actions={user?.role === 'patient' && <Link to="/prescriptions" className="btn">+ Request a refill from prescriptions</Link>}
            />

            {items.length === 0 ? (
                <Empty Icon={RefreshIcon} title="No refill requests" message={user?.role === 'patient' ? 'When you request a refill from a prescription, it will appear here.' : 'No refill requests to review at this time.'} />
            ) : (
                <motion.div className="table-wrap" variants={staggerContainer} initial="initial" animate="animate">
                    <table>
                        <thead><tr><th>Prescription</th><th>Patient</th><th>Note</th><th>Requested</th><th>Status</th><th></th></tr></thead>
                        <tbody>
                            {items.map(rr => (
                                <motion.tr key={rr.request_id} variants={staggerItem}>
                                    <td><code>{rr.prescription_uid}</code><br /><span className="muted small">{rr.medication_name} {rr.dosage}</span></td>
                                    <td>{rr.patient_name}</td>
                                    <td>{rr.note || '—'}</td>
                                    <td>{fmtDateTime(rr.requested_at)}</td>
                                    <td><Pill status={STATUS_PILL_MAP[rr.status] || 'pending'}>{rr.status}</Pill></td>
                                    <td className="right">
                                        {user?.role === 'doctor' && rr.status === 'pending' && (
                                            <>
                                                <motion.button className="btn-success btn-sm" onClick={() => decide(rr.request_id, 'approve')} whileTap={{ scale: 0.96 }}>Approve</motion.button>{' '}
                                                <motion.button className="btn-danger btn-sm" onClick={() => decide(rr.request_id, 'deny')} whileTap={{ scale: 0.96 }}>Deny</motion.button>
                                            </>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            )}
        </>
    );
}
