import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import { fmtDate, fmtDateTime } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import { ShieldIcon } from '../components/Icons.jsx';

export default function Profile() {
    const { user, logout } = useAuth();
    const toast = useToast();
    const [me, setMe] = useState(null);
    const [profile, setProfile] = useState({});
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });

    useEffect(() => {
        API.me().then(r => {
            setMe(r.user);
            setProfile(r.profile || {});
        });
    }, []);

    function set(field, value) {
        setProfile(p => ({ ...p, [field]: value }));
    }

    async function saveProfile(e) {
        e.preventDefault();
        const data = {
            full_name: profile.full_name,
            phone: profile.phone || null,
        };
        if (user.role === 'admin') {
            data.email = (profile.email ?? me.email).trim();
        }
        if (user.role === 'patient') {
            Object.assign(data, {
                date_of_birth: profile.date_of_birth || null,
                gender: profile.gender || null,
                address: profile.address || null,
                emergency_contact: profile.emergency_contact || null,
                medical_history_summary: profile.medical_history_summary || null,
            });
        } else if (user.role === 'doctor') {
            Object.assign(data, {
                specialisation: profile.specialisation || null,
                affiliated_institution: profile.affiliated_institution || null,
                is_available: parseInt(profile.is_available, 10),
            });
        } else if (user.role === 'pharmacist') {
            Object.assign(data, {
                pharmacy_name: profile.pharmacy_name || null,
                pharmacy_address: profile.pharmacy_address || null,
            });
        }

        try {
            await API.patch('/auth/profile', data);
            const updated = await API.me();
            setMe(updated.user);
            setProfile(updated.profile || {});
            toast('Profile updated', 'success');
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    async function savePassword(e) {
        e.preventDefault();
        if (pwForm.next !== pwForm.confirm) {
            toast('New password and confirmation do not match', 'error');
            return;
        }
        try {
            await API.post('/auth/password', {
                current_password: pwForm.current,
                new_password: pwForm.next,
            });
            toast('Password updated', 'success');
            setPwForm({ current: '', next: '', confirm: '' });
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    if (!me) return null;

    return (
        <>
            <PageHeader title="Profile & settings" lead="Update your details and password." />

            <motion.div className="grid split-2" variants={staggerContainer} initial="initial" animate="animate">
                <motion.div variants={staggerItem}>
                    <Card>
                        <h2>Account details</h2>
                        <form className={user.role === 'admin' ? 'admin-profile-form' : ''} onSubmit={saveProfile}>
                            <div className="grid grid-2">
                                <div className="field"><label>Full name</label><input type="text" value={profile.full_name || me.full_name} onChange={e => set('full_name', e.target.value)} /></div>
                                <div className="field"><label>Phone</label><input type="tel" value={profile.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
                            </div>
                            <div className="field"><label>Email</label><input type="email" value={profile.email ?? me.email} disabled={user.role !== 'admin'} onChange={e => set('email', e.target.value)} /></div>

                            {user.role === 'patient' && (<>
                                <div className="grid grid-2">
                                    <div className="field"><label>Date of birth</label><input type="date" value={profile.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} /></div>
                                    <div className="field"><label>Gender</label>
                                        <select value={profile.gender || ''} onChange={e => set('gender', e.target.value)}>
                                            <option value="">--</option><option>male</option><option>female</option><option>other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="field"><label>Address</label><input type="text" value={profile.address || ''} onChange={e => set('address', e.target.value)} /></div>
                                <div className="field"><label>Emergency contact</label><input type="tel" value={profile.emergency_contact || ''} onChange={e => set('emergency_contact', e.target.value)} /></div>
                                <div className="field"><label>Medical history summary</label><textarea value={profile.medical_history_summary || ''} onChange={e => set('medical_history_summary', e.target.value)} /></div>
                            </>)}

                            {user.role === 'doctor' && (<>
                                <div className="grid grid-2">
                                    <div className="field"><label>Specialisation</label><input type="text" value={profile.specialisation || ''} onChange={e => set('specialisation', e.target.value)} /></div>
                                    <div className="field"><label>Affiliated institution</label><input type="text" value={profile.affiliated_institution || ''} onChange={e => set('affiliated_institution', e.target.value)} /></div>
                                </div>
                                <div className="field">
                                    <label>Availability</label>
                                    <select value={profile.is_available != null ? profile.is_available : 1} onChange={e => set('is_available', e.target.value)}>
                                        <option value="1">Available — accepting new consultations</option>
                                        <option value="0">Busy — not accepting new consultations</option>
                                    </select>
                                </div>
                                <div className="field"><label>HPCZ licence number</label><input type="text" value={profile.license_number || ''} disabled /></div>
                            </>)}

                            {user.role === 'pharmacist' && (<>
                                <div className="field"><label>Pharmacy name</label><input type="text" value={profile.pharmacy_name || ''} onChange={e => set('pharmacy_name', e.target.value)} /></div>
                                <div className="field"><label>Pharmacy address</label><input type="text" value={profile.pharmacy_address || ''} onChange={e => set('pharmacy_address', e.target.value)} /></div>
                                <div className="field"><label>Registration number</label><input type="text" value={profile.pharmacy_registration_number || ''} disabled /></div>
                            </>)}

                            <motion.button type="submit" whileTap={{ scale: 0.97 }}>Save changes</motion.button>
                        </form>
                    </Card>

                    <Card>
                        <h2>Change password</h2>
                        <form onSubmit={savePassword}>
                            <div className="field"><label className="required">Current password</label><input type="password" required value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} /></div>
                            <div className="field"><label className="required">New password (min 8 chars)</label><input type="password" required minLength={8} value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} /></div>
                            <div className="field"><label className="required">Confirm new password</label><input type="password" required minLength={8} value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} /></div>
                            <motion.button type="submit" whileTap={{ scale: 0.97 }}>Update password</motion.button>
                        </form>
                    </Card>
                </motion.div>

                <motion.div variants={staggerItem}>
                    <Card>
                        <h3>Account information</h3>
                        <ul className="list-clean">
                            <li><strong>Role:</strong> {me.role}</li>
                            <li><strong>Member since:</strong> {fmtDate(me.created_at)}</li>
                            <li><strong>Last login:</strong> {me.last_login ? fmtDateTime(me.last_login) : '—'}</li>
                        </ul>
                    </Card>
                    <Card style={{ background: 'var(--primary-tint)', border: '1px solid var(--primary-soft)' }}>
                        <h3 style={{ color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldIcon size={18} /> Security
                        </h3>
                        <p className="small muted">Your password is hashed with bcrypt before storage. Sessions expire after 30 minutes of inactivity (NFR-Security).</p>
                    </Card>
                    <Card>
                        <h3>Danger zone</h3>
                        <button className="btn-secondary" onClick={logout}>Sign out</button>
                    </Card>
                </motion.div>
            </motion.div>
        </>
    );
}
