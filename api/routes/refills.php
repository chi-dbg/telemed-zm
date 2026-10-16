<?php
/**
 * Prescription refill requests.
 * Patients can request a refill of an existing prescription.
 * Doctors review and approve / deny.
 * Pharmacists see approved refills appear as pending prescriptions.
 *
 * Reduces unnecessary consultations for routine renewals (RO-1).
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function refill_list(): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $pdo  = DB::conn();

    $base = '
        SELECT rr.*, rx.prescription_uid, rx.medication_name, rx.dosage,
               pu.full_name AS patient_name,
               du.full_name AS doctor_name
        FROM refill_requests rr
        JOIN prescriptions rx ON rx.prescription_id = rr.prescription_id
        JOIN patients p   ON p.patient_id = rr.patient_id
        JOIN users    pu  ON pu.user_id   = p.user_id
        LEFT JOIN doctors d ON d.doctor_id = rr.reviewed_by_doctor_id
        LEFT JOIN users du ON du.user_id = d.user_id
    ';

    if ($auth['role'] === 'patient') {
        $pid = profile_id_for_user($uid, 'patient');
        $stmt = $pdo->prepare("$base WHERE rr.patient_id = ? ORDER BY rr.requested_at DESC");
        $stmt->execute([$pid]);
    } elseif ($auth['role'] === 'doctor') {
        $did = profile_id_for_user($uid, 'doctor');
        $stmt = $pdo->prepare("$base WHERE rx.doctor_id = ? OR rr.reviewed_by_doctor_id = ? ORDER BY rr.requested_at DESC");
        $stmt->execute([$did, $did]);
    } elseif ($auth['role'] === 'pharmacist') {
        $phid = profile_id_for_user($uid, 'pharmacist');
        $stmt = $pdo->prepare("$base WHERE rx.pharmacist_id = ? ORDER BY rr.requested_at DESC");
        $stmt->execute([$phid]);
    } else {
        send_json(['error' => 'Forbidden'], 403);
    }

    send_json(['refills' => $stmt->fetchAll()]);
}

function refill_create(): void
{
    $auth = require_auth(['patient']);
    $data = read_json();
    require_fields($data, ['prescription_id']);
    $pid  = profile_id_for_user((int)$auth['uid'], 'patient');

    // Verify the prescription belongs to this patient
    $stmt = DB::conn()->prepare(
        'SELECT prescription_id, doctor_id FROM prescriptions WHERE prescription_id = ? AND patient_id = ?'
    );
    $stmt->execute([(int)$data['prescription_id'], $pid]);
    $rx = $stmt->fetch();
    if (!$rx) send_json(['error' => 'Prescription not found in your records'], 404);

    $ins = DB::conn()->prepare(
        'INSERT INTO refill_requests (prescription_id, patient_id, note) VALUES (?, ?, ?)'
    );
    $ins->execute([
        $rx['prescription_id'],
        $pid,
        $data['note'] ?? null,
    ]);
    $rid = db_last_insert_id(DB::conn());
    audit_log((int)$auth['uid'], 'patient', 'refill.requested', 'refill', $rid, "For RX #{$rx['prescription_id']}");

    // Notify the prescribing doctor
    $doc = DB::conn()->prepare(
        'SELECT u.user_id FROM doctors d JOIN users u ON u.user_id = d.user_id WHERE d.doctor_id = ?'
    );
    $doc->execute([$rx['doctor_id']]);
    $du = $doc->fetch();
    if ($du) {
        notify((int)$du['user_id'], 'Refill requested',
               "A patient has requested a refill for one of their prescriptions.",
               'prescription', $rx['prescription_id']);
    }

    send_json(['message' => 'Refill requested', 'request_id' => $rid], 201);
}

function refill_decision(string $id): void
{
    $auth = require_auth(['doctor']);
    $rid  = (int) $id;
    $data = read_json();
    require_fields($data, ['decision']);
    if (!in_array($data['decision'], ['approve', 'deny'], true)) {
        send_json(['error' => 'decision must be approve or deny'], 400);
    }
    $did = profile_id_for_user((int)$auth['uid'], 'doctor');

    $pdo = DB::conn();
    $stmt = $pdo->prepare(
        'SELECT rr.*, rx.doctor_id, rx.patient_id AS rx_patient_id
         FROM refill_requests rr
         JOIN prescriptions rx ON rx.prescription_id = rr.prescription_id
         WHERE rr.request_id = ? AND rx.doctor_id = ?'
    );
    $stmt->execute([$rid, $did]);
    $rr = $stmt->fetch();
    if (!$rr) send_json(['error' => 'Request not found or not yours to review'], 404);

    $newStatus = $data['decision'] === 'approve' ? 'approved' : 'denied';
    $pdo->prepare(
        "UPDATE refill_requests
         SET status = ?, reviewed_by_doctor_id = ?, reviewed_at = NOW(), note = COALESCE(note, '')
         WHERE request_id = ?"
    )->execute([$newStatus, $did, $rid]);

    audit_log((int)$auth['uid'], 'doctor', 'refill.' . $newStatus, 'refill', $rid, '');

    // Notify patient
    $pat = $pdo->prepare(
        'SELECT u.user_id FROM patients p JOIN users u ON u.user_id = p.user_id WHERE p.patient_id = ?'
    );
    $pat->execute([$rr['patient_id']]);
    $pu = $pat->fetch();
    if ($pu) {
        notify((int)$pu['user_id'], 'Refill ' . $newStatus,
               "Your refill request has been $newStatus by the doctor.",
               'prescription', (int)$rr['prescription_id']);
    }

    // If approved, the existing prescription gets its status reset to 'pending' so the pharmacy sees it again.
    if ($newStatus === 'approved') {
        $pdo->prepare("UPDATE prescriptions SET status = 'pending', dispensed_at = NULL WHERE prescription_id = ?")
            ->execute([(int)$rr['prescription_id']]);
    }

    send_json(['message' => "Refill $newStatus", 'request_id' => $rid]);
}
