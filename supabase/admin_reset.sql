-- Run this once in the Supabase SQL Editor to reset the Telemed administrator.
-- New credentials: admin@demo.zm / TelemedAdmin!2026
INSERT INTO public.users (full_name, email, password_hash, role, phone, is_active, account_status)
VALUES (
    'Telemed Administrator',
    'admin@demo.zm',
    '$2y$12$4m2n7xCDBFeNbHSZe1OXH.moA9ZXhi3P4wfrfGC.m.fGssCs1MWUO',
    'admin',
    '+260977000030',
    1,
    'approved'
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    password_hash = EXCLUDED.password_hash,
    role = 'admin',
    phone = EXCLUDED.phone,
    is_active = 1,
    account_status = 'approved';
