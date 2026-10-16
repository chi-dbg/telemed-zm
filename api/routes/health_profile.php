<?php
/**
 * Patient allergies + chronic conditions.
 * - Patients can add their own
 * - Doctors can view (during consultation) but not modify
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../middleware.php';

/* ---- Allergies ---- */

function allergy_list(): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $pdo  = DB::conn();

    if ($auth['role'] === 'patient') {
        $pid = profile_id_for_user($uid, 'patient');
    } elseif ($auth['role'] === 'doctor') {
        $pid = (int)($_GET['patient_id'] ?? 0);
        if (!$pid) send_json(['error' => 'patient_id required'], 400);
    } else {
        send_json(['error' => 'Forbidden'], 403);
    }

    $stmt = $pdo->prepare('SELECT * FROM allergies WHERE patient_id = ? ORDER BY noted_on DESC, allergy_id DESC');
    $stmt->execute([$pid]);
    send_json(['allergies' => $stmt->fetchAll()]);
}

function allergy_create(): void
{
    $auth = require_auth(['patient']);
    $data = read_json();
    require_fields($data, ['allergen']);
    $sev = $data['severity'] ?? 'mild';
    if (!in_array($sev, ['mild','moderate','severe'], true)) {
        send_json(['error' => 'Invalid severity'], 400);
    }
    $pid = profile_id_for_user((int)$auth['uid'], 'patient');
    $stmt = DB::conn()->prepare(
        'INSERT INTO allergies (patient_id, allergen, severity, reaction, noted_on)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $pid,
        trim($data['allergen']),
        $sev,
        $data['reaction'] ?? null,
        $data['noted_on'] ?? null,
    ]);
    $id = db_last_insert_id(DB::conn());
    audit_log((int)$auth['uid'], 'patient', 'allergy.created', 'allergy', $id, "Allergen: {$data['allergen']}");
    send_json(['message' => 'Allergy added', 'allergy_id' => $id], 201);
}

function allergy_delete(string $id): void
{
    $auth = require_auth(['patient']);
    $pid  = profile_id_for_user((int)$auth['uid'], 'patient');
    $stmt = DB::conn()->prepare('DELETE FROM allergies WHERE allergy_id = ? AND patient_id = ?');
    $stmt->execute([(int)$id, $pid]);
    audit_log((int)$auth['uid'], 'patient', 'allergy.deleted', 'allergy', (int)$id, '');
    send_json(['message' => 'Removed']);
}

/* ---- Chronic conditions ---- */

function condition_list(): void
{
    $auth = require_auth();
    $uid  = (int) $auth['uid'];
    $pdo  = DB::conn();

    if ($auth['role'] === 'patient') {
        $pid = profile_id_for_user($uid, 'patient');
    } elseif ($auth['role'] === 'doctor') {
        $pid = (int)($_GET['patient_id'] ?? 0);
        if (!$pid) send_json(['error' => 'patient_id required'], 400);
    } else {
        send_json(['error' => 'Forbidden'], 403);
    }

    $stmt = $pdo->prepare('SELECT * FROM chronic_conditions WHERE patient_id = ? ORDER BY is_active DESC, diagnosed_date DESC');
    $stmt->execute([$pid]);
    send_json(['conditions' => $stmt->fetchAll()]);
}

function condition_create(): void
{
    $auth = require_auth(['patient']);
    $data = read_json();
    require_fields($data, ['condition_name']);
    $pid  = profile_id_for_user((int)$auth['uid'], 'patient');

    $stmt = DB::conn()->prepare(
        'INSERT INTO chronic_conditions (patient_id, condition_name, diagnosed_date, notes, is_active)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $pid,
        trim($data['condition_name']),
        $data['diagnosed_date'] ?? null,
        $data['notes'] ?? null,
        isset($data['is_active']) ? (int)!!$data['is_active'] : 1,
    ]);
    $id = db_last_insert_id(DB::conn());
    audit_log((int)$auth['uid'], 'patient', 'condition.created', 'condition', $id, $data['condition_name']);
    send_json(['message' => 'Condition added', 'condition_id' => $id], 201);
}

function condition_delete(string $id): void
{
    $auth = require_auth(['patient']);
    $pid  = profile_id_for_user((int)$auth['uid'], 'patient');
    $stmt = DB::conn()->prepare('DELETE FROM chronic_conditions WHERE condition_id = ? AND patient_id = ?');
    $stmt->execute([(int)$id, $pid]);
    audit_log((int)$auth['uid'], 'patient', 'condition.deleted', 'condition', (int)$id, '');
    send_json(['message' => 'Removed']);
}
