import sqlite3, datetime

c = sqlite3.connect('instance/healthcare_fresh.db')
cur = c.cursor()
today = str(datetime.date.today())
print('Today:', today)
print()

# Check all today's appointments
rows = cur.execute(
    "SELECT a.id, a.doctor_id, a.token_number, a.status, a.appointment_date, u.full_name "
    "FROM appointments a JOIN users u ON a.doctor_id=u.id "
    "WHERE a.appointment_date=? ORDER BY a.doctor_id, a.token_number",
    (today,)
).fetchall()

print(f"=== Today's appointments ({len(rows)} total) ===")
for r in rows:
    appt_id, doc_id, token, status, appt_date, dname = r
    # Simulate ahead_count from get_queue_status
    ahead = cur.execute(
        "SELECT COUNT(*) FROM appointments "
        "WHERE doctor_id=? AND appointment_date=? AND token_number<? "
        "AND status IN ('booked','in_queue','consulting')",
        (doc_id, appt_date, token)
    ).fetchone()[0]
    print(f"  Appt #{appt_id} | {dname} | Token={token} | status={status}")
    print(f"    => queue_position={ahead+1}, ahead_in_queue={ahead}, est_wait={ahead*15}min")

# Now simulate booking a 2nd patient for Kavitha Devi to test queue increment
print()
print("=== Simulating a 2nd patient booking Kavitha Devi today ===")
kavitha_id = cur.execute("SELECT id FROM users WHERE full_name LIKE '%Kavitha%'").fetchone()
if kavitha_id:
    next_token = cur.execute(
        "SELECT COALESCE(MAX(token_number),0)+1 FROM appointments WHERE doctor_id=? AND appointment_date=?",
        (kavitha_id[0], today)
    ).fetchone()[0]
    print(f"  Next token would be: {next_token}")
    # Count what would be ahead for that new patient
    ahead_new = cur.execute(
        "SELECT COUNT(*) FROM appointments "
        "WHERE doctor_id=? AND appointment_date=? AND token_number<? "
        "AND status IN ('booked','in_queue','consulting')",
        (kavitha_id[0], today, next_token)
    ).fetchone()[0]
    print(f"  => queue_position={ahead_new+1}, ahead={ahead_new}, wait={ahead_new*15}min")

c.close()
