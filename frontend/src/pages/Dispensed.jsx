import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Empty from '../components/Empty.jsx';
import { CheckCircleIcon } from '../components/Icons.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';

export default function Dispensed() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        API.get('/prescriptions').then(r => {
            setItems((r.prescriptions || []).filter(p => p.status === 'dispensed'));
        });
    }, []);

    return (
        <>
            <PageHeader title="Dispensed" lead="Successfully dispensed prescriptions, most recent first." />

            {items.length === 0 ? (
                <Empty Icon={CheckCircleIcon} title="No dispensed prescriptions yet" message="Once you mark a prescription as dispensed it appears here." />
            ) : (
                <motion.div className="table-wrap" variants={staggerContainer} initial="initial" animate="animate">
                    <table>
                        <thead><tr><th>ID</th><th>Medication</th><th>Patient</th><th>Doctor</th><th>Dispensed</th></tr></thead>
                        <tbody>
                            {items.map(rx => (
                                <motion.tr key={rx.prescription_id} variants={staggerItem}>
                                    <td><code>{rx.prescription_uid}</code></td>
                                    <td>{rx.medication_name}</td>
                                    <td>{rx.patient_name}</td>
                                    <td>{rx.doctor_name}</td>
                                    <td>{fmtDateTime(rx.dispensed_at || rx.issued_at)}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            )}
        </>
    );
}
