#!/usr/bin/env python3
"""
Queue-Free Healthcare System - Verification Script
Checks all components, files, and dependencies are properly configured
"""

import os
import json
from pathlib import Path

def check_mark():
    return "✅"

def x_mark():
    return "❌"

def verify_system():
    """Verify all system components are present and configured"""
    print("🏥 Queue-Free Healthcare System - Component Verification")
    print("=" * 60)
    
    # Check project structure
    print("\n📁 Project Structure:")
    required_dirs = [
        "backend",
        "frontend",
        "frontend/src",
        "frontend/src/components",
        "frontend/src/pages",
        "frontend/src/contexts",
        "frontend/src/utils"
    ]
    
    for dir_path in required_dirs:
        if os.path.exists(dir_path):
            print(f"   {check_mark()} {dir_path}/")
        else:
            print(f"   {x_mark()} {dir_path}/ - MISSING")
    
    # Check backend files
    print("\n🐍 Backend Files:")
    backend_files = [
        "backend/app.py",
        "backend/requirements.txt",
        "backend/init_postgresql.py"
    ]
    
    for file_path in backend_files:
        if os.path.exists(file_path):
            print(f"   {check_mark()} {file_path}")
        else:
            print(f"   {x_mark()} {file_path} - MISSING")
    
    # Check frontend files
    print("\n⚛️  Frontend Files:")
    frontend_files = [
        "frontend/package.json",
        "frontend/tailwind.config.js",
        "frontend/src/App.js",
        "frontend/src/index.js",
        "frontend/src/index.css"
    ]
    
    for file_path in frontend_files:
        if os.path.exists(file_path):
            print(f"   {check_mark()} {file_path}")
        else:
            print(f"   {x_mark()} {file_path} - MISSING")
    
    # Check React components
    print("\n🧩 React Components:")
    component_files = [
        "frontend/src/contexts/AuthContext.js",
        "frontend/src/utils/api.js",
        "frontend/src/utils/socket.js",
        "frontend/src/pages/Login.js",
        "frontend/src/pages/Register.js",
        "frontend/src/pages/PatientDashboard.js",
        "frontend/src/pages/DoctorDashboard.js",
        "frontend/src/pages/PharmacyDashboard.js"
    ]
    
    for file_path in component_files:
        if os.path.exists(file_path):
            print(f"   {check_mark()} {file_path}")
        else:
            print(f"   {x_mark()} {file_path} - MISSING")
    
    # Check system files
    print("\n⚙️  System Files:")
    system_files = [
        "README.md",
        "run_system.py"
    ]
    
    for file_path in system_files:
        if os.path.exists(file_path):
            print(f"   {check_mark()} {file_path}")
        else:
            print(f"   {x_mark()} {file_path} - MISSING")
    
    # Check dependencies
    print("\n📦 Dependencies:")
    
    # Check package.json
    if os.path.exists("frontend/package.json"):
        try:
            with open("frontend/package.json", "r") as f:
                package_json = json.load(f)
            
            required_deps = [
                "react", "react-dom", "react-router-dom", 
                "axios", "socket.io-client", "lucide-react",
                "tailwindcss", "react-hot-toast"
            ]
            
            for dep in required_deps:
                if dep in package_json.get("dependencies", {}):
                    print(f"   {check_mark()} {dep}")
                else:
                    print(f"   {x_mark()} {dep} - MISSING from package.json")
        except Exception as e:
            print(f"   {x_mark()} Error reading package.json: {e}")
    else:
        print(f"   {x_mark()} package.json not found")
    
    # Check requirements.txt
    if os.path.exists("backend/requirements.txt"):
        try:
            with open("backend/requirements.txt", "r") as f:
                requirements = f.read().lower()
            
            required_packages = [
                "flask", "sqlalchemy", "psycopg2", 
                "jwt", "cors", "socketio"
            ]
            
            for package in required_packages:
                if package in requirements:
                    print(f"   {check_mark()} {package}")
                else:
                    print(f"   {x_mark()} {package} - MISSING from requirements.txt")
        except Exception as e:
            print(f"   {x_mark()} Error reading requirements.txt: {e}")
    else:
        print(f"   {x_mark()} requirements.txt not found")
    
    # Check file sizes (basic validation)
    print("\n📏 File Size Validation:")
    size_checks = {
        "backend/app.py": 1000,  # Should be at least 1KB
        "frontend/src/pages/PatientDashboard.js": 500,
        "frontend/src/pages/DoctorDashboard.js": 500,
        "frontend/src/pages/PharmacyDashboard.js": 500,
        "frontend/src/index.css": 200
    }
    
    for file_path, min_size in size_checks.items():
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            if size >= min_size:
                print(f"   {check_mark()} {file_path} ({size} bytes)")
            else:
                print(f"   {x_mark()} {file_path} ({size} bytes) - Too small")
        else:
            print(f"   {x_mark()} {file_path} - File not found")
    
    # Summary
    print("\n" + "=" * 60)
    print("🎯 Verification Summary:")
    print("   - All core files should be present with ✅")
    print("   - Missing files (❌) need to be created")
    print("   - Run 'python run_system.py' to start the system")
    print("\n📚 Next Steps:")
    print("   1. Ensure PostgreSQL is running")
    print("   2. Run: python run_system.py")
    print("   3. Access system at http://localhost:3000")
    print("\n🆘 If issues occur:")
    print("   - Check console for specific error messages")
    print("   - Verify all dependencies are installed")
    print("   - Review README.md for troubleshooting")
    print("=" * 60)

if __name__ == "__main__":
    verify_system()