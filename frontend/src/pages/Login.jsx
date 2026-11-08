import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { slideFromLeft, slideFromRight, staggerContainer, staggerItem, buttonPress } from '../lib/animations.js';
import { useAuth } from '../hooks/useAuth.jsx';
import Alert from '../components/Alert.jsx';
import { BrandIcon, CheckIcon, EyeIcon, EyeOffIcon } from '../components/Icons.jsx';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const user = await login({ email: email.trim(), password });
            navigate(user?.role === 'admin' ? '/admin' : '/overview');
        } catch (err) {
            setError(err.message || 'Login failed');
            setLoading(false);
        }
    }

    return (
        <div className="auth-shell login-shell">
            <motion.div className="auth-side login-auth-side" variants={slideFromLeft} initial="initial" animate="animate">
                <div>
                    <div className="auth-logo">
                        <div className="auth-logo-mark">
                            <BrandIcon size={22} />
                        </div>
                        <div className="auth-logo-text">Telemed ZM</div>
                    </div>
                    <span className="badge-small">Aligned with HPCZ Guidelines</span>
                    <h1 style={{ marginTop: 18 }}>Welcome back.</h1>
                    <p>Continue caring for patients without the geography. Sign in to access consultations, prescriptions, and your medical record.</p>

                    <motion.div className="features" variants={staggerContainer} initial="initial" animate="animate">
                        {[
                            ['Real-time consultations', 'Doctor & patient chat in <1s on any modern browser'],
                            ['Traceable e-prescriptions', 'Unique IDs, immutable audit, direct pharmacy transmission'],
                            ['Safe-by-default referrals', 'Triage flags ambiguous cases for in-person tests'],
                        ].map(([t, body]) => (
                            <motion.div className="feature" key={t} variants={staggerItem}>
                                <div className="check"><CheckIcon size={14} /></div>
                                <div><strong>{t}</strong><span>{body}</span></div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
                <div style={{ fontSize: '.85rem', color: 'rgba(226, 218, 218, 0.65)' }}>
                </div>
            </motion.div>

            <motion.div className="auth-form" variants={slideFromRight} initial="initial" animate="animate">
                <div className="auth-form-inner">
                    <div className="auth-form-logo">
                        <BrandIcon size={22} />
                        <span>Telemed ZM</span>
                    </div>
                    <h2>Sign in to your account</h2>
                    <p className="lead">Use the email you registered with.</p>

                    {error && <Alert kind="error">{error}</Alert>}
                    {location.state?.passwordReset && <Alert kind="success">Password reset complete. Sign in with your new password.</Alert>}

                    <motion.form onSubmit={onSubmit} variants={staggerContainer} initial="initial" animate="animate">
                        <motion.div className="field" variants={staggerItem}>
                            <label className="required">Email</label>
                            <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                        </motion.div>
                        <motion.div className="field" variants={staggerItem}>
                            <label className="required">Password</label>
                            <div className="password-input">
                                <input type={showPassword ? 'text' : 'password'} required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
                                <button type="button" className="password-toggle" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>
                                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                                </button>
                            </div>
                        </motion.div>
                        <motion.button type="submit" disabled={loading} style={{ width: '100%' }} className="btn-lg" variants={staggerItem} {...buttonPress}>
                            {loading ? 'Signing in…' : 'Sign in'}
                        </motion.button>
                    </motion.form>


                    <div className="divider-with-text">or</div>

                    <p className="auth-switch"><Link to="/forgot-password">Forgot your password?</Link></p>
                    <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
                    


                    
                </div>
            </motion.div>
        </div>
    );
}
