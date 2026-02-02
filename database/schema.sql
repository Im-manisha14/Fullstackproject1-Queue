-- Secure Healthcare Management System Database Schema
-- Enhanced with role-based security and verification features

CREATE DATABASE IF NOT EXISTS secure_healthcare;
USE secure_healthcare;

-- Users table with enhanced security features
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('patient', 'doctor', 'pharmacy', 'admin')) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,  -- Admin verification for doctors/pharmacy
    verification_token VARCHAR(255),    -- For email verification if needed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_verification (is_verified, is_active)
);

-- Departments table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_departments_active (is_active)
);

-- Doctors table with enhanced verification
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    department_id INTEGER,
    specialization VARCHAR(255),
    license_number VARCHAR(50) UNIQUE,
    consultation_fee DECIMAL(10,2) DEFAULT 0.00,
    availability_start TIME DEFAULT '09:00:00',
    availability_end TIME DEFAULT '17:00:00',
    max_patients_per_day INTEGER DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    
    INDEX idx_doctors_user (user_id),
    INDEX idx_doctors_department (department_id),
    INDEX idx_doctors_license (license_number)
);

-- Patients table
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    emergency_contact VARCHAR(20),
    medical_history TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_patients_user (user_id)
);

-- Appointments table with enhanced status tracking
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    token_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
    estimated_duration INTEGER DEFAULT 15,  -- minutes
    symptoms TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    
    INDEX idx_appointments_patient (patient_id),
    INDEX idx_appointments_doctor (doctor_id),
    INDEX idx_appointments_date (appointment_date),
    INDEX idx_appointments_status (status),
    UNIQUE KEY unique_doctor_date_token (doctor_id, appointment_date, token_number)
);

-- Queue status table for real-time tracking
CREATE TABLE queue_status (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL,
    current_token INTEGER NOT NULL,
    estimated_wait_time INTEGER, -- minutes
    queue_position INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    
    INDEX idx_queue_appointment (appointment_id)
);

-- Prescriptions table with enhanced tracking
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    prescription_data JSON NOT NULL,  -- Medicines array in JSON format
    notes TEXT,
    status VARCHAR(20) DEFAULT 'sent_to_pharmacy' CHECK (status IN ('sent_to_pharmacy', 'processing', 'ready_for_pickup', 'dispensed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    dispensed_at TIMESTAMP NULL,
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    
    INDEX idx_prescriptions_appointment (appointment_id),
    INDEX idx_prescriptions_doctor (doctor_id),
    INDEX idx_prescriptions_patient (patient_id),
    INDEX idx_prescriptions_status (status),
    INDEX idx_prescriptions_created (created_at)
);

-- Pharmacy inventory with enhanced stock management
CREATE TABLE pharmacy_inventory (
    id SERIAL PRIMARY KEY,
    medicine_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    manufacturer VARCHAR(255),
    batch_number VARCHAR(100),
    expiry_date DATE,
    quantity_in_stock INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    minimum_stock_alert INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_inventory_name (medicine_name),
    INDEX idx_inventory_generic (generic_name),
    INDEX idx_inventory_stock (quantity_in_stock),
    INDEX idx_inventory_expiry (expiry_date)
);

-- Security audit log table for tracking access and changes
CREATE TABLE security_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,  -- login, logout, create, update, delete, access_denied
    resource VARCHAR(100),         -- appointment, prescription, user, etc.
    resource_id INTEGER,
    ip_address VARCHAR(45),        -- IPv4 and IPv6 support
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_success (success)
);

-- System settings table for configuration
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default departments
INSERT INTO departments (name, description) VALUES
    ('Cardiology', 'Heart and cardiovascular diseases'),
    ('Neurology', 'Brain and nervous system disorders'),
    ('Orthopedics', 'Bone and joint conditions'),
    ('Pediatrics', 'Children healthcare'),
    ('Gynecology', 'Women\'s health and reproductive medicine'),
    ('Dermatology', 'Skin, hair, and nail conditions'),
    ('Internal Medicine', 'General internal medicine'),
    ('Surgery', 'Surgical procedures and operations'),
    ('Emergency Medicine', 'Emergency and urgent care'),
    ('Psychiatry', 'Mental health and psychiatric care');

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('max_appointments_per_day', '50', 'Maximum appointments per doctor per day'),
    ('appointment_duration_default', '15', 'Default appointment duration in minutes'),
    ('queue_update_interval', '30', 'Queue status update interval in seconds'),
    ('prescription_auto_expire_days', '30', 'Days after which uncollected prescriptions expire'),
    ('low_stock_alert_threshold', '10', 'Default minimum stock level for alerts'),
    ('security_audit_retention_days', '90', 'Days to retain security audit logs'),
    ('password_min_length', '8', 'Minimum password length requirement'),
    ('session_timeout_hours', '8', 'JWT token expiration time in hours');

-- Create views for common queries

-- Active doctors view
CREATE VIEW active_doctors AS
SELECT 
    d.id,
    u.full_name,
    u.email,
    d.specialization,
    dept.name as department,
    d.consultation_fee,
    d.availability_start,
    d.availability_end,
    d.max_patients_per_day
