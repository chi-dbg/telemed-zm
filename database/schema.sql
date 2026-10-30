-- =====================================================================
-- Web-Based Telemedicine Platform with Electronic Prescription Management
-- Database Schema (MySQL 5.7+ / 8.0)
-- Author: Chipego Shambeza (2300072) - prototype implementation
-- Reference: Project Proposal Chapter 3.5.2 - 9 core tables
-- =====================================================================

DROP DATABASE IF EXISTS telemed_db;
CREATE DATABASE telemed_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE telemed_db;

-- ---------------------------------------------------------------------
-- Table 1: users  (FR-S-01 RBAC, NFR-Security bcrypt)
-- Stores account credentials for all three roles.
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,        -- bcrypt
    role ENUM('patient','doctor','pharmacist','admin') NOT NULL,
    phone VARCHAR(30),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    account_status ENUM('pending','approved','rejected','blocked') NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    status_changed_at TIMESTAMP NULL,
    status_changed_by INT NULL,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_account_status (account_status),
    INDEX idx_role_status (role, account_status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 2: patients  (FR-P-01)
-- ---------------------------------------------------------------------
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    date_of_birth DATE,
    gender ENUM('male','female','other'),
    address TEXT,
    medical_history_summary TEXT,
    emergency_contact VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 3: doctors  (FR-D-01)
-- ---------------------------------------------------------------------
CREATE TABLE doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    license_number VARCHAR(50) NOT NULL UNIQUE,    -- HPCZ licence number
    specialisation VARCHAR(100),
    affiliated_institution VARCHAR(150),
    is_available TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 4: pharmacists  (FR-PH-01)
-- ---------------------------------------------------------------------
CREATE TABLE pharmacists (
    pharmacist_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    pharmacy_name VARCHAR(150) NOT NULL,
    pharmacy_registration_number VARCHAR(50) NOT NULL UNIQUE,
    pharmacy_address TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 5: consultations  (FR-P-04, FR-D-02, UC-01)
-- ---------------------------------------------------------------------
CREATE TABLE consultations (
    consultation_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NULL,                            -- NULL while in queue
    submitted_symptoms TEXT NOT NULL,
    triage_score INT DEFAULT 0,                    -- FR-S-05 result
    triage_recommendation VARCHAR(50),             -- routine | review | refer
    communication_mode ENUM('chat','video') NOT NULL DEFAULT 'chat',
    diagnosis_notes TEXT,
    status ENUM('queued','assigned','in_progress','prescribed','referred','completed','cancelled')
           NOT NULL DEFAULT 'queued',
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_patient (patient_id),
    INDEX idx_doctor (doctor_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 6: prescriptions  (FR-D-05/06, FR-S-03 unique IDs, UC-02)
-- ---------------------------------------------------------------------
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_uid VARCHAR(40) NOT NULL UNIQUE,   -- FR-S-03 traceable ID e.g. RX-2026-000001
    consultation_id INT NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    pharmacist_id INT NOT NULL,                     -- assigned pharmacy
    medication_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    instructions TEXT,
    status ENUM('pending','dispensed','unavailable','cancelled') NOT NULL DEFAULT 'pending',
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispensed_at TIMESTAMP NULL,
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (pharmacist_id) REFERENCES pharmacists(pharmacist_id) ON DELETE CASCADE,
    INDEX idx_uid (prescription_uid),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 7: health_records  (FR-D-08, FR-P-06)
-- ---------------------------------------------------------------------
CREATE TABLE health_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    consultation_id INT NULL,
    doctor_id INT NULL,
    record_type ENUM('consultation_note','diagnosis','vital_signs','allergy','chronic_condition','other')
                NOT NULL DEFAULT 'consultation_note',
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    INDEX idx_patient (patient_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 8: referrals  (FR-D-07, FR-S-06, UC-03)
-- ---------------------------------------------------------------------
CREATE TABLE referrals (
    referral_id INT AUTO_INCREMENT PRIMARY KEY,
    consultation_id INT NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    clinic_name VARCHAR(150) NOT NULL,
    clinic_address TEXT NOT NULL,
    clinic_contact VARCHAR(50),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    referral_reason TEXT NOT NULL,
    status ENUM('scheduled','attended','missed','cancelled') NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 9: notifications  (FR-P-07, FR-PH-02, FR-PH-05)
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('consultation','prescription','referral','system') NOT NULL,
    related_id INT,                               -- consultation/prescription/referral id
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 10 (extra): chat_messages  (FR-P-05, FR-D-04)
-- Persists chat between patient and doctor for audit & continuity.
-- ---------------------------------------------------------------------
CREATE TABLE chat_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    consultation_id INT NOT NULL,
    sender_user_id INT NOT NULL,
    sender_role ENUM('patient','doctor') NOT NULL,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_consultation (consultation_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 11 (extra): audit_log  (FR-S-04 immutable audit log)
-- Records prescription creation, transmission, dispensing, etc.
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    actor_role VARCHAR(20),
    action VARCHAR(80) NOT NULL,                 -- e.g. 'prescription.created'
    entity_type VARCHAR(40) NOT NULL,
    entity_id INT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 12: allergies  (Patient allergy profile - extends EHR coverage)
-- Supports Doctor's pre-prescription safety check and reduces medication errors.
-- ---------------------------------------------------------------------
CREATE TABLE allergies (
    allergy_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    allergen VARCHAR(150) NOT NULL,
    severity ENUM('mild','moderate','severe') NOT NULL DEFAULT 'mild',
    reaction TEXT,
    noted_on DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    INDEX idx_patient (patient_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 13: chronic_conditions  (Long-term illnesses tracked in EHR)
-- ---------------------------------------------------------------------
CREATE TABLE chronic_conditions (
    condition_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    condition_name VARCHAR(150) NOT NULL,
    diagnosed_date DATE,
    notes TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    INDEX idx_patient (patient_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 14: refill_requests  (Patient self-service prescription renewals)
-- Reduces unnecessary consultations for routine renewals (RO-1).
-- ---------------------------------------------------------------------
CREATE TABLE refill_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT NOT NULL,
    patient_id INT NOT NULL,
    reviewed_by_doctor_id INT NULL,
    note TEXT,
    status ENUM('pending','approved','denied','dispensed') NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by_doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 15: drugs  (Structured medication catalog - reduces typing errors)
-- Doctors pick from this list when issuing prescriptions.
-- ---------------------------------------------------------------------
CREATE TABLE drugs (
    drug_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    strength VARCHAR(50),
    form ENUM('tablet','capsule','syrup','injection','cream','drops','inhaler','other') NOT NULL DEFAULT 'tablet',
    common_dosage VARCHAR(100),
    common_frequency VARCHAR(100),
    notes TEXT,
    INDEX idx_name (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table 16: password_reset_tokens (short-lived account recovery tokens)
-- ---------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
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
