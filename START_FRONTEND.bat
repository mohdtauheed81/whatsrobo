@echo off
echo.
echo ================================================
echo   WhatsApp SaaS - Frontend Dev Server
echo ================================================
echo.

cd client

echo Checking dependencies...
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

echo.
echo ✅ Starting Vite Dev Server on http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev

pause
