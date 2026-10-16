<?php
/**
 * Referral routes
 * Implements: FR-D-07, FR-S-06, FR-P-08, UC-03 (Doctor refers patient for in-person tests).
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function ref_create(): void
{
    $auth = require_auth(['doctor']);
    $data = read_json();
    require_fields($data, [
        'consultation_id', 'clinic_name', 'clinic_address',
        'appointment_date', 'appointment_time', 'referral_reason'
    ]);

    $pdo = DB::conn();
    $did = profile_id_for_user((int)$auth['uid'], 'doctor');

    $stmt = $pdo->prepare('SELECT * FROM consultations WHERE consultation_id = ? AND doctor_id = ?');
    $stmt->execute([(int)$data['consultation_id'], $did]);
    $c = $stmt->fetch();
    if (!$c) send_json(['error' => 'Consultation not found or not yours'], 404);

    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare(
            "INSERT INTO referrals
             (consultation_id, patient_id, doctor_id, clinic_name, clinic_address, clinic_contact,
              appointment_date, appointment_time, referral_reason, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')"
        );
        $ins->execute([
            $c['consultation_id'],
            $c['patient_id'],
            $did,
            $data['clinic_name'],
            $data['clinic_address'],
            $data['clinic_contact'] ?? null,
            $data['appointment_date'],
            $data['appointment_time'],
            $data['referral_reason'],
        ]);
        $rid = db_last_insert_id($pdo);

        $pdo->prepare("UPDATE consultations SET status = 'referred', closed_at = NOW() WHERE consultation_id = ?")
            ->execute([$c['consultation_id']]);

        $pdo->commit();
        audit_log((int)$auth['uid'], 'doctor', 'referral.created', 'referral', $rid,
                  "Patient #{$c['patient_id']} referred to {$data['clinic_name']} on {$data['appointment_date']} {$data['appointment_time']}");

        // Notify patient (FR-P-08)
        $pat = $pdo->prepare(
            'SELECT u.user_id FROM patients p JOIN users u ON u.user_id = p.user_id WHERE p.patient_id = ?'
        );
        $pat->execute([$c['patient_id']]);
        $pu = $pat->fetch();
        if ($pu) {
            notify((int)$pu['user_id'], 'Referral scheduled',
                   "You have been referred to {$data['clinic_name']} on {$data['appointment_date']} at {$data['appointment_time']}.",
                   'referral', $rid);
        }

        send_json(['message' => 'Referral created', 'referral_id' => $rid], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        send_json(['error' => 'Referral creation failed', 'detail' => $e->getMessage()], 500);
    }
}

function ref_list(): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $pdo  = DB::conn();

    $base = '
        SELECT r.*,
               pu.full_name AS patient_name,
               du.full_name AS doctor_name
        FROM referrals r
        JOIN patients p  ON p.patient_id = r.patient_id
        JOIN users pu    ON pu.user_id   = p.user_id
        JOIN doctors d   ON d.doctor_id  = r.doctor_id
        JOIN users du    ON du.user_id   = d.user_id
    ';

    if ($auth['role'] === 'patient') {
        $pid = profile_id_for_user($uid, 'patient');
        $stmt = $pdo->prepare("$base WHERE r.patient_id = ? ORDER BY r.appointment_date ASC");
        $stmt->execute([$pid]);
    } elseif ($auth['role'] === 'doctor') {
        $did = profile_id_for_user($uid, 'doctor');
        $stmt = $pdo->prepare("$base WHERE r.doctor_id = ? ORDER BY r.appointment_date ASC");
        $stmt->execute([$did]);
    } else {
        send_json(['error' => 'Forbidden'], 403);
    }
    send_json(['referrals' => $stmt->fetchAll()]);
}
