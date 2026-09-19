import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pill from '../components/Pill.jsx';
import Empty from '../components/Empty.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { PillIcon, RefreshIcon } from '../components/Icons.jsx';

export default function Prescriptions() {
    const { user } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState([]);
    const isPatient = user?.role === 'patient';
    const isPharma  = user?.role === 'pharmacist';

    function load() {
        API.get('/prescriptions').then(r => setItems(r.prescriptions || [])).catch(() => {});
    }

    useEffect(() => { load(); }, []);

    async function setStatus(id, status) {
        try {
            await API.patch(`/prescriptions/${id}/status`, { status });
            toast('Status updated', 'success');
            load();
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    async function requestRefill(id) {
        const note = prompt('Optional note for the doctor (e.g. running out, working well):');
        if (note === null) return;
        try {
            await API.post('/refills', { prescription_id: id, note: note || null });
            toast('Refill requested. Your doctor has been notified.', 'success');
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    return (
        <>
            <PageHeader
                title={isPatient ? 'My prescriptions' : isPharma ? 'All prescriptions' : 'Prescriptions issued'}
                lead={
                    isPatient ? 'Every prescription issued to you, by date. Use Refill to request a renewal.' :
                    isPharma ? 'All prescriptions transmitted to your pharmacy.' :
                    'Every prescription you have issued.'
                }
            />

            {items.length === 0 ? (
                <Empty Icon={PillIcon} title="No prescriptions yet" message="Prescriptions will appear here once issued." />
            ) : (
                <motion.div className="table-wrap" variants={staggerContainer} initial="initial" animate="animate">
                    <table>
                        <thead><tr>
                            <th>ID</th><th>Medication</th><th>Patient</th><th>Doctor</th><th>Pharmacy</th><th>Issued</th><th>Status</th><th></th>
                        </tr></thead>
                        <tbody>
                            {items.map(rx => (
                                <motion.tr key={rx.prescription_id} variants={staggerItem}>
                                    <td><code>{rx.prescription_uid}</code></td>
                                    <td><strong>{rx.medication_name}</strong><br /><span className="muted small">{rx.dosage} · {rx.frequency} · {rx.duration}</span></td>
                                    <td>{rx.patient_name}</td>
                                    <td>{rx.doctor_name}</td>
                                    <td>{rx.pharmacy_name}</td>
                                    <td>{fmtDateTime(rx.issued_at)}</td>
                                    <td><Pill status={rx.status} /></td>
                                    <td className="right">
                                        {isPatient && rx.status === 'dispensed' && (
                                            <motion.button className="btn-ghost btn-sm" onClick={() => requestRefill(rx.prescription_id)} whileTap={{ scale: 0.96 }}>
                                                <RefreshIcon size={14} /> Refill
                                            </motion.button>
                                        )}
                                        {isPharma && rx.status === 'pending' && (
                                            <>
                                                <motion.button className="btn-success btn-sm" onClick={() => setStatus(rx.prescription_id, 'dispensed')} whileTap={{ scale: 0.96 }}>Dispense</motion.button>{' '}
                                                <motion.button className="btn-warn btn-sm" onClick={() => setStatus(rx.prescription_id, 'unavailable')} whileTap={{ scale: 0.96 }}>Unavailable</motion.button>
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
