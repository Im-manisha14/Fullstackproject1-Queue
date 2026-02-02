"""
Database Initialization for Queue-Free Healthcare System
Creates tables and populates initial data
"""
import sqlite3
from werkzeug.security import generate_password_hash
from datetime import datetime, date, time

def init_database():
    # Create connection
    conn = sqlite3.connect('backend/queue_healthcare.db')
    cursor = conn.cursor()
    
    # Drop existing tables
    tables = ['prescription_medications', 'prescriptions', 'queue_entries', 'appointments', 
              'doctor_profiles', 'medicines', 'departments', 'users']
    for table in tables:
        cursor.execute(f'DROP TABLE IF EXISTS {table}')
    
    # Create tables
    cursor.execute('''
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL,
        is_verified BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    )''')
    
    cursor.execute('''
    CREATE TABLE departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    cursor.execute('''
    CREATE TABLE doctor_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        department_id INTEGER NOT NULL,
        specialization TEXT,
        experience_years INTEGER,
        consultation_fee REAL DEFAULT 0.0,
        available_from TIME DEFAULT '09:00',
        available_to TIME DEFAULT '17:00',
        max_patients_per_day INTEGER DEFAULT 50,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (department_id) REFERENCES departments (id)
    )''')
    
    cursor.execute('''
    CREATE TABLE appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        department_id INTEGER NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        token_number INTEGER NOT NULL,
        status TEXT DEFAULT 'booked',
        priority TEXT DEFAULT 'normal',
        estimated_duration INTEGER DEFAULT 15,
        actual_start_time TIMESTAMP,
        actual_end_time TIMESTAMP,
        symptoms TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES users (id),
        FOREIGN KEY (doctor_id) REFERENCES users (id),
        FOREIGN KEY (department_id) REFERENCES departments (id)
    )''')
    
    cursor.execute('''
    CREATE TABLE queue_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER NOT NULL,
        queue_position INTEGER NOT NULL,
        estimated_wait_time INTEGER,
        checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        called_at TIMESTAMP,
        status TEXT DEFAULT 'waiting',
        FOREIGN KEY (appointment_id) REFERENCES appointments (id)
    )''')
    
    cursor.execute('''
    CREATE TABLE prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER NOT NULL,
        prescription_number TEXT UNIQUE NOT NULL,
        diagnosis TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        dispensed_at TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments (id)
    )''')
    
    cursor.execute('''
    CREATE TABLE medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        generic_name TEXT,
        manufacturer TEXT,
        dosage_form TEXT,
        strength TEXT,
        price_per_unit REAL NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        expiry_date DATE,
        batch_number TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    cursor.execute('''
    CREATE TABLE prescription_medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prescription_id INTEGER NOT NULL,
        medicine_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        dosage_instructions TEXT,
        duration_days INTEGER,
        dispensed_quantity INTEGER DEFAULT 0,
        FOREIGN KEY (prescription_id) REFERENCES prescriptions (id),
        FOREIGN KEY (medicine_id) REFERENCES medicines (id)
    )''')
    
    print("Tables created successfully!")
    
    # Insert sample departments
    departments = [
        ('General Medicine', 'Primary healthcare and general medical consultations'),
        ('Cardiology', 'Heart and cardiovascular system specialists'),
        ('Orthopedics', 'Bone, joint, and muscle disorders'),
        ('Pediatrics', 'Child healthcare and development'),
        ('Dermatology', 'Skin, hair, and nail conditions'),
        ('Neurology', 'Brain and nervous system disorders'),
        ('Ophthalmology', 'Eye care and vision correction'),
        ('ENT', 'Ear, nose, and throat specialists')
    ]
    
    for name, desc in departments:
        cursor.execute('INSERT INTO departments (name, description) VALUES (?, ?)', (name, desc))
    print("Sample departments added!")
    
    # Insert admin user
    admin_password = generate_password_hash('admin123')
    cursor.execute('''INSERT INTO users (username, email, password_hash, full_name, role, is_verified) 
                     VALUES (?, ?, ?, ?, ?, ?)''', 
                  ('admin', 'admin@hospital.com', admin_password, 'System Administrator', 'admin', True))
    print("Admin user created (username: admin, password: admin123)")
    
    # Insert sample doctor
    doctor_password = generate_password_hash('doctor123')
    cursor.execute('''INSERT INTO users (username, email, password_hash, full_name, phone, role, is_verified) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)''', 
                  ('drsmith', 'dr.smith@hospital.com', doctor_password, 'Dr. John Smith', '+1-555-0101', 'doctor', True))
    doctor_id = cursor.lastrowid
    
    # Insert doctor profile
    cursor.execute('''INSERT INTO doctor_profiles (user_id, department_id, specialization, experience_years, consultation_fee) 
                     VALUES (?, ?, ?, ?, ?)''', 
                  (doctor_id, 1, 'Internal Medicine', 10, 150.00))
    print("Sample doctor created (username: drsmith, password: doctor123)")
    
    # Insert sample patient
    patient_password = generate_password_hash('patient123')
    cursor.execute('''INSERT INTO users (username, email, password_hash, full_name, phone, role, is_verified) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)''', 
                  ('johnpat', 'john.patient@email.com', patient_password, 'John Patient', '+1-555-0201', 'patient', True))
    print("Sample patient created (username: johnpat, password: patient123)")
    
    # Insert pharmacy user
    pharmacy_password = generate_password_hash('pharmacy123')
    cursor.execute('''INSERT INTO users (username, email, password_hash, full_name, phone, role, is_verified) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)''', 
                  ('pharmacy1', 'pharmacy@hospital.com', pharmacy_password, 'Hospital Pharmacy', '+1-555-0301', 'pharmacy', True))
    print("Sample pharmacy user created (username: pharmacy1, password: pharmacy123)")
    
    # Insert sample medicines
    medicines = [
        ('Paracetamol 500mg', 'Acetaminophen', 'Generic Pharma', 'Tablet', '500mg', 0.50, 1000, 100),
        ('Amoxicillin 250mg', 'Amoxicillin', 'Antibiotic Co', 'Capsule', '250mg', 2.00, 500, 50),
        ('Ibuprofen 400mg', 'Ibuprofen', 'Pain Relief Ltd', 'Tablet', '400mg', 0.75, 800, 80),
        ('Metformin 500mg', 'Metformin HCl', 'Diabetes Care', 'Tablet', '500mg', 1.25, 600, 60),
        ('Lisinopril 10mg', 'Lisinopril', 'Heart Med Inc', 'Tablet', '10mg', 1.50, 400, 40),
        ('Simvastatin 20mg', 'Simvastatin', 'Cholesterol Co', 'Tablet', '20mg', 2.25, 300, 30),
        ('Omeprazole 20mg', 'Omeprazole', 'Gastro Pharma', 'Capsule', '20mg', 1.80, 450, 45),
        ('Cetirizine 10mg', 'Cetirizine HCl', 'Allergy Relief', 'Tablet', '10mg', 0.60, 750, 75)
    ]
    
    for name, generic, manufacturer, form, strength, price, stock, reorder in medicines:
        cursor.execute('''INSERT INTO medicines (name, generic_name, manufacturer, dosage_form, strength, 
                         price_per_unit, stock_quantity, reorder_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)''', 
                      (name, generic, manufacturer, form, strength, price, stock, reorder))
    print("Sample medicines added!")
    
    # Commit and close
    conn.commit()
    conn.close()
    print("Database initialization completed successfully!")
    print("\nLogin credentials:")
    print("Admin: admin / admin123")
    print("Doctor: drsmith / doctor123")
    print("Patient: johnpat / patient123")
    print("Pharmacy: pharmacy1 / pharmacy123")

if __name__ == '__main__':
    init_database()