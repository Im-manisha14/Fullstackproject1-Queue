#!/bin/bash

echo "🏥 Starting Queue-Free Healthcare System"
echo "========================================"

# Check if PostgreSQL database exists
echo "📊 Setting up PostgreSQL database..."

# Create database if it doesn't exist (assuming PostgreSQL is installed)
export PGPASSWORD=Manisha14
createdb -U postgres -h localhost queue 2>/dev/null || echo "Database 'queue' already exists or couldn't be created"

echo "🔧 Installing backend dependencies..."
cd backend
pip install -r requirements.txt

echo "🚀 Starting Flask backend server..."
python postgresql_app.py &
BACKEND_PID=$!

sleep 3

echo "🎨 Installing frontend dependencies..."
cd ../frontend
npm install

echo "🌐 Starting React frontend server..."
npm start &
FRONTEND_PID=$!

echo "✅ System is starting up!"
echo ""
echo "🔗 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:5000"
echo ""
echo "👤 Demo Login Credentials:"
echo "   Patient:  username=patient1, password=password"
echo "   Doctor:   username=doctor1, password=password" 
echo "   Pharmacy: username=pharmacy1, password=password"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user interrupt
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait