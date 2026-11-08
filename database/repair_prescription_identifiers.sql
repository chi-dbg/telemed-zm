-- One-time repair for any legacy prescription records that display an
-- incomplete placeholder such as RX-2026-XXXX or PENDING.
-- Run this in phpMyAdmin against the local MySQL telemed_db database.
-- Each final value is based on the unique prescription_id primary key.

UPDATE prescriptions
SET prescription_uid = CONCAT(
    'RX-',
    YEAR(COALESCE(issued_at, CURRENT_TIMESTAMP)),
    '-',
    LPAD(prescription_id, 6, '0')
)
WHERE prescription_uid LIKE '%XXXX%'
   OR prescription_uid = 'PENDING'
   OR prescription_uid LIKE 'TMP-RX-%';
