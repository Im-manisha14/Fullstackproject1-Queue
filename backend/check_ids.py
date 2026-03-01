import sqlite3
c = sqlite3.connect('instance/healthcare_fresh.db')
cur = c.cursor()

# Step 1: What's in appointment 19?
row = cur.execute('SELECT a.id, a.doctor_id, a.token_number, a.status, u.full_name FROM appointments a JOIN users u ON a.doctor_id=u.id WHERE a.id=19').fetchone()
print('Appt 19:', row)

row2 = cur.execute('SELECT a.id, a.doctor_id, a.token_number, a.status, u.full_name FROM appointments a JOIN users u ON a.doctor_id=u.id WHERE a.id=23').fetchone()
print('Appt 23:', row2)

# Step 2: All today's appointments
today = '2026-03-01'
rows = cur.execute('SELECT a.id, a.doctor_id, a.token_number, a.status, u.full_name FROM appointments a JOIN users u ON a.doctor_id=u.id WHERE a.appointment_date=? ORDER BY a.token_number', (today,)).fetchall()
print('\nAll today:', rows)

# Step 3: Check if doctor_id matches what doctor_profiles returns
dp = cur.execute('SELECT id, user_id FROM doctor_profiles LIMIT 5').fetchall()
print('\nDoctor profiles sample:', dp)

c.close()
