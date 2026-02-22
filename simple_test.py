"""Simple test without JSON parsing"""
import requests

try:
    r = requests.get('http://localhost:5000/api/health', timeout=2)
    print(f"Health check: {r.status_code}")
    if r.status_code == 200:
        print("Backend is running")
        
        # Try appointments endpoint
        r2 = requests.get('http://localhost:5000/api/appointments/', timeout=2)
        print(f"\nAppointments GET: {r2.status_code}")
        print(f"Response text (first 300 chars):\n{r2.text[:300]}")
    else:
        print("Backend not healthy")
except Exception as e:
    print(f"Error: {e}")
