
from backend.app import app, db
from sqlalchemy import text

def force_seed():
    with app.app_context():
        print("Forcing Seed...")
        # Departments
        db.session.execute(text("INSERT INTO departments (name, description) VALUES ('General Medicine', 'General') ON CONFLICT DO NOTHING"))
        db.session.execute(text("INSERT INTO departments (name, description) VALUES ('Cardiology', 'Heart') ON CONFLICT DO NOTHING"))
        
        # Pharmacy Inventory (Medicines)
        # Note: 'pharmacy_inventory' table
        db.session.execute(text("INSERT INTO pharmacy_inventory (medicine_name, quantity_in_stock, unit_price) VALUES ('Paracetamol', 100, 5.0) ON CONFLICT DO NOTHING"))
        db.session.execute(text("INSERT INTO pharmacy_inventory (medicine_name, quantity_in_stock, unit_price) VALUES ('Ibuprofen', 100, 10.0) ON CONFLICT DO NOTHING"))
        
        db.session.commit()
        print("Force Seed Complete.")

if __name__ == '__main__':
    force_seed()
