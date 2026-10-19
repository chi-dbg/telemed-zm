<?php
/**
 * Audit log viewer. Only administrators may view platform audit entries.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function audit_list(): void
{
    require_auth(['admin']);
    $pdo  = DB::conn();

    $limit = max(1, min(200, (int)($_GET['limit'] ?? 50)));

    $stmt = $pdo->query(
        'SELECT a.*, u.full_name AS actor_name
         FROM audit_log a
         LEFT JOIN users u ON u.user_id = a.actor_user_id
         ORDER BY a.created_at DESC LIMIT ' . $limit
    );

    send_json(['entries' => $stmt->fetchAll()]);
}
