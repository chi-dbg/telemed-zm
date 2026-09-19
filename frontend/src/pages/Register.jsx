import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { slideFromLeft, slideFromRight, staggerContainer, staggerItem, buttonPress } from '../lib/animations.js';
import { useAuth } from '../hooks/useAuth.jsx';
import Alert from '../components/Alert.jsx';
import { BrandIcon, UserIcon, StethoscopeIcon, PillIcon, EyeIcon, EyeOffIcon } from '../components/Icons.jsx';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [role, setRole] = useState('patient');
    const [data, setData] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submittedUser, setSubmittedUser] = useState(null);

    function field(name, value) {
        setData(d => ({ ...d, [name]: value }));
    }

    function valueOf(name) {
        return data[name] ?? '';
    }

    async function onSubmit(e) {
        e.preventDefault();
        setLoading(true); setError(''); setSubmittedUser(null);
        try {
            const result = await register({ role, ...data });
            if (result?.user?.account_status === 'pending') {
                setSubmittedUser(result.user);
                setLoading(false);
                return;
            }
            navigate(result?.user?.role === 'admin' ? '/admin' : '/overview');
        } catch (err) {
            setError(err.message || 'Registration failed');
            setLoading(false);
        }
    }

    function renderRoleFields() {
        if (role === 'patient') {
            return (
            <>
                <div className="grid grid-2">
                    <div className="field">
                        <label>Date of birth</label>
                        <input
                            type="date"
                            value={valueOf('date_of_birth')}
                            onChange={e => field('date_of_birth', e.target.value || null)}
                        />
                    </div>
                    <div className="field"><label>Gender</label>
                        <select value={valueOf('gender')} onChange={e => field('gender', e.target.value || null)}>
                            <option value="">--</option><option>male</option><option>female</option><option>other</option>
                        </select>
                    </div>
                </div>
                <div className="field">
                    <label>Address</label>
                    <input
                        type="text"
                        value={valueOf('address')}
                        onChange={e => field('address', e.target.value || null)}
                        placeholder="Town / district"
                    />
                </div>
                <div className="field">
                    <label>Emergency contact</label>
                    <input
                        type="tel"
                        value={valueOf('emergency_contact')}
                        onChange={e => field('emergency_contact', e.target.value || null)}
                    />
                </div>
            </>
            );
        }

        if (role === 'doctor') {
            return (
            <>
                <div className="grid grid-2">
                    <div className="field">
                        <label className="required">HPCZ licence number</label>
                        <input
                            type="text"
                            required
                            value={valueOf('license_number')}
                            onChange={e => field('license_number', e.target.value)}
                            placeholder="HPCZ-..."
                        />
                    </div>
                    <div className="field">
                        <label>Specialisation</label>
                        <input
                            type="text"
                            value={valueOf('specialisation')}
                            onChange={e => field('specialisation', e.target.value)}
                            placeholder="General Practice"
                        />
                    </div>
                </div>
                <div className="field">
                    <label>Affiliated institution</label>
                    <input
                        type="text"
                        value={valueOf('affiliated_institution')}
                        onChange={e => field('affiliated_institution', e.target.value || null)}
                    />
                </div>
            </>
            );
        }

        return (
            <>
                <div className="grid grid-2">
                    <div className="field">
                        <label className="required">Pharmacy name</label>
                        <input
                            type="text"
                            required
                            value={valueOf('pharmacy_name')}
                            onChange={e => field('pharmacy_name', e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label className="required">HPCZ registration #</label>
                        <input
                            type="text"
                            required
                            value={valueOf('pharmacy_registration_number')}
                            onChange={e => field('pharmacy_registration_number', e.target.value)}
                        />
                    </div>
                </div>
                <div className="field">
                    <label className="required">Pharmacy address</label>
                    <input
                        type="text"
                        required
                        value={valueOf('pharmacy_address')}
                        onChange={e => field('pharmacy_address', e.target.value)}
                    />
                </div>
            </>
        );
    }

    return (
        <div className="auth-shell">
            <motion.div className="auth-side" variants={slideFromLeft} initial="initial" animate="animate">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
                        <div style={{ width: 40, height: 40, background: 'white', borderRadius: 10, display: 'grid', placeItems: 'center', color: 'var(--primary-dark)' }}>
                            <BrandIcon size={22} />
                        </div>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>Telemed ZM</div>
                    </div>
                    <h1>Join the platform.</h1>
                    <p>Whether you're a patient, a licensed doctor, or a registered pharmacy — we'll set you up in seconds.</p>

                    <motion.div className="features" variants={staggerContainer} initial="initial" animate="animate">
                        {[
                            [UserIcon, 'Patients', 'Submit symptoms, chat with a doctor, get e-prescriptions'],
                            [StethoscopeIcon, 'Doctors', 'HPCZ licence required. Accept consultations, prescribe, refer.'],
                            [PillIcon, 'Pharmacies', 'Pharmacy registration number required. Receive prescriptions and update dispensing status.'],
                        ].map(([Icon, t, b]) => (
                            <motion.div className="feature" key={t} variants={staggerItem}>
                                <div className="check"><Icon size={14} /></div>
                                <div><strong>{t}</strong><span>{b}</span></div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
                <div style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.65)' }}>
                    Your password is hashed with bcrypt before storage. Sessions expire after 30 minutes of inactivity.
                </div>
            </motion.div>

            <motion.div className="auth-form" variants={slideFromRight} initial="initial" animate="animate">
                <div className="auth-form-inner">
                    <h2>Create your account</h2>
                    <p className="lead">Pick your role and the form will adapt.</p>

                    {error && <Alert kind="error">{error}</Alert>}
                    {submittedUser && <Alert kind="success">Registration submitted for administrator approval. You will be able to sign in after your account is approved.</Alert>}

                    <div className="field">
                        <label className="required">I am registering as</label>
                        <select value={role} onChange={e => setRole(e.target.value)}>
                            <option value="patient">Patient</option>
                            <option value="doctor">Doctor</option>
                            <option value="pharmacist">Pharmacist</option>
                        </select>
                    </div>

                    <form onSubmit={onSubmit}>
                        <div className="grid grid-2">
                            <div className="field"><label className="required">Full name</label><input type="text" required onChange={e => field('full_name', e.target.value)} /></div>
                            <div className="field"><label>Phone</label><input type="tel" onChange={e => field('phone', e.target.value || null)} placeholder="+260..." /></div>
                        </div>
                        <div className="grid grid-2">
                            <div className="field"><label className="required">Email</label><input type="email" required onChange={e => field('email', e.target.value)} /></div>
                            <div className="field"><label className="required">Password</label><div className="password-input"><input type={showPassword ? 'text' : 'password'} required minLength={8} onChange={e => field('password', e.target.value)} placeholder="Min 8 characters" /><button type="button" className="password-toggle" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}</button></div></div>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={role}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.3 }}
                            >
                                {renderRoleFields()}
                            </motion.div>
                        </AnimatePresence>

                        <motion.button type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }} className="btn-lg" {...buttonPress}>
                            {loading ? 'Creating…' : 'Create account'}
                        </motion.button>
                    </form>

                    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
                </div>
            </motion.div>
        </div>
    );
}
