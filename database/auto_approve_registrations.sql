-- One-time cleanup for accounts created before automatic registration approval.
-- Safe for MySQL and PostgreSQL. It does not change accounts that an
-- administrator has already blocked or rejected.
UPDATE users
SET is_active = 1,
    account_status = 'approved'
WHERE account_status = 'pending';
