import { API } from '../api/client.js';

export async function downloadMedicalHistory(patientId = null) {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
    const response = await fetch(`${API.BASE}/records/export${query}`, { credentials: 'include' });
    if (!response.ok) {
        let message = 'Could not create the Word document';
        try { message = (await response.json()).error || message; } catch (_) {}
        throw new Error(message);
    }
    const blob = await response.blob();
    const filename = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || 'telemed-medical-history.docx';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}