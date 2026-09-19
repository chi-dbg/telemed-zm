import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Pill from '../components/Pill.jsx';
import Empty from '../components/Empty.jsx';
import { fmtDate, fmtDateTime, truncate } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { MessageIcon, PillIcon, HospitalIcon, BellIcon, SearchIcon } from '../components/Icons.jsx';

export default function Search() {
    const [params] = useSearchParams();
    const q = (params.get('q') || '').toLowerCase();
    const [results, setResults] = useState({ consult: [], rx: [], ref: [], notif: [] });

    useEffect(() => {
        if (!q) return;
        Promise.all([
            API.get('/consultations').catch(() => ({ consultations: [] })),
            API.get('/prescriptions').catch(() => ({ prescriptions: [] })),
            API.get('/referrals').catch(() => ({ referrals: [] })),
            API.get('/notifications').catch(() => ({ notifications: [] })),
        ]).then(([c, rx, rf, n]) => {
            const m = (s) => (s || '').toLowerCase().includes(q);
            setResults({
                consult: c.consultations.filter(x => m(x.submitted_symptoms) || m(x.diagnosis_notes) || m(x.patient_name) || m(x.doctor_name)),
                rx: rx.prescriptions.filter(x => m(x.prescription_uid) || m(x.medication_name) || m(x.patient_name) || m(x.doctor_name) || m(x.pharmacy_name)),
                ref: rf.referrals.filter(x => m(x.clinic_name) || m(x.referral_reason) || m(x.patient_name)),
                notif: n.notifications.filter(x => m(x.title) || m(x.message)),
            });
        });
    }, [q]);

    const total = results.consult.length + results.rx.length + results.ref.length + results.notif.length;

    return (
        <>
            <PageHeader
                title={`Search results for "${q}"`}
                lead={`${total} match${total === 1 ? '' : 'es'} across consultations, prescriptions, referrals, and notifications.`}
            />

            <motion.div variants={staggerContainer} initial="initial" animate="animate">
                {results.consult.length > 0 && (
                    <motion.div variants={staggerItem}>
                        <Card>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MessageIcon size={18} /> Consultations ({results.consult.length})</h3>
                            <div className="table-wrap"><table>
                                <thead><tr><th>Date</th><th>Patient/Doctor</th><th>Symptoms</th><th>Status</th></tr></thead>
                                <tbody>
                                    {results.consult.map(x => (
                                        <tr key={x.consultation_id} style={{ cursor: 'pointer' }} onClick={() => location.hash = `/consultation/${x.consultation_id}`}>
                                            <td>{fmtDateTime(x.requested_at)}</td>
                                            <td>{x.patient_name || x.doctor_name || '—'}</td>
                                            <td>{truncate(x.submitted_symptoms, 80)}</td>
                                            <td><Pill status={x.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>
                        </Card>
                    </motion.div>
                )}

                {results.rx.length > 0 && (
                    <motion.div variants={staggerItem}>
                        <Card>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PillIcon size={18} /> Prescriptions ({results.rx.length})</h3>
                            <div className="table-wrap"><table>
                                <thead><tr><th>ID</th><th>Medication</th><th>Patient</th><th>Status</th></tr></thead>
                                <tbody>
                                    {results.rx.map(x => (
                                        <tr key={x.prescription_id}>
                                            <td><code>{x.prescription_uid}</code></td>
                                            <td>{x.medication_name}</td>
                                            <td>{x.patient_name}</td>
                                            <td><Pill status={x.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>
                        </Card>
                    </motion.div>
                )}

                {results.ref.length > 0 && (
                    <motion.div variants={staggerItem}>
                        <Card>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><HospitalIcon size={18} /> Referrals ({results.ref.length})</h3>
                            {results.ref.map(x => (
                                <div key={x.referral_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <strong>{x.clinic_name}</strong> — {fmtDate(x.appointment_date)} {x.appointment_time}<br />
                                    <span className="muted small">{x.referral_reason || ''}</span>
                                </div>
                            ))}
                        </Card>
                    </motion.div>
                )}

                {results.notif.length > 0 && (
                    <motion.div variants={staggerItem}>
                        <Card>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BellIcon size={18} /> Notifications ({results.notif.length})</h3>
                            {results.notif.map(x => (
                                <div key={x.notification_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <strong>{x.title}</strong>
                                    <div className="muted small">{x.message}</div>
                                </div>
                            ))}
                        </Card>
                    </motion.div>
                )}

                {total === 0 && (
                    <Empty Icon={SearchIcon} title="No matches" message="Try a different search term — patient names, prescription IDs (RX-...), medication names, clinic names, or symptom keywords all work." />
                )}
            </motion.div>
        </>
    );
}
