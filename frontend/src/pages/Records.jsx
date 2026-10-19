import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Pill from '../components/Pill.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { downloadMedicalHistory } from '../lib/medicalRecordExport.js';
import { DownloadIcon } from '../components/Icons.jsx';

export default function Records() {
    const [data, setData] = useState(null);
    const [allergies, setAllergies] = useState([]);
    const [conditions, setConditions] = useState([]);

    useEffect(() => {
        Promise.all([
            API.get('/records'),
            API.get('/allergies'),
            API.get('/conditions'),
        ]).then(([r, a, c]) => {
            setData(r);
            setAllergies(a.allergies || []);
            setConditions(c.conditions || []);
        }).catch(() => {});
    }, []);

    if (!data) return null;

    return (
        <div className="medical-record-page">
            <PageHeader
                title="My medical record"
                lead="Your consultations, prescriptions, referrals, allergies, and chronic conditions in one place."
                actions={
                    <button className="btn-secondary btn-sm" onClick={() => downloadMedicalHistory()}>
                        <DownloadIcon size={16} /> Download full history
                    </button>
                }
            />

            <motion.div className="grid split-2 medical-record-grid" variants={staggerContainer} initial="initial" animate="animate">
                <motion.div variants={staggerItem}>
                    {data.patient && (
                        <Card>
                            <div className="card-title-row">
                                <h2>Profile</h2>
                                <Link to="/profile" className="btn-ghost btn-sm">Edit ↗</Link>
                            </div>
                            <div className="grid grid-2 record-detail-grid">
                                <div><strong>Name:</strong> {data.patient.full_name}</div>
                                <div><strong>Email:</strong> {data.patient.email}</div>
                                <div><strong>Phone:</strong> {data.patient.phone || '—'}</div>
                                <div><strong>Date of birth:</strong> {data.patient.date_of_birth || '—'}</div>
                                <div><strong>Gender:</strong> {data.patient.gender || '—'}</div>
                                <div><strong>Address:</strong> {data.patient.address || '—'}</div>
                                <div><strong>Emergency contact:</strong> {data.patient.emergency_contact || '—'}</div>
                            </div>
                        </Card>
                    )}

                    {data.consultations.length > 0 && (
                        <Card>
                            <h3>Consultations</h3>
                            <div className="table-wrap" style={{ marginTop: 8 }}>
                                <table>
                                    <thead><tr><th>Date</th><th>Doctor</th><th>Status</th><th>Diagnosis</th></tr></thead>
                                    <tbody>
                                        {data.consultations.map(c => (
                                            <tr key={c.consultation_id}>
                                                <td>{fmtDateTime(c.requested_at)}</td>
                                                <td>{c.doctor_name || '—'}</td>
                                                <td><Pill status={c.status} /></td>
                                                <td>{c.diagnosis_notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {data.notes.length > 0 && (
                        <Card>
                            <h3>Doctor notes</h3>
                            {data.notes.map(n => (
                                <div key={n.record_id} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 14, marginBottom: 14 }}>
                                    <strong>{n.title}</strong>
                                    <div className="muted small">{fmtDateTime(n.created_at)} — {n.doctor_name || 'Doctor'}</div>
                                    <p>{n.content}</p>
                                </div>
                            ))}
                        </Card>
                    )}
                </motion.div>

                <motion.div variants={staggerItem}>
                    {allergies.length > 0 ? (
                        <Card>
                            <div className="card-title-row">
                                <h3>Allergies</h3>
                                <Link to="/allergies" className="btn-ghost btn-sm">Manage ↗</Link>
                            </div>
                            {allergies.map(a => (
                                <div key={a.allergy_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <div className="gap-sm"><strong>{a.allergen}</strong><Pill status={a.severity} /></div>
                                    {a.reaction && <div className="muted small">{a.reaction}</div>}
                                </div>
                            ))}
                        </Card>
                    ) : (
                        <Card>
                            <div className="card-title-row"><h3>Allergies</h3><Link to="/allergies" className="btn-ghost btn-sm">Add allergies ↗</Link></div>
                            <p className="muted small">No allergies on file. Adding them helps doctors prescribe safely.</p>
                        </Card>
                    )}

                    {conditions.length > 0 && (
                        <Card>
                            <h3>Chronic conditions</h3>
                            {conditions.map(c => (
                                <div key={c.condition_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <strong>{c.condition_name}</strong>
                                    {c.diagnosed_date && <span className="muted small"> since {c.diagnosed_date}</span>}
                                    {c.notes && <div className="muted small">{c.notes}</div>}
                                </div>
                            ))}
                        </Card>
                    )}

                    <Card style={{ background: 'var(--primary-tint)', border: '1px solid var(--primary-soft)' }}>
                        <h3 style={{ color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <DownloadIcon size={18} /> Export
                        </h3>
                        <p className="small">Download a Word document containing your profile, consultations, prescriptions, referrals, allergies, and chronic conditions.</p>
                        <button className="btn-secondary btn-sm" onClick={() => downloadMedicalHistory()}>
                            <DownloadIcon size={16} /> Download full history
                        </button>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    );
}
