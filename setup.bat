@echo off
REM Telemedicine Platform - Windows setup helper
REM Configure DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, and DB_SSLMODE first.

setlocal
echo.
echo =====================================================
echo  Web-Based Telemedicine Platform - setup helper
echo  React + framer-motion + Vite frontend
echo =====================================================
echo.

REM 1. Apply the PostgreSQL schema and demo seed data.
where psql >nul 2>nul
IF ERRORLEVEL 1 (
    echo Could not find psql. Install PostgreSQL client tools and set PG* connection variables.
    exit /b 1
)
echo [1/3] Loading PostgreSQL schema and demo seed data...
set "PGPASSWORD=%DB_PASSWORD%"
psql "host=%DB_HOST% port=%DB_PORT% dbname=%DB_NAME% user=%DB_USER% sslmode=%DB_SSLMODE%" -v ON_ERROR_STOP=1 -f supabase\migrations\20261015000100_initial_schema.sql
IF ERRORLEVEL 1 (
    echo Schema load failed. Check the PostgreSQL connection variables.
    pause & exit /b 1
)
psql "host=%DB_HOST% port=%DB_PORT% dbname=%DB_NAME% user=%DB_USER% sslmode=%DB_SSLMODE%" -v ON_ERROR_STOP=1 -f supabase\seed.sql
IF ERRORLEVEL 1 (
    echo Seed load failed.
    pause & exit /b 1
)
echo PostgreSQL schema and seed data loaded.
echo.

REM 2. Install chat-server dependencies.
echo [2/3] Installing Node.js chat-server dependencies...
pushd chat-server
call npm ci
popd

REM 3. Install + build the React frontend.
echo [3/3] Installing and building the React frontend (this may take a couple of minutes)...
pushd frontend
call npm ci
call npm run build
popd

echo.
echo Setup complete!
echo  - Open http://localhost/telemed-platform/api/health to verify the API
echo  - Run "cd chat-server ^&^& npm start" to launch the realtime chat server (port 3001)
echo  - Open http://localhost/telemed-platform/public/ to use the app
echo.
echo Demo credentials (password Password@123):
echo   patient@demo.zm   /  doctor@demo.zm   /  pharmacy@demo.zm
echo.
echo To develop with hot reload: cd frontend ^&^& npm run dev
echo.
pause
