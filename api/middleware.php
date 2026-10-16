<?php
/**
 * Auth middleware: read JWT from cookie or Authorization header,
 * verify signature + expiry, and attach the current user to the request.
 *
 * Implements FR-S-01 (RBAC) and NFR-Security (30-min idle session).
 */

require_once __DIR__ . '/helpers.php';

/**
 * Returns the authenticated user payload or aborts 401.
 * Optional $allowedRoles = ['doctor','pharmacist'] enforces RBAC.
 */
function require_auth(?array $allowedRoles = null): array
{
    $token = null;

    // 1. Cookie (HTTP-only, set on login).
    if (!empty($_COOKIE['telemed_token'])) {
        $token = $_COOKIE['telemed_token'];
    }
    // 2. Authorization: Bearer <token> header (for API tools / Postman).
    if (!$token && !empty($_SERVER['HTTP_AUTHORIZATION'])) {
        if (preg_match('/Bearer\s+(.+)/i', $_SERVER['HTTP_AUTHORIZATION'], $m)) {
            $token = trim($m[1]);
        }
    }

    if (!$token) {
        send_json(['error' => 'Authentication required'], 401);
    }

    $payload = jwt_verify($token);
    if (!$payload) {
        send_json(['error' => 'Invalid or expired session'], 401);
    }

    $uid = (int)($payload['uid'] ?? 0);
    if ($uid <= 0) {
        send_json(['error' => 'Invalid session user'], 401);
    }

    $stmt = DB::conn()->prepare('SELECT role, is_active, account_status FROM users WHERE user_id = ? LIMIT 1');
    $stmt->execute([$uid]);
    $user = $stmt->fetch();
    if (!$user || (int)$user['is_active'] !== 1 || $user['account_status'] !== 'approved') {
        send_json(['error' => 'Account is not active'], 403);
    }

    $payload['role'] = $user['role'];

    // RBAC check
    if ($allowedRoles && !in_array($payload['role'] ?? '', $allowedRoles, true)) {
        send_json(['error' => 'Forbidden - role not permitted for this resource'], 403);
    }

    return $payload;
}

/**
 * Apply CORS headers (development convenience).
 * In production these are usually set at the web-server level.
 */
function apply_cors(): void
{
    $config = require __DIR__ . '/config.php';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = $config['cors']['allowed_origins'];

    // Allow same-origin requests automatically; explicit allowlist for cross-origin.
    if ($origin && in_array($origin, $allowed, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}