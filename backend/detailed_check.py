import sqlite3
from datetime import date

# Connect to database
conn = sqlite3.connect('instance/healthcare_fresh.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

today = str(date.today())
print('Today:', today)
print() 

# Check all users in the system
print('=== All users in system ===')
users = cur.execute('''
    SELECT id, username, full_name, role 
    FROM users 
    ORDER BY id
''').fetchall()

for user in users:
    print(f'ID: {user["id"]}, Username: {user["username"]}, Full Name: "{user["full_name"]}", Role: {user["role"]}')

print() 

# Check if there are any appointments with patient_name containing "Ashrudi"
print('=== Appointments with custom patient names ===')
custom_appointments = cur.execute('''
    SELECT a.id, a.patient_id, a.patient_name, a.doctor_id, a.token_number, 
           a.status, a.appointment_date, a.created_at,
           u.full_name as doctor_name,
           p.full_name as registered_patient_name
    FROM appointments a 
    JOIN users u ON a.doctor_id = u.id
    LEFT JOIN users p ON a.patient_id = p.id
    WHERE a.patient_name IS NOT NULL AND a.patient_name != ''
    ORDER BY a.created_at DESC
''').fetchall()

if custom_appointments:
    for row in custom_appointments:
        print(f'ID: {row["id"]}, Custom Name: "{row["patient_name"]}", Registered: "{row["registered_patient_name"]}", Date: {row["appointment_date"]}, Created: {row["created_at"]}')
else:
    print('No appointments found with custom patient names.')

print()

# Check all appointments for the last few days
print('=== All recent appointments (last 7 days) ===')
recent_appointments = cur.execute('''
    SELECT a.id, a.patient_id, a.patient_name, a.doctor_id, a.token_number, 
           a.status, a.appointment_date, a.created_at,
           u.full_name as doctor_name,
           p.full_name as registered_patient_name
    FROM appointments a 
    JOIN users u ON a.doctor_id = u.id
    LEFT JOIN users p ON a.patient_id = p.id
    WHERE a.appointment_date >= date('now', '-7 days')
    ORDER BY a.created_at DESC
''').fetchall()

for row in recent_appointments:
    patient_display = row["patient_name"] if row["patient_name"] else row["registered_patient_name"]
    print(f'ID: {row["id"]}, Display Name: "{patient_display}", Patient ID: {row["patient_id"]}, Date: {row["appointment_date"]}, Status: {row["status"]}, Created: {row["created_at"]}')

print(f'\nTotal recent appointments: {len(recent_appointments)}')
conn.close()