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

SET @pw := '$2y$10$.dbZMcrrsIshzNZO3ebXO.vfE4/UOqc.mTP8BurVl8myGng1ctpku';
INSERT INTO users (full_name, email, password_hash, role, phone, is_active, account_status)
SELECT 'Telemed Administrator', 'admin@demo.zm', @pw, 'admin', '+260977000030', 1, 'approved'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@demo.zm');

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    reset_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_reset_user (user_id),
    INDEX idx_reset_expiry (expires_at)
) ENGINE=InnoDB;

-- Fix the earlier invalid prototype demo hash in existing local databases.
UPDATE users SET password_hash = @pw
WHERE email = 'admin@demo.zm';
