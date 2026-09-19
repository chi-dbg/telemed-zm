import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../api/client.js';
import { useToast } from '../hooks/useToast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import { triageResultVariants, symptomSelectVariants, staggerContainer, staggerItem } from '../lib/animations.js';

const RED_FLAGS = [
    ['chest_pain', 'Chest pain', 'high'],
    ['shortness_of_breath', 'Shortness of breath', 'high'],
    ['severe_abdominal_pain', 'Severe abdominal pain', 'high'],
    ['unexplained_bleeding', 'Unexplained bleeding', 'high'],
    ['loss_of_consciousness', 'Loss of consciousness', 'high'],
    ['severe_headache_sudden', 'Severe sudden headache', 'high'],
    ['jaundice', 'Yellowing skin / eyes', 'high'],
    ['severe_dehydration', 'Severe dehydration', 'high'],
    ['altered_mental_state', 'Altered mental state', 'high'],
    ['high_fever_above_39', 'High fever (>39°C)', 'high'],
    ['persistent_vomiting', 'Persistent vomiting', 'medium'],
    ['persistent_diarrhoea', 'Persistent diarrhoea', 'medium'],
    ['rash_with_fever', 'Rash with fever', 'medium'],
    ['severe_pain_unrelieved', 'Severe pain (unrelieved)', 'medium'],
    ['pregnancy_complications', 'Pregnancy complications', 'medium'],
    ['mild_fever', 'Mild fever', 'low'],
    ['cough', 'Cough', 'low'],
    ['sore_throat', 'Sore throat', 'low'],
    ['runny_nose', 'Runny nose', 'low'],
    ['mild_headache', 'Mild headache', 'low'],
    ['fatigue', 'Fatigue', 'low'],
    ['mild_diarrhoea', 'Mild diarrhoea', 'low'],
    ['minor_skin_rash', 'Minor skin rash', 'low'],
    ['muscle_ache', 'Muscle ache', 'low'],
];

