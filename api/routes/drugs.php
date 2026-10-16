<?php
/**
 * Drug catalog.
 * Doctors browse and pick from this list when issuing prescriptions
 * - reduces typing errors and standardises dosing.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function drugs_list(): void
{
    require_auth();
    $q = trim($_GET['q'] ?? '');
    $pdo = DB::conn();
    if ($q !== '') {
        $stmt = $pdo->prepare('SELECT * FROM drugs WHERE name ILIKE ? ORDER BY name LIMIT 100');
        $stmt->execute(['%' . $q . '%']);
    } else {
        $stmt = $pdo->query('SELECT * FROM drugs ORDER BY name LIMIT 200');
    }
    send_json(['drugs' => $stmt->fetchAll()]);
}
