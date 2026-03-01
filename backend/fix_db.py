import sqlite3
from datetime import date

c = sqlite3.connect('instance/healthcare_fresh.db')
c.row_factory = sqlite3.Row
cur = c.cursor()

today = str(date.today())
print('Today:', today)

# Show all not-yet-expired past appointments
rows = cur.execute(
    "SELECT id, appointment_date, status FROM appointments "
    "WHERE appointment_date < ? AND status NOT IN ('completed','cancelled','expired')",
    (today,)
).fetchall()
print('Past active (should be expired):', [dict(r) for r in rows])

# Expire them
n = cur.execute(
    "UPDATE appointments SET status='expired' "
    "WHERE appointment_date < ? AND status IN ('booked','in_queue','consulting')",
    (today,)
).rowcount
c.commit()
print('Marked expired now:', n)

# Show what patient 1 sees now
print('\nPatient 1 appointments:')
rows2 = cur.execute(
    "SELECT a.id, a.appointment_date, a.status, a.token_number, u.full_name "
    "FROM appointments a JOIN users u ON a.doctor_id=u.id "
    "WHERE a.patient_id=1 ORDER BY a.appointment_date DESC"
).fetchall()
for r in rows2:
    print(dict(r))

c.close()
