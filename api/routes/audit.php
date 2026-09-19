<?php
/**
 * Audit log viewer. Admins see every platform action; doctors see their own
 * actions; patients see actions relating to their own data.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function audit_list(): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $role = $auth['role'];
    $pdo  = DB::conn();

    $limit = max(1, min(200, (int)($_GET['limit'] ?? 50)));

    if ($role === 'admin') {
        $stmt = $pdo->query(
            'SELECT a.*, u.full_name AS actor_name
             FROM audit_log a
             LEFT JOIN users u ON u.user_id = a.actor_user_id
             ORDER BY a.created_at DESC LIMIT ' . $limit
        );
    } elseif ($role === 'doctor') {
        // Doctors see audit entries they performed
        $stmt = $pdo->prepare(
            'SELECT a.*, u.full_name AS actor_name
             FROM audit_log a
             LEFT JOIN users u ON u.user_id = a.actor_user_id
             WHERE a.actor_user_id = ?
             ORDER BY a.created_at DESC LIMIT ' . $limit
        );
        $stmt->execute([$uid]);
    } elseif ($role === 'patient') {
        // Patients see actions where the entity belongs to them.
        $pid = profile_id_for_user($uid, 'patient');
        $stmt = $pdo->prepare(
            'SELECT a.*, u.full_name AS actor_name
             FROM audit_log a
             LEFT JOIN users u ON u.user_id = a.actor_user_id
             WHERE
                (a.entity_type = "consultation" AND a.entity_id IN (SELECT consultation_id FROM consultations WHERE patient_id = ?))
                OR (a.entity_type = "prescription" AND a.entity_id IN (SELECT prescription_id FROM prescriptions WHERE patient_id = ?))
                OR (a.entity_type = "referral"     AND a.entity_id IN (SELECT referral_id    FROM referrals    WHERE patient_id = ?))
                OR (a.entity_type = "user"         AND a.entity_id = ?)
             ORDER BY a.created_at DESC LIMIT ' . $limit
        );
        $stmt->execute([$pid, $pid, $pid, $uid]);
    } elseif ($role === 'pharmacist') {
        $phid = profile_id_for_user($uid, 'pharmacist');
        $stmt = $pdo->prepare(
            'SELECT a.*, u.full_name AS actor_name
             FROM audit_log a
             LEFT JOIN users u ON u.user_id = a.actor_user_id
             WHERE
                a.actor_user_id = ?
                OR (a.entity_type = "prescription" AND a.entity_id IN (SELECT prescription_id FROM prescriptions WHERE pharmacist_id = ?))
             ORDER BY a.created_at DESC LIMIT ' . $limit
        );
        $stmt->execute([$uid, $phid]);
    } else {
        send_json(['error' => 'Forbidden'], 403);
    }

    send_json(['entries' => $stmt->fetchAll()]);
}