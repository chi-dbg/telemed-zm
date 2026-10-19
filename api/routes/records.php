<?php
/**
 * Health records routes
 * Implements: FR-P-06, FR-D-08 (doctor annotates patient record).
 * Provides a unified record view aggregating consultations, prescriptions, referrals.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function rec_list(): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $pdo  = DB::conn();

    // Determine which patient's records to fetch
    $patientId = null;
    $includeNotes = $auth['role'] === 'doctor';
    if ($auth['role'] === 'patient') {
        $patientId = profile_id_for_user($uid, 'patient');
    } elseif ($auth['role'] === 'doctor') {
        // Doctor can request a specific patient's records via ?patient_id= - they must
        // have at least one consultation with that patient.
        $requested = isset($_GET['patient_id']) ? (int)$_GET['patient_id'] : null;
        if (!$requested) send_json(['error' => 'patient_id query param required'], 400);
        $did = profile_id_for_user($uid, 'doctor');
        $check = $pdo->prepare(
            'SELECT 1 FROM consultations WHERE doctor_id = ? AND patient_id = ? LIMIT 1'
        );
        $check->execute([$did, $requested]);
        if (!$check->fetch()) send_json(['error' => 'No prior consultation with this patient'], 403);
        $patientId = $requested;
    } else {
        send_json(['error' => 'Forbidden'], 403);
    }

    // Patient demographics
    $pi = $pdo->prepare(
        'SELECT p.*, u.full_name, u.email, u.phone
         FROM patients p JOIN users u ON u.user_id = p.user_id WHERE p.patient_id = ?'
    );
    $pi->execute([$patientId]);
    $patient = $pi->fetch();

    // Consultations
    $cons = $pdo->prepare(
        'SELECT c.*, du.full_name AS doctor_name
         FROM consultations c
         LEFT JOIN doctors d ON d.doctor_id = c.doctor_id
         LEFT JOIN users du ON du.user_id = d.user_id
         WHERE c.patient_id = ? ORDER BY c.requested_at DESC'
    );
    $cons->execute([$patientId]);

    // Prescriptions
    $rx = $pdo->prepare(
        'SELECT rx.*, du.full_name AS doctor_name, ph.pharmacy_name
         FROM prescriptions rx
         JOIN doctors d ON d.doctor_id = rx.doctor_id
         JOIN users du ON du.user_id = d.user_id
         JOIN pharmacists ph ON ph.pharmacist_id = rx.pharmacist_id
         WHERE rx.patient_id = ? ORDER BY rx.issued_at DESC'
    );
    $rx->execute([$patientId]);

    // Referrals
    $ref = $pdo->prepare(
        'SELECT r.*, du.full_name AS doctor_name
         FROM referrals r
         JOIN doctors d ON d.doctor_id = r.doctor_id
         JOIN users du ON du.user_id = d.user_id
         WHERE r.patient_id = ? ORDER BY r.appointment_date DESC'
    );
    $ref->execute([$patientId]);

    $notes = [];
    if ($includeNotes) {
        $notesQuery = $pdo->prepare(
            'SELECT hr.*, du.full_name AS doctor_name
             FROM health_records hr
             LEFT JOIN doctors d ON d.doctor_id = hr.doctor_id
             LEFT JOIN users du ON du.user_id = d.user_id
             WHERE hr.patient_id = ? ORDER BY hr.created_at DESC'
        );
        $notesQuery->execute([$patientId]);
        $notes = $notesQuery->fetchAll();
    }

    send_json([
        'patient'        => $patient,
        'consultations'  => $cons->fetchAll(),
        'prescriptions'  => $rx->fetchAll(),
        'referrals'      => $ref->fetchAll(),
        'notes'          => $notes,
    ]);
}

/* ---- Doctor adds a note to a patient record (FR-D-08) ---- */
function rec_create(): void
{
    $auth = require_auth(['doctor']);
    $data = read_json();
    require_fields($data, ['patient_id', 'title', 'content']);

    $did = profile_id_for_user((int)$auth['uid'], 'doctor');
    $consultationId = isset($data['consultation_id']) ? (int)$data['consultation_id'] : null;
    $type = $data['record_type'] ?? 'consultation_note';

    $stmt = DB::conn()->prepare(
        'INSERT INTO health_records (patient_id, consultation_id, doctor_id, record_type, title, content)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        (int)$data['patient_id'],
        $consultationId,
        $did,
        $type,
        $data['title'],
        $data['content'],
    ]);
    $rid = db_last_insert_id(DB::conn());
    audit_log((int)$auth['uid'], 'doctor', 'record.created', 'health_record', $rid, "Note: {$data['title']}");

    send_json(['message' => 'Record added', 'record_id' => $rid], 201);
}

