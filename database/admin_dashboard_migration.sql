-- Admin dashboard and account approval migration.
-- Run this once on an existing telemed_db before using admin approval features.
USE telemed_db;

ALTER TABLE users
    ADD COLUMN account_status ENUM('pending','approved','rejected','blocked') NOT NULL DEFAULT 'approved' AFTER is_active,
    ADD COLUMN status_changed_at TIMESTAMP NULL AFTER last_login,
    ADD COLUMN status_changed_by INT NULL AFTER status_changed_at,
    ADD INDEX idx_account_status (account_status),
    ADD INDEX idx_role_status (role, account_status);

UPDATE users
SET account_status = CASE WHEN is_active = 1 THEN 'approved' ELSE 'blocked' END
WHERE account_status IS NULL OR account_status = '';

SET @pw := '$2y$10$2gcIhIK.32gStrIOlxXKWOoXEz2TLSMkdu06fJyTqbP1NutszivFO';
INSERT INTO users (full_name, email, password_hash, role, phone, is_active, account_status)
SELECT 'Telemed Administrator', 'admin@demo.zm', @pw, 'admin', '+260977000030', 1, 'approved'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@demo.zm');