-- Optional demonstration data. Demo credentials are for local evaluation only.
-- Password for each demo account: Password@123

INSERT INTO users (full_name, email, password_hash, role, phone, is_active, account_status) VALUES
('Joseph Mwansa', 'patient@demo.zm', '$2y$10$2gcIhIK.32gStrIOlxXKWOoXEz2TLSMkdu06fJyTqbP1NutszivFO', 'patient', '+260977000001', 1, 'approved'),
('Grace Banda', 'patient2@demo.zm', '$2y$10$2gcIhIK.32gStrIOlxXKWOoXEz2TLSMkdu06fJyTqbP1NutszivFO', 'patient', '+260977000002', 1, 'approved'),
('Dr. Mulenga Phiri', 'doctor@demo.zm', '$2y$10$2gcIhIK.32gStrIOlxXKWOoXEz2TLSMkdu06fJyTqbP1NutszivFO', 'doctor', '+260977000010', 1, 'approved'),
('Dr. Chanda Tembo', 'doctor2@demo.zm', '$2y$10$2gcIhIK.32gStrIOlxXKWOoXEz2TLSMkdu06fJyTqbP1NutszivFO', 'doctor', '+260977000011', 1, 'approved'),
('Naomi Sakala', 'pharmacy@demo.zm', '$2y$10$2gcIhIK.32gStrIOlxXKWOoXEz2TLSMkdu06fJyTqbP1NutszivFO', 'pharmacist', '+260977000020', 1, 'approved'),
('Peter Lungu', 'pharmacy2@demo.zm', '$2y$10$2gcIhIK.32gStrIOlxXKWOoXEz2TLSMkdu06fJyTqbP1NutszivFO', 'pharmacist', '+260977000021', 1, 'approved'),
('Telemed Administrator', 'admin@demo.zm', '$2y$10$2gcIhIK.32gStrIOlxXKWOoXEz2TLSMkdu06fJyTqbP1NutszivFO', 'admin', '+260977000030', 1, 'approved');

INSERT INTO patients (user_id, date_of_birth, gender, address, medical_history_summary, emergency_contact) VALUES
(1, '1990-04-15', 'male', 'Plot 23, Kabwata, Lusaka', 'Mild hypertension, controlled with diet.', '+260977100001'),
(2, '1985-11-02', 'female', 'House 5, Chelston, Lusaka', 'No chronic conditions. Penicillin allergy.', '+260977100002');

INSERT INTO doctors (user_id, license_number, specialisation, affiliated_institution, is_available) VALUES
(3, 'HPCZ-2019-00451', 'General Practice', 'University Teaching Hospital, Lusaka', 1),
(4, 'HPCZ-2020-00782', 'Internal Medicine', 'Ndola Teaching Hospital', 1);

INSERT INTO pharmacists (user_id, pharmacy_name, pharmacy_registration_number, pharmacy_address) VALUES
(5, 'Health Plus Pharmacy', 'HPCZ-PH-2021-00102', 'Cairo Road, Lusaka'),
(6, 'Ndola Central Pharmacy', 'HPCZ-PH-2022-00187', 'Broadway, Ndola');

INSERT INTO consultations (patient_id, doctor_id, submitted_symptoms, triage_score, triage_recommendation, communication_mode, diagnosis_notes, status, started_at, closed_at)
VALUES (1, 1, 'Persistent dry cough for 5 days, mild fever, sore throat. No shortness of breath.',
        2, 'routine', 'chat', 'Likely viral upper respiratory infection. Advised rest and fluids; antitussive prescribed.',
        'completed', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '90 minutes');

INSERT INTO prescriptions (prescription_uid, consultation_id, patient_id, doctor_id, pharmacist_id, medication_name, dosage, frequency, duration, instructions, status)
VALUES ('RX-2026-000001', 1, 1, 1, 1, 'Dextromethorphan syrup', '10 ml', '3 times daily', '5 days',
        'Take after meals. Avoid driving if drowsy.', 'pending');

INSERT INTO health_records (patient_id, consultation_id, doctor_id, record_type, title, content)
VALUES (1, 1, 1, 'consultation_note', 'Upper respiratory infection - 2 days ago',
        'Symptoms: dry cough, mild fever, sore throat. Diagnosis: viral URI. Plan: symptomatic treatment with dextromethorphan, rest, hydration. Follow up in 7 days if symptoms persist.');

INSERT INTO consultations (patient_id, doctor_id, submitted_symptoms, triage_score, triage_recommendation, communication_mode, diagnosis_notes, status, started_at, closed_at)
VALUES (2, 2, 'Severe abdominal pain, intermittent vomiting for 2 days, mild jaundice noticed today.',
        7, 'refer', 'video', 'Symptoms suggest possible hepatobiliary issue. Cannot diagnose remotely - physical examination and lab tests required.',
        'referred', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '40 minutes');

INSERT INTO referrals (consultation_id, patient_id, doctor_id, clinic_name, clinic_address, clinic_contact, appointment_date, appointment_time, referral_reason, status)
VALUES (2, 2, 2, 'Levy Mwanawasa Medical University Teaching Hospital',
        'Great East Road, Lusaka', '+260211200000', CURRENT_DATE + 2, '10:00:00',
        'Possible hepatobiliary pathology requiring abdominal ultrasound and liver function tests.', 'scheduled');

