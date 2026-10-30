<?php
/**
 * Front controller for the Telemedicine Platform REST API.
 *
 * Routes are dispatched by HTTP method + URI path. All responses are JSON.
 * Architecture: per Chapter 4.2 of the proposal (three-tier client-server,
 * MVC separation; this file is the Controller dispatch layer).
 */

declare(strict_types=1);

require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/helpers.php';

apply_cors();

// Strip /telemed-platform/api prefix so routes are pure (e.g. /auth/login).
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$basePrefix = '/telemed-platform/api';
if (str_starts_with($uri, $basePrefix)) {
    $uri = substr($uri, strlen($basePrefix));
}
$uri = '/' . trim($uri, '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// Health check
if ($uri === '/' || $uri === '/health') {
    send_json([
        'status'  => 'ok',
        'service' => 'telemed-platform-api',
        'time'    => date('c'),
    ]);
}

// ----------------------------------------------------------------------
// Route table
// ----------------------------------------------------------------------
$routes = [
    // Auth
    ['POST', '#^/auth/register$#',           'routes/auth.php',           'auth_register'],
    ['POST', '#^/auth/login$#',              'routes/auth.php',           'auth_login'],
    ['POST', '#^/auth/logout$#',             'routes/auth.php',           'auth_logout'],
    ['POST', '#^/auth/password-reset/request$#', 'routes/auth.php',        'auth_password_reset_request'],
    ['POST', '#^/auth/password-reset$#',     'routes/auth.php',           'auth_password_reset'],
    ['GET',  '#^/auth/me$#',                 'routes/auth.php',           'auth_me'],

    // Triage
    ['POST', '#^/triage/score$#',            'routes/triage.php',         'triage_score'],

    // Consultations
    ['POST', '#^/consultations$#',           'routes/consultations.php',  'consult_create'],
    ['GET',  '#^/consultations$#',           'routes/consultations.php',  'consult_list'],
    ['GET',  '#^/consultations/queue$#',     'routes/consultations.php',  'consult_queue'],
    ['GET',  '#^/consultations/(\d+)$#',     'routes/consultations.php',  'consult_show'],
    ['POST', '#^/consultations/(\d+)/accept$#',  'routes/consultations.php', 'consult_accept'],
    ['POST', '#^/consultations/(\d+)/close$#',   'routes/consultations.php', 'consult_close'],
    ['GET',  '#^/consultations/(\d+)/messages$#','routes/consultations.php','consult_messages'],
    ['POST', '#^/consultations/(\d+)/messages$#','routes/consultations.php','consult_send_message'],

    // Prescriptions
    ['POST', '#^/prescriptions$#',           'routes/prescriptions.php',  'rx_create'],
    ['GET',  '#^/prescriptions$#',           'routes/prescriptions.php',  'rx_list'],
    ['GET',  '#^/prescriptions/(\d+)$#',     'routes/prescriptions.php',  'rx_show'],
    ['PATCH','#^/prescriptions/(\d+)/status$#', 'routes/prescriptions.php', 'rx_update_status'],

    // Referrals
    ['POST', '#^/referrals$#',               'routes/referrals.php',      'ref_create'],
    ['GET',  '#^/referrals$#',               'routes/referrals.php',      'ref_list'],

    // Health records
    ['GET',  '#^/records/export$#',          'routes/records.php',        'rec_export'],
    ['GET',  '#^/records$#',                 'routes/records.php',        'rec_list'],
    ['POST', '#^/records$#',                 'routes/records.php',        'rec_create'],

    // Notifications
    ['GET',  '#^/notifications$#',           'routes/notifications.php',  'notif_list'],
    ['POST', '#^/notifications/(\d+)/read$#','routes/notifications.php',  'notif_mark_read'],

    // Doctors / Pharmacists directories (for assignment dropdowns)
    ['GET',  '#^/doctors$#',                 'routes/users.php',          'list_doctors'],
    ['GET',  '#^/pharmacists$#',             'routes/users.php',          'list_pharmacists'],

    // Stats / dashboard
    ['GET',  '#^/stats$#',                   'routes/stats.php',          'stats_overview'],

    // Administrator dashboard
    ['GET',  '#^/admin/overview$#',          'routes/admin.php',          'admin_overview'],
    ['GET',  '#^/admin/hospitals$#',         'routes/admin.php',          'admin_hospitals'],
    ['GET',  '#^/admin/users$#',             'routes/admin.php',          'admin_users'],
    ['PATCH','#^/admin/users/(\d+)/status$#','routes/admin.php',          'admin_update_user_status'],

    // Profile + password
    ['PATCH','#^/auth/profile$#',            'routes/profile.php',        'profile_update'],
    ['POST', '#^/auth/password$#',           'routes/profile.php',        'profile_change_password'],

    // Audit log viewer
    ['GET',  '#^/audit$#',                   'routes/audit.php',          'audit_list'],

    // Drug catalog
    ['GET',  '#^/drugs$#',                   'routes/drugs.php',          'drugs_list'],

    // Allergies
    ['GET',  '#^/allergies$#',               'routes/health_profile.php', 'allergy_list'],
    ['POST', '#^/allergies$#',               'routes/health_profile.php', 'allergy_create'],
    ['DELETE','#^/allergies/(\d+)$#',        'routes/health_profile.php', 'allergy_delete'],

    // Chronic conditions
    ['GET',  '#^/conditions$#',              'routes/health_profile.php', 'condition_list'],
    ['POST', '#^/conditions$#',              'routes/health_profile.php', 'condition_create'],
    ['DELETE','#^/conditions/(\d+)$#',       'routes/health_profile.php', 'condition_delete'],

    // Refill requests
    ['GET',  '#^/refills$#',                 'routes/refills.php',        'refill_list'],
    ['POST', '#^/refills$#',                 'routes/refills.php',        'refill_create'],
    ['POST', '#^/refills/(\d+)/decision$#',  'routes/refills.php',        'refill_decision'],
];

foreach ($routes as [$rMethod, $pattern, $file, $fn]) {
    if ($rMethod !== $method) continue;
    if (preg_match($pattern, $uri, $m)) {
        require_once __DIR__ . '/' . $file;
        array_shift($m); // drop full match, keep capture groups as args
        try {
            $fn(...$m);
        } catch (Throwable $e) {
            error_log('Unhandled error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            send_json(['error' => 'Server error', 'detail' => $e->getMessage()], 500);
        }
        exit;
    }
}

send_json(['error' => 'Not found', 'path' => $uri, 'method' => $method], 404);
