import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Pill from '../components/Pill.jsx';
import Alert from '../components/Alert.jsx';
import { fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { downloadMedicalHistory } from '../lib/medicalRecordExport.js';
import { ActivityIcon, DownloadIcon, StethoscopeIcon } from '../components/Icons.jsx';

export default function PatientRecord() {
    const { patientId } = useParams();
    const [data, setData] = useState(null);
    const [allergies, setAllergies] = useState([]);
    const [conditions, setConditions] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            API.get('/records', { patient_id: patientId }),
            API.get('/allergies', { patient_id: patientId }),
            API.get('/conditions', { patient_id: patientId }),
        ]).then(([r, a, c]) => {
            setData(r);
            setAllergies(a.allergies || []);
            setConditions(c.conditions || []);
        }).catch(e => setError(e.message));
    }, [patientId]);

    if (error) return <Alert kind="error">Failed to load: {error}</Alert>;
    if (!data) return null;

    return (
        <div className="medical-record-page">
            <PageHeader
                title={data.patient ? data.patient.full_name : 'Patient record'}
                lead="Complete record across consultations, prescriptions, allergies and chronic conditions."
                actions={
                    <>
                        <Link to="/patients" className="btn-ghost">← Back to patients</Link>
                        <button className="btn-secondary btn-sm" onClick={() => downloadMedicalHistory(patientId)}>
                            <DownloadIcon size={16} /> Download full history
                        </button>
                    </>
                }
            />

            <motion.div className="grid split-2 medical-record-grid" variants={staggerContainer} initial="initial" animate="animate">
                <motion.div variants={staggerItem}>
                    {data.patient && (
                        <Card>
                            <h3>Patient profile</h3>
                            <div className="grid grid-2 record-detail-grid">
                                <div><strong>Name:</strong> {data.patient.full_name}</div>
                                <div><strong>Email:</strong> {data.patient.email}</div>
                                <div><strong>Phone:</strong> {data.patient.phone || '—'}</div>
                                <div><strong>DOB:</strong> {data.patient.date_of_birth || '—'}</div>
                                <div><strong>Gender:</strong> {data.patient.gender || '—'}</div>
                                <div><strong>Address:</strong> {data.patient.address || '—'}</div>
                            </div>
                            {data.patient.medical_history_summary && <p className="muted">{data.patient.medical_history_summary}</p>}
                        </Card>
                    )}

                    {data.consultations.length > 0 && (
                        <Card>
                            <h3>Consultations</h3>
                            <div className="table-wrap">
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

                    {data.prescriptions.length > 0 && (
                        <Card>
                            <h3>Prescriptions</h3>
                            <div className="table-wrap">
                                <table>
                                    <thead><tr><th>ID</th><th>Medication</th><th>Doctor</th><th>Pharmacy</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {data.prescriptions.map(rx => (
                                            <tr key={rx.prescription_id}>
                                                <td><code>{rx.prescription_uid}</code></td>
                                                <td>{rx.medication_name} {rx.dosage}</td>
                                                <td>{rx.doctor_name}</td>
                                                <td>{rx.pharmacy_name}</td>
                                                <td><Pill status={rx.status} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </motion.div>

                <motion.div variants={staggerItem}>
                    {allergies.length > 0 ? (
                        <Card style={{ borderLeft: '4px solid var(--danger)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ActivityIcon size={18} /> Allergies</h3>
                            {allergies.map(a => (
                                <div key={a.allergy_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <strong>{a.allergen}</strong>{' '}
                                    <Pill status={a.severity} />
                                    {a.reaction && <div className="muted small">{a.reaction}</div>}
                                </div>
                            ))}
                        </Card>
                    ) : (
                        <Card><h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ActivityIcon size={18} /> Allergies</h3><p className="muted small">No allergies on file.</p></Card>
                    )}

                    {conditions.length > 0 && (
                        <Card>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><StethoscopeIcon size={18} /> Chronic conditions</h3>
                            {conditions.map(c => (
                                <div key={c.condition_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <strong>{c.condition_name}</strong>
                                    {c.diagnosed_date && <span className="muted small"> since {c.diagnosed_date}</span>}
                                    {c.notes && <div className="muted small">{c.notes}</div>}
                                </div>
                            ))}
                        </Card>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
}
