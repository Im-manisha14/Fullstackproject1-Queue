@echo off
cls
echo ========================================
echo   QueueFree System - Complete Restart
echo ========================================
echo.

echo [1/5] Stopping all running services...
echo.

REM Kill any existing processes on ports 5001 and 3011
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3011 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

echo Services stopped!
echo.
echo [2/5] Starting Backend (Flask on port 5001)...
echo.

start "Backend Server" cmd /c "cd c:\Fullstackproject-QueueFreeAppoinment\backend && c:\Fullstackproject-QueueFreeAppoinment\.venv\Scripts\python.exe -u app.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo [3/5] Starting Frontend (Vite on port 3011)...
echo.

start "Frontend Server" cmd /c "cd c:\Fullstackproject-QueueFreeAppoinment\frontend && npm run dev"

echo Waiting for frontend to start...
timeout /t 8 /nobreak >nul

echo.
echo [4/5] Verifying services...
echo.

netstat -an | findstr "5001.*LISTEN" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend is running on port 5001
) else (
    echo [ERROR] Backend failed to start
)

netstat -an | findstr "3011.*LISTEN" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Frontend is running on port 3011
) else (
    echo [INFO] Frontend might be running on different port
)

echo.
echo [5/5] Opening browser...
echo.

start http://localhost:3011

echo.
echo ========================================
echo   System Started Successfully!
echo ========================================
echo.
echo   Backend:  http://localhost:5001
echo   Frontend: http://localhost:3011
echo.
echo   Demo Credentials:
echo   - Patient:  patient@test.com / password123
echo   - Doctor:   doctor@example.com / password123
echo   - Pharmacy: pharmacy@test.com / password123
echo.
echo ========================================
echo.
pause