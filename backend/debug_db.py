import sqlite3

def fetch_prescriptions():
    try:
        conn = sqlite3.connect('instance/healthcare_fresh.db')
        cursor = conn.cursor()
        
        query = "SELECT id, patient_id, doctor_id, appointment_id, pharmacy_status, created_at FROM prescriptions LIMIT 5;"
        cursor.execute(query)
        rows = cursor.fetchall()
        
        print("Prescriptions:")
        for row in rows:
            print(row)
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_prescriptions()