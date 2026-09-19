import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useToast } from '../hooks/useToast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Pill from '../components/Pill.jsx';
import Empty from '../components/Empty.jsx';
import { InboxIcon, CheckIcon } from '../components/Icons.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';

export default function Incoming() {
    const toast = useToast();
    const [items, setItems] = useState([]);

    function load() {
        API.get('/prescriptions').then(r => {
            setItems((r.prescriptions || []).filter(p => p.status === 'pending'));
        });
    }

    useEffect(() => {
        load();
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, []);

    async function setStatus(id, status) {
        try {
            await API.patch(`/prescriptions/${id}/status`, { status });
            toast('Status updated', 'success');
            load();
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    return (
        <>
            <PageHeader
                title="Incoming prescriptions"
                lead="Prescriptions transmitted to your pharmacy that are awaiting dispensing."
                actions={<button className="btn-secondary" onClick={load}>↻ Refresh</button>}
            />

            {items.length === 0 ? (
                <Empty Icon={InboxIcon} title="No pending prescriptions" message="All caught up. New prescriptions will appear here automatically." />
            ) : (
                <motion.div variants={staggerContainer} initial="initial" animate="animate">
                    {items.map(rx => (
                        <motion.div key={rx.prescription_id} variants={staggerItem}>
                            <Card style={{ borderLeft: '4px solid var(--warn)' }}>
                                <div className="card-title-row">
                                    <div>
                                        <h3 style={{ margin: 0 }}><code>{rx.prescription_uid}</code> · {rx.medication_name}</h3>
                                        <div className="muted small">Issued {fmtDateTime(rx.issued_at)}</div>
                                    </div>
                                    <Pill status="pending" />
                                </div>
                                <div className="grid grid-2" style={{ marginTop: 12 }}>
                                    <div><strong>Patient:</strong> {rx.patient_name}</div>
                                    <div><strong>Doctor:</strong> {rx.doctor_name}</div>
                                    <div><strong>Dosage:</strong> {rx.dosage}</div>
                                    <div><strong>Frequency:</strong> {rx.frequency}</div>
                                    <div><strong>Duration:</strong> {rx.duration}</div>
                                </div>
                                {rx.instructions && <p><strong>Instructions:</strong> {rx.instructions}</p>}
                                <div className="gap-sm" style={{ marginTop: 14 }}>
                                    <motion.button className="btn-success" onClick={() => setStatus(rx.prescription_id, 'dispensed')} whileTap={{ scale: 0.96 }}>
                                        <CheckIcon size={16} /> Mark dispensed
                                    </motion.button>
                                    <motion.button className="btn-warn" onClick={() => setStatus(rx.prescription_id, 'unavailable')} whileTap={{ scale: 0.96 }}>Out of stock</motion.button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </>
    );
}
