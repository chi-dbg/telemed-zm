import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import { BrandIcon } from '../components/Icons.jsx';
import { staggerContainer, staggerItem } from '../lib/animations.js';

const RO_ITEMS = [
    {
        label: 'Research objective 1',
        title: 'Design a remote medical consultation framework that minimizes physical hospital visits for routine care.',
        body: 'The system implements a complete consultation lifecycle: queued → assigned → in_progress → prescribed/referred/completed. Real-time chat, doctor queue management, structured symptom submission, and the prescription pathway together replace physical visits for routine care while keeping a clinical safety net.',
        rq: 'RQ-1 answered: the lifecycle states, the Socket.IO-powered chat, and the doctor\'s "Accept & chat" workflow show how a remote consultation framework can effectively replace physical visits — while preserving safety through the triage/referral pathway for cases that can\'t be safely assessed remotely.',
    },
    {
        label: 'Research objective 2',
        title: 'Develop an integrated electronic prescription system that improves accuracy and reduces medication errors.',
        body: 'Doctors issue prescriptions inside the consultation panel, optionally selecting from a structured drug catalog (which standardises medication name, dosage and frequency). Each prescription gets a unique traceable ID (RX-YYYY-NNNNNN), is transmitted directly to the chosen pharmacy, and every event is logged immutably.',
        rq: 'RQ-2 answered: security comes from bcrypt + JWT + RBAC + immutable audit log; accuracy comes from server-side validation, structured drug catalog, atomic transactions, and traceable IDs. The patient\'s allergy & condition list is shown to the doctor before they prescribe.',
    },
    {
        label: 'Research objective 3',
        title: 'Create a secure platform for managing digital medical records featuring symptom assessment and referral modules.',
        body: 'The unified medical record aggregates consultations, prescriptions, doctor notes, allergies, chronic conditions, and referrals — all per-patient. The triage module runs at submission, persists its score and recommendation on the consultation, and surfaces a clear flag in the doctor\'s queue.',
        rq: 'RQ-3 answered: the triage scorer (rule-based red-flag detection with 24 weighted symptoms) runs at submission, the recommendation persists on the consultation, and is the first thing the doctor sees in the queue. The referral and appointment scheduling module is wired directly into the consultation page.',
    },
];

const GAP_ITEMS = [
    { label: 'Gap 1 — Fragmentation', title: 'No prior platform combined teleconsultation + e-prescription + EHR + pharmacy linkage in a unified system.', body: 'Asukile et al. (2022) explicitly noted the absence of EMRs as a key limitation in their Zambian teleneurology study.', solution: 'A single dashboard combines all six modules with patient–doctor–pharmacy data flow.' },
    { label: 'Gap 2 — E-prescription not integrated', title: 'Most reviewed platforms either focused on consultations OR on prescribing, never both inside one workflow.', body: 'Ezeamii et al. (2024) and Al-Samarraie et al. (2020) confirmed remote consultation works, but neither integrated digital prescribing with pharmacy transmission.', solution: "The doctor's prescribe form lives inside the consultation page — the patient and pharmacy both see the prescription instantly." },
    { label: 'Gap 3 — Ambiguous symptom referrals', title: "Existing platforms didn't safely handle cases that need physical examination.", body: 'Hendriks et al. (2024) warned scheduling without symptom triage leads to under-treated serious conditions.', solution: 'Rule-based triage runs at submission, surfaces in the doctor\'s queue, and the referral module schedules in-person visits in one click.' },
{ label: 'Gap 4 — Data security in low-resource settings', title: 'Practical secure RBAC implementations for African contexts were insufficiently documented.', body: 'Mishra et al. (2024) flagged growing EHR breach risks. Muyunda & Mpundu (2023) confirmed Zambia\'s framework mandates compliance via SI 43 of 2023.', solution: 'bcrypt-hashed passwords, JWT with 30-min idle timeout, role-based access on every endpoint, prepared statements only, immutable audit log on every significant event.' },
    { label: 'Gap 5 — Zambian regulatory alignment', title: 'Local guidelines exist (HPCZ Guidelines, SI 43 of 2023) but reference implementations don\'t.', solution: 'HPCZ licence numbers captured at registration; unique prescription IDs (FR-S-03); audit log (FR-S-04); HPCZ-aligned pharmacy registration numbers.' },
];

function GapCard({ label, title, body, solution }) {
    return (
        <motion.div className="gap-card" variants={staggerItem}>
            <div className="gap-label">{label}</div>
            <h3>{title}</h3>
            {body && <p>{body}</p>}
            <div className="solution"><strong>{label.startsWith('Research') ? 'Answered:' : 'Closed:'}</strong> {solution}</div>
        </motion.div>
    );
}

function HelpContent() {
    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
            <Card>
                <h2></h2>
                <p>
                    
                </p>
                <p>
                    
                </p>
            </Card>

            <h2 style={{ marginTop: 32 }}>Research objectives & how they're satisfied</h2>
            {RO_ITEMS.map(it => (
                <GapCard key={it.label} label={it.label} title={it.title} body={it.body} solution={it.rq} />
            ))}

            <h2 style={{ marginTop: 32 }}>Research gaps closed</h2>
            {GAP_ITEMS.map(it => <GapCard key={it.label} {...it} />)}

            <h2 style={{ marginTop: 32 }}>Frequently asked questions</h2>
            <Card>
                <h3>How does the triage scorer decide between routine, review and refer?</h3>
                <p className="muted">It maintains a small dictionary of 24 red-flag symptoms with severity weights. The patient picks symptoms; the system sums the weights and applies thresholds: 0–2 routine, 3–5 review, ≥6 refer. Long-duration low-grade symptoms (≥7 days) get a +1. The doctor still makes the final call.</p>
            </Card>
            <Card>
                <h3>Why does the platform support refill requests?</h3>
                <p className="muted">Refill requests reduce unnecessary consultations for stable, long-term medications. A patient requests a refill from a previous prescription; the prescribing doctor approves or denies it; if approved, the prescription's status flips to <em>pending</em> at the pharmacy.</p>
            </Card>
            <Card>
                <h3>How is patient data protected?</h3>
                <p className="muted">Passwords are hashed with bcrypt before storage. Sessions use signed JWT tokens (HS256) in HTTP-only cookies and expire after 30 minutes of inactivity. Every API endpoint enforces role-based access. All database queries use prepared statements. Every significant action is recorded in an immutable audit log.</p>
            </Card>
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
                            <Link to="/" className="btn-ghost">← Home</Link>
                            <Link to="/login" className="btn-ghost">Sign in</Link>
                            <Link to="/register" className="btn">Get started</Link>
                        </div>
                    </div>
                </nav>
                <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px' }}>
                    <h1>

                    </h1>
                    <p className="lead muted"></p>
                    <HelpContent />
                </main>
            </>
        );
    }

    // Authenticated mode is rendered through the Layout in App.jsx.
    // But Help is configured at the public route, so we render its own
    // shell. Simpler: just render content as plain.
    return (
        <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px' }}>
            <PageHeader title="Research alignment & FAQ" lead="How this system answers each research question and closes each gap from the proposal." />
            <HelpContent />
            <div style={{ marginTop: 24 }}>
               
            </div>
        </main>
    );
}