function medical_docx_paragraph(string $text, bool $heading = false): string
{
    $value = htmlspecialchars($text, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    $style = $heading ? '<w:pPr><w:spacing w:before="260" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr>' : '<w:pPr><w:spacing w:after="80"/></w:pPr><w:r>';
    return '<w:p>' . $style . '<w:t xml:space="preserve">' . $value . '</w:t></w:r></w:p>';
}

function rec_export(): void
{
    $auth = require_auth();
    $uid = (int)$auth['uid'];
    $pdo = DB::conn();
    $patientId = 0;

    $includeNotes = $auth['role'] === 'doctor';
    if ($auth['role'] === 'patient') {
        $patientId = (int)profile_id_for_user($uid, 'patient');
    } elseif ($auth['role'] === 'doctor') {
        $patientId = (int)($_GET['patient_id'] ?? 0);
        $doctorId = (int)profile_id_for_user($uid, 'doctor');
        $access = $pdo->prepare('SELECT 1 FROM consultations WHERE patient_id = ? AND doctor_id = ? LIMIT 1');
        $access->execute([$patientId, $doctorId]);
        if (!$patientId || !$access->fetch()) send_json(['error' => 'No prior consultation with this patient'], 403);
    }

    $patientQuery = $pdo->prepare('SELECT p.*, u.full_name, u.email, u.phone FROM patients p JOIN users u ON u.user_id = p.user_id WHERE p.patient_id = ?');
    $patientQuery->execute([$patientId]);
    $patient = $patientQuery->fetch();
    if (!$patient) send_json(['error' => 'Patient record not found'], 404);

    $queries = [
        'Consultations' => ['SELECT c.requested_at, c.status, c.submitted_symptoms, c.diagnosis_notes, u.full_name AS doctor_name FROM consultations c LEFT JOIN doctors d ON d.doctor_id = c.doctor_id LEFT JOIN users u ON u.user_id = d.user_id WHERE c.patient_id = ? ORDER BY c.requested_at DESC', static fn($r) => 'Date: ' . $r['requested_at'] . ' | Doctor: ' . ($r['doctor_name'] ?? '-') . ' | Status: ' . $r['status'] . ' | Symptoms: ' . $r['submitted_symptoms'] . ' | Diagnosis: ' . ($r['diagnosis_notes'] ?? '-')],
        'Prescriptions' => ['SELECT rx.prescription_uid, rx.medication_name, rx.dosage, rx.frequency, rx.duration, rx.status, ph.pharmacy_name FROM prescriptions rx LEFT JOIN pharmacists ph ON ph.pharmacist_id = rx.pharmacist_id WHERE rx.patient_id = ? ORDER BY rx.issued_at DESC', static fn($r) => 'ID: ' . $r['prescription_uid'] . ' | Medication: ' . $r['medication_name'] . ' | ' . $r['dosage'] . ' | ' . $r['frequency'] . ' | ' . $r['duration'] . ' | Pharmacy: ' . ($r['pharmacy_name'] ?? '-') . ' | Status: ' . $r['status']],
        'Referrals' => ['SELECT clinic_name, appointment_date, appointment_time, referral_reason, status FROM referrals WHERE patient_id = ? ORDER BY appointment_date DESC', static fn($r) => 'Clinic: ' . $r['clinic_name'] . ' | Appointment: ' . $r['appointment_date'] . ' ' . $r['appointment_time'] . ' | Reason: ' . $r['referral_reason'] . ' | Status: ' . $r['status']],
        'Allergies' => ['SELECT allergen, severity, reaction FROM allergies WHERE patient_id = ? ORDER BY allergen', static fn($r) => $r['allergen'] . ' | Severity: ' . $r['severity'] . ' | Reaction: ' . ($r['reaction'] ?? '-')],
        'Chronic conditions' => ['SELECT condition_name, diagnosed_date, notes, is_active FROM chronic_conditions WHERE patient_id = ? ORDER BY condition_name', static fn($r) => $r['condition_name'] . ' | Diagnosed: ' . ($r['diagnosed_date'] ?? '-') . ' | Notes: ' . ($r['notes'] ?? '-')],
    ];
    if ($includeNotes) {
        $queries['Doctor notes'] = ['SELECT hr.title, hr.content, hr.created_at, u.full_name AS doctor_name FROM health_records hr LEFT JOIN doctors d ON d.doctor_id = hr.doctor_id LEFT JOIN users u ON u.user_id = d.user_id WHERE hr.patient_id = ? ORDER BY hr.created_at DESC', static fn($r) => 'Title: ' . $r['title'] . ' | Date: ' . $r['created_at'] . ' | Doctor: ' . ($r['doctor_name'] ?? '-') . ' | Note: ' . $r['content']];
    }

    $body = medical_docx_paragraph('Telemed ZM Medical History', true);
    $body .= medical_docx_paragraph('Generated ' . date('d F Y H:i') . '. This is the current medical history held by Telemed ZM.');
    $body .= medical_docx_paragraph('Patient profile', true);
    foreach (['Name' => 'full_name', 'Email' => 'email', 'Phone' => 'phone', 'Date of birth' => 'date_of_birth', 'Gender' => 'gender', 'Address' => 'address', 'Emergency contact' => 'emergency_contact', 'Medical history summary' => 'medical_history_summary'] as $label => $field) {
        $body .= medical_docx_paragraph($label . ': ' . ($patient[$field] ?: '-'));
    }
    foreach ($queries as $title => [$sql, $format]) {
        $body .= medical_docx_paragraph($title, true);
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll();
        if (!$rows) $body .= medical_docx_paragraph('No records recorded.');
        foreach ($rows as $row) $body .= medical_docx_paragraph($format($row));
    }

    if (!class_exists('ZipArchive') && !class_exists('PharData')) send_json(['error' => 'Word export is unavailable on this server'], 500);
    $path = tempnam(sys_get_temp_dir(), 'telemed-docx-');
    unlink($path);
    $path .= '.zip';
    $zipAvailable = class_exists('ZipArchive');
    if ($zipAvailable) {
        $zip = new ZipArchive();
        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) send_json(['error' => 'Could not prepare the Word document'], 500);
    } else {
        $zip = new PharData($path, 0, null, Phar::ZIP);
    }
    $addFile = static function (string $name, string $content) use ($zip, $zipAvailable): void {
        if ($zipAvailable) {
            $zip->addFromString($name, $content);
        } else {
            $zip[$name] = $content;
        }
    };
    $addFile('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    $addFile('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    $addFile('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' . $body . '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>');
    if ($zipAvailable) {
        $zip->close();
    } else {
        unset($zip);
    }

    audit_log($uid, $auth['role'], 'record.exported', 'patient', $patientId, 'Medical history Word document downloaded');
    $name = trim((string)preg_replace('/[^a-z0-9]+/i', '-', strtolower($patient['full_name'])), '-');
    header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    header('Content-Disposition: attachment; filename="telemed-medical-history-' . ($name ?: 'patient') . '-' . date('Y-m-d') . '.docx"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    unlink($path);
    exit;
}
