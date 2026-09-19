import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Pill from '../components/Pill.jsx';
import Empty from '../components/Empty.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { UsersIcon } from '../components/Icons.jsx';

export default function Patients() {
    const [patients, setPatients] = useState([]);

    useEffect(() => {
        API.get('/consultations').then(r => {
            const groups = {};
            for (const c of r.consultations || []) {
                if (!groups[c.patient_id]) {
                    groups[c.patient_id] = {
                        patient_id: c.patient_id,
                        name: c.patient_name,
                        consultations: [],
                    };
                }
                groups[c.patient_id].consultations.push(c);
            }
            setPatients(Object.values(groups));
        });
    }, []);

    return (
        <>
            <PageHeader title="My patients" lead="Patients who have had at least one consultation with you." />

            {patients.length === 0 ? (
                <Empty Icon={UsersIcon} title="No patients yet" message="Once you accept consultations, your patients will appear here." />
            ) : (
                <motion.div className="grid grid-2" variants={staggerContainer} initial="initial" animate="animate">
                    {patients.map(p => (
                        <motion.div key={p.patient_id} variants={staggerItem}>
                            <Card>
                                <div className="card-title-row">
                                    <div>
                                        <h3 style={{ margin: 0 }}>{p.name}</h3>
                                        <div className="muted small">{p.consultations.length} consultation{p.consultations.length === 1 ? '' : 's'}</div>
                                    </div>
                                    <Link to={`/patients/${p.patient_id}`} className="btn-ghost btn-sm">View record →</Link>
                                </div>
                                <div className="muted small">
                                    Last seen: {fmtDateTime(p.consultations[0].requested_at)} — <Pill status={p.consultations[0].status} />
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </>
    );
}
