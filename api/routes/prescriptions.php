<?php
/**
 * Prescription routes
 * Implements: FR-D-05, FR-D-06, FR-PH-02, FR-PH-03, FR-PH-04, FR-S-03, FR-S-04, UC-02.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

/* ---- Doctor creates and transmits a prescription ---- */
function rx_create(): void
{
    $auth = require_auth(['doctor']);
    $data = read_json();
    require_fields($data, [
        'consultation_id', 'pharmacist_id',
        'medication_name', 'dosage', 'frequency', 'duration'
    ]);

    $pdo = DB::conn();
    $did = profile_id_for_user((int)$auth['uid'], 'doctor');

    // Validate consultation belongs to this doctor
    $stmt = $pdo->prepare(
        'SELECT * FROM consultations WHERE consultation_id = ? AND doctor_id = ?'
    );
    $stmt->execute([(int)$data['consultation_id'], $did]);
    $c = $stmt->fetch();
    if (!$c) send_json(['error' => 'Consultation not found or not yours'], 404);

    $pdo->beginTransaction();
    try {
        // Insert prescription with placeholder UID, then update with the real UID
        $ins = $pdo->prepare(
            'INSERT INTO prescriptions
             (prescription_uid, consultation_id, patient_id, doctor_id, pharmacist_id,
              medication_name, dosage, frequency, duration, instructions, status)
             VALUES ("PENDING", ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending")'
        );
        $ins->execute([
            $c['consultation_id'],
            $c['patient_id'],
            $did,
            (int)$data['pharmacist_id'],
            $data['medication_name'],
            $data['dosage'],
            $data['frequency'],
            $data['duration'],
            $data['instructions'] ?? null,
        ]);
        $pid = (int) $pdo->lastInsertId();
        $uid = generate_prescription_uid($pid);
        $pdo->prepare('UPDATE prescriptions SET prescription_uid = ? WHERE prescription_id = ?')
            ->execute([$uid, $pid]);

        // Mark consultation as prescribed (closes the loop)
        $pdo->prepare('UPDATE consultations SET status = "prescribed", closed_at = NOW() WHERE consultation_id = ?')
            ->execute([$c['consultation_id']]);

        $pdo->commit();

        audit_log((int)$auth['uid'], 'doctor', 'prescription.created', 'prescription', $pid,
                  "$uid for medication {$data['medication_name']}");
        audit_log((int)$auth['uid'], 'doctor', 'prescription.transmitted', 'prescription', $pid,
                  "Transmitted to pharmacist #{$data['pharmacist_id']}");

        // Notifications
        $pat = $pdo->prepare(
            'SELECT u.user_id FROM patients p JOIN users u ON u.user_id = p.user_id WHERE p.patient_id = ?'
        );
        $pat->execute([$c['patient_id']]);
        $pu = $pat->fetch();
        if ($pu) {
            notify((int)$pu['user_id'], 'Prescription issued',
                   "Your prescription $uid has been sent to the pharmacy.", 'prescription', $pid);
        }

        $phs = $pdo->prepare(
            'SELECT u.user_id FROM pharmacists ph JOIN users u ON u.user_id = ph.user_id WHERE ph.pharmacist_id = ?'
        );
        $phs->execute([(int)$data['pharmacist_id']]);
        $phu = $phs->fetch();
        if ($phu) {
            notify((int)$phu['user_id'], 'New prescription received',
                   "Prescription $uid has been transmitted to your pharmacy.", 'prescription', $pid);
        }

        send_json([
            'message'         => 'Prescription created and transmitted',
            'prescription_id' => $pid,
            'prescription_uid'=> $uid,
        ], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        send_json(['error' => 'Prescription creation failed', 'detail' => $e->getMessage()], 500);
    }
}

/* ---- List prescriptions for the current user, filtered by their role ---- */
function rx_list(): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $role = $auth['role'];
    $pdo  = DB::conn();

    if ($role === 'patient') {
        $pid = profile_id_for_user($uid, 'patient');
        $stmt = $pdo->prepare(prescription_select_sql() . ' WHERE rx.patient_id = ? ORDER BY rx.issued_at DESC');
        $stmt->execute([$pid]);
    } elseif ($role === 'doctor') {
        $did = profile_id_for_user($uid, 'doctor');
        $stmt = $pdo->prepare(prescription_select_sql() . ' WHERE rx.doctor_id = ? ORDER BY rx.issued_at DESC');
        $stmt->execute([$did]);
    } elseif ($role === 'pharmacist') {
        $phid = profile_id_for_user($uid, 'pharmacist');
        $stmt = $pdo->prepare(prescription_select_sql() . ' WHERE rx.pharmacist_id = ? ORDER BY rx.issued_at DESC');
        $stmt->execute([$phid]);
    } else {
        send_json(['error' => 'Forbidden'], 403);
    }

    send_json(['prescriptions' => $stmt->fetchAll()]);
}

/* ---- Show one prescription ---- */
function rx_show(string $id): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $stmt = DB::conn()->prepare(prescription_select_sql() . ' WHERE rx.prescription_id = ?');
    $stmt->execute([(int) $id]);
    $rx = $stmt->fetch();
    if (!$rx) send_json(['error' => 'Not found'], 404);

    // RBAC check
    $allowed = false;
    if ($auth['role'] === 'patient'    && (int)$rx['patient_user_id']    === $uid) $allowed = true;
    if ($auth['role'] === 'doctor'     && (int)$rx['doctor_user_id']     === $uid) $allowed = true;
    if ($auth['role'] === 'pharmacist' && (int)$rx['pharmacist_user_id'] === $uid) $allowed = true;
    if (!$allowed) send_json(['error' => 'Forbidden'], 403);

    send_json(['prescription' => $rx]);
}

