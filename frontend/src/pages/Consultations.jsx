import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pill from '../components/Pill.jsx';
import Empty from '../components/Empty.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { MessageIcon } from '../components/Icons.jsx';

export default function Consultations() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);

    useEffect(() => {
        API.get('/consultations').then(r => setItems(r.consultations || [])).catch(() => {});
    }, []);

    const isPatient = user?.role === 'patient';
    const activeStatuses = ['in_progress', 'assigned'];
    const consultationPath = (c) => `/consultation/${c.consultation_id}${activeStatuses.includes(c.status) ? '' : '?view=1'}`;
    const symptomsPath = (c) => `${consultationPath(c)}#submitted-symptoms`;
    const openTile = (c) => navigate(consultationPath(c));
    const openTileFromKeyboard = (e, c) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openTile(c);
        }
    };

    return (
        <>
            <PageHeader
                title="My consultations"
                lead={isPatient ? 'Every consultation you have ever requested.' : 'Consultations you have accepted.'}
                actions={isPatient
                    ? <Link to="/consultation-new" className="btn">+ New consultation</Link>
                    : <Link to="/queue" className="btn">Patient queue →</Link>
                }
            />

            {items.length === 0 ? (
                <Empty Icon={MessageIcon} title="No consultations yet" message={isPatient ? 'Click "New consultation" to start.' : 'Open the patient queue to accept incoming requests.'} />
            ) : (
                <motion.div className="consultation-tile-grid" variants={staggerContainer} initial="initial" animate="animate">
                    {items.map(c => (
                        <motion.article
                            key={c.consultation_id}
                            className="card consultation-tile"
                            variants={staggerItem}
                            role="button"
                            tabIndex={0}
                            aria-label={`Open consultation ${c.consultation_id}`}
                            onClick={() => openTile(c)}
                            onKeyDown={(e) => openTileFromKeyboard(e, c)}
                        >
                            <div className="consultation-tile-header">
                                <div>
                                    <span className="consultation-tile-label">Requested</span>
                                    <strong>{fmtDateTime(c.requested_at)}</strong>
                                </div>
                                <Pill status={c.status} />
                            </div>

                            <div className="consultation-tile-main">
                                <div>
                                    <span className="consultation-tile-label">{isPatient ? 'Doctor' : 'Patient'}</span>
                                    <strong>{isPatient ? (c.doctor_name || '— unassigned —') : c.patient_name}</strong>
                                </div>
                                <span className="tag primary">{c.communication_mode === 'video' ? 'Video' : 'Chat'}</span>
                            </div>

                            <div className="consultation-tile-meta">
                                <div>
                                    <span className="consultation-tile-label">Triage</span>
                                    <Pill status={c.triage_recommendation || 'routine'} />
                                </div>
                                <div>
                                    <span className="consultation-tile-label">Symptoms</span>
                                    <button
                                        type="button"
                                        className="btn-ghost btn-sm consultation-symptoms-button"
                                        onKeyDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(symptomsPath(c));
                                        }}
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </motion.div>
            )}
        </>
    );
}
