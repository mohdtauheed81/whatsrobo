@echo off
title WhatsApp SaaS - Complete Startup
color 0B
cls

echo.
echo ======================================================
echo   WhatsApp SaaS Platform - Complete Setup
echo ======================================================
echo.
echo This script will guide you through starting all services.
echo You need 4 Command Prompt windows open simultaneously.
echo.
echo Prerequisites:
echo   [1] Redis must be running
echo   [2] MongoDB Atlas configured (already done)
echo   [3] Node.js installed
echo.
pause

cls
echo.
echo ======================================================
echo   STEP 1: Redis Setup
echo ======================================================
echo.
echo Redis is required for message queuing.
echo.
echo Choose your Redis setup:
echo   [1] Docker Desktop (easiest - install at https://www.docker.com/products/docker-desktop)
echo   [2] Windows WSL (advanced)
echo   [3] Windows Redis (or skip and follow instructions in REDIS_SETUP.md)
echo.
echo For quick testing with Docker:
echo   1. Install Docker Desktop
echo   2. Run: docker run -d -p 6379:6379 --name redis redis:latest
echo   3. Verify: docker ps
echo.
pause

cls
echo.
echo ======================================================
echo   STEP 2: Open 4 Command Prompt Windows
echo ======================================================
echo.
echo You will open 4 separate command prompts to run:
echo.
echo   Terminal 1: Redis (or Docker/WSL)
echo   Terminal 2: Backend API (npm run dev)
echo   Terminal 3: Message Worker (node src/services/worker/MessageWorker.js)
echo   Terminal 4: Frontend (npm run dev in client folder)
echo.
echo Opening terminals now...
echo.
pause

REM Store the current directory
set ROOTDIR=%cd%

REM Open Terminal 1 - Backend API
echo Opening Terminal 1 (Backend API)...
start "Terminal 1 - Backend API [Port 5000]" cmd /k "cd /d %ROOTDIR% && npm run dev"

REM Wait a bit for first terminal to open
timeout /t 2 /nobreak

REM Open Terminal 2 - Message Worker
echo Opening Terminal 2 (Message Worker)...
start "Terminal 2 - Message Worker" cmd /k "cd /d %ROOTDIR% && node src/services/worker/MessageWorker.js"

REM Wait a bit
timeout /t 2 /nobreak

REM Open Terminal 3 - Frontend
echo Opening Terminal 3 (Frontend)...
start "Terminal 3 - Frontend [Port 3000]" cmd /k "cd /d %ROOTDIR%\client && npm run dev"

REM Wait a bit
timeout /t 2 /nobreak

REM Open Terminal 4 - Redis/Instructions
echo Opening Terminal 4 (Setup Instructions)...
start "Terminal 4 - Setup Instructions" cmd /k "color 0A && echo. && echo ============================================ && echo   REDIS SETUP INSTRUCTIONS && echo ============================================ && echo. && echo Please start Redis in this terminal. && echo. && echo Option 1 - Docker (Easiest): && echo   docker run -d -p 6379:6379 --name redis redis:latest && echo. && echo Option 2 - Windows Redis: && echo   redis-server && echo. && echo Option 3 - WSL: && echo   (Open WSL and run: redis-server) && echo. && echo Once Redis is started, check other terminals: && echo - Terminal 1: Backend API starting... && echo - Terminal 2: Message Worker starting... && echo - Terminal 3: Frontend starting (Vite)... && echo. && echo Then open browser: http://localhost:3000 && echo. && pause"

cls
echo.
echo ======================================================
echo   IMPORTANT INSTRUCTIONS
echo ======================================================
echo.
echo You should see 4 new terminals opening. In the 4th terminal:
echo.
echo 1. First, START REDIS using one of these commands:
echo.
echo    Docker:
echo    docker run -d -p 6379:6379 --name redis redis:latest
echo.
echo    OR Windows Redis:
echo    redis-server
echo.
echo    OR WSL Ubuntu (in WSL window):
echo    redis-server
echo.
echo 2. Then wait 5-10 seconds for other terminals to initialize
echo.
echo 3. You should see:
echo    Terminal 1: "Server running on port 5000"
echo    Terminal 2: "Worker started"
echo    Terminal 3: "ready in XXX ms" with "Local: http://localhost:3000"
echo.
echo 4. Open browser and go to: http://localhost:3000
echo.
echo 5. Login or Register to test:
echo    Email: test@example.com
echo    Password: Test123456!
echo.
echo ======================================================
echo.
echo All terminals are opening now...
echo This window will close in 10 seconds.
echo.
timeout /t 10 /nobreak

exit
