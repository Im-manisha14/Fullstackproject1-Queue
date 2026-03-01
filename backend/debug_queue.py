import sqlite3
from datetime import datetime

conn = sqlite3.connect('instance/healthcare_fresh.db')
cur = conn.cursor()

today = datetime.now().strftime('%Y-%m-%d')
print('Today:', today)

# Mark all past booked/in_queue/consulting as expired
cur.execute(
    "UPDATE appointments SET status='expired' WHERE appointment_date < ? AND status IN ('booked','in_queue','consulting')",
    (today,)
)
conn.commit()
print(f'Marked {cur.rowcount} past appointment(s) as expired')

# Verify active list for patient_id=1
print('\n=== Active appointments for patient 1 ===')
for r in cur.execute(
    "SELECT a.id, a.appointment_date, a.status, a.token_number, u.full_name "
    "FROM appointments a JOIN users u ON a.doctor_id=u.id "
    "WHERE a.patient_id=1 AND a.status IN ('booked','in_queue','consulting') AND a.appointment_date>=? "
    "ORDER BY a.appointment_date", (today,)
).fetchall():
    print(r)

conn.close()
print('DONE')
