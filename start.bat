@echo off
cls
echo 🏥 Starting Queue-Free Healthcare System
echo ========================================

echo 📊 Setting up PostgreSQL database...
rem Create database if it doesn't exist (assuming PostgreSQL is installed)
set PGPASSWORD=Manisha14
createdb -U postgres -h localhost queue 2>nul || echo Database 'queue' already exists or couldn't be created

echo 🔧 Installing backend dependencies...
cd backend
pip install -r requirements.txt

echo 🚀 Starting Flask backend server...
start "Backend Server" cmd /k "python postgresql_app.py"

timeout /t 3 /nobreak >nul

echo 🎨 Installing frontend dependencies...
cd ..\frontend
call npm install

echo 🌐 Starting React frontend server...
start "Frontend Server" cmd /k "npm start"

echo ✅ System is starting up!
echo.
echo 🔗 Frontend: http://localhost:3000
echo 🔗 Backend API: http://localhost:5000
echo.
echo 👤 Demo Login Credentials:
echo    Patient:  username=patient1, password=password
echo    Doctor:   username=doctor1, password=password
echo    Pharmacy: username=pharmacy1, password=password
echo.
echo Press any key to close this window...
pause >nul