import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { BrandIcon, EyeIcon, EyeOffIcon } from '../components/Icons.jsx';
import Alert from '../components/Alert.jsx';
import { buttonPress, staggerContainer, staggerItem } from '../lib/animations.js';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [requested, setRequested] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function requestCode(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await API.post('/auth/password-reset/request', { email: email.trim() });
            setRequested(true);
            setNotice(result.message);
        } catch (err) {
            setError(err.message || 'Could not request a reset code');
        } finally {
            setLoading(false);
        }
    }

    async function resetPassword(e) {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('The passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await API.post('/auth/password-reset', { email: email.trim(), code: code.trim(), password });
            navigate('/login', { replace: true, state: { passwordReset: true } });
        } catch (err) {
            setError(err.message || 'Could not reset the password');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-shell login-shell">
            <div className="auth-side login-auth-side">
                <div>
                    <div className="auth-logo"><div className="auth-logo-mark"><BrandIcon size={22} /></div><div className="auth-logo-text">Telemed ZM</div></div>
                    <h1>Reset your password.</h1>
                    <p>Request a short-lived reset code, then choose a new password for your account.</p>
                </div>
            </div>
            <div className="auth-form">
                <div className="auth-form-inner">
                    <div className="auth-form-logo"><BrandIcon size={22} /><span>Telemed ZM</span></div>
                    <h2>Forgot password?</h2>
                    <p className="lead">{requested ? 'Check your email for the reset code, then choose a new password.' : 'Enter the email address on your account.'}</p>
                    {error && <Alert kind="error">{error}</Alert>}
                    {notice && <Alert kind="success">{notice}</Alert>}

                    {!requested ? (
                        <motion.form onSubmit={requestCode} variants={staggerContainer} initial="initial" animate="animate">
                            <motion.div className="field" variants={staggerItem}>
                                <label className="required">Email</label>
                                <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                            </motion.div>
                            <motion.button type="submit" disabled={loading} style={{ width: '100%' }} className="btn-lg" variants={staggerItem} {...buttonPress}>
                                {loading ? 'Sending email...' : 'Email reset code'}
                            </motion.button>
                        </motion.form>
                    ) : (
                        <motion.form onSubmit={resetPassword} variants={staggerContainer} initial="initial" animate="animate">
                            <motion.div className="field" variants={staggerItem}>
                                <label className="required">Reset code</label>
                                <input required value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" />
                            </motion.div>
                            <motion.div className="field" variants={staggerItem}>
                                <label className="required">New password</label>
                                <div className="password-input">
                                    <input type={showPassword ? 'text' : 'password'} required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                                    <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}</button>
                                </div>
                            </motion.div>
                            <motion.div className="field" variants={staggerItem}>
                                <label className="required">Confirm new password</label>
                                <input type={showPassword ? 'text' : 'password'} required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
                            </motion.div>
                            <motion.button type="submit" disabled={loading} style={{ width: '100%' }} className="btn-lg" variants={staggerItem} {...buttonPress}>
                                {loading ? 'Resetting password...' : 'Reset password'}
                            </motion.button>
                        </motion.form>
                    )}
                    <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
                </div>
            </div>
        </div>
    );
}
