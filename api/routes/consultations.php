<?php
/**
 * Consultation routes
 * Implements: FR-P-03/04/05, FR-D-02/03/04, UC-01.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function consult_ensure_communication_columns(): void
{
    static $checked = false;
    if ($checked) return;
    $checked = true;

    $pdo = DB::conn();
    $stmt = $pdo->query("SHOW COLUMNS FROM consultations LIKE 'communication_mode'");
    if (!$stmt->fetch()) {
        $pdo->exec(
            "ALTER TABLE consultations
             ADD COLUMN communication_mode ENUM('chat','video') NOT NULL DEFAULT 'chat'
             AFTER triage_recommendation"
        );
    }
}

function consult_patient_profile_id(int $userId): ?int
{
    $existing = profile_id_for_user($userId, 'patient');
    if ($existing) return $existing;

    $pdo = DB::conn();
    $stmt = $pdo->prepare('SELECT user_id FROM users WHERE user_id = ? AND role = "patient" AND is_active = 1 LIMIT 1');
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) return null;

    try {
        $stmt = $pdo->prepare('INSERT INTO patients (user_id) VALUES (?)');
        $stmt->execute([$userId]);
        return (int) $pdo->lastInsertId();
    } catch (Throwable $e) {
        $existing = profile_id_for_user($userId, 'patient');
        if ($existing) return $existing;
        throw $e;
    }
}

/* ---- Patient creates a consultation request ---- */
function consult_create(): void
{
    consult_ensure_communication_columns();

    $auth = require_auth(['patient']);
    $data = read_json();
    require_fields($data, ['symptoms']);

    $patientId = consult_patient_profile_id((int)$auth['uid']);
    if (!$patientId) send_json(['error' => 'Patient profile missing'], 400);

    $triageScore = (int)($data['triage_score'] ?? 0);
    $triageRec   = $data['triage_recommendation'] ?? 'routine';
    $mode        = $data['communication_mode'] ?? 'chat';
    if (!in_array($mode, ['chat', 'video'], true)) {
        send_json(['error' => 'Invalid communication_mode'], 400);
    }

    $stmt = DB::conn()->prepare(
        'INSERT INTO consultations (patient_id, submitted_symptoms, triage_score, triage_recommendation, communication_mode, status)
         VALUES (?, ?, ?, ?, ?, "queued")'
    );
    $stmt->execute([$patientId, $data['symptoms'], $triageScore, $triageRec, $mode]);
    $cid = (int) DB::conn()->lastInsertId();

    audit_log((int)$auth['uid'], 'patient', 'consultation.requested', 'consultation', $cid,
              "Patient submitted symptoms (triage=$triageRec, score=$triageScore, mode=$mode)");

    // Notify all available doctors (broadcast queue)
    $docs = DB::conn()->query(
        "SELECT u.user_id FROM doctors d JOIN users u ON u.user_id = d.user_id WHERE d.is_available = 1 AND u.is_active = 1"
    )->fetchAll();
    foreach ($docs as $d) {
        notify((int)$d['user_id'], 'New consultation request',
               "A patient has requested a $mode consultation and is awaiting approval.", 'consultation', $cid);
    }

    send_json(['message' => 'Consultation requested', 'consultation_id' => $cid], 201);
}

/* ---- List consultations for the current user ---- */
function consult_list(): void
{
    consult_ensure_communication_columns();

    $auth = require_auth();
    $role = $auth['role'];
    $uid  = (int) $auth['uid'];
    $pdo  = DB::conn();

    if ($role === 'patient') {
        $pid = profile_id_for_user($uid, 'patient');
        $stmt = $pdo->prepare(
            'SELECT c.*, du.full_name AS doctor_name
             FROM consultations c
             LEFT JOIN doctors d ON d.doctor_id = c.doctor_id
             LEFT JOIN users du ON du.user_id = d.user_id
             WHERE c.patient_id = ?
             ORDER BY c.requested_at DESC'
        );
        $stmt->execute([$pid]);
    } elseif ($role === 'doctor') {
        $did = profile_id_for_user($uid, 'doctor');
        $stmt = $pdo->prepare(
            'SELECT c.*, pu.full_name AS patient_name
             FROM consultations c
             JOIN patients p ON p.patient_id = c.patient_id
             JOIN users pu ON pu.user_id = p.user_id
             WHERE c.doctor_id = ?
             ORDER BY c.requested_at DESC'
        );
        $stmt->execute([$did]);
    } else {
        send_json(['error' => 'Forbidden'], 403);
    }

    send_json(['consultations' => $stmt->fetchAll()]);
}

