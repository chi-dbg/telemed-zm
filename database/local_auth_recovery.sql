-- Safe to run against an existing local telemed_db database.
USE telemed_db;

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

-- Restores the local prototype administrator with the documented demo password.
SET @admin_pw := '$2y$10$.dbZMcrrsIshzNZO3ebXO.vfE4/UOqc.mTP8BurVl8myGng1ctpku';
INSERT INTO users (full_name, email, password_hash, role, phone, is_active, account_status)
SELECT 'Telemed Administrator', 'admin@demo.zm', @admin_pw, 'admin', '+260977000030', 1, 'approved'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@demo.zm');

UPDATE users
SET password_hash = @admin_pw, is_active = 1, account_status = 'approved'
WHERE email = 'admin@demo.zm';
