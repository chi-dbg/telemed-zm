<?php
/**
 * Dashboard statistics endpoint - role-aware KPIs.
 * Used by the overview page on each role's dashboard.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function stats_overview(): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $role = $auth['role'];
    $pdo  = DB::conn();

    $payload = ['role' => $role, 'cards' => [], 'recent' => []];

    if ($role === 'patient') {
        $pid = profile_id_for_user($uid, 'patient');

        $stmt = $pdo->prepare('SELECT COUNT(*) c FROM consultations WHERE patient_id = ? AND status IN ("queued","assigned","in_progress")');
        $stmt->execute([$pid]); $active = (int)$stmt->fetch()['c'];

        $stmt = $pdo->prepare('SELECT COUNT(*) c FROM prescriptions WHERE patient_id = ?');
        $stmt->execute([$pid]); $rxTotal = (int)$stmt->fetch()['c'];

        $stmt = $pdo->prepare('SELECT COUNT(*) c FROM prescriptions WHERE patient_id = ? AND status = "pending"');
        $stmt->execute([$pid]); $rxPending = (int)$stmt->fetch()['c'];

        $stmt = $pdo->prepare('SELECT COUNT(*) c FROM referrals WHERE patient_id = ? AND status = "scheduled" AND appointment_date >= CURDATE()');
        $stmt->execute([$pid]); $upcoming = (int)$stmt->fetch()['c'];

        $payload['cards'] = [
            ['label' => 'Active consultations',       'value' => $active,    'icon' => '💬', 'tone' => 'primary'],
            ['label' => 'Total prescriptions',        'value' => $rxTotal,   'icon' => '💊', 'tone' => 'primary'],
            ['label' => 'Pending at pharmacy',        'value' => $rxPending, 'icon' => '⏳', 'tone' => 'warn'],
            ['label' => 'Upcoming referrals',         'value' => $upcoming,  'icon' => '🏥', 'tone' => 'primary'],
        ];

        // Recent activity feed (mixed)
        $stmt = $pdo->prepare(
            '(SELECT "consultation" AS t, c.consultation_id AS id, c.requested_at AS at,
                     c.status, c.submitted_symptoms AS detail, du.full_name AS who
              FROM consultations c
              LEFT JOIN doctors d ON d.doctor_id = c.doctor_id
              LEFT JOIN users du  ON du.user_id  = d.user_id
              WHERE c.patient_id = ?)
             UNION ALL
             (SELECT "prescription", rx.prescription_id, rx.issued_at, rx.status,
                     CONCAT(rx.medication_name, " - ", rx.dosage), du.full_name
              FROM prescriptions rx
              JOIN doctors d ON d.doctor_id = rx.doctor_id
              JOIN users du  ON du.user_id  = d.user_id
              WHERE rx.patient_id = ?)
             UNION ALL
             (SELECT "referral", r.referral_id, r.created_at, r.status,
                     CONCAT(r.clinic_name, " on ", r.appointment_date), du.full_name
              FROM referrals r
              JOIN doctors d ON d.doctor_id = r.doctor_id
              JOIN users du  ON du.user_id  = d.user_id
              WHERE r.patient_id = ?)
             ORDER BY at DESC
             LIMIT 10'
        );
        $stmt->execute([$pid, $pid, $pid]);
        $payload['recent'] = $stmt->fetchAll();

    } elseif ($role === 'doctor') {
        $did = profile_id_for_user($uid, 'doctor');

        $stmt = $pdo->query('SELECT COUNT(*) c FROM consultations WHERE status = "queued"');
        $queued = (int)$stmt->fetch()['c'];

        $stmt = $pdo->prepare('SELECT COUNT(*) c FROM consultations WHERE doctor_id = ? AND status IN ("assigned","in_progress")');
        $stmt->execute([$did]); $active = (int)$stmt->fetch()['c'];

        $stmt = $pdo->prepare('SELECT COUNT(*) c FROM prescriptions WHERE doctor_id = ?');
        $stmt->execute([$did]); $rxTotal = (int)$stmt->fetch()['c'];

        $stmt = $pdo->prepare('SELECT COUNT(*) c FROM referrals WHERE doctor_id = ?');
        $stmt->execute([$did]); $refTotal = (int)$stmt->fetch()['c'];

        $stmt = $pdo->prepare('SELECT COUNT(DISTINCT patient_id) c FROM consultations WHERE doctor_id = ?');
        $stmt->execute([$did]); $patients = (int)$stmt->fetch()['c'];

        $payload['cards'] = [
            ['label' => 'In queue (system-wide)',     'value' => $queued,   'icon' => '⏳', 'tone' => 'warn'],
            ['label' => 'My active consultations',    'value' => $active,   'icon' => '💬', 'tone' => 'primary'],
            ['label' => 'Prescriptions issued',       'value' => $rxTotal,  'icon' => '💊', 'tone' => 'success'],
            ['label' => 'Patients seen',              'value' => $patients, 'icon' => '👥', 'tone' => 'primary'],
        ];

        $stmt = $pdo->prepare(
            'SELECT c.consultation_id AS id, c.requested_at AS at, c.status, c.triage_recommendation AS triage,
                    pu.full_name AS who, c.submitted_symptoms AS detail
             FROM consultations c
             JOIN patients p ON p.patient_id = c.patient_id
             JOIN users pu ON pu.user_id = p.user_id
             WHERE c.doctor_id = ? OR c.status = "queued"
             ORDER BY c.requested_at DESC LIMIT 10'
        );
        $stmt->execute([$did]);
        $payload['recent'] = $stmt->fetchAll();

    } elseif ($role === 'pharmacist') {
        $phid = profile_id_for_user($uid, 'pharmacist');

        $stmt = $pdo->prepare('SELECT COUNT(*) c FROM prescriptions WHERE pharmacist_id = ? AND status = "pending"');
        $stmt->execute([$phid]); $pending = (int)$stmt->fetch()['c'];

        $stmt = $pdo->prepare('SELECT COUNT(*) c FROM prescriptions WHERE pharmacist_id = ? AND status = "dispensed"');
        $stmt->execute([$phid]); $dispensed = (int)$stmt->fetch()['c'];

        $stmt = $pdo->prepare('SELECT COUNT(*) c FROM prescriptions WHERE pharmacist_id = ? AND status = "unavailable"');
        $stmt->execute([$phid]); $unavail = (int)$stmt->fetch()['c'];

        $stmt = $pdo->prepare('SELECT COUNT(DISTINCT patient_id) c FROM prescriptions WHERE pharmacist_id = ?');
        $stmt->execute([$phid]); $patients = (int)$stmt->fetch()['c'];

        $payload['cards'] = [
            ['label' => 'Pending dispensing',         'value' => $pending,   'icon' => '⏳', 'tone' => 'warn'],
            ['label' => 'Dispensed total',            'value' => $dispensed, 'icon' => '✅', 'tone' => 'success'],
            ['label' => 'Marked unavailable',         'value' => $unavail,   'icon' => '⚠', 'tone' => 'danger'],
            ['label' => 'Unique patients served',     'value' => $patients,  'icon' => '👥', 'tone' => 'primary'],
        ];

        $stmt = $pdo->prepare(
            'SELECT rx.prescription_id AS id, rx.issued_at AS at, rx.status,
                    pu.full_name AS who, CONCAT(rx.medication_name, " - ", rx.dosage) AS detail
             FROM prescriptions rx
             JOIN patients p  ON p.patient_id = rx.patient_id
             JOIN users    pu ON pu.user_id   = p.user_id
             WHERE rx.pharmacist_id = ?
             ORDER BY rx.issued_at DESC LIMIT 10'
        );
        $stmt->execute([$phid]);
        $payload['recent'] = $stmt->fetchAll();
    }

    send_json($payload);
}