export default function ConsultationNew() {
    const navigate = useNavigate();
    const toast = useToast();
    const [selected, setSelected] = useState(new Set());
    const [duration, setDuration] = useState(2);
    const [severity, setSeverity] = useState('mild');
    const [communicationMode, setCommunicationMode] = useState('chat');
    const [freeText, setFreeText] = useState('');
    const [triage, setTriage] = useState(null);
    const selectedSymptoms = RED_FLAGS
        .filter(([key]) => selected.has(key))
        .map(([key, label, severityLevel]) => ({ key, label, severityLevel }));

    function toggle(key) {
        setSelected(s => {
            const next = new Set(s);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }

    function handleSymptomKeyDown(e, key) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle(key);
        }
    }

    async function runTriage() {
        if (!selected.size) {
            toast('Please select at least one symptom', 'error');
            return;
        }
        try {
            const r = await API.post('/triage/score', {
                symptoms: Array.from(selected),
                duration_days: parseInt(duration, 10) || 0,
            });
            setTriage(r);
        } catch (e) {
            toast('Triage failed: ' + e.message, 'error');
        }
    }

    async function submit() {
        if (!freeText && !selected.size) {
            toast('Please describe your symptoms or select from the list', 'error');
            return;
        }
        let t = triage;
        if (!t && selected.size) {
            try {
                t = await API.post('/triage/score', {
                    symptoms: Array.from(selected),
                    duration_days: parseInt(duration, 10) || 0,
                });
            } catch (_) {}
        }
        const blob = [
            freeText,
            selectedSymptoms.length ? `Selected symptoms: ${selectedSymptoms.map(s => s.label).join(', ')}` : '',
            `Severity self-rated: ${severity}`,
            `Duration: ${duration} days`,
        ].filter(Boolean).join('\n');
        try {
            await API.post('/consultations', {
                symptoms: blob,
                triage_score: t?.score ?? 0,
                triage_recommendation: t?.recommendation ?? 'routine',
                communication_mode: communicationMode,
            });
            toast('Consultation submitted. A doctor will be assigned shortly.', 'success');
            setTimeout(() => navigate('/consultations'), 600);
        } catch (e) {
            toast('Submit failed: ' + e.message, 'error');
        }
    }

    return (
        <>
            <PageHeader
                title="Tell us what's happening"
                //lead="The platform runs a quick triage check — red-flag symptoms get routed to the safest pathway."
            />

            <div className="banner">
                 select your symptoms below and add a description in your own words.
                If your symptoms are routine, a doctor will review and may issue a prescription remotely.
                If they are red-flag symptoms, the doctor will arrange an in-person visit at a clinic.
            </div>

            <Card>
                <div className="grid grid-2">
                    <div className="field">
                        <label>How long have you had these symptoms?</label>
                        <input type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} />
                        <div className="muted small">In days</div>
                    </div>
                    <div className="field">
                        <label>Severity in your own words</label>
                        <select value={severity} onChange={e => setSeverity(e.target.value)}>
                            <option value="mild">Mild — annoying but manageable</option>
                            <option value="moderate">Moderate — affects daily activities</option>
                            <option value="severe">Severe — I can't function normally</option>
                        </select>
                    </div>
                </div>

                <div className="field">
                    <label>Consultation type</label>
                    <div className="mode-options">
                        <label className={`mode-option ${communicationMode === 'chat' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="communication_mode"
                                value="chat"
                                checked={communicationMode === 'chat'}
                                onChange={() => setCommunicationMode('chat')}
                            />
                            <span>
                                <strong>Chat consultation</strong>
                                <small>Request a text consultation after a doctor accepts.</small>
                            </span>
                        </label>
                        <label className={`mode-option ${communicationMode === 'video' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="communication_mode"
                                value="video"
                                checked={communicationMode === 'video'}
                                onChange={() => setCommunicationMode('video')}
                            />
                            <span>
                                <strong>Video consultation</strong>
                                <small>Request a camera call when a physical meeting is not possible.</small>
                            </span>
                        </label>
                    </div>
                </div>

                <div className="field">
                    <label>Select all symptoms that apply</label>
                    <div className="symptom-summary" aria-live="polite">
                        <div className="symptom-summary-header">
                            <strong>Selected symptoms</strong>
                            <span>{selectedSymptoms.length} selected</span>
                        </div>
                        {selectedSymptoms.length ? (
                            <div className="selected-symptom-list">
                                {selectedSymptoms.map(symptom => (
                                    <button
                                        key={symptom.key}
                                        type="button"
                                        className={`selected-symptom-chip ${symptom.severityLevel}`}
                                        onClick={() => toggle(symptom.key)}
                                        title={`Remove ${symptom.label}`}
                                    >
                                        <span className="sev-dot" />
                                        <span>{symptom.label}</span>
                                        <span className="chip-remove" aria-hidden="true">x</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="muted small">No symptoms selected yet.</div>
                        )}
                    </div>
                    <motion.div className="symptom-grid" variants={staggerContainer} initial="initial" animate="animate">
                        {RED_FLAGS.map(([key, label, sev]) => (
                            <motion.div
                                key={key}
                                className={`symptom-item ${sev} ${selected.has(key) ? 'selected' : ''}`}
                                variants={staggerItem}
                                animate={selected.has(key) ? symptomSelectVariants.selected : undefined}
                                onClick={() => toggle(key)}
                                onKeyDown={e => handleSymptomKeyDown(e, key)}
                                role="button"
                                tabIndex={0}
                                aria-pressed={selected.has(key)}
                            >
                                <span className="sev-dot" />
                                {label}
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                <div className="field">
                    <label>Describe your symptoms (in your own words)</label>
                    <textarea value={freeText} onChange={e => setFreeText(e.target.value)} placeholder="e.g. Persistent dry cough for 5 days, mild fever in the evenings, no shortness of breath." />
                </div>

                <div className="gap-sm">
                    <motion.button className="btn-secondary" onClick={runTriage} whileTap={{ scale: 0.97 }}>
                        Run triage check
                    </motion.button>
                    <motion.button onClick={submit} whileTap={{ scale: 0.97 }}>
                        Submit consultation request →
                    </motion.button>
                </div>

                <AnimatePresence>
                    {triage && (
                        <motion.div
                            key={triage.recommendation + triage.score}
                            className={`triage-result ${triage.recommendation}`}
                            variants={triageResultVariants}
                            initial="initial"
                            animate="animate"
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <strong>Triage result: {triage.recommendation.toUpperCase()}</strong> (score {triage.score})<br />
                            {triage.message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </>
    );
}
