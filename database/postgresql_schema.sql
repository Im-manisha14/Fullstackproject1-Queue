-- Queue-Free Healthcare System - PostgreSQL Schema
-- Complete database schema with sample data

-- Create database (run this separately)
-- CREATE DATABASE queue_healthcare;

-- Connect to queue_healthcare database and run below:

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'pharmacy', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Departments table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctor profiles table
CREATE TABLE doctor_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id),
    specialization VARCHAR(100),
    experience_years INTEGER,
    consultation_fee DECIMAL(10,2) DEFAULT 0.0,
    available_from TIME DEFAULT '09:00:00',
    available_to TIME DEFAULT '17:00:00',
    max_patients_per_day INTEGER DEFAULT 50
);

-- Appointments table
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES users(id),
    doctor_id INTEGER REFERENCES users(id),
    department_id INTEGER REFERENCES departments(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    token_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'booked' CHECK (status IN ('booked', 'in_queue', 'consulting', 'completed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'emergency')),
    estimated_duration INTEGER DEFAULT 15,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    symptoms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queue entries table
CREATE TABLE queue_entries (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
    queue_position INTEGER NOT NULL,
    estimated_wait_time INTEGER,
    checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'consulting', 'completed'))
);

-- Prescriptions table
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id),
    prescription_number VARCHAR(20) UNIQUE NOT NULL,
    diagnosis TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'dispensed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dispensed_at TIMESTAMP
);

-- Medicines table
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
);

-- Prescription medications table
CREATE TABLE prescription_medications (
    id SERIAL PRIMARY KEY,
    prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_id INTEGER REFERENCES medicines(id),
    quantity INTEGER NOT NULL,
    dosage_instructions VARCHAR(200),
    duration_days INTEGER,
    dispensed_quantity INTEGER DEFAULT 0
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_queue_entries_appointment ON queue_entries(appointment_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Insert departments
INSERT INTO departments (name, description) VALUES
('General Medicine', 'General healthcare and routine checkups'),
('Cardiology', 'Heart and cardiovascular system'),
('Neurology', 'Nervous system and brain disorders'),
('Orthopedics', 'Bones, joints and muscles'),
('Pediatrics', 'Child healthcare'),
('Gynecology', 'Women''s reproductive health'),
('Dermatology', 'Skin, hair and nail conditions'),
('Ophthalmology', 'Eye care and vision');

-- Note: User passwords are hashed, use the Python script to insert users with proper password hashing
-- Insert sample medicines
INSERT INTO medicines (name, generic_name, manufacturer, dosage_form, strength, price_per_unit, stock_quantity, reorder_level, expiry_date, batch_number) VALUES
('Paracetamol', 'Acetaminophen', 'PharmaCorp', 'Tablet', '500mg', 0.50, 500, 50, '2026-12-31', 'PC2024001'),
('Amoxicillin', 'Amoxicillin', 'AntiBio Ltd', 'Capsule', '250mg', 1.20, 200, 30, '2026-10-15', 'AB2024002'),
('Lisinopril', 'Lisinopril', 'CardioMed', 'Tablet', '10mg', 0.80, 300, 40, '2027-03-20', 'CM2024003'),
('Omeprazole', 'Omeprazole', 'GastroHealth', 'Capsule', '20mg', 0.90, 250, 35, '2026-08-10', 'GH2024004'),
('Metformin', 'Metformin HCl', 'DiabCare', 'Tablet', '500mg', 0.60, 400, 50, '2026-11-25', 'DC2024005'),
('Aspirin', 'Acetylsalicylic Acid', 'CardioMed', 'Tablet', '75mg', 0.30, 350, 45, '2026-09-30', 'CM2024006'),
('Ibuprofen', 'Ibuprofen', 'PainRelief Inc', 'Tablet', '400mg', 0.75, 280, 40, '2026-07-20', 'PR2024007'),
('Cetirizine', 'Cetirizine HCl', 'AllergyFree', 'Tablet', '10mg', 0.45, 180, 25, '2026-05-15', 'AF2024008');

-- Create a simple view for appointment queue
CREATE VIEW appointment_queue AS
SELECT 
    a.id,
    a.token_number,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.priority,
    p.full_name as patient_name,
    d.full_name as doctor_name,
    dept.name as department_name,
    q.queue_position,
    q.estimated_wait_time
FROM appointments a
JOIN users p ON a.patient_id = p.id
JOIN users d ON a.doctor_id = d.id
JOIN departments dept ON a.department_id = dept.id
LEFT JOIN queue_entries q ON a.id = q.appointment_id
ORDER BY a.appointment_date, q.queue_position;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;