/* ---- Doctor's pending queue ---- */
function consult_queue(): void
{
    consult_ensure_communication_columns();

    require_auth(['doctor']);
    $stmt = DB::conn()->query(
        'SELECT c.*, pu.full_name AS patient_name
         FROM consultations c
         JOIN patients p ON p.patient_id = c.patient_id
         JOIN users pu ON pu.user_id = p.user_id
         WHERE c.status = "queued"
         ORDER BY c.requested_at ASC'
    );
    send_json(['queue' => $stmt->fetchAll()]);
}

/* ---- Show one consultation (with patient context) ---- */
function consult_show(string $id): void
{
    consult_ensure_communication_columns();

    $auth = require_auth();
    $cid  = (int) $id;
    $stmt = DB::conn()->prepare(
        'SELECT c.*,
                pu.full_name AS patient_name, pu.email AS patient_email, pu.user_id AS patient_user_id,
                p.date_of_birth, p.gender, p.medical_history_summary,
                du.full_name AS doctor_name, du.user_id AS doctor_user_id
         FROM consultations c
         JOIN patients p ON p.patient_id = c.patient_id
         JOIN users pu ON pu.user_id = p.user_id
         LEFT JOIN doctors d ON d.doctor_id = c.doctor_id
         LEFT JOIN users du ON du.user_id = d.user_id
         WHERE c.consultation_id = ?'
    );
    $stmt->execute([$cid]);
    $c = $stmt->fetch();
    if (!$c) send_json(['error' => 'Not found'], 404);

    // RBAC: only the patient or doctor on this consult may see it.
    $allowed = false;
    if ($auth['role'] === 'patient' && (int)$c['patient_user_id'] === (int)$auth['uid']) $allowed = true;
    if ($auth['role'] === 'doctor'  && (int)$c['doctor_user_id']  === (int)$auth['uid']) $allowed = true;
    if ($auth['role'] === 'doctor'  && $c['status'] === 'queued') $allowed = true;
    if (!$allowed) send_json(['error' => 'Forbidden'], 403);

    send_json(['consultation' => $c]);
}

/* ---- Doctor accepts a queued consultation (FR-D-02) ---- */
function consult_accept(string $id): void
{
    consult_ensure_communication_columns();

    $auth = require_auth(['doctor']);
    $cid  = (int) $id;
    $did  = profile_id_for_user((int)$auth['uid'], 'doctor');

    $pdo = DB::conn();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT * FROM consultations WHERE consultation_id = ? FOR UPDATE');
        $stmt->execute([$cid]);
        $c = $stmt->fetch();
        if (!$c) { $pdo->rollBack(); send_json(['error' => 'Not found'], 404); }
        if ($c['status'] !== 'queued') {
            $pdo->rollBack();
            send_json(['error' => 'Consultation already accepted'], 409);
        }

        $upd = $pdo->prepare(
            'UPDATE consultations SET doctor_id = ?, status = "in_progress", started_at = NOW()
             WHERE consultation_id = ?'
        );
        $upd->execute([$did, $cid]);
        $pdo->commit();

        audit_log((int)$auth['uid'], 'doctor', 'consultation.accepted', 'consultation', $cid, "Accepted by doctor #$did");

        // Notify patient
        $pat = $pdo->prepare(
            'SELECT u.user_id FROM patients p JOIN users u ON u.user_id = p.user_id WHERE p.patient_id = ?'
        );
        $pat->execute([$c['patient_id']]);
        $pu = $pat->fetch();
        if ($pu) {
            $mode = $c['communication_mode'] ?? 'chat';
            notify((int)$pu['user_id'], 'Doctor accepted your consultation',
                   "A doctor has approved your $mode consultation. Open it to begin.",
                   'consultation', $cid);
        }

        send_json(['message' => 'Consultation accepted', 'consultation_id' => $cid]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        send_json(['error' => 'Failed', 'detail' => $e->getMessage()], 500);
    }
}

