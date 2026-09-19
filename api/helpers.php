<?php
/**
 * Shared helpers: JSON I/O, JWT, validation, audit log, notifications.
 */

require_once __DIR__ . '/db.php';

/**
 * Send a JSON response and exit.
 */
function send_json($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Read JSON body of the current request.
 */
function read_json(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        send_json(['error' => 'Invalid JSON body'], 400);
    }
    return $data;
}

/**
 * Require fields to be present and non-empty in $data, otherwise abort 400.
 * NFR-Data Integrity: server-side validation.
 */
function require_fields(array $data, array $fields): void
{
    $missing = [];
    foreach ($fields as $f) {
        if (!isset($data[$f]) || (is_string($data[$f]) && trim($data[$f]) === '')) {
            $missing[] = $f;
        }
    }
    if ($missing) {
        send_json(['error' => 'Missing required fields', 'fields' => $missing], 400);
    }
}

/* ---------------------------------------------------------------------
 * JWT (HS256) - lightweight implementation, no external dependency.
 * ------------------------------------------------------------------ */

function base64url_encode(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function base64url_decode(string $s): string
{
    $r = strlen($s) % 4;
    if ($r) $s .= str_repeat('=', 4 - $r);
    return base64_decode(strtr($s, '-_', '+/'));
}

function jwt_sign(array $payload): string
{
    $config = require __DIR__ . '/config.php';
    $secret = $config['jwt']['secret'];
    $ttl    = $config['jwt']['ttl_seconds'];

    $now = time();
    $payload = array_merge($payload, [
        'iss' => $config['jwt']['issuer'],
        'iat' => $now,
        'exp' => $now + $ttl,
    ]);

    $header = ['typ' => 'JWT', 'alg' => 'HS256'];
    $h = base64url_encode(json_encode($header));
    $p = base64url_encode(json_encode($payload));
    $sig = hash_hmac('sha256', "$h.$p", $secret, true);
    $s = base64url_encode($sig);
    return "$h.$p.$s";
}

function jwt_verify(string $token): ?array
{
    $config = require __DIR__ . '/config.php';
    $secret = $config['jwt']['secret'];

    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;

    $expected = base64url_encode(hash_hmac('sha256', "$h.$p", $secret, true));
    if (!hash_equals($expected, $s)) return null;

    $payload = json_decode(base64url_decode($p), true);
    if (!is_array($payload)) return null;
    if (isset($payload['exp']) && $payload['exp'] < time()) return null;

    return $payload;
}

/* ---------------------------------------------------------------------
 * Audit log (FR-S-04: immutable trail of significant events).
 * ------------------------------------------------------------------ */

function audit_log(?int $actorUserId, ?string $role, string $action, string $entityType, ?int $entityId, string $details = ''): void
{
    try {
        $stmt = DB::conn()->prepare(
            'INSERT INTO audit_log (actor_user_id, actor_role, action, entity_type, entity_id, details, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $actorUserId,
            $role,
            $action,
            $entityType,
            $entityId,
            $details,
            $_SERVER['REMOTE_ADDR'] ?? null,
        ]);
    } catch (Throwable $e) {
        // Never break the request just because logging failed.
        error_log('audit_log failed: ' . $e->getMessage());
    }
}

/* ---------------------------------------------------------------------
 * Notifications helper (FR-P-07, FR-PH-02, FR-PH-05).
 * ------------------------------------------------------------------ */

function notify(int $userId, string $title, string $message, string $type, ?int $relatedId = null): int
{
    $stmt = DB::conn()->prepare(
        'INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $title, $message, $type, $relatedId]);
    return (int) DB::conn()->lastInsertId();
}

/**
 * Generate a unique prescription identifier (FR-S-03).
 */
function generate_prescription_uid(int $prescriptionId): string
{
    return sprintf('RX-%s-%06d', date('Y'), $prescriptionId);
}

/**
 * Resolve role-specific profile id (patient_id / doctor_id / pharmacist_id) for a user.
 */
function profile_id_for_user(int $userId, string $role): ?int
{
    $map = ['patient' => 'patients', 'doctor' => 'doctors', 'pharmacist' => 'pharmacists'];
    if (!isset($map[$role])) return null;
    $col = $role . '_id';
    $sql = "SELECT $col AS id FROM {$map[$role]} WHERE user_id = ? LIMIT 1";
    $stmt = DB::conn()->prepare($sql);
    $stmt->execute([$userId]);
    $r = $stmt->fetch();
    return $r ? (int) $r['id'] : null;
}
