<?php
/**
 * Directory routes - list available doctors / pharmacists for assignment.
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

function list_doctors(): void
{
    require_auth();
    $stmt = DB::conn()->query(
        'SELECT d.doctor_id, u.full_name, d.specialisation, d.affiliated_institution, d.is_available
         FROM doctors d JOIN users u ON u.user_id = d.user_id
         WHERE u.is_active = 1 ORDER BY u.full_name'
    );
    send_json(['doctors' => $stmt->fetchAll()]);
}

function list_pharmacists(): void
{
    require_auth();
    $stmt = DB::conn()->query(
        'SELECT ph.pharmacist_id, u.full_name, ph.pharmacy_name, ph.pharmacy_address
         FROM pharmacists ph JOIN users u ON u.user_id = ph.user_id
         WHERE u.is_active = 1 ORDER BY ph.pharmacy_name'
    );
    send_json(['pharmacists' => $stmt->fetchAll()]);
}
