<?php
/**
 * Notifications routes (FR-P-07, FR-PH-02, FR-PH-05).
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function notif_list(): void
{
    $auth = require_auth();
    $stmt = DB::conn()->prepare(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
    );
    $stmt->execute([(int)$auth['uid']]);
    send_json(['notifications' => $stmt->fetchAll()]);
}

function notif_mark_read(string $id): void
{
    $auth = require_auth();
    $stmt = DB::conn()->prepare(
        'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?'
    );
    $stmt->execute([(int)$id, (int)$auth['uid']]);
    send_json(['message' => 'marked', 'id' => (int)$id]);
}
