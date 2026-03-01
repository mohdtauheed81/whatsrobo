@echo off
echo.
echo ======================================================
echo   WhatsApp SaaS - Quick Start
echo ======================================================
echo.
echo Starting all services...
echo.

REM Get the current directory
set ROOTDIR=%cd%

REM Terminal 1 - Backend API (Port 5000)
echo [1/3] Starting Backend API (Port 5000)...
start "Backend API - Port 5000" cmd /k "cd /d %ROOTDIR% && npm run dev"

REM Wait 3 seconds
timeout /t 3 /nobreak

REM Terminal 2 - Message Worker
echo [2/3] Starting Message Worker...
start "Message Worker" cmd /k "cd /d %ROOTDIR% && node src/services/worker/MessageWorker.js"

REM Wait 3 seconds
timeout /t 3 /nobreak

REM Terminal 3 - Frontend (Port 8081)
echo [3/3] Starting Frontend (Port 8081)...
start "Frontend - Port 8081" cmd /k "cd /d %ROOTDIR%\client && npm run dev"

REM Wait for startup
timeout /t 5 /nobreak

cls
echo.
echo ======================================================
echo   ✅ All Services Started!
echo ======================================================
echo.
echo IMPORTANT: You should see 3 new terminal windows above
echo.
echo Services Running:
echo   [1] Backend API:    http://localhost:5000
echo   [2] Message Worker: Processing queue
echo   [3] Frontend:       http://localhost:8081
echo.
echo ======================================================
echo   Open your browser to:
echo   http://localhost:8081
echo ======================================================
echo.
echo Wait 10 seconds for services to fully start...
echo.
pause
