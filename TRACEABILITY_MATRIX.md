# Requirements Traceability Matrix — React + framer-motion + Vite

Every functional and non-functional requirement from Chapter 3 of the proposal, mapped to the React component (and where helpful, the supporting hook or backend route) that implements it.

> **Architecture:** React 18 + framer-motion 11 + Vite 5 frontend (`frontend/`), PHP 8 REST API (`api/`), MySQL 5.7+ (`database/`), Node.js Socket.IO chat server (`chat-server/`).

---

## Functional Requirements — Patient (FR-P-*)

| ID      | Requirement                                                                                                     | Frontend page / component                                | Backend route                            |
|---------|-----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|------------------------------------------|
| FR-P-01 | Register with full name, DOB, gender, contact, secure password                                                  | `frontend/src/pages/Register.jsx`                        | `api/routes/auth.php` `auth_register()`  |
| FR-P-02 | Login with email + password, session management                                                                 | `frontend/src/pages/Login.jsx`, `hooks/useAuth.js`       | `api/routes/auth.php` `auth_login()`     |
| FR-P-03 | Submit symptoms via structured form before requesting consultation                                              | `frontend/src/pages/ConsultationNew.jsx` (24-symptom selector + triage scorer) | `api/routes/triage.php`     |
| FR-P-04 | Request a remote consultation with an available doctor                                                          | `frontend/src/pages/ConsultationNew.jsx` `submit()`      | `api/routes/consultations.php` `consult_create()` |
| FR-P-05 | Real-time chat with doctor                                                                                      | `frontend/src/pages/Consultation.jsx` `<ChatBox>` (socket.io-client + framer-motion `<AnimatePresence>`) | `chat-server/server.js`     |
| FR-P-06 | View consultation history, prescriptions, medical records                                                       | `pages/Consultations.jsx`, `pages/Prescriptions.jsx`, `pages/Records.jsx` | various                          |
| FR-P-07 | Notification when prescription issued or referral created                                                       | `pages/Notifications.jsx`, `<Header>` bell badge         | `api/helpers.php` `notify()`             |
| FR-P-08 | View referral details (clinic, date, time)                                                                      | `pages/Referrals.jsx`                                    | `api/routes/referrals.php`               |

## Functional Requirements — Doctor (FR-D-*)

| ID      | Requirement                                                                                                     | Frontend page / component                                | Backend route                            |
|---------|-----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|------------------------------------------|
| FR-D-01 | Doctor login with role-based dashboard                                                                          | `pages/Overview.jsx` (role-aware), `<Sidebar>`           | `api/routes/auth.php`                    |
| FR-D-02 | View and accept incoming consultation requests                                                                  | `pages/Queue.jsx` (auto-refresh, framer-motion stagger)  | `api/routes/consultations.php` `consult_queue()`, `consult_accept()` |
| FR-D-03 | Review patient symptoms and history before consulting                                                           | `pages/Consultation.jsx` `<DoctorActionPanel>` Patient context | `api/routes/consultations.php` `consult_show()` |
| FR-D-04 | Real-time chat with patient                                                                                     | Same as FR-P-05                                          | `chat-server/server.js`                  |
| FR-D-05 | Generate electronic prescriptions                                                                               | `pages/Consultation.jsx` `<DoctorActionPanel>` Prescribe tab + drug catalog | `api/routes/prescriptions.php` `rx_create()` |
| FR-D-06 | Transmit prescriptions to a registered pharmacy                                                                 | Pharmacy dropdown in `<DoctorActionPanel>`               | `rx_create()` (pharmacist_id FK)         |
| FR-D-07 | Classify ambiguous symptoms and activate referral module                                                        | `<DoctorActionPanel>` Refer tab                          | `api/routes/referrals.php` `ref_create()` |
| FR-D-08 | Update and annotate patient records after each consultation                                                     | `<DoctorActionPanel>` Note tab                           | `api/routes/records.php` `rec_create()`  |

## Functional Requirements — Pharmacist (FR-PH-*)

| ID       | Requirement                                                                                                    | Frontend page / component                                | Backend route                            |
|----------|----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|------------------------------------------|
| FR-PH-01 | Pharmacist login with dedicated dashboard and RBAC                                                             | `pages/Overview.jsx`, role-specific `<Sidebar>`          | `api/routes/auth.php`                    |
| FR-PH-02 | Real-time notification of new prescription                                                                     | `pages/Incoming.jsx` (auto-refresh 30s)                  | `api/helpers.php` `notify()`             |
| FR-PH-03 | View full prescription details                                                                                 | `<Card>` rendering in `pages/Incoming.jsx`               | `api/routes/prescriptions.php` `rx_list()` |
| FR-PH-04 | Update status to dispensed / pending / unavailable                                                             | Buttons in `pages/Incoming.jsx` and `pages/Prescriptions.jsx` | `api/routes/prescriptions.php` `rx_update_status()` |
| FR-PH-05 | Notify patient when status changes                                                                             | Triggered server-side                                    | `rx_update_status()` calls `notify()`    |

