# Q-Free Health Setup Instructions

## Quick Setup Guide for Development

### Step 1: Database Setup
1. **Install PostgreSQL** (if not already installed)
   - Download from: https://www.postgresql.org/download/
   - During installation, remember the password for the 'postgres' user

2. **Create Database**
   ```bash
   # Using psql command line
   psql -U postgres -c "CREATE DATABASE queue;"
   
   # Or using pgAdmin interface
   # Connect to PostgreSQL server
   # Right-click Databases → Create → Database
   # Name: queue
   ```

3. **Import Schema**
   ```bash
   psql -U postgres -d queue -f database/schema.sql
   ```

### Step 2: Backend Setup
1. **Navigate to backend folder**
   ```bash
   cd backend
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Update database connection** (if needed)
   - Open `app.py`
   - Modify line: `app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:Manisha14@localhost/queue'`
   - Replace `Manisha14` with your PostgreSQL password

4. **Start the backend server**
   ```bash
   python app.py
   ```
   - Server will start on http://localhost:5000
   - You should see "Running on http://0.0.0.0:5000"

### Step 3: Frontend Setup
1. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```

2. **Start a local server**
   ```bash
   # Option 1: Python (if installed)
   python -m http.server 3000
   
   # Option 2: Node.js (if installed)
   npx http-server -p 3000
   
   # Option 3: Open index.html directly in browser
   # Just double-click index.html file
   ```

3. **Access the application**
   - Open browser and go to http://localhost:3000
   - Or if opened directly: file:///path/to/frontend/index.html

### Step 4: Test the System
1. **Try logging in with test accounts**
   - Patient: `patient@qfree.com` / `password123`
   - Doctor: `dr.smith@qfree.com` / `password123` 
   - Pharmacy: `pharmacy@qfree.com` / `password123`

2. **Register new accounts**
   - Click "Register here" on login page
   - Fill in the form based on your role
   - Use a real email format

### Docker Setup (Alternative)
If you prefer Docker:

1. **Make sure Docker is installed**
2. **Run the entire system**
   ```bash
   docker-compose up -d
   ```
3. **Access at http://localhost**

### Troubleshooting
- **Database connection error**: Check if PostgreSQL is running and password is correct
- **Backend won't start**: Verify all Python packages are installed
- **Frontend not loading**: Check if the HTTP server is running on port 3000
- **API calls failing**: Ensure backend is running on port 5000

### File Structure
```
Fullstackproject-QueueFreeAppoinment/
├── backend/
│   ├── app.py (Flask server)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── index.html (Main page)
│   ├── app.js (React application)
│   └── style.css (Styles)
├── database/
│   └── schema.sql (Database setup)
├── docker-compose.yml
└── README.md
```

The system is now ready for testing and development!