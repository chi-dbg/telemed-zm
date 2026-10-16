#!/usr/bin/env bash
# Telemedicine Platform - macOS / Linux setup helper.
# Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, and DB_SSLMODE first.

set -e

echo
echo "====================================================="
echo " Web-Based Telemedicine Platform - setup helper"
echo " React + framer-motion + Vite frontend"
echo "====================================================="
echo

command -v psql >/dev/null || {
    echo "Could not find psql. Install PostgreSQL client tools and set PG* connection variables."
    exit 1
}

echo "[1/3] Loading PostgreSQL schema and demo seed data..."
export PGPASSWORD="${DB_PASSWORD:?Set DB_PASSWORD before running setup}"
PSQL_ARGS="host=${DB_HOST:?Set DB_HOST} port=${DB_PORT:-5432} dbname=${DB_NAME:-postgres} user=${DB_USER:?Set DB_USER} sslmode=${DB_SSLMODE:-require}"
psql "$PSQL_ARGS" -v ON_ERROR_STOP=1 -f supabase/migrations/20261015000100_initial_schema.sql
psql "$PSQL_ARGS" -v ON_ERROR_STOP=1 -f supabase/seed.sql

echo "[2/3] Installing Node.js chat-server dependencies..."
( cd chat-server && npm ci )

echo "[3/3] Installing and building the React frontend (this takes 1-2 minutes)..."
( cd frontend && npm ci && npm run build )

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
