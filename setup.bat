@echo off
REM Telemedicine Platform - Windows / XAMPP setup helper
REM Run this from inside xampp\htdocs\telemed-platform after starting XAMPP.

setlocal
echo.
echo =====================================================
echo  Web-Based Telemedicine Platform - setup helper
echo  React + framer-motion + Vite frontend
echo =====================================================
echo.

REM 1. Run schema and seed via XAMPP's bundled mysql client.
SET MYSQL=C:\xampp\mysql\bin\mysql.exe
IF NOT EXIST "%MYSQL%" (
    echo Could not find XAMPP MySQL at %MYSQL%.
    echo Edit setup.bat and adjust the MYSQL path, or run the SQL files manually via phpMyAdmin.
    goto :node
)
echo [1/3] Loading database schema and seed data...
"%MYSQL%" -u root < database\schema.sql
IF ERRORLEVEL 1 (
    echo Schema load failed. Make sure MySQL is running in the XAMPP control panel.
    pause & exit /b 1
)
"%MYSQL%" -u root < database\seed.sql
IF ERRORLEVEL 1 (
    echo Seed load failed.
    pause & exit /b 1
)
echo Database created: telemed_db
echo.

:node
REM 2. Install chat-server dependencies.
echo [2/3] Installing Node.js chat-server dependencies...
pushd chat-server
call npm install
popd

REM 3. Install + build the React frontend.
echo [3/3] Installing and building the React frontend (this may take a couple of minutes)...
pushd frontend
call npm install
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
