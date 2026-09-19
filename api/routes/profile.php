<?php
/**
 * Profile + password management.
 * Endpoints:
 *   PATCH /auth/profile      - update name, phone, role-specific fields
 *   POST  /auth/password     - change password (requires current_password)
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function profile_update(): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $role = $auth['role'];
    $data = read_json();

    if ($role === 'admin' && array_key_exists('email', $data)) {
        $email = trim((string)$data['email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            send_json(['error' => 'Invalid email format'], 400);
        }
        $check = DB::conn()->prepare('SELECT user_id FROM users WHERE email = ? AND user_id != ? LIMIT 1');
        $check->execute([$email, $uid]);
        if ($check->fetch()) {
            send_json(['error' => 'Email already registered'], 409);
        }
        $data['email'] = $email;
    }
    $pdo = DB::conn();
    $pdo->beginTransaction();
    try {
        // Update users (name + phone) when provided
        if (isset($data['full_name']) && trim($data['full_name']) !== '') {
            $pdo->prepare('UPDATE users SET full_name = ? WHERE user_id = ?')
                ->execute([trim($data['full_name']), $uid]);
        }
        if (array_key_exists('phone', $data)) {
            $pdo->prepare('UPDATE users SET phone = ? WHERE user_id = ?')
                ->execute([$data['phone'] ?: null, $uid]);
        }

        if ($role === 'admin' && array_key_exists('email', $data)) {
            $pdo->prepare('UPDATE users SET email = ? WHERE user_id = ?')
                ->execute([$data['email'], $uid]);
        }
        if ($role === 'patient') {
            $sets = [];
            $params = [];
            foreach (['date_of_birth','gender','address','medical_history_summary','emergency_contact'] as $f) {
                if (array_key_exists($f, $data)) {
                    $sets[] = "$f = ?";
                    $params[] = $data[$f] ?: null;
                }
            }
            if ($sets) {
                $params[] = $uid;
                $pdo->prepare('UPDATE patients SET ' . implode(', ', $sets) . ' WHERE user_id = ?')
                    ->execute($params);
            }
        } elseif ($role === 'doctor') {
            $sets = [];
            $params = [];
            foreach (['specialisation','affiliated_institution','is_available'] as $f) {
                if (array_key_exists($f, $data)) {
                    $sets[] = "$f = ?";
                    $params[] = $data[$f];
                }
            }
            if ($sets) {
                $params[] = $uid;
                $pdo->prepare('UPDATE doctors SET ' . implode(', ', $sets) . ' WHERE user_id = ?')
                    ->execute($params);
            }
        } elseif ($role === 'pharmacist') {
            $sets = [];
            $params = [];
            foreach (['pharmacy_name','pharmacy_address'] as $f) {
                if (array_key_exists($f, $data)) {
                    $sets[] = "$f = ?";
                    $params[] = $data[$f] ?: null;
                }
            }
            if ($sets) {
                $params[] = $uid;
                $pdo->prepare('UPDATE pharmacists SET ' . implode(', ', $sets) . ' WHERE user_id = ?')
                    ->execute($params);
            }
        }

        $pdo->commit();
        audit_log($uid, $role, 'profile.updated', 'user', $uid, '');
        send_json(['message' => 'Profile updated']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        send_json(['error' => 'Update failed', 'detail' => $e->getMessage()], 500);
    }
}

function profile_change_password(): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $data = read_json();
    require_fields($data, ['current_password', 'new_password']);

    if (strlen($data['new_password']) < 8) {
        send_json(['error' => 'New password must be at least 8 characters'], 400);
    }

    $stmt = DB::conn()->prepare('SELECT password_hash FROM users WHERE user_id = ?');
    $stmt->execute([$uid]);
    $u = $stmt->fetch();
    if (!$u || !password_verify($data['current_password'], $u['password_hash'])) {
        send_json(['error' => 'Current password is incorrect'], 401);
    }

    $hash = password_hash($data['new_password'], PASSWORD_BCRYPT);
    DB::conn()->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?')
        ->execute([$hash, $uid]);

    audit_log($uid, $auth['role'], 'password.changed', 'user', $uid, '');
    send_json(['message' => 'Password updated. Please log in again next time for security.']);
}