## Functional Requirements — System (FR-S-*)

| ID      | Requirement                                                                                                     | Implementation                                                                       |
|---------|-----------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| FR-S-01 | Role-based access control                                                                                       | `api/middleware.php` `require_auth($allowedRoles)` server-side; `<Layout allowedRoles>` + `useRequireAuth` client-side |
| FR-S-02 | Store all data securely in MySQL                                                                                | `database/schema.sql` (15 tables, InnoDB, foreign keys, utf8mb4)                    |
| FR-S-03 | Unique prescription ID for full traceability                                                                    | `api/helpers.php` `generate_prescription_uid()` → `RX-YYYY-NNNNNN`                  |
| FR-S-04 | Immutable audit log of prescription events                                                                      | `database/schema.sql` `audit_log`, `helpers.php` `audit_log()`. Viewer: `pages/Audit.jsx` |
| FR-S-05 | Symptom triage module                                                                                           | `api/routes/triage.php` (24 weighted red-flag rules); UI in `pages/ConsultationNew.jsx` |
| FR-S-06 | Referral and appointment scheduling module                                                                      | `database/schema.sql` `referrals`; `api/routes/referrals.php`; UI in `pages/Referrals.jsx` |

## Full-system Extensions

| Feature                    | Why it matters                                              | Frontend                                       | Backend                                            |
|----------------------------|-------------------------------------------------------------|------------------------------------------------|----------------------------------------------------|
| Drug catalog               | Reduces typing errors → reinforces RO-2                     | `<DoctorActionPanel>` drug picker              | `api/routes/drugs.php`                             |
| Allergies tracker          | Doctor sees allergies before prescribing → safer RO-2       | `pages/Allergies.jsx`                          | `api/routes/health_profile.php`                    |
| Chronic conditions tracker | Surface long-term comorbidities                             | `pages/Allergies.jsx`                          | `api/routes/health_profile.php`                    |
| Refill requests            | Avoid unnecessary visits → reinforces RO-1                  | `pages/Refills.jsx` + `pages/Prescriptions.jsx` 🔁 button | `api/routes/refills.php`                |
| Profile + password change  | NFR-Security                                                | `pages/Profile.jsx`                            | `api/routes/profile.php`                           |
| Audit log viewer           | Transparency, supports SI 43 of 2023                        | `pages/Audit.jsx`                              | `api/routes/audit.php`                             |
| Dashboard stats (KPIs)     | Operational awareness                                       | `pages/Overview.jsx` + `<KpiCard>` (count-up animation) | `api/routes/stats.php`                    |
| Global search              | Quick access across all data                                | `pages/Search.jsx` + `<Header>` search box     | reuses /consultations, /prescriptions, /referrals  |
| Patient deep-record view   | Full longitudinal view per patient                          | `pages/Patients.jsx` → `pages/PatientRecord.jsx` | `api/routes/records.php`                         |

---

## Non-Functional Requirements

| Category        | Requirement                                                              | Where enforced                                                                      |
|-----------------|---------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| Performance     | Pages load within 3s on local network                                     | Vite-bundled SPA (single JS bundle, code-split routes), single-query API endpoints   |
| Performance     | Chat messages delivered within 1s                                         | Socket.IO websocket transport                                                        |
| Security        | Passwords hashed with bcrypt                                              | `auth.php` `auth_register()` uses `password_hash($pw, PASSWORD_BCRYPT)`              |
| Security        | RBAC                                                                      | `middleware.php` `require_auth([roles])` server + `<Layout allowedRoles>` client     |
| Security        | 30-minute session expiry                                                  | `config.php` `jwt.ttl_seconds = 1800`                                               |
| Usability       | Navigation in ≤ 3 clicks                                                  | Sidebar deep links — every page is one click from any other                          |
| Usability       | Responsive on desktop and mobile                                          | CSS grid + `@media` breakpoints; mobile hamburger toggle in `<Layout>`              |
| Reliability     | Atomic transactions                                                       | `PDO::beginTransaction()` in registration, prescription, referral, refill            |
| Scalability     | No major redesign needed for growth                                       | Stateless API, indexed lookups, connection pool in chat server                      |
| Maintainability | MVC separation of concerns                                                | React: `App.jsx` (router) → `pages/*` (containers) → `components/*` (presentational); PHP: `index.php` (controller) → `routes/*.php` (service) |
| Compatibility   | Modern browsers without plugins                                           | ES2020 + JSX (transpiled by Vite), CSS grid, no plugins                              |
| Data integrity  | Client + server-side validation                                           | React `required`/`min`; server `require_fields()`, prepared statements                |

