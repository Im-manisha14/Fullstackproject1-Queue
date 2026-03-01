import sqlite3, datetime

c = sqlite3.connect('instance/healthcare_fresh.db')
cur = c.cursor()
today = str(datetime.date.today())

# Kavitha user_id=85, Rajendran user_id=104 (confirmed from check_ids)
for doc_uid, doc_name in [(85, 'Dr. S. Kavitha Devi'), (104, 'Dr. K. Rajendran')]:
    next_tok = cur.execute(
        "SELECT COALESCE(MAX(token_number),0)+1 FROM appointments WHERE doctor_id=? AND appointment_date=?",
        (doc_uid, today)
    ).fetchone()[0]
    p2 = cur.execute("SELECT id, full_name FROM users WHERE role='patient' AND id!=1 LIMIT 1").fetchone()
    if not p2: continue
    p2_id, p2_name = p2
    cur.execute(
        "INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, token_number, symptoms, status, priority, created_at) "
        "VALUES (?, ?, ?, '10:00', ?, 'Test', 'in_queue', 'normal', datetime('now'))",
        (p2_id, doc_uid, today, next_tok)
    )
    c.commit()
    new_id = cur.lastrowid
    print(f"\n=== {doc_name} queue with test 2nd patient (token #{next_tok}) ===")
    rows = cur.execute(
        "SELECT a.id, a.token_number, u.full_name FROM appointments a JOIN users u ON a.patient_id=u.id "
        "WHERE a.doctor_id=? AND a.appointment_date=? ORDER BY a.token_number",
        (doc_uid, today)
    ).fetchall()
    for (aid, tok, pname) in rows:
        ahead = cur.execute(
            "SELECT COUNT(*) FROM appointments WHERE doctor_id=? AND appointment_date=? "
            "AND token_number<? AND status IN ('booked','in_queue','consulting')",
            (doc_uid, today, tok)
        ).fetchone()[0]
        print(f"  Token #{tok} | {pname} | queue_position={ahead+1}, ahead={ahead}, wait={ahead*15}min")
    cur.execute("DELETE FROM appointments WHERE id=?", (new_id,))
c.commit()
print("\nTest appointments cleaned up.")
c.close()

# DEAD CODE BELOW — kept for reference
kavitha = cur.execute(
    "SELECT u.id FROM users u JOIN doctor_profiles dp ON dp.user_id=u.id WHERE u.full_name LIKE '%Kavitha%'"
).fetchone()
if not kavitha:
    print("Kavitha not found")
    c.close()
    exit()
kavitha_user_id = kavitha[0]
print(f"Kavitha user_id: {kavitha_user_id}")

# Get a second test patient (not patient 1)
p2 = cur.execute("SELECT id, full_name FROM users WHERE role='patient' AND id!=1 LIMIT 1").fetchone()
if not p2:
    print("No second patient found")
    c.close()
    exit()
p2_id, p2_name = p2
print(f"Second patient: {p2_name} (id={p2_id})")

# Get next token for Kavitha today
next_tok = cur.execute(
    "SELECT COALESCE(MAX(token_number),0)+1 FROM appointments WHERE doctor_id=? AND appointment_date=?",
    (kavitha_user_id, today)
).fetchone()[0]
print(f"Next token for Kavitha today: {next_tok}")

# Insert a test appointment for this second patient
cur.execute(
    "INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, token_number, symptoms, status, priority, created_at) "
    "VALUES (?, ?, ?, '10:00', ?, 'Test booking', 'in_queue', 'normal', datetime('now'))",
    (p2_id, kavitha_user_id, today, next_tok)
)
new_id = cur.lastrowid
c.commit()
print(f"Created test appointment id={new_id} for {p2_name}, token={next_tok}")
print()

# Now check queue for ALL today's Kavitha appointments
rows = cur.execute(
    "SELECT a.id, a.patient_id, a.token_number, a.status, u.full_name as patient FROM appointments a "
    "JOIN users u ON a.patient_id=u.id WHERE a.doctor_id=? AND a.appointment_date=? ORDER BY a.token_number",
    (kavitha_user_id, today)
).fetchall()

print("=== Kavitha Devi's queue today ===")
for (aid, pid, tok, status, pname) in rows:
    ahead = cur.execute(
        "SELECT COUNT(*) FROM appointments WHERE doctor_id=? AND appointment_date=? AND token_number<? AND status IN ('booked','in_queue','consulting')",
        (kavitha_user_id, today, tok)
    ).fetchone()[0]
    print(f"  Token #{tok} | {pname} | status={status}")
    print(f"    => queue_position={ahead+1}, ahead={ahead}, est_wait={ahead*15}min")

# Clean up — remove test appointment
cur.execute("DELETE FROM appointments WHERE id=?", (new_id,))
c.commit()
print()
print(f"Cleaned up test appointment {new_id}")
c.close()
