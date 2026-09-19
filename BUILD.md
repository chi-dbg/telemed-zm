# Build instructions

This is a **React + framer-motion + Vite** project. The frontend source lives in `frontend/` and must be built before XAMPP can serve it.

## One-time setup

```bash
# 1. Install Node.js 18+ if you don't already have it
#    https://nodejs.org

# 2. Install frontend dependencies (from the project root)
cd frontend
npm install
```

This creates `frontend/node_modules/` (~150 MB, gitignored).

## Build for XAMPP (production)

```bash
cd frontend
npm run build
```

Vite outputs to `../public/` (configured in `vite.config.js`). Apache will then serve the app at:

```
http://localhost/telemed-platform/public/
```

## Develop with hot reload

```bash
cd frontend
npm run dev
```

Vite starts on port 5173 with HMR. The dev server proxies `/telemed-platform/api/*` to your local Apache, so the PHP backend keeps working without changes.

Open `http://localhost:5173/`.

## Start the chat server (separate terminal)

```bash
cd chat-server
npm install   # one-time
npm start
```

Should print:
```
telemed-chat-server listening on http://localhost:3001
```

## All three running together

For full functionality (frontend + API + realtime chat), you need:

| Service | How to start | Port |
|---|---|---|
| Apache + MySQL (XAMPP) | XAMPP Control Panel → Start | 80 + 3306 |
| Node.js chat server | `cd chat-server && npm start` | 3001 |
| React frontend (built) | served by Apache from `public/` | 80 |
| React frontend (dev) | `cd frontend && npm run dev` | 5173 |

## Troubleshooting

**`npm install` fails with EACCES or permission errors**
→ Don't use `sudo`. If you've used `sudo npm install` previously, fix permissions: `sudo chown -R $USER:$USER ~/.npm`.

**`vite: command not found`**
→ Run `npm install` in `frontend/` first.

**Build succeeds but page is blank**
→ Open browser DevTools console. The most common cause is a missing API connection — check that Apache is running and the URL `http://localhost/telemed-platform/api/health` returns JSON.

**Routes 404 on refresh**
→ The app uses HashRouter so URLs look like `index.html#/overview`. This avoids needing any Apache rewrite rules. If you want clean URLs, switch to BrowserRouter and add an `.htaccess` SPA fallback in `public/`.