INSERT INTO notifications (user_id, title, message, type, related_id) VALUES
(1, 'Prescription issued', 'Your prescription RX-2026-000001 has been sent to Health Plus Pharmacy.', 'prescription', 1),
(2, 'Referral scheduled', 'You have been referred to Levy Mwanawasa MUTH for further investigation.', 'referral', 1),
(5, 'New prescription received', 'Doctor Mulenga Phiri has sent prescription RX-2026-000001 to your pharmacy.', 'prescription', 1);

INSERT INTO audit_log (actor_user_id, actor_role, action, entity_type, entity_id, details) VALUES
(3, 'doctor', 'prescription.created', 'prescription', 1, 'RX-2026-000001 issued for consultation #1'),
(3, 'doctor', 'prescription.transmitted', 'prescription', 1, 'Transmitted to Health Plus Pharmacy'),
(4, 'doctor', 'referral.created', 'referral', 1, 'Referred patient #2 to Levy Mwanawasa MUTH');

INSERT INTO chat_messages (consultation_id, sender_user_id, sender_role, message_text) VALUES
(1, 1, 'patient', 'Good afternoon doctor, I have had a dry cough for 5 days now.'),
(1, 3, 'doctor', 'Hello Joseph. Any fever or shortness of breath?'),
(1, 1, 'patient', 'Mild fever in the evenings, no shortness of breath.'),
(1, 3, 'doctor', 'Thank you. I will issue a prescription for an antitussive. Rest and drink plenty of fluids.');

INSERT INTO allergies (patient_id, allergen, severity, reaction, noted_on) VALUES
(2, 'Penicillin', 'severe', 'Hives and breathing difficulty', '2018-06-12'),
(1, 'Aspirin', 'mild', 'Mild stomach upset', '2022-01-20');

INSERT INTO chronic_conditions (patient_id, condition_name, diagnosed_date, notes, is_active) VALUES
(1, 'Hypertension (mild)', '2020-03-15', 'Controlled with diet and exercise. Blood pressure target <140/90.', 1);

INSERT INTO drugs (name, strength, form, common_dosage, common_frequency, notes) VALUES
('Paracetamol', '500mg', 'tablet', '1-2 tablets', 'Every 6 hours as needed', 'Max 4g/day. Avoid in severe liver disease.'),
('Ibuprofen', '400mg', 'tablet', '1 tablet', '3 times daily after meals', 'Avoid in peptic ulcer disease.'),
('Amoxicillin', '500mg', 'capsule', '1 capsule', '3 times daily', 'Check for penicillin allergy first.'),
('Azithromycin', '500mg', 'tablet', '1 tablet', 'Once daily', 'Typically 3-5 day course.'),
('Ciprofloxacin', '500mg', 'tablet', '1 tablet', 'Twice daily', 'Avoid in pregnancy and children.'),
('Metformin', '500mg', 'tablet', '1 tablet', 'Twice daily with meals', 'For type 2 diabetes.'),
('Amlodipine', '5mg', 'tablet', '1 tablet', 'Once daily', 'For hypertension.'),
('Lisinopril', '10mg', 'tablet', '1 tablet', 'Once daily', 'ACE inhibitor for hypertension.'),
('Salbutamol inhaler', '100mcg', 'inhaler', '2 puffs', 'As needed', 'For asthma / bronchospasm.'),
('Dextromethorphan syrup', '15mg/5ml', 'syrup', '10 ml', '3 times daily', 'Cough suppressant.'),
('Loratadine', '10mg', 'tablet', '1 tablet', 'Once daily', 'Non-drowsy antihistamine.'),
('ORS (Oral Rehydration Salts)', '1 sachet', 'other', '1 sachet in 1L water', 'After each loose stool', 'For diarrhoea / dehydration.'),
('Artemether + Lumefantrine', '20/120mg', 'tablet', '4 tablets', 'Twice daily for 3 days', 'For uncomplicated malaria.'),
('Albendazole', '400mg', 'tablet', '1 tablet', 'Single dose', 'Antihelminthic.'),
('Omeprazole', '20mg', 'capsule', '1 capsule', 'Once daily before breakfast', 'For acid reflux / peptic ulcer.');

DO $$
DECLARE
    item RECORD;
    sequence_name TEXT;
    max_id BIGINT;
BEGIN
    FOR item IN
        SELECT * FROM (VALUES
            ('users', 'user_id'),
            ('patients', 'patient_id'),
            ('doctors', 'doctor_id'),
            ('pharmacists', 'pharmacist_id'),
            ('consultations', 'consultation_id'),
            ('prescriptions', 'prescription_id'),
            ('health_records', 'record_id'),
            ('referrals', 'referral_id'),
            ('notifications', 'notification_id'),
            ('chat_messages', 'message_id'),
            ('audit_log', 'audit_id'),
            ('allergies', 'allergy_id'),
            ('chronic_conditions', 'condition_id'),
            ('refill_requests', 'request_id'),
            ('drugs', 'drug_id')
        ) AS sequence_target(table_name, column_name)
    LOOP
        sequence_name := pg_get_serial_sequence(
            format('public.%I', item.table_name),
            item.column_name
        );
        EXECUTE format('SELECT MAX(%I) FROM public.%I', item.column_name, item.table_name)
            INTO max_id;
        IF max_id IS NULL THEN
            PERFORM setval(sequence_name::regclass, 1, false);
        ELSE
                PERFORM setval(sequence_name::regclass, max_id, true);
        END IF;
    END LOOP;
END $$;
