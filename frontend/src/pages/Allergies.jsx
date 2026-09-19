import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useToast } from '../hooks/useToast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Pill from '../components/Pill.jsx';
import { ActivityIcon, StethoscopeIcon } from '../components/Icons.jsx';
import { staggerContainer, staggerItem } from '../lib/animations.js';

export default function Allergies() {
    const toast = useToast();
    const [allergies, setAllergies] = useState([]);
    const [conditions, setConditions] = useState([]);

    const [aForm, setAForm] = useState({ allergen: '', severity: 'mild', reaction: '' });
    const [cForm, setCForm] = useState({ condition_name: '', diagnosed_date: '', notes: '' });

    function load() {
        API.get('/allergies').then(r => setAllergies(r.allergies || []));
        API.get('/conditions').then(r => setConditions(r.conditions || []));
    }

    useEffect(() => { load(); }, []);

    async function addAllergy(e) {
        e.preventDefault();
        if (!aForm.allergen.trim()) return;
        try {
            await API.post('/allergies', {
                allergen: aForm.allergen.trim(),
                severity: aForm.severity,
                reaction: aForm.reaction.trim() || null,
                noted_on: new Date().toISOString().slice(0, 10),
            });
            toast('Allergy added', 'success');
            setAForm({ allergen: '', severity: 'mild', reaction: '' });
            load();
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    async function delAllergy(id) {
        if (!confirm('Remove this allergy?')) return;
        try { await API.del('/allergies/' + id); toast('Removed', 'success'); load(); }
        catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    async function addCondition(e) {
        e.preventDefault();
        if (!cForm.condition_name.trim()) return;
        try {
            await API.post('/conditions', {
                condition_name: cForm.condition_name.trim(),
                diagnosed_date: cForm.diagnosed_date || null,
                notes: cForm.notes.trim() || null,
                is_active: true,
            });
            toast('Condition added', 'success');
            setCForm({ condition_name: '', diagnosed_date: '', notes: '' });
            load();
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    async function delCondition(id) {
        if (!confirm('Remove this condition?')) return;
        try { await API.del('/conditions/' + id); toast('Removed', 'success'); load(); }
        catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    return (
        <>
            <PageHeader title="Allergies & chronic conditions" lead="Keep this list current — your doctors see it before issuing prescriptions to avoid harmful interactions." />

            <div className="banner">
                <strong>Why this matters:</strong> Doctors and pharmacists check this list to avoid prescribing medications that could trigger an allergy or interact with a chronic condition.
            </div>

            <Card>
                <div className="card-title-row"><h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ActivityIcon size={20} /> Allergies</h2></div>
                <form onSubmit={addAllergy} className="grid grid-4" style={{ alignItems: 'end' }}>
                    <div className="field"><label className="required">Allergen</label><input type="text" required value={aForm.allergen} onChange={e => setAForm(f => ({ ...f, allergen: e.target.value }))} placeholder="e.g. Penicillin" /></div>
                    <div className="field"><label>Severity</label>
                        <select value={aForm.severity} onChange={e => setAForm(f => ({ ...f, severity: e.target.value }))}>
                            <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
                        </select>
                    </div>
                    <div className="field"><label>Reaction</label><input type="text" value={aForm.reaction} onChange={e => setAForm(f => ({ ...f, reaction: e.target.value }))} placeholder="e.g. Hives" /></div>
                    <div className="field"><motion.button type="submit" style={{ width: '100%' }} whileTap={{ scale: 0.97 }}>+ Add allergy</motion.button></div>
                </form>

                {allergies.length > 0 ? (
                    <motion.div className="table-wrap" style={{ marginTop: 16 }} variants={staggerContainer} initial="initial" animate="animate">
                        <table>
                            <thead><tr><th>Allergen</th><th>Severity</th><th>Reaction</th><th>Noted on</th><th></th></tr></thead>
                            <tbody>
                                {allergies.map(a => (
                                    <motion.tr key={a.allergy_id} variants={staggerItem}>
                                        <td><strong>{a.allergen}</strong></td>
                                        <td><Pill status={a.severity} /></td>
                                        <td>{a.reaction || '—'}</td>
                                        <td>{a.noted_on || '—'}</td>
                                        <td className="right"><button className="btn-ghost btn-sm" onClick={() => delAllergy(a.allergy_id)}>Remove</button></td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                ) : <div className="muted small" style={{ marginTop: 12 }}>No allergies on file yet.</div>}
            </Card>

            <Card>
                <div className="card-title-row"><h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><StethoscopeIcon size={20} /> Chronic conditions</h2></div>
                <form onSubmit={addCondition} className="grid grid-4" style={{ alignItems: 'end' }}>
                    <div className="field"><label className="required">Condition</label><input type="text" required value={cForm.condition_name} onChange={e => setCForm(f => ({ ...f, condition_name: e.target.value }))} placeholder="e.g. Hypertension" /></div>
                    <div className="field"><label>Diagnosed</label><input type="date" value={cForm.diagnosed_date} onChange={e => setCForm(f => ({ ...f, diagnosed_date: e.target.value }))} /></div>
                    <div className="field"><label>Notes</label><input type="text" value={cForm.notes} onChange={e => setCForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. controlled with diet" /></div>
                    <div className="field"><motion.button type="submit" style={{ width: '100%' }} whileTap={{ scale: 0.97 }}>+ Add condition</motion.button></div>
                </form>

                {conditions.length > 0 ? (
                    <motion.div className="table-wrap" style={{ marginTop: 16 }} variants={staggerContainer} initial="initial" animate="animate">
                        <table>
                            <thead><tr><th>Condition</th><th>Diagnosed</th><th>Notes</th><th>Status</th><th></th></tr></thead>
                            <tbody>
                                {conditions.map(c => (
                                    <motion.tr key={c.condition_id} variants={staggerItem}>
                                        <td><strong>{c.condition_name}</strong></td>
                                        <td>{c.diagnosed_date || '—'}</td>
                                        <td>{c.notes || '—'}</td>
                                        <td>{c.is_active ? <span className="tag primary">active</span> : <span className="tag">resolved</span>}</td>
                                        <td className="right"><button className="btn-ghost btn-sm" onClick={() => delCondition(c.condition_id)}>Remove</button></td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                ) : <div className="muted small" style={{ marginTop: 12 }}>No conditions on file yet.</div>}
            </Card>
        </>
    );
}
