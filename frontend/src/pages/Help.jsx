import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import { BrandIcon } from '../components/Icons.jsx';
import { staggerContainer, staggerItem } from '../lib/animations.js';

const FAQS = [
    {
        question: 'How do I start a consultation?',
        answer: 'Choose New consultation, select your symptoms, add a short description, then choose chat or video. A doctor will review and accept the request when available.',
    },
    {
        question: 'What happens after I submit symptoms?',
        answer: 'The system performs an initial triage check. A doctor then reviews your request and may start a remote consultation, issue a prescription, or arrange a referral for in-person care.',
    },
    {
        question: 'How do prescriptions work?',
        answer: 'After a doctor issues a prescription, it is sent to the selected pharmacy. You can follow its status from the Prescriptions page.',
    },
    {
        question: 'Can I see my medical record?',
        answer: 'Yes. Your medical record includes your consultations, prescriptions, referrals, allergies, and chronic conditions. Private clinical comments written by doctors are not shown or included in your download.',
    },
    {
        question: 'How do I update allergies or chronic conditions?',
        answer: 'Open Allergies from the side menu. Keeping this information up to date helps doctors prescribe safely.',
    },
    {
        question: 'How is my information protected?',
        answer: 'The platform uses authenticated sessions, role-based access, encrypted connections, and audit controls. Only approved staff can access information needed for their role.',
    },
];

function FaqContent() {
    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
            {FAQS.map(({ question, answer }) => (
                <motion.div key={question} variants={staggerItem}>
                    <Card>
                        <h2>{question}</h2>
                        <p className="muted" style={{ marginBottom: 0 }}>{answer}</p>
                    </Card>
                </motion.div>
            ))}
        </motion.div>
    );
}

export default function Help() {
    const { user, loading } = useAuth();

    if (loading) return null;

    if (!user) {
        return (
            <>
                <nav className="landing-nav">
                    <div className="container">
                        <div className="brand"><div className="logo"><BrandIcon size={22} /></div><div>Telemed ZM</div></div>
                        <div className="links">
                            <Link to="/" className="btn-ghost">Home</Link>
                            <Link to="/login" className="btn-ghost">Sign in</Link>
                            <Link to="/register" className="btn">Get started</Link>
                        </div>
                    </div>
                </nav>
                <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px' }}>
                    <PageHeader title="Frequently asked questions" lead="Answers to common questions about using Telemed ZM." />
                    <FaqContent />
                </main>
            </>
        );
    }

    return (
        <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px' }}>
            <PageHeader title="Frequently asked questions" lead="Answers to common questions about using Telemed ZM." />
            <FaqContent />
        </main>
    );
}