/* ---- Pharmacist updates dispensing status (FR-PH-04) ---- */
function rx_update_status(string $id): void
{
    $auth = require_auth(['pharmacist']);
    $data = read_json();
    require_fields($data, ['status']);
    if (!in_array($data['status'], ['dispensed', 'pending', 'unavailable', 'cancelled'], true)) {
        send_json(['error' => 'Invalid status'], 400);
    }

    $pid = (int) $id;
    $phid = profile_id_for_user((int)$auth['uid'], 'pharmacist');

    $pdo = DB::conn();
    $stmt = $pdo->prepare('SELECT * FROM prescriptions WHERE prescription_id = ? AND pharmacist_id = ?');
    $stmt->execute([$pid, $phid]);
    $rx = $stmt->fetch();
    if (!$rx) send_json(['error' => 'Prescription not found at your pharmacy'], 404);

    $sets = 'status = ?';
    $params = [$data['status']];
    if ($data['status'] === 'dispensed') {
        $sets .= ', dispensed_at = NOW()';
    }
    $params[] = $pid;
    $pdo->prepare("UPDATE prescriptions SET $sets WHERE prescription_id = ?")->execute($params);

    audit_log((int)$auth['uid'], 'pharmacist', 'prescription.status_changed', 'prescription', $pid,
              "Status set to {$data['status']}");

    // Notify patient (FR-PH-05)
    $pat = $pdo->prepare(
        'SELECT u.user_id FROM patients p JOIN users u ON u.user_id = p.user_id WHERE p.patient_id = ?'
    );
    $pat->execute([$rx['patient_id']]);
    $pu = $pat->fetch();
    if ($pu) {
        notify((int)$pu['user_id'], 'Prescription status updated',
               "Your prescription {$rx['prescription_uid']} is now: {$data['status']}.",
               'prescription', $pid);
    }

    send_json(['message' => 'Status updated', 'prescription_id' => $pid, 'status' => $data['status']]);
}

/* ---- Internal: shared SELECT joining everything pretty ---- */
function prescription_select_sql(): string
{
    return '
        SELECT rx.*,
               pu.full_name AS patient_name,  pu.user_id AS patient_user_id,
               du.full_name AS doctor_name,   du.user_id AS doctor_user_id,
               phu.full_name AS pharmacist_name, phu.user_id AS pharmacist_user_id,
               ph.pharmacy_name, ph.pharmacy_address
        FROM prescriptions rx
        JOIN patients    p  ON p.patient_id = rx.patient_id
        JOIN users       pu ON pu.user_id   = p.user_id
        JOIN doctors     d  ON d.doctor_id  = rx.doctor_id
        JOIN users       du ON du.user_id   = d.user_id
        JOIN pharmacists ph ON ph.pharmacist_id = rx.pharmacist_id
        JOIN users       phu ON phu.user_id  = ph.user_id
    ';
}
