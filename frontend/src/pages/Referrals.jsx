import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Pill from '../components/Pill.jsx';
import Empty from '../components/Empty.jsx';
import { fmtDate, fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { HospitalIcon, CalendarIcon, ClockIcon } from '../components/Icons.jsx';

export default function Referrals() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);

    useEffect(() => {
        API.get('/referrals').then(r => setItems(r.referrals || [])).catch(() => {});
    }, []);

    return (
        <>
            <PageHeader
                title={user?.role === 'patient' ? 'My referrals' : 'Referrals issued'}
                lead={user?.role === 'patient'
                    ? 'In-person appointments your doctor has scheduled for you.'
                    : 'Cases you referred for physical examination because remote prescribing was not safe.'}
            />

            {items.length === 0 ? (
                <Empty Icon={HospitalIcon} title="No referrals" message={user?.role === 'patient' ? 'When a doctor refers you for in-person tests, the appointment will appear here.' : 'You have not referred any patients yet.'} />
            ) : (
                <motion.div variants={staggerContainer} initial="initial" animate="animate">
                    {items.map(rf => (
                        <motion.div key={rf.referral_id} variants={staggerItem}>
                            <Card style={{ borderLeft: '4px solid var(--primary)' }}>
                                <div className="card-title-row">
                                    <h3 style={{ margin: 0 }}>{rf.clinic_name}</h3>
                                    <Pill status={rf.status} />
                                </div>
                                <div className="muted small">{rf.clinic_address}{rf.clinic_contact ? ' · ' + rf.clinic_contact : ''}</div>
                                <div className="grid grid-2" style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarIcon size={14} /> <strong>Date:</strong> {fmtDate(rf.appointment_date)}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ClockIcon size={14} /> <strong>Time:</strong> {rf.appointment_time}</div>
                                    <div><strong>{user?.role === 'patient' ? 'Referred by' : 'Patient'}:</strong> {user?.role === 'patient' ? rf.doctor_name : rf.patient_name}</div>
                                    <div><strong>Created:</strong> {fmtDateTime(rf.created_at)}</div>
                                </div>
                                <p><strong>Reason for referral:</strong><br />{rf.referral_reason}</p>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </>
    );
}
