"""
PostgreSQL Database Initialization for Queue-Free Healthcare System
Creates tables and populates initial data
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from werkzeug.security import generate_password_hash
from datetime import datetime, date, time

def create_database():
    """Create the healthcare_queue database if it doesn't exist"""
    try:
        # Connect to PostgreSQL server (default database)
        conn = psycopg2.connect(
            host="localhost",
            user="postgres",
            password="password",
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Create database
        cursor.execute("DROP DATABASE IF EXISTS healthcare_queue")
        cursor.execute("CREATE DATABASE healthcare_queue")
        
        cursor.close()
        conn.close()
        print("Database 'healthcare_queue' created successfully!")
        
    except psycopg2.Error as e:
        print(f"Error creating database: {e}")
        return False
    
    return True

def init_database():
    """Initialize tables and sample data"""
    try:
        # Connect to the healthcare_queue database
        conn = psycopg2.connect(
            host="localhost",
            user="postgres",
            password="password",
            database="healthcare_queue"
        )
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            phone VARCHAR(20),
            role VARCHAR(20) NOT NULL,
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )''')
        
        cursor.execute('''
        CREATE TABLE departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        cursor.execute('''
        CREATE TABLE doctor_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            department_id INTEGER NOT NULL REFERENCES departments(id),
            specialization VARCHAR(100),
            experience_years INTEGER,
            consultation_fee DECIMAL(10,2) DEFAULT 0.0,
            available_from TIME DEFAULT '09:00',
            available_to TIME DEFAULT '17:00',
            max_patients_per_day INTEGER DEFAULT 50
        )''')
        
        cursor.execute('''
        CREATE TABLE appointments (
            id SERIAL PRIMARY KEY,
            patient_id INTEGER NOT NULL REFERENCES users(id),
            doctor_id INTEGER NOT NULL REFERENCES users(id),
            department_id INTEGER NOT NULL REFERENCES departments(id),
            appointment_date DATE NOT NULL,
            appointment_time TIME NOT NULL,
            token_number INTEGER NOT NULL,
            status VARCHAR(20) DEFAULT 'booked',
            priority VARCHAR(10) DEFAULT 'normal',
            estimated_duration INTEGER DEFAULT 15,
            actual_start_time TIMESTAMP,
            actual_end_time TIMESTAMP,
            symptoms TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        cursor.execute('''
        CREATE TABLE queue_entries (
            id SERIAL PRIMARY KEY,
            appointment_id INTEGER NOT NULL REFERENCES appointments(id),
            queue_position INTEGER NOT NULL,
            estimated_wait_time INTEGER,
            checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            called_at TIMESTAMP,
            status VARCHAR(20) DEFAULT 'waiting'
        )''')
        
        cursor.execute('''
        CREATE TABLE prescriptions (
            id SERIAL PRIMARY KEY,
            appointment_id INTEGER NOT NULL REFERENCES appointments(id),
            prescription_number VARCHAR(20) UNIQUE NOT NULL,
            diagnosis TEXT,
            notes TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            dispensed_at TIMESTAMP
        )''')
        
        cursor.execute('''
        CREATE TABLE medicines (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            generic_name VARCHAR(100),
            manufacturer VARCHAR(100),
            dosage_form VARCHAR(50),
            strength VARCHAR(50),
            price_per_unit DECIMAL(10,2) NOT NULL,
            stock_quantity INTEGER DEFAULT 0,
            reorder_level INTEGER DEFAULT 10,
            expiry_date DATE,
            batch_number VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        cursor.execute('''
        CREATE TABLE prescription_medications (
            id SERIAL PRIMARY KEY,
            prescription_id INTEGER NOT NULL REFERENCES prescriptions(id),
            medicine_id INTEGER NOT NULL REFERENCES medicines(id),
            quantity INTEGER NOT NULL,
            dosage_instructions VARCHAR(200),
            duration_days INTEGER,
            dispensed_quantity INTEGER DEFAULT 0
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
            cursor.execute('INSERT INTO departments (name, description) VALUES (%s, %s)', (name, desc))
        print("Sample departments added!")
        
        # Insert users
        admin_password = generate_password_hash('admin123')
        cursor.execute('''INSERT INTO users (username, email, password_hash, full_name, role, is_verified) 
                         VALUES (%s, %s, %s, %s, %s, %s)''', 
                      ('admin', 'admin@hospital.com', admin_password, 'System Administrator', 'admin', True))
        print("Admin user created (username: admin, password: admin123)")
        
        doctor_password = generate_password_hash('doctor123')
        cursor.execute('''INSERT INTO users (username, email, password_hash, full_name, phone, role, is_verified) 
                         VALUES (%s, %s, %s, %s, %s, %s, %s)''', 
                      ('drsmith', 'dr.smith@hospital.com', doctor_password, 'Dr. John Smith', '+1-555-0101', 'doctor', True))
        
        # Get doctor ID for profile
        cursor.execute('SELECT id FROM users WHERE username = %s', ('drsmith',))
        doctor_id = cursor.fetchone()[0]
        
        # Insert doctor profile
        cursor.execute('''INSERT INTO doctor_profiles (user_id, department_id, specialization, experience_years, consultation_fee) 
                         VALUES (%s, %s, %s, %s, %s)''', 
                      (doctor_id, 1, 'Internal Medicine', 10, 150.00))
        print("Sample doctor created (username: drsmith, password: doctor123)")
        
        # Insert patient
        patient_password = generate_password_hash('patient123')
        cursor.execute('''INSERT INTO users (username, email, password_hash, full_name, phone, role, is_verified) 
                         VALUES (%s, %s, %s, %s, %s, %s, %s)''', 
                      ('johnpat', 'john.patient@email.com', patient_password, 'John Patient', '+1-555-0201', 'patient', True))
        print("Sample patient created (username: johnpat, password: patient123)")
        
        # Insert pharmacy user
        pharmacy_password = generate_password_hash('pharmacy123')
        cursor.execute('''INSERT INTO users (username, email, password_hash, full_name, phone, role, is_verified) 
                         VALUES (%s, %s, %s, %s, %s, %s, %s)''', 
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
                             price_per_unit, stock_quantity, reorder_level) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''', 
                          (name, generic, manufacturer, form, strength, price, stock, reorder))
        print("Sample medicines added!")
        
        # Commit and close
        conn.commit()
        cursor.close()
        conn.close()
        print("PostgreSQL database initialization completed successfully!")
        print("\nLogin credentials:")
        print("Admin: admin / admin123")
        print("Doctor: drsmith / doctor123")
        print("Patient: johnpat / patient123")
        print("Pharmacy: pharmacy1 / pharmacy123")
        
    except psycopg2.Error as e:
        print(f"Error initializing database: {e}")
        return False
    
    return True

if __name__ == '__main__':
    if create_database():
        init_database()