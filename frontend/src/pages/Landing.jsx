import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { animate as motionAnimate } from 'framer-motion';
import {
    staggerContainer, staggerItem,
    heroLineVariants, heroIllustrationVariants, heroFloatVariants, ctaPulse,
    featureCardVariants, gapCardVariants,
} from '../lib/animations.js';
import {
    BrandIcon, MessageIcon, PillIcon, ActivityIcon, HospitalIcon,
    ClipboardIcon, ShieldIcon,
} from '../components/Icons.jsx';

const FEATURES = [
    { Icon: MessageIcon,   title: 'Remote consultations',     body: 'Patients submit symptoms and chat with a licensed doctor in real time — no travel for routine care.' },
    { Icon: PillIcon,      title: 'Electronic prescriptions', body: 'Doctors generate digital prescriptions with unique traceable IDs and transmit them directly to a registered pharmacy.' },
    { Icon: ActivityIcon,  title: 'Symptom triage',           body: 'A built-in red-flag scorer routes ambiguous cases through a referral pathway instead of remote prescribing.' },
    { Icon: HospitalIcon,  title: 'Safe referrals',           body: "When symptoms can't be safely assessed remotely, doctors schedule in-person appointments at the nearest clinic." },
    { Icon: ClipboardIcon, title: 'Unified medical records',  body: 'Every consultation, prescription, allergy and referral lives in one secure record — accessible by patient and treating doctor.' },
    { Icon: ShieldIcon,    title: 'Compliance built-in',      body: 'Role-based access, bcrypt-hashed credentials, immutable audit log, 30-minute idle timeout — aligned with HPCZ guidelines and SI 43 of 2023.' },
];

const GAPS = [
    {
        
    },
    {
    
    },
    {
        
    },
    {
      
    },
    {
       
    },
];

function CountUp({ value, duration = 1.1 }) {
    const ref = useRef(null);
    const [n, setN] = useState(0);
    const inView = useInView(ref, { once: true });
    useEffect(() => {
        if (!inView) return;
        const target = Number(value) || 0;
        if (typeof target !== 'number') return;
        const ctrl = motionAnimate(0, target, {
            duration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => setN(Math.round(v)),
        });
        return () => ctrl.stop();
    }, [inView, value, duration]);
    return <span ref={ref}>{n}</span>;
}

function StatBlock({ value, label, isText }) {
    return (
        <motion.div className="stat" variants={staggerItem}>
            <strong>{isText ? value : <CountUp value={value} />}</strong>
            <span>{label}</span>
        </motion.div>
    );
}

function HeadlineLine({ children, delay = 0 }) {
    return (
        <motion.span
            style={{ display: 'inline-block' }}
            variants={heroLineVariants}
            transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.span>
    );
}

function FeatureCard({ Icon, title, body }) {
    return (
        <motion.div className="feature-card" variants={featureCardVariants} whileHover="hover">
            <div className="icon"><Icon size={24} /></div>
            <h3>{title}</h3>
            <p>{body}</p>
        </motion.div>
    );
}

function GapCard({ label, title, body, solution }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
    return (
        <motion
            >
            
        </motion>
    );
}
    

export default function Landing() {
    const featuresRef = useRef(null);
    const featuresInView = useInView(featuresRef, { once: true, margin: '0px 0px -15% 0px' });
    const ctaRef = useRef(null);
    const ctaInView = useInView(ctaRef, { once: true, margin: '0px 0px -10% 0px' });

    return (
        <>
            <motion.nav
                className="landing-nav"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="container">
                    <motion.div className="brand" initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                        <div className="logo"><BrandIcon size={22} /></div>
                        <div>Telemed ZM</div>
                    </motion.div>
                    <motion.div className="links" variants={staggerContainer} initial="initial" animate="animate">
                        <motion.span variants={staggerItem}><Link to="/login" className="btn-ghost">Sign in</Link></motion.span>
                        <motion.span variants={staggerItem}><Link to="/register" className="btn">Get started</Link></motion.span>
                    </motion.div>
                </div>
            </motion.nav>

            <section className="hero">
                <div className="container">
                    <div>
                        <motion.span
                            className="tag primary"
                            style={{ marginBottom: '16px' }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            Aligned with Zambia Digital Health Strategy 2022–2026
                        </motion.span>

                        <h1 style={{objectFit: 'hidden' }}>
                            <HeadlineLine delay={0.4}>Healthcare without</HeadlineLine>
                            <br />
                            <HeadlineLine delay={0.5}>the </HeadlineLine>
                            <HeadlineLine delay={0.6}><em>journey.</em></HeadlineLine> 
                            
                        </h1>
                        
                        
            

                        <motion.p
                            className="lead"
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.7 }}
                        >
                            A unified web-based telemedicine platform connecting Zambian patients with licensed doctors and registered pharmacies  featuring secure remote consultations, electronic prescriptions, automated symptom triage, and safe-by-default referrals when in-person care is needed.
                        </motion.p>

                        <motion.div
                            className="actions"
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                            style={{ marginTop: 28 }}
                        >
                            <motion.span variants={staggerItem}>
                                <Link to="/register" className="btn btn-lg">Create an account →</Link>
                            </motion.span>
                            <motion.span variants={staggerItem}>
                                <Link to="/login" className="btn btn-ghost btn-lg">Sign in</Link>
                            </motion.span>
                        </motion.div>

                        <motion.div
                            className="stats"
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                        >
                            
                            <StatBlock value="HPCZ" isText label="Compliant by design" />
                        </motion.div>
                    </div>

                    <motion.div
                        className="hero-illustration"
                        variants={heroIllustrationVariants}
                        initial="initial"
                        animate="animate"
                    >
                        <motion.div animate={heroFloatVariants.animate}>
                            <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--primary-dark)' }}>
                                Live consultation queue
                            </div>
                            {[
                                { color: 'linear-gradient(135deg, var(--primary), var(--accent))', pill: 'pill-routine', text: 'routine' },
                                { color: 'linear-gradient(135deg, #c87600, #e69300)', pill: 'pill-review', text: 'review' },
                                { color: 'linear-gradient(135deg, #c62828, #e64545)', pill: 'pill-refer', text: 'refer' },
                            ].map((card, i) => (
                                <motion.div
                                    className="mock-card"
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.9 + i * 0.1 }}
                                >
                                    <div className="av" style={{ background: card.color }} />
                                    <div className="lines"><span /><span /></div>
                                    <span className={`pill ${card.pill}`}>{card.text}</span>
                                </motion.div>
                            ))}
                            <div style={{ fontSize: '.8rem', color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
                                Triage runs the moment a patient submits symptoms doctors see risk at a glance.
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            <section className="section" style={{ background: 'var(--surface)' }}>
                <div className="container">
                    <motion.h2
                        className="section-title"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                        transition={{ duration: 0.6 }}
                    >
                        A complete care pathway in one platform
                    </motion.h2>
                    <motion.p
                        className="section-lead"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        
                    </motion.p>

                    <motion.div
                        ref={featuresRef}
                        className="feature-grid"
                        variants={staggerContainer}
                        initial="initial"
                        animate={featuresInView ? 'animate' : 'initial'}
                    >
                        {FEATURES.map((f, i) => <FeatureCard key={i} {...f} />)}
                    </motion.div>
                </div>
            </section>

            <footer className="landing-footer">
             ©2026.
            </footer>
        </>
    );
}