/* ---- Close a consultation (after prescription/referral or cancellation) ---- */
function consult_close(string $id): void
{
    $auth = require_auth(['doctor']);
    $cid  = (int) $id;
    $data = read_json();
    $diagnosis = $data['diagnosis_notes'] ?? '';
    $finalStatus = $data['final_status'] ?? 'completed';
    if (!in_array($finalStatus, ['completed', 'prescribed', 'referred', 'cancelled'], true)) {
        send_json(['error' => 'Invalid final_status'], 400);
    }

    $stmt = DB::conn()->prepare(
        'UPDATE consultations SET status = ?, diagnosis_notes = ?, closed_at = NOW() WHERE consultation_id = ?'
    );
    $stmt->execute([$finalStatus, $diagnosis, $cid]);

    audit_log((int)$auth['uid'], 'doctor', 'consultation.closed', 'consultation', $cid, "Status=$finalStatus");
    send_json(['message' => 'Consultation closed', 'consultation_id' => $cid, 'status' => $finalStatus]);
}

/* ---- Chat history (REST fallback / audit) (FR-P-05, FR-D-04) ---- */
function consult_messages(string $id): void
{
    $auth = require_auth();
    $cid  = (int) $id;
    // Lightweight authz: ensure user belongs to this consultation
    $check = DB::conn()->prepare(
        'SELECT c.consultation_id, c.status, pu.user_id AS patient_user_id, du.user_id AS doctor_user_id
         FROM consultations c
         JOIN patients p ON p.patient_id = c.patient_id
         JOIN users pu ON pu.user_id = p.user_id
         LEFT JOIN doctors d ON d.doctor_id = c.doctor_id
         LEFT JOIN users du ON du.user_id = d.user_id
         WHERE c.consultation_id = ?'
    );
    $check->execute([$cid]);
    $row = $check->fetch();
    if (!$row) send_json(['error' => 'Not found'], 404);
    if ($row['status'] === 'queued') send_json(['error' => 'Consultation has not been approved yet'], 403);
    $uid = (int)$auth['uid'];
    if ((int)$row['patient_user_id'] !== $uid && (int)$row['doctor_user_id'] !== $uid) {
        send_json(['error' => 'Forbidden'], 403);
    }

    $stmt = DB::conn()->prepare(
        'SELECT * FROM chat_messages WHERE consultation_id = ? ORDER BY sent_at ASC'
    );
    $stmt->execute([$cid]);
    send_json(['messages' => $stmt->fetchAll()]);
}

/* ---- Send a chat message (REST fallback if Socket.IO unavailable) ---- */
function consult_send_message(string $id): void
{
    $auth = require_auth();
    $cid  = (int) $id;
    $data = read_json();
    require_fields($data, ['message']);

    if (!in_array($auth['role'], ['patient', 'doctor'], true)) {
        send_json(['error' => 'Only patient/doctor can chat'], 403);
    }

    $check = DB::conn()->prepare(
        'SELECT c.status, pu.user_id AS patient_user_id, du.user_id AS doctor_user_id
         FROM consultations c
         JOIN patients p ON p.patient_id = c.patient_id
         JOIN users pu ON pu.user_id = p.user_id
         LEFT JOIN doctors d ON d.doctor_id = c.doctor_id
         LEFT JOIN users du ON du.user_id = d.user_id
         WHERE c.consultation_id = ?'
    );
    $check->execute([$cid]);
    $row = $check->fetch();
    if (!$row) send_json(['error' => 'Not found'], 404);
    if (!in_array($row['status'], ['assigned', 'in_progress'], true)) {
        send_json(['error' => 'Consultation communication is not active'], 403);
    }
    $uid = (int)$auth['uid'];
    if ((int)$row['patient_user_id'] !== $uid && (int)$row['doctor_user_id'] !== $uid) {
        send_json(['error' => 'Forbidden'], 403);
    }

    $stmt = DB::conn()->prepare(
        'INSERT INTO chat_messages (consultation_id, sender_user_id, sender_role, message_text)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$cid, (int)$auth['uid'], $auth['role'], $data['message']]);
    send_json(['message' => 'sent', 'id' => (int) DB::conn()->lastInsertId()], 201);
}
