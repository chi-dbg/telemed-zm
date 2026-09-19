#!/usr/bin/env bash
# Telemedicine Platform - macOS / Linux setup helper.
# Run from inside the project root after XAMPP / MySQL is running.

set -e

echo
echo "====================================================="
echo " Web-Based Telemedicine Platform - setup helper"
echo " React + framer-motion + Vite frontend"
echo "====================================================="
echo

# Detect MySQL client
MYSQL_BIN="$(command -v mysql || true)"
if [ -z "$MYSQL_BIN" ]; then
    if [ -x "/Applications/XAMPP/xamppfiles/bin/mysql" ]; then
        MYSQL_BIN="/Applications/XAMPP/xamppfiles/bin/mysql"
    elif [ -x "/opt/lampp/bin/mysql" ]; then
        MYSQL_BIN="/opt/lampp/bin/mysql"
    fi
fi

if [ -z "$MYSQL_BIN" ]; then
    echo "Could not find a 'mysql' client. Please import the SQL files via phpMyAdmin manually."
else
    echo "[1/3] Loading database schema and seed data with $MYSQL_BIN..."
    "$MYSQL_BIN" -u root < database/schema.sql
    "$MYSQL_BIN" -u root < database/seed.sql
    echo "Database created: telemed_db"
    echo
fi

echo "[2/3] Installing Node.js chat-server dependencies..."
( cd chat-server && npm install )

echo "[3/3] Installing and building the React frontend (this takes 1-2 minutes)..."
( cd frontend && npm install && npm run build )

echo
echo "Setup complete!"
echo " - Verify API:        http://localhost/telemed-platform/api/health"
echo " - Run chat server:   cd chat-server && npm start"
echo " - Open the app:      http://localhost/telemed-platform/public/"
echo
echo "Demo credentials (password Password@123):"
echo "  patient@demo.zm  /  doctor@demo.zm  /  pharmacy@demo.zm"
echo
echo "To develop with hot reload: cd frontend && npm run dev"