FROM doctors d
JOIN users u ON d.user_id = u.id
LEFT JOIN departments dept ON d.department_id = dept.id
WHERE u.is_active = true AND u.is_verified = true;

-- Patient appointments view
CREATE VIEW patient_appointments AS
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.token_number,
    a.status,
    a.symptoms,
    p.id as patient_id,
    pu.full_name as patient_name,
    d.id as doctor_id,
    du.full_name as doctor_name,
    d.specialization,
    dept.name as department
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN users pu ON p.user_id = pu.id
JOIN doctors d ON a.doctor_id = d.id
JOIN users du ON d.user_id = du.id
LEFT JOIN departments dept ON d.department_id = dept.id;

-- Pharmacy prescription queue view
CREATE VIEW pharmacy_prescription_queue AS
SELECT 
    pr.id,
    pr.prescription_data,
    pr.notes,
    pr.status,
    pr.created_at,
    pu.full_name as patient_name,
    pu.phone as patient_phone,
    du.full_name as doctor_name,
    a.appointment_date
FROM prescriptions pr
JOIN patients p ON pr.patient_id = p.id
JOIN users pu ON p.user_id = pu.id
JOIN doctors d ON pr.doctor_id = d.id
JOIN users du ON d.user_id = du.id
JOIN appointments a ON pr.appointment_id = a.id
WHERE pr.status IN ('sent_to_pharmacy', 'processing', 'ready_for_pickup')
ORDER BY pr.created_at ASC;
    medical_history TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    doctor_id INTEGER REFERENCES doctors(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    token_number INTEGER NOT NULL,
    status VARCHAR(20) CHECK (status IN ('scheduled', 'waiting', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
    estimated_duration INTEGER DEFAULT 15, -- in minutes
    symptoms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doctor_id, appointment_date, appointment_time)
);

-- Queue management table
CREATE TABLE queue_status (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id),
    current_token INTEGER NOT NULL,
    estimated_wait_time INTEGER, -- in minutes
    queue_position INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions table
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id),
    doctor_id INTEGER REFERENCES doctors(id),
    patient_id INTEGER REFERENCES patients(id),
    prescription_data JSONB NOT NULL, -- Store medicines as JSON
    notes TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'sent_to_pharmacy', 'processing', 'ready', 'dispensed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy inventory table
CREATE TABLE pharmacy_inventory (
    id SERIAL PRIMARY KEY,
    medicine_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    manufacturer VARCHAR(255),
    batch_number VARCHAR(100),
    expiry_date DATE,
    quantity_in_stock INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2),
    minimum_stock_alert INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy transactions table
CREATE TABLE pharmacy_transactions (
    id SERIAL PRIMARY KEY,
    prescription_id INTEGER REFERENCES prescriptions(id),
    pharmacy_user_id INTEGER REFERENCES users(id),
    transaction_data JSONB NOT NULL, -- Store dispensed medicines
    total_amount DECIMAL(10,2),
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'partial')) DEFAULT 'pending',
    dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_queue_appointment ON queue_status(appointment_id);
CREATE INDEX idx_pharmacy_medicine ON pharmacy_inventory(medicine_name);

-- Insert sample data
INSERT INTO departments (name, description) VALUES
('General Medicine', 'General health checkups and primary care'),
('Cardiology', 'Heart and cardiovascular system'),
('Pediatrics', 'Medical care for infants, children and adolescents'),
('Orthopedics', 'Musculoskeletal system disorders'),
('Dermatology', 'Skin, hair and nail conditions');

INSERT INTO users (email, password_hash, role, full_name, phone) VALUES
('admin@qfree.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewgwqJzKX6jc/S', 'admin', 'System Administrator', '+1234567890'),
('dr.smith@qfree.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewgwqJzKX6jc/S', 'doctor', 'Dr. John Smith', '+1234567891'),
('dr.wilson@qfree.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewgwqJzKX6jc/S', 'doctor', 'Dr. Sarah Wilson', '+1234567892'),
('pharmacy@qfree.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewgwqJzKX6jc/S', 'pharmacy', 'Central Pharmacy', '+1234567893'),
('patient@qfree.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewgwqJzKX6jc/S', 'patient', 'John Doe', '+1234567894');

INSERT INTO doctors (user_id, department_id, specialization, license_number, consultation_fee, availability_start, availability_end) VALUES
(2, 1, 'General Practitioner', 'MD001', 50.00, '09:00:00', '17:00:00'),
(3, 2, 'Cardiologist', 'MD002', 100.00, '10:00:00', '16:00:00');

INSERT INTO patients (user_id, date_of_birth, gender, address, emergency_contact) VALUES
(5, '1990-05-15', 'Male', '123 Main St, City', '+1234567895');

INSERT INTO pharmacy_inventory (medicine_name, generic_name, manufacturer, quantity_in_stock, unit_price, minimum_stock_alert) VALUES
('Paracetamol 500mg', 'Acetaminophen', 'PharmaCorp', 100, 2.50, 20),
('Amoxicillin 250mg', 'Amoxicillin', 'MediLab', 50, 5.00, 10),
('Lisinopril 10mg', 'Lisinopril', 'CardioMeds', 75, 8.00, 15),
('Metformin 500mg', 'Metformin HCl', 'DiabetCare', 200, 3.50, 25);