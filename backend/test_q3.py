import sqlite3, datetime

c = sqlite3.connect('instance/healthcare_fresh.db')
cur = c.cursor()
today = str(datetime.date.today())

# Add 2nd patient to Kavitha queue (doc user_id=85)
p2 = cur.execute("SELECT id, full_name FROM users WHERE role='patient' AND id!=1 LIMIT 1").fetchone()
p2_id, p2_name = p2

next_tok = cur.execute(
    "SELECT COALESCE(MAX(token_number),0)+1 FROM appointments WHERE doctor_id=85 AND appointment_date=?",
    (today,)
).fetchone()[0]
print(f"Adding {p2_name} (id={p2_id}) as token #{next_tok} for Kavitha Devi")

cur.execute(
    "INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, token_number, symptoms, status, priority, created_at) "
    "VALUES (?, 85, ?, '10:00', ?, 'Test booking', 'in_queue', 'normal', datetime('now'))",
    (p2_id, today, next_tok)
)
c.commit()
new_id = cur.lastrowid

print("\n=== Kavitha Devi queue now ===")
rows = cur.execute(
    "SELECT a.token_number, a.status, u.full_name "
    "FROM appointments a JOIN users u ON a.patient_id=u.id "
    "WHERE a.doctor_id=85 AND a.appointment_date=? ORDER BY a.token_number",
    (today,)
).fetchall()
for tok, status, name in rows:
    ahead = cur.execute(
        "SELECT COUNT(*) FROM appointments WHERE doctor_id=85 AND appointment_date=? "
        "AND token_number<? AND status IN ('booked','in_queue','consulting')",
        (today, tok)
    ).fetchone()[0]
    print(f"  Token #{tok} | {name:30s} | ahead={ahead} | wait={ahead*15}min | position={ahead+1}")

# cleanup
cur.execute("DELETE FROM appointments WHERE rowid=?", (new_id,))
c.commit()
print("\nTest record cleaned up.")
c.close()
