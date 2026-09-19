# Web-Based Telemedicine Platform with Electronic Prescription Management System

> **React + framer-motion + Vite** implementation of the project proposed by **Chipego Shambeza (2300072)**, Bachelor of Information Technology, Zambia University College of Technology, 2026.

This system satisfies all three research objectives, answers all three research questions, addresses all five research gaps from Chapter 2.3 of the proposal, and implements the 27 functional requirements (FR-P-01..08, FR-D-01..08, FR-PH-01..05, FR-S-01..06) plus 8 non-functional requirements specified in Chapter 3 — with extra features (drug catalog, allergies & chronic conditions tracker, refill requests, audit log viewer) layered on top.

---

## What you're getting

- **React 18** SPA with **React Router v6** (HashRouter for zero-config XAMPP deploy)
- **framer-motion 11** for all animations (page transitions, sidebar slide-in, KPI count-up, hover lifts, chat message slide-in, etc.)
- **Vite 5** build tool — single `npm run build` produces a static dist
- **Socket.IO client** for realtime patient↔doctor chat
- **Sidebar navigation + content layout** with green primary palette and white surfaces
- **22 React pages** covering the entire care pathway, plus 9 reusable components
- **PHP 8 REST API** backend (unchanged from previous version) with 40+ endpoints
- **15 MySQL tables** (9 from proposal + 6 extensions)
- **Realtime chat** via Socket.IO Node.js server

---

## Architecture

| Layer            | Technology                                           | Folder              |
|------------------|------------------------------------------------------|---------------------|
| Presentation     | **React 18 + framer-motion + Vite**                  | `frontend/` (source) → builds to `public/` |
| Application API  | **PHP 8** REST API (front controller + routes)       | `api/`              |
| Real-time chat   | **Node.js 18+** with Socket.IO                       | `chat-server/`      |
| Data             | **MySQL 5.7+/8.0** (XAMPP)                           | `database/`         |

```
xampp/htdocs/telemed-platform/
├── frontend/             ← React + framer-motion + Vite source
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              ← React Router config
│       ├── api/client.js        ← fetch wrapper
│       ├── hooks/
│       │   ├── useAuth.js       ← AuthProvider, useAuth, useRequireAuth
│       │   └── useToast.jsx     ← ToastProvider with framer-motion entry
│       ├── lib/
│       │   ├── animations.js    ← shared framer-motion variants
│       │   └── helpers.js       ← formatting / display helpers
│       ├── components/          ← Layout, Sidebar, Header, KpiCard, Card, Pill, Empty, Alert, PageHeader
│       ├── pages/               ← 22 page components
│       └── styles/global.css    ← green-on-white sidebar shell
├── public/               ← Built React app (Vite output) — what XAMPP serves
├── api/                  ← PHP REST API (unchanged)
├── chat-server/          ← Node.js Socket.IO server (unchanged)
├── database/             ← schema.sql + seed.sql (unchanged)
├── README.md
└── TRACEABILITY_MATRIX.md
```

---

## Prerequisites

- **XAMPP 8.x** (Apache + MySQL + PHP 8) — [download](https://www.apachefriends.org/)
- **Node.js 18+** for both the chat server and the frontend build — [download](https://nodejs.org)
- A modern browser: Chrome / Edge / Brave / Firefox

---

## Setup

### 1. Place the project in `htdocs`

Copy this `telemed-platform` folder into your XAMPP `htdocs` directory.

### 2. Start XAMPP

Start **Apache** and **MySQL** from the XAMPP control panel.

### 3. Create the database

Via phpMyAdmin (`http://localhost/phpmyadmin`) → SQL tab → paste contents of `database/schema.sql`, run, then `database/seed.sql`, run.

Or use the helper script: `setup.bat` (Windows) or `./setup.sh` (macOS/Linux).

### 4. Install frontend dependencies and build

```bash
cd telemed-platform/frontend
npm install
npm run build
```

This builds the React app into `../public/`, which Apache serves.

> **For development with hot reload**, run `npm run dev` and visit `http://localhost:5173`. The Vite dev server proxies `/telemed-platform/api/*` to your local Apache backend.

### 5. Install and start the chat server

```bash
cd telemed-platform/chat-server
npm install
npm start
```

Should print `telemed-chat-server listening on http://localhost:3001`.

### 6. Open the app

`http://localhost/telemed-platform/public/` (or after `npm run dev`, `http://localhost:5173/`)

---

## Demo credentials

Password for **all** demo accounts: **`Password@123`**

| Role        | Email                  | Use to demonstrate                                     |
|-------------|------------------------|--------------------------------------------------------|
| Patient     | `patient@demo.zm`      | Submit symptoms, chat, view RX & referrals             |
| Patient     | `patient2@demo.zm`     | Pre-loaded ambiguous symptoms → referral case          |
| Doctor      | `doctor@demo.zm`       | Accept consultations, prescribe, refer                 |
| Doctor      | `doctor2@demo.zm`      | Second doctor for assignment dropdowns                 |
| Pharmacist  | `pharmacy@demo.zm`     | Receive prescriptions, mark dispensed                  |
| Pharmacist  | `pharmacy2@demo.zm`    | Second pharmacy                                        |

---

## What animates (framer-motion)

Every transition is built with framer-motion variants centralised in `src/lib/animations.js`:

| Where | What animates |
|---|---|
| **Layout shell** | Sidebar slides in from left (`sidebarVariants`), header fades down (`headerVariants`), nav items stagger (`navListVariants` + `navItemVariants`), active nav item gets a spring bounce (`activeNavBounce`) |
| **Pages** | Each route enters with `pageVariants` (fade + 12px lift) and exits with -8px when navigating, wrapped in `<AnimatePresence mode="wait">` |
| **Cards & sections** | Stagger entry via `staggerContainer` + `staggerItem` |
| **KPI cards** | Stagger up + **count-up animation** using `framer-motion` `animate()` + `useInView` |
| **Landing hero** | Headline lines slide up word-by-word, illustration floats with infinite bob, mock cards slide in, CTA pulses |
| **Login / Register** | Brand panel slides from left (`slideFromLeft`), form panel slides from right (`slideFromRight`), fields stagger, role-fields fade-swap with `<AnimatePresence>` |
| **Symptom selector** | Items stagger in, click triggers `symptomSelectVariants` bounce |
| **Triage result** | Springs in with overshoot (`triageResultVariants`) when triage runs |
| **Chat messages** | Each new message slides in from sender's side via `<AnimatePresence>` + `chatMessageVariants(isMe)` |
| **Tables** | Rows stagger in |
| **Referral / pharmacy cards** | Hover lift on `whileHover="hover"` |
| **Buttons everywhere** | `whileTap={{ scale: 0.97 }}` on every motion.button |

---

## API reference (unchanged)

The PHP backend is unchanged from the previous implementation. All 40+ endpoints work exactly as before. See the previous version's API table in `TRACEABILITY_MATRIX.md` or the route files in `api/routes/`.

---

## Mapping to research objectives & gaps

| Proposal item | Where in this React app it's satisfied |
|---|---|
| **RO-1** Remote consultation framework | `pages/Consultation.jsx` (chat + actions), `pages/Queue.jsx` (doctor queue), `pages/Refills.jsx` (avoid unnecessary visits) |
| **RO-2** Integrated electronic prescription system | `pages/Consultation.jsx` `<DoctorActionPanel>` Prescribe tab, `pages/Prescriptions.jsx`, `pages/Incoming.jsx` |
| **RO-3** Secure records + symptom assessment + referral | `pages/Records.jsx`, `pages/ConsultationNew.jsx` (24-symptom triage), `pages/Referrals.jsx`, `pages/Allergies.jsx` |
| **Gap 1** Fragmentation | Single React SPA combines all six modules |
| **Gap 2** E-prescription not integrated | Prescribe tab lives inside `<Consultation>` |
| **Gap 3** Ambiguous symptom referrals | Triage runs at submission, persists to consultation, surfaces in `pages/Queue.jsx` |
| **Gap 4** Data security in low-resource settings | bcrypt + JWT + RBAC + audit log + viewer at `pages/Audit.jsx` |
| **Gap 5** Zambian regulatory alignment | HPCZ licence at registration; unique RX IDs; audit log; aligned with HPCZ + SI 43 of 2023 |

Full requirement-to-file mapping is in [TRACEABILITY_MATRIX.md](./TRACEABILITY_MATRIX.md).

---

## Folder layout

```
telemed-platform/
├── README.md
├── TRACEABILITY_MATRIX.md
├── setup.bat / setup.sh
├── database/
│   ├── schema.sql                15 tables
│   └── seed.sql                  Demo users + drug catalog + sample cases
├── api/                          PHP 8 REST API (unchanged)
│   ├── index.php                 Front controller
│   ├── config.php
│   ├── db.php / helpers.php / middleware.php
│   ├── .htaccess
│   └── routes/                   14 route files
├── chat-server/                  Node.js + Socket.IO realtime chat (unchanged)
├── frontend/                     React + framer-motion + Vite source
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/client.js
│       ├── hooks/{useAuth.js, useToast.jsx}
│       ├── lib/{animations.js, helpers.js}
│       ├── components/           10 reusable components (incl. Icons.jsx)
│       ├── pages/                22 page components
│       └── styles/global.css
└── public/                       Built React app (run npm run build)
```

---

## Why the migration?

The previous version used vanilla JS with Motion One (framer-motion's vanilla-JS sibling, by the same author). This version uses the literal `framer-motion` React package as the proposal lists React.js in the technology stack. The animations are equivalent — same physics, same APIs.

## Iconography

No emoji are used anywhere in the UI. Every icon is a hand-tuned inline SVG component in `frontend/src/components/Icons.jsx` (line-style, 24x24 viewBox, color from `currentColor`). Includes: BrandIcon, HomeIcon, MessageIcon, PillIcon, HospitalIcon, ClipboardIcon, RefreshIcon, ActivityIcon, BellIcon, UserIcon, BookIcon, ClockIcon, UsersIcon, SearchIcon, InboxIcon, CheckCircleIcon, NoteIcon, StethoscopeIcon, CalendarIcon, DownloadIcon, ShieldIcon, LockIcon, LogoutIcon, AlertIcon, CheckIcon, MailIcon, MenuIcon, InfoIcon, ChevronRightIcon, ChevronLeftIcon, ArrowRightIcon, ExternalLinkIcon, PrinterIcon, FileSearchIcon, SettingsIcon, PlusIcon, PlusCircleIcon. All inherit color and respond to a `size` prop. No external icon library required.

The React migration also unlocks:
- **AnimatePresence** for proper exit animations on route changes
- **useInView** hooks for clean scroll-triggered animations
- Component reuse (e.g. `<KpiCard>`, `<Card>`, `<Pill>`) is now first-class
- Type-safe ref handling for chat scroll-to-bottom etc.

---

## Troubleshooting

**`npm run build` fails with "vite: command not found"**
→ Run `npm install` in `frontend/` first.

**`/api/health` returns 404**
→ Apache `mod_rewrite` is disabled, or the project is mounted at a different path. Edit `api/.htaccess` and update `RewriteBase`.

**`Database connection failed`**
→ MySQL isn't running. Edit `api/config.php` if your XAMPP MySQL has a non-default password.

**Chat says "connection error"**
→ The Node.js chat server isn't running. `cd chat-server && npm start`. Messages still persist via REST fallback.

**Hot reload doesn't pick up API changes**
→ The Vite dev server proxies the API. Make sure Apache+PHP are running on port 80.

---

## Licence

Academic prototype. Not for clinical use.
