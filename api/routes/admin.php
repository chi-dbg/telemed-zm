<?php
/**
 * Administrator routes: platform-wide usage, approvals, and user controls.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function admin_count(PDO $pdo, string $sql, array $params = []): int
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row ? (int) array_values($row)[0] : 0;
}

function admin_user_select_sql(): string
{
    return "SELECT
                u.user_id AS id,
                u.full_name,
                u.email,
                u.role,
                u.phone,
                u.is_active,
                u.account_status,
                u.created_at,
                u.last_login,
                u.status_changed_at,
                reviewer.full_name AS status_changed_by_name,
                CASE
                    WHEN u.role = 'doctor' THEN d.affiliated_institution
                    WHEN u.role = 'pharmacist' THEN ph.pharmacy_name
                    WHEN u.role = 'patient' THEN p.address
                    ELSE 'Telemed ZM'
                END AS organization,
                CASE
                    WHEN u.role = 'doctor' THEN d.license_number
                    WHEN u.role = 'pharmacist' THEN ph.pharmacy_registration_number
                    ELSE NULL
                END AS credential,
                d.specialisation,
                d.is_available,
                ph.pharmacy_address
            FROM users u
            LEFT JOIN patients p ON p.user_id = u.user_id
            LEFT JOIN doctors d ON d.user_id = u.user_id
            LEFT JOIN pharmacists ph ON ph.user_id = u.user_id
            LEFT JOIN users reviewer ON reviewer.user_id = u.status_changed_by";
}

function admin_fetch_users(PDO $pdo, array $conditions = [], array $params = [], int $limit = 300): array
{
    $sql = admin_user_select_sql();
    if ($conditions) {
        $sql .= ' WHERE ' . implode(' AND ', $conditions);
    }
    $sql .= " ORDER BY CASE u.account_status
              WHEN 'pending' THEN 1 WHEN 'approved' THEN 2
              WHEN 'blocked' THEN 3 WHEN 'rejected' THEN 4 ELSE 5 END,
              u.created_at DESC LIMIT " . max(1, min(500, $limit));

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function admin_overview(): void
{
    require_auth(['admin']);
    $pdo = DB::conn();

    $hospitalCount = admin_count(
        $pdo,
        "SELECT COUNT(DISTINCT NULLIF(TRIM(COALESCE(d.affiliated_institution, '')), ''))
         FROM doctors d
         JOIN users u ON u.user_id = d.user_id
         WHERE u.account_status = 'approved' AND u.is_active = 1"
    );

    $payload = [
        'cards' => [
            ['label' => 'Hospitals registered', 'value' => $hospitalCount, 'icon' => 'hospital', 'tone' => 'primary', 'foot' => 'approved doctor institutions'],
            ['label' => 'Patients registered', 'value' => admin_count($pdo, "SELECT COUNT(*) FROM users WHERE role = 'patient'"), 'icon' => 'users', 'tone' => 'primary'],
            ['label' => 'Doctors registered', 'value' => admin_count($pdo, "SELECT COUNT(*) FROM users WHERE role = 'doctor'"), 'icon' => 'shield', 'tone' => 'success'],
            ['label' => 'Pharmacies registered', 'value' => admin_count($pdo, "SELECT COUNT(*) FROM users WHERE role = 'pharmacist'"), 'icon' => 'pill', 'tone' => 'primary'],
        ],
        'account_summary' => [
            'total_users' => admin_count($pdo, 'SELECT COUNT(*) FROM users'),
            'active_users' => admin_count($pdo, "SELECT COUNT(*) FROM users WHERE is_active = 1 AND account_status = 'approved'"),
            'pending_users' => admin_count($pdo, "SELECT COUNT(*) FROM users WHERE account_status = 'pending'"),
            'blocked_users' => admin_count($pdo, "SELECT COUNT(*) FROM users WHERE account_status = 'blocked'"),
            'rejected_users' => admin_count($pdo, "SELECT COUNT(*) FROM users WHERE account_status = 'rejected'"),
        ],
        'usage' => [
            'clinical' => [
                ['label' => 'Total consultations', 'value' => admin_count($pdo, 'SELECT COUNT(*) FROM consultations')],
                ['label' => 'Active consultations', 'value' => admin_count($pdo, "SELECT COUNT(*) FROM consultations WHERE status IN ('queued', 'assigned', 'in_progress')")],
                ['label' => 'Consultations today', 'value' => admin_count($pdo, 'SELECT COUNT(*) FROM consultations WHERE requested_at::date = CURRENT_DATE')],
                ['label' => 'Upcoming referrals', 'value' => admin_count($pdo, "SELECT COUNT(*) FROM referrals WHERE status = 'scheduled' AND appointment_date >= CURRENT_DATE")],
            ],
            'pharmacy' => [
                ['label' => 'Total prescriptions', 'value' => admin_count($pdo, 'SELECT COUNT(*) FROM prescriptions')],
                ['label' => 'Pending dispensing', 'value' => admin_count($pdo, "SELECT COUNT(*) FROM prescriptions WHERE status = 'pending'")],
                ['label' => 'Dispensed prescriptions', 'value' => admin_count($pdo, "SELECT COUNT(*) FROM prescriptions WHERE status = 'dispensed'")],
                ['label' => 'Pending refill reviews', 'value' => admin_count($pdo, "SELECT COUNT(*) FROM refill_requests WHERE status = 'pending'")],
            ],
            'system' => [
                ['label' => 'Chat messages', 'value' => admin_count($pdo, 'SELECT COUNT(*) FROM chat_messages')],
                ['label' => 'Audit events', 'value' => admin_count($pdo, 'SELECT COUNT(*) FROM audit_log')],
                ['label' => 'Audit events in 7 days', 'value' => admin_count($pdo, "SELECT COUNT(*) FROM audit_log WHERE created_at >= NOW() - INTERVAL '7 days'")],
                ['label' => 'Unread notifications', 'value' => admin_count($pdo, 'SELECT COUNT(*) FROM notifications WHERE is_read = 0')],
            ],
        ],
        'pending_users' => admin_fetch_users($pdo, ["u.account_status = 'pending'"], [], 8),
        'recent_users' => admin_fetch_users($pdo, [], [], 8),
        'role_breakdown' => [],
        'recent_activity' => [],
    ];

    $stmt = $pdo->query(
        "SELECT role,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE is_active = 1 AND account_status = 'approved') AS active,
                COUNT(*) FILTER (WHERE account_status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE account_status = 'blocked') AS blocked,
                COUNT(*) FILTER (WHERE account_status = 'rejected') AS rejected
         FROM users
         GROUP BY role
         ORDER BY CASE role
                  WHEN 'admin' THEN 1 WHEN 'doctor' THEN 2
                  WHEN 'pharmacist' THEN 3 WHEN 'patient' THEN 4 ELSE 5 END"
    );
    $payload['role_breakdown'] = $stmt->fetchAll();

    $stmt = $pdo->query(
        'SELECT a.audit_id, a.actor_user_id, a.actor_role, a.action, a.entity_type, a.entity_id,
                a.details, a.created_at, u.full_name AS actor_name
         FROM audit_log a
         LEFT JOIN users u ON u.user_id = a.actor_user_id
         ORDER BY a.created_at DESC
         LIMIT 12'
    );
    $payload['recent_activity'] = $stmt->fetchAll();

    send_json($payload);
}

function admin_hospitals(): void
{
    require_auth(['admin']);
    $stmt = DB::conn()->query(
        "SELECT
            TRIM(d.affiliated_institution) AS name,
            COUNT(*) AS doctor_count,
            STRING_AGG(DISTINCT NULLIF(TRIM(d.specialisation), ''), ', ' ORDER BY NULLIF(TRIM(d.specialisation), '')) AS specialisations
         FROM doctors d
         JOIN users u ON u.user_id = d.user_id
         WHERE u.account_status = 'approved'
           AND u.is_active = 1
           AND NULLIF(TRIM(COALESCE(d.affiliated_institution, '')), '') IS NOT NULL
         GROUP BY TRIM(d.affiliated_institution)
         ORDER BY name ASC"
    );

    send_json(['hospitals' => $stmt->fetchAll()]);
}
function admin_users(): void
{
    require_auth(['admin']);
    $pdo = DB::conn();
    $conditions = [];
    $params = [];

    $status = strtolower(trim((string)($_GET['status'] ?? '')));
    if ($status !== '' && $status !== 'all') {
        if (!in_array($status, ['pending', 'approved', 'rejected', 'blocked'], true)) {
            send_json(['error' => 'Invalid account status'], 400);
        }
        $conditions[] = 'u.account_status = ?';
        $params[] = $status;
    }

    $role = strtolower(trim((string)($_GET['role'] ?? '')));
    if ($role !== '' && $role !== 'all') {
        if (!in_array($role, ['patient', 'doctor', 'pharmacist', 'admin'], true)) {
            send_json(['error' => 'Invalid role'], 400);
        }
        $conditions[] = 'u.role = ?';
        $params[] = $role;
    }

    send_json(['users' => admin_fetch_users($pdo, $conditions, $params)]);
}

function admin_status_from_action(string $value): string
{
    $value = strtolower(trim($value));
    $map = [
        'approve' => 'approved',
        'approved' => 'approved',
        'restore' => 'approved',
        'reject' => 'rejected',
        'rejected' => 'rejected',
        'block' => 'blocked',
        'blocked' => 'blocked',
        'pending' => 'pending',
    ];

    if (!isset($map[$value])) {
        send_json(['error' => 'Invalid account status'], 400);
    }
    return $map[$value];
}

function admin_update_user_status(string $id): void
{
    $auth = require_auth(['admin']);
    $adminId = (int) $auth['uid'];
    $targetId = (int) $id;
    $data = read_json();
    $status = admin_status_from_action((string)($data['status'] ?? $data['action'] ?? ''));
    $pdo = DB::conn();

    $stmt = $pdo->prepare('SELECT user_id, full_name, email, role, account_status FROM users WHERE user_id = ? LIMIT 1');
    $stmt->execute([$targetId]);
    $target = $stmt->fetch();
    if (!$target) {
        send_json(['error' => 'User not found'], 404);
    }

    if ($targetId === $adminId && $status !== 'approved') {
        send_json(['error' => 'Administrators cannot suspend their own account'], 400);
    }

    if ($target['role'] === 'admin' && $status !== 'approved') {
        $remainingAdmins = admin_count(
            $pdo,
            "SELECT COUNT(*) FROM users WHERE role = 'admin' AND user_id <> ? AND is_active = 1 AND account_status = 'approved'",
            [$targetId]
        );
        if ($remainingAdmins < 1) {
            send_json(['error' => 'At least one approved administrator must remain active'], 400);
        }
    }

    $isActive = $status === 'approved' ? 1 : 0;
    $stmt = $pdo->prepare(
        'UPDATE users
         SET account_status = ?, is_active = ?, status_changed_at = NOW(), status_changed_by = ?
         WHERE user_id = ?'
    );
    $stmt->execute([$status, $isActive, $adminId, $targetId]);

    $detail = sprintf('Set account status for %s (%s) to %s', $target['full_name'], $target['email'], $status);
    audit_log($adminId, 'admin', 'user.status_updated', 'user', $targetId, $detail);

    $messages = [
        'approved' => ['Account approved', 'Your Telemed ZM account has been approved. You can now sign in.'],
        'rejected' => ['Account rejected', 'Your Telemed ZM registration was reviewed and rejected.'],
        'blocked' => ['Account blocked', 'Your Telemed ZM account has been blocked by an administrator.'],
        'pending' => ['Account pending review', 'Your Telemed ZM account is awaiting administrator review.'],
    ];
    [$title, $message] = $messages[$status];
    notify($targetId, $title, $message, 'system', $targetId);

    $updated = admin_fetch_users($pdo, ['u.user_id = ?'], [$targetId], 1);
    send_json(['message' => 'User status updated', 'user' => $updated[0] ?? null]);
}