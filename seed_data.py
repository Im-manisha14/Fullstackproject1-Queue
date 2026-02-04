
from backend.app import app, db, Department, Medicine

def seed():
    with app.app_context():
        # Seed Departments
        depts = ['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics']
        for d_name in depts:
            if not Department.query.filter_by(name=d_name).first():
                db.session.add(Department(name=d_name, description=f"{d_name} Department"))
        
        # Seed Medicines
        meds = [
            ('Paracetamol', '500mg', 100),
            ('Amoxicillin', '250mg', 50),
            ('Ibuprofen', '400mg', 100),
            ('Metformin', '500mg', 50),
            ('Cough Syrup', '100ml', 30)
        ]
        for name, strength, stock in meds:
            if not Medicine.query.filter_by(name=name, strength=strength).first():
                db.session.add(Medicine(name=name, strength=strength, stock_quantity=stock, expiry_date='2025-12-31'))
        
        db.session.commit()
        print("Seeding Complete: Departments and Medicines added.")

if __name__ == '__main__':
    seed()
