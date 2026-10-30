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
    return db_last_insert_id(DB::conn());
}

function db_last_insert_id(PDO $pdo): int
{
    return DB::driver() === 'mysql'
        ? (int) $pdo->lastInsertId()
        : (int) $pdo->query('SELECT LASTVAL()')->fetchColumn();
}

/* ---------------------------------------------------------------------
 * Email delivery. SMTP is used when configured; PHP mail() remains a
 * practical fallback for XAMPP hosts configured with a local mail relay.
 * ------------------------------------------------------------------ */
function smtp_expect($socket, array $expected): bool
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') break;
    }
    $code = (int)substr($response, 0, 3);
    return in_array($code, $expected, true);
}

function smtp_send($socket, string $command, array $expected): bool
{
    fwrite($socket, $command . "\r\n");
    return smtp_expect($socket, $expected);
}

function send_platform_email(string $to, string $subject, string $body): bool
{
    $config = require __DIR__ . '/config.php';
    $mail = $config['mail'];
    $from = str_replace(["\r", "\n"], '', $mail['from']);
    $fromName = str_replace(["\r", "\n", '"'], '', $mail['from_name']);
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        "From: {$fromName} <{$from}>",
        "Reply-To: {$from}",
    ];

    if ($mail['host'] === '') {
        return @mail($to, $subject, $body, implode("\r\n", $headers));
    }

    $prefix = $mail['encryption'] === 'ssl' ? 'ssl://' : 'tcp://';
    $socket = @stream_socket_client(
        $prefix . $mail['host'] . ':' . $mail['port'],
        $errno,
        $errstr,
        15,
        STREAM_CLIENT_CONNECT
    );
    if (!$socket) {
        error_log("Email connection failed: {$errstr} ({$errno})");
        return false;
    }

    stream_set_timeout($socket, 15);
    $ok = smtp_expect($socket, [220]) &&
        smtp_send($socket, 'EHLO telemedzm.local', [250]);
    if ($ok && $mail['encryption'] === 'tls') {
        $ok = smtp_send($socket, 'STARTTLS', [220]) &&
            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) &&
            smtp_send($socket, 'EHLO telemedzm.local', [250]);
    }
    if ($ok && $mail['username'] !== '') {
        $ok = smtp_send($socket, 'AUTH LOGIN', [334]) &&
            smtp_send($socket, base64_encode($mail['username']), [334]) &&
            smtp_send($socket, base64_encode($mail['password']), [235]);
    }
    if ($ok) {
        $message = implode("\r\n", $headers) . "\r\n\r\n" . $body;
        $ok = smtp_send($socket, "MAIL FROM:<{$from}>", [250]) &&
            smtp_send($socket, "RCPT TO:<{$to}>", [250, 251]) &&
            smtp_send($socket, 'DATA', [354]) &&
            smtp_send($socket, $message . "\r\n.", [250]);
    }
    @smtp_send($socket, 'QUIT', [221]);
    fclose($socket);
    return $ok;
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
