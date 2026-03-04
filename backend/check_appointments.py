import sqlite3
from datetime import date

# Connect to database
conn = sqlite3.connect('instance/healthcare_fresh.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

today = str(date.today())
print('Today:', today)
print() 

# Show all current appointments for today
print('=== Current appointments for today ===')
rows = cur.execute('''
    SELECT a.id, a.patient_id, a.patient_name, a.doctor_id, a.token_number, 
           a.status, a.appointment_date, u.full_name as doctor_name,
           p.full_name as registered_patient_name
    FROM appointments a 
    JOIN users u ON a.doctor_id = u.id
    LEFT JOIN users p ON a.patient_id = p.id
    WHERE a.appointment_date = ? AND a.status != 'expired'
    ORDER BY a.doctor_id, a.token_number
''', (today,)).fetchall()

for row in rows:
    print(f'ID: {row["id"]}, Patient ID: {row["patient_id"]}, Custom Name: "{row["patient_name"]}", Registered Name: "{row["registered_patient_name"]}", Doctor: {row["doctor_name"]}, Token: {row["token_number"]}, Status: {row["status"]}')

print(f'\nTotal appointments today: {len(rows)}')
conn.close()