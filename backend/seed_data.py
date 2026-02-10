
import sys
import os

# Add current directory to path so imports work
sys.path.append(os.getcwd())

from app import app, db, Department, PharmacyInventory

def seed():
    with app.app_context():
        # Seed Departments
        depts = ['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics']
        for d_name in depts:
            if not Department.query.filter_by(name=d_name).first():
                db.session.add(Department(name=d_name, description=f"{d_name} Department"))
        
        # Seed Inventory
        meds = [
            ('Paracetamol', '500mg', 100),
            ('Amoxicillin', '250mg', 50),
            ('Ibuprofen', '400mg', 100),
            ('Metformin', '500mg', 50),
            ('Cough Syrup', '100ml', 30)
        ]
        for name, generic, stock in meds:
            # Assuming medicine_name is unique or close enough for seed
            if not PharmacyInventory.query.filter_by(medicine_name=name).first():
                db.session.add(PharmacyInventory(
                    medicine_name=name,
                    generic_name=generic,
                    quantity_in_stock=stock,
                    expiry_date='2025-12-31',
                    unit_price=10.0
                ))
        
        db.session.commit()
        print("Seeding Complete: Departments and PharmacyInventory added.")

if __name__ == '__main__':
    seed()
