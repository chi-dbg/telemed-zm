<?php
/**
 * Authentication routes
 * Implements: FR-P-01, FR-P-02, FR-D-01, FR-PH-01, FR-S-01 (RBAC).
 * NFR-Security: bcrypt hashing, JWT (HS256) in HTTP-only cookie, 30-min idle expiry.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function auth_register(): void
{
    $data = read_json();
    require_fields($data, ['full_name', 'email', 'password', 'role']);

    $role = $data['role'];
    if (!in_array($role, ['patient', 'doctor', 'pharmacist'], true)) {
        send_json(['error' => 'Invalid role'], 400);
    }

    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        send_json(['error' => 'Invalid email format'], 400);
    }
    if (strlen($data['password']) < 8) {
        send_json(['error' => 'Password must be at least 8 characters'], 400);
    }

    if ($role === 'doctor') {
        require_fields($data, ['license_number']);
    } elseif ($role === 'pharmacist') {
        require_fields($data, ['pharmacy_name', 'pharmacy_registration_number', 'pharmacy_address']);
    }

    $pdo = DB::conn();

    // Email uniqueness
    $stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ?');
    $stmt->execute([$data['email']]);
    if ($stmt->fetch()) {
        send_json(['error' => 'Email already registered'], 409);
    }

    try {
        $pdo->beginTransaction();

        $hash = password_hash($data['password'], PASSWORD_BCRYPT);
        $stmt = $pdo->prepare(
            "INSERT INTO users (full_name, email, password_hash, role, phone, is_active, account_status) VALUES (?, ?, ?, ?, ?, 0, 'pending')"
        );
        $stmt->execute([
            $data['full_name'],
            $data['email'],
            $hash,
            $role,
            $data['phone'] ?? null,
        ]);
        $userId = db_last_insert_id($pdo);

        // Role-specific profile row
        if ($role === 'patient') {
            $stmt = $pdo->prepare(
                'INSERT INTO patients (user_id, date_of_birth, gender, address, emergency_contact)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $userId,
                $data['date_of_birth'] ?? null,
                $data['gender']        ?? null,
                $data['address']       ?? null,
                $data['emergency_contact'] ?? null,
            ]);
        } elseif ($role === 'doctor') {
            $stmt = $pdo->prepare(
                'INSERT INTO doctors (user_id, license_number, specialisation, affiliated_institution)
                 VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([
                $userId,
                $data['license_number'],
                $data['specialisation']        ?? 'General Practice',
                $data['affiliated_institution']?? null,
            ]);
        } else { // pharmacist
            $stmt = $pdo->prepare(
                'INSERT INTO pharmacists (user_id, pharmacy_name, pharmacy_registration_number, pharmacy_address)
                 VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([
                $userId,
                $data['pharmacy_name'],
                $data['pharmacy_registration_number'],
                $data['pharmacy_address'],
            ]);
        }

        $pdo->commit();
        audit_log($userId, $role, 'user.registration_submitted', 'user', $userId, "New $role registration awaiting administrator approval");

        $stmt = $pdo->query("SELECT user_id FROM users WHERE role = 'admin' AND is_active = 1 AND account_status = 'approved'");
        foreach ($stmt->fetchAll() as $admin) {
            notify((int)$admin['user_id'], 'New account awaiting approval', $data['full_name'] . " registered as $role.", 'system', $userId);
        }

        send_json([
            'message' => 'Registration submitted for administrator approval',
            'user'    => [
                'id' => $userId,
                'email' => $data['email'],
                'role' => $role,
                'full_name' => $data['full_name'],
                'account_status' => 'pending',
            ],
        ], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        send_json(['error' => 'Registration failed', 'detail' => $e->getMessage()], 500);
    }
}

function auth_login(): void
{
    $data = read_json();
    require_fields($data, ['email', 'password']);

    $stmt = DB::conn()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($data['password'], $user['password_hash'])) {
        // Constant-ish error to avoid email enumeration
        send_json(['error' => 'Invalid email or password'], 401);
    }

    $status = $user['account_status'] ?? ((int)$user['is_active'] === 1 ? 'approved' : 'blocked');
    if ((int)$user['is_active'] !== 1 || $status !== 'approved') {
        $messages = [
            'pending' => 'Your account is awaiting administrator approval',
            'rejected' => 'Your account registration was rejected by an administrator',
            'blocked' => 'Your account has been blocked by an administrator',
        ];
        send_json(['error' => $messages[$status] ?? 'Your account is not active'], 403);
    }

    // Update last_login
    DB::conn()->prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?')
        ->execute([$user['user_id']]);

    audit_log((int)$user['user_id'], $user['role'], 'user.login', 'user', (int)$user['user_id'], 'Login success');

    $token = jwt_sign([
        'uid'   => (int) $user['user_id'],
        'role'  => $user['role'],
        'email' => $user['email'],
    ]);
    set_session_cookie($token);

    send_json([
        'message' => 'Login successful',
        'user' => [
            'id'        => (int) $user['user_id'],
            'email'     => $user['email'],
            'role'      => $user['role'],
            'full_name' => $user['full_name'],
            'account_status' => $status,
        ],
        'token' => $token, // also returned for non-cookie clients
    ]);
}

function auth_logout(): void
{
    // Clear cookie
    $config = require __DIR__ . '/../config.php';
    setcookie('telemed_token', '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $config['app']['env'] === 'production',
        'samesite' => $config['app']['env'] === 'production' ? 'None' : 'Lax',
    ]);
    send_json(['message' => 'Logged out']);
}

function auth_me(): void
{
    $payload = require_auth();
    $stmt = DB::conn()->prepare(
        'SELECT user_id, full_name, email, role, phone, is_active, account_status, created_at, last_login, status_changed_at
         FROM users WHERE user_id = ?'
    );
    $stmt->execute([$payload['uid']]);
    $u = $stmt->fetch();
    if (!$u) send_json(['error' => 'User not found'], 404);

    // Load role-specific profile
    $profile = null;
    if ($u['role'] === 'patient') {
        $stmt = DB::conn()->prepare('SELECT * FROM patients WHERE user_id = ?');
        $stmt->execute([$u['user_id']]);
        $profile = $stmt->fetch();
    } elseif ($u['role'] === 'doctor') {
        $stmt = DB::conn()->prepare('SELECT * FROM doctors WHERE user_id = ?');
        $stmt->execute([$u['user_id']]);
        $profile = $stmt->fetch();
    } elseif ($u['role'] === 'pharmacist') {
        $stmt = DB::conn()->prepare('SELECT * FROM pharmacists WHERE user_id = ?');
        $stmt->execute([$u['user_id']]);
        $profile = $stmt->fetch();
    }

    send_json(['user' => $u, 'profile' => $profile]);
}

function set_session_cookie(string $token): void
{
    $config = require __DIR__ . '/../config.php';
    setcookie('telemed_token', $token, [
        'expires'  => time() + $config['jwt']['ttl_seconds'],
        'path'     => '/',
        'httponly' => true,
        'secure'   => $config['app']['env'] === 'production',
        'samesite' => $config['app']['env'] === 'production' ? 'None' : 'Lax',
    ]);
}