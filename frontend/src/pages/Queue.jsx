import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useToast } from '../hooks/useToast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Pill from '../components/Pill.jsx';
import Empty from '../components/Empty.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { ClockIcon } from '../components/Icons.jsx';

const BORDER_BY_TRIAGE = {
    refer:   'var(--danger)',
    review:  'var(--warn)',
    routine: 'var(--success)',
};

export default function Queue() {
    const [queue, setQueue] = useState([]);
    const navigate = useNavigate();
    const toast = useToast();

    async function load() {
        try { const r = await API.get('/consultations/queue'); setQueue(r.queue || []); } catch (_) {}
    }

    useEffect(() => {
        load();
        const id = setInterval(load, 20000);
        return () => clearInterval(id);
    }, []);

    async function accept(id) {
        try {
            await API.post(`/consultations/${id}/accept`);
            navigate(`/consultation/${id}`);
        } catch (e) {
            toast('Could not accept: ' + e.message, 'error');
        }
    }

    return (
        <>
            <PageHeader
                title="Patient queue"
                lead="Patients waiting to be seen, oldest first. Triage hints highlight cases that may need in-person referral."
                actions={<button className="btn-secondary" onClick={load}>↻ Refresh</button>}
            />

            {queue.length === 0 ? (
                <Empty Icon={ClockIcon} title="Queue is empty" message="No patients waiting. New requests will appear here automatically." />
            ) : (
                <motion.div variants={staggerContainer} initial="initial" animate="animate">
                    {queue.map(c => {
                        const triage = c.triage_recommendation || 'routine';
                        const mode = c.communication_mode === 'video' ? 'video' : 'chat';
                        return (
                            <motion.div key={c.consultation_id} variants={staggerItem}>
                                <Card style={{ borderLeft: `4px solid ${BORDER_BY_TRIAGE[triage]}` }}>
                                    <div className="card-title-row">
                                        <div>
                                            <h3 style={{ margin: 0 }}>{c.patient_name}</h3>
                                            <div className="muted small">Requested {fmtDateTime(c.requested_at)}</div>
                                        </div>
                                        <div className="gap-sm">
                                            <span className="tag primary">{mode} requested</span>
                                            <Pill status={triage}>Triage: {triage} ({c.triage_score || 0})</Pill>
                                            <motion.button onClick={() => accept(c.consultation_id)} whileTap={{ scale: 0.97 }}>
                                                Accept &amp; start {mode}
                                            </motion.button>
                                        </div>
                                    </div>
                                    <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{c.submitted_symptoms}</p>
                                </Card>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </>
    );
}