## Animation NFRs (added with framer-motion migration)

| Animation                                              | Where defined                                          | Where applied                                                       |
|--------------------------------------------------------|--------------------------------------------------------|---------------------------------------------------------------------|
| Page transition (fade + 12px lift, exit -8px)          | `lib/animations.js` `pageVariants`                     | `<Layout>` `<AnimatePresence mode="wait">` wrapping `<Outlet>`      |
| Sidebar slide-in from left + nav item stagger          | `sidebarVariants`, `navListVariants`, `navItemVariants` | `<Sidebar>`                                                         |
| Active sidebar item bounce                             | `activeNavBounce`                                      | `<Sidebar>` matching item                                            |
| Header fade-down                                       | `headerVariants`                                       | `<Header>`                                                           |
| KPI count-up + stagger                                 | `framer-motion` `animate()` + `useInView`              | `<KpiCard>`                                                          |
| Card hover lift                                        | `cardVariants` `hover` state                           | `<Card whileHover="hover">`                                          |
| Card / table row stagger                               | `staggerContainer` + `staggerItem`                     | Every list page                                                     |
| Hero headline word-by-word reveal                      | `heroLineVariants`                                     | `pages/Landing.jsx`                                                 |
| Hero illustration float                                | `heroFloatVariants`                                    | `pages/Landing.jsx`                                                 |
| Auth split-panel slide                                 | `slideFromLeft`, `slideFromRight`                      | `pages/Login.jsx`, `pages/Register.jsx`                             |
| Symptom select bounce                                  | `symptomSelectVariants`                                | `pages/ConsultationNew.jsx`                                         |
| Triage result spring                                   | `triageResultVariants`                                 | `pages/ConsultationNew.jsx`                                         |
| Chat message slide from sender side                    | `chatMessageVariants(isMe)`                            | `<ChatBox>` `<AnimatePresence>`                                     |
| CTA pulse                                              | `ctaPulse`                                             | Landing CTA band                                                    |
| Toast spring entry                                     | `useToast.jsx` inline variants                         | All pages via `useToast()`                                          |

---

## Database Schema

| Proposal table     | Implemented as                  | Notes                                          |
|--------------------|----------------------------------|------------------------------------------------|
| users              | `users`                          | + `is_active`, `last_login`                    |
| patients           | `patients`                       | + `medical_history_summary`                    |
| doctors            | `doctors`                        | + `is_available`                               |
| pharmacists        | `pharmacists`                    |                                                 |
| consultations      | `consultations`                  | + `triage_score`, `triage_recommendation`      |
| prescriptions      | `prescriptions`                  | UNIQUE `prescription_uid`                      |
| health_records     | `health_records`                 | typed via `record_type` enum                   |
| referrals          | `referrals`                      |                                                 |
| notifications      | `notifications`                  |                                                 |
| _(extension)_      | `chat_messages`                  |                                                 |
| _(extension)_      | `audit_log`                      |                                                 |
| _(extension)_      | `allergies`                      |                                                 |
| _(extension)_      | `chronic_conditions`             |                                                 |
| _(extension)_      | `refill_requests`                |                                                 |
| _(extension)_      | `drugs`                          | Drug catalog                                    |

---

## Research gap → implementation matrix

| Gap (Section 2.3)                                                          | How this React system closes it                                                                          |
|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| 1. Fragmentation                                                            | Single React SPA with role-aware sidebar combines all six modules                                         |
| 2. E-prescription not integrated into consultation                          | `<DoctorActionPanel>` Prescribe tab embedded in `<Consultation>` page                                     |
| 3. Ambiguous symptom referrals: no triage + referral flow                   | `triage.php` rule-based scorer at submission; `<DoctorActionPanel>` Refer tab one click away              |
| 4. Data security in low-resource settings                                   | bcrypt + JWT (30-min) + RBAC + audit log + viewer at `pages/Audit.jsx`                                   |
| 5. Zambian regulatory alignment                                             | HPCZ licence at registration; unique RX IDs; audit log; HPCZ-aligned pharmacy registration                |
