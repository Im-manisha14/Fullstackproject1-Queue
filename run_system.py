#!/usr/bin/env python3
"""
Queue-Free Healthcare Appointment System
Complete system launcher and verification script
"""

import subprocess
import sys
import os
import time
import webbrowser
from threading import Thread
import requests

def check_dependencies():
    """Check if all required dependencies are available"""
    print("🔍 Checking system dependencies...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        return False
    
    # Check if pip is available
    try:
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                      capture_output=True, check=True)
        print("✅ Python and pip available")
    except subprocess.CalledProcessError:
        print("❌ pip not available")
        return False
    
    # Check if Node.js is available
    try:
        result = subprocess.run(["node", "--version"], 
                              capture_output=True, text=True, check=True)
        node_version = result.stdout.strip()
        print(f"✅ Node.js available: {node_version}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js not found. Please install Node.js 16+")
        return False
    
    # Check if npm is available
    try:
        result = subprocess.run(["npm", "--version"], 
                              capture_output=True, text=True, check=True)
        npm_version = result.stdout.strip()
        print(f"✅ npm available: {npm_version}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ npm not found")
        return False
    
    return True

def install_backend_dependencies():
    """Install Python backend dependencies"""
    print("📦 Installing backend dependencies...")
    
    try:
        # Change to backend directory
        backend_dir = os.path.join(os.getcwd(), "backend")
        
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], cwd=backend_dir, check=True)
        
        print("✅ Backend dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install backend dependencies: {e}")
        return False

def install_frontend_dependencies():
    """Install React frontend dependencies"""
    print("📦 Installing frontend dependencies...")
    
    try:
        # Change to frontend directory
        frontend_dir = os.path.join(os.getcwd(), "frontend")
        
        subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
        
        print("✅ Frontend dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install frontend dependencies: {e}")
        return False

def start_backend():
    """Start the Flask backend server"""
    print("🚀 Starting backend server...")
    
    backend_dir = os.path.join(os.getcwd(), "backend")
    
    # Start backend in a separate process
    backend_process = subprocess.Popen([
        sys.executable, "app.py"
    ], cwd=backend_dir)
    
    return backend_process

def start_frontend():
    """Start the React frontend development server"""
    print("🚀 Starting frontend server...")
    
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    
    # Start frontend in a separate process
    frontend_process = subprocess.Popen([
        "npm", "start"
    ], cwd=frontend_dir)
    
    return frontend_process

def wait_for_backend():
    """Wait for backend server to be ready"""
    print("⏳ Waiting for backend server to start...")
    
    for attempt in range(30):  # Wait up to 30 seconds
        try:
            response = requests.get("http://localhost:5000/api/health", timeout=1)
            if response.status_code == 200:
                print("✅ Backend server is ready")
                return True
        except:
            pass
        
        time.sleep(1)
        print(f"   Attempt {attempt + 1}/30...")
    
    print("❌ Backend server failed to start within 30 seconds")
    return False

def wait_for_frontend():
    """Wait for frontend server to be ready"""
    print("⏳ Waiting for frontend server to start...")
    
    for attempt in range(60):  # Wait up to 60 seconds (React can be slow)
        try:
            response = requests.get("http://localhost:3000", timeout=1)
            if response.status_code == 200:
                print("✅ Frontend server is ready")
                return True
        except:
            pass
        
        time.sleep(1)
        if attempt % 10 == 9:  # Show progress every 10 attempts
            print(f"   Still waiting... {attempt + 1}/60")
    
    print("❌ Frontend server failed to start within 60 seconds")
    return False

def open_browser():
    """Open the application in the default browser"""
    print("🌐 Opening application in browser...")
    webbrowser.open("http://localhost:3000")

def display_usage_info():
    """Display usage information for the system"""
    print("\n" + "="*60)
    print("🎉 QUEUE-FREE HEALTHCARE SYSTEM IS RUNNING!")
    print("="*60)
    print("\n📊 System URLs:")
    print("   Frontend: http://localhost:3000")
    print("   Backend:  http://localhost:5000")
    print("   API Docs: http://localhost:5000/api/health")
    print("\n👥 Test Accounts:")
    print("   Patient:")
    print("   - Email: patient@test.com")
    print("   - Password: password123")
    print("\n   Doctor:")
    print("   - Email: doctor@test.com") 
    print("   - Password: password123")
    print("\n   Pharmacy:")
    print("   - Email: pharmacy@test.com")
    print("   - Password: password123")
    print("\n🔧 Features Available:")
    print("   ✅ Real-time appointment booking")
    print("   ✅ Live queue tracking")
    print("   ✅ Role-based dashboards")
    print("   ✅ JWT authentication")
    print("   ✅ WebSocket notifications")
    print("   ✅ Prescription management")
    print("   ✅ Medicine inventory")
    print("\n⚠️  To stop the system:")
    print("   Press Ctrl+C in this terminal")
    print("\n" + "="*60)

def main():
    """Main system launcher"""
    print("🏥 Queue-Free Healthcare System Launcher")
    print("="*50)
    
    # Check dependencies
    if not check_dependencies():
        print("❌ Dependency check failed. Please install required software.")
        return 1
    
    # Install dependencies
    if not install_backend_dependencies():
        return 1
    
    if not install_frontend_dependencies():
        return 1
    
    try:
        # Start backend server
        backend_process = start_backend()
        
        # Wait for backend to be ready
        if not wait_for_backend():
            backend_process.terminate()
            return 1
        
        # Start frontend server
        frontend_process = start_frontend()
        
        # Wait for frontend to be ready
        if not wait_for_frontend():
            backend_process.terminate()
            frontend_process.terminate()
            return 1
        
        # Open browser
        time.sleep(2)  # Give servers a moment to fully stabilize
        open_browser()
        
        # Display usage information
        display_usage_info()
        
        # Wait for user interruption
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\n🛑 Shutting down servers...")
            backend_process.terminate()
            frontend_process.terminate()
            print("✅ System shut down successfully")
            
    except Exception as e:
        print(f"❌ Error starting system: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)