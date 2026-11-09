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
- **PHP 8 REST API** backend connected to Supabase PostgreSQL, with 40+ endpoints
- **15 PostgreSQL tables** hosted on Supabase (9 from proposal + 6 extensions)
- **Realtime chat** via Socket.IO Node.js server

---

## Architecture

| Layer            | Technology                                           | Folder              |
|------------------|------------------------------------------------------|---------------------|
| Presentation     | **React 18 + framer-motion + Vite**                  | `frontend/` (source) → builds to `public/` |
| Application API  | **PHP 8** REST API (front controller + routes)       | `api/`              |
| Real-time chat   | **Node.js 18+** with Socket.IO                       | `chat-server/`      |
| Data             | **PostgreSQL** (Supabase)                             | `supabase/`         |

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
├── api/                  ← PHP REST API (PostgreSQL)
├── chat-server/          ← Node.js Socket.IO server (PostgreSQL)
├── supabase/             ← PostgreSQL migration, seed data, and Supabase config
├── README.md
└── TRACEABILITY_MATRIX.md
```

---

## Deploying to Render with Supabase

This deployment runs the PHP API and Socket.IO server as separate Render web
services, hosts the Vite build as a Render static site, and stores application
data in Supabase PostgreSQL.

1. Create a Supabase project. Apply
   `supabase/migrations/20261015000100_initial_schema.sql` using the Supabase
   SQL Editor (or `supabase db push`). Optionally run `supabase/seed.sql` for
   demo accounts; these demo credentials are not suitable for production.
2. In Supabase, copy the PostgreSQL **session pooler** host, port, username,
   database name, and database password. Use its session mode so the API and
   chat service can use PostgreSQL identity sequences reliably.
3. In Render, create a Blueprint from this repository and use `render.yaml`.
   Supply the database host, user, and password when prompted. Set
   `CORS_ALLOWED_ORIGINS` on both API and chat services to the exact HTTPS URL
   of the deployed frontend if you change its Render service name.
4. The frontend build gets `VITE_API_BASE_URL` and `VITE_CHAT_SERVER_URL` from
   the Blueprint. Once the services are deployed, open the static site URL.

### Environment variables

| Variable | Required | Used by | Description |
|---|---|---|---|
| `APP_ENV` | Yes in production | API, chat | Use `production`; enables secure cross-site auth cookies and production secret checks. |
| `DB_HOST` | Yes | API, chat | Supabase PostgreSQL session-pooler hostname. |
| `DB_PORT` | Yes | API, chat | PostgreSQL port (usually `5432` for the session pooler). |
| `DB_NAME` | Yes | API, chat | Supabase database name (usually `postgres`). |
| `DB_USER` | Yes | API, chat | Supabase database/session-pooler username. |
| `DB_PASSWORD` | Yes | API, chat | Supabase **database** password; not an anon or service-role API key. |
| `DB_SSLMODE` | Yes in production | API, chat | Set to `require` for Supabase TLS. |
| `JWT_SECRET` | Yes | API, chat | Identical long, random secret on both services; Render generates one and shares it. |
| `CORS_ALLOWED_ORIGINS` | Yes in production | API, chat | Comma-separated exact frontend origins, e.g. `https://telemed-frontend.onrender.com`. |
| `VITE_API_BASE_URL` | Yes for Render build | Frontend | Public URL of the PHP API service, with no trailing slash. |
| `VITE_CHAT_SERVER_URL` | Yes for Render build | Frontend | Public HTTPS URL of the Socket.IO service. |
| `PORT` | Render-managed | API, chat | Render's HTTP port (10000 by default); the API image listens on 10000 and the chat server uses the injected port. |
| `CHAT_HOST` | No | Chat | Bind host; defaults to `0.0.0.0`. |
| `CHAT_PORT` | No | Chat/local development | Local chat-server port; Render uses its injected `PORT`. |
| `VITE_HOST` | No | Frontend/local development | Local Vite bind host. |
| `VITE_PORT` | No | Frontend/local development | Local Vite port. |
| `VITE_STRICT_PORT` | No | Frontend/local development | Set to `1` to fail rather than choose another Vite port. |
| `VITE_DEV_HTTPS` | No | Frontend/local development | Set to `1` to enable the existing local HTTPS setup when certificates are present. |
| `VITE_AUTO_CHAT_SERVER` | No | Frontend/local development | Set to `0` to disable automatic local chat-server startup. |

See `.env.example` for local variable names and example values. Never commit
actual database passwords or JWT secrets.

## Prerequisites

- **PHP 8.3+ with `pdo_pgsql`** (or Docker for the API)
- A **Supabase PostgreSQL** project
- **Node.js 18+** for both the chat server and the frontend build — [download](https://nodejs.org)
- A modern browser: Chrome / Edge / Brave / Firefox

---

## Setup

### 1. Configure the database

Create a Supabase project and apply
`supabase/migrations/20261015000100_initial_schema.sql` in its SQL Editor.
Optionally run `supabase/seed.sql` to add demo accounts and sample records.
The older `database/schema.sql` and `database/seed.sql` are retained for
reference only; do not use them with the PostgreSQL backend.

### 2. Configure backend environment

Set the API and chat server variables from the deployment section above,
including the same `JWT_SECRET` and Supabase database credentials on both.
For XAMPP local testing, enable `pdo_pgsql` and pass these environment variables
to Apache and Node.js.

### 3. Place the project in `htdocs` (optional local Apache setup)

Copy this `telemed-platform` folder into your XAMPP `htdocs` directory.

### 4. Install frontend dependencies and build

```bash
cd telemed-platform/frontend
npm install
npm run build
```

This builds the React app into `../public/`, which Apache serves. To build for
Render's static site instead, use `npm run build:render` (outputs to `dist/`).

> **For development with hot reload**, run `npm run dev` and visit `http://localhost:5174`. The Vite dev server proxies `/telemed-platform/api/*` to your local Apache/PHP API and starts the local chat/video service on port 4311.

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
→ Check the Supabase PostgreSQL host, username, password, port, and SSL mode in the API environment.

**Chat says "connection error"**
→ The Node.js chat server isn't running. `cd chat-server && npm start`. Messages still persist via REST fallback.

**Hot reload doesn't pick up API changes**
→ The Vite dev server proxies the API. Make sure Apache+PHP are running on port 80.

---

## Licence

Academic prototype. Not for clinical use.
