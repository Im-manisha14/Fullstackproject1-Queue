import sqlite3
import re
from datetime import date

def test_name_validation():
    """Test various name patterns against the current validation rules."""
    
    # Backend validation patterns
    registration_pattern = r'^[a-zA-Z\s\.\-]+$'  # Registration full_name validation
    booking_pattern = r'^[a-zA-Z\s\.\-\']+$'     # Patient booking validation
    
    # Test names - various formats and edge cases
    test_names = [
        # Basic names
        "John Doe",
        "Mary Jane",
        "Ashrudi",
        "Rajesh Kumar",
        
        # Names with dots
        "Dr. Smith",
        "J.K. Rowling",
        "St. Mary",
        
        # Names with hyphens
        "Anne-Marie",
        "Jean-Paul",
        "Mary-Jane",
        
        # Names with apostrophes (should work in booking but not registration)
        "O'Connor",
        "D'Angelo",
        "Mary O'Brien",
        
        # Single character names
        "A",
        "X Y",
        
        # International names (should fail with current validation)
        "José María",
        "François",
        "Müller",
        "李小明",
        "Ahmed Al-Rashid",
        
        # Names with numbers (should fail)
        "John 2",
        "Mary Jane 3rd",
        
        # Names with special characters (should fail)
        "John@Doe",
        "Mary&Jane",
        "John+Smith",
        "Mary (Jane)",
        "John/Smith",
        
        # Very short names
        "",
        " ",
        "A",
        
        # Very long names
        "VeryVeryVeryLongNameThatExceedsNormalLimits" * 3,
        
        # Edge cases
        "   John Doe   ",  # Leading/trailing spaces
        "John  Doe",      # Multiple spaces
        ".John",          # Starting with dot
        "John.",          # Ending with dot
        "-John",          # Starting with hyphen
        "John-",          # Ending with hyphen
    ]
    
    print("=== NAME VALIDATION TEST RESULTS ===\n")
    print("Registration Pattern:", registration_pattern)
    print("Booking Pattern:     ", booking_pattern)
    print()
    
    print("LEGEND: ✅ = Passes, ❌ = Fails, ⚠️  = Length Issue")
    print("-" * 80)
    
    issues_found = []
    
    for name in test_names:
        # Test length validation (both require >= 2 chars after strip)
        name_stripped = name.strip()
        length_ok = len(name_stripped) >= 2
        
        # Test pattern matching
        registration_ok = bool(re.match(registration_pattern, name_stripped)) if name_stripped else False
        booking_ok = bool(re.match(booking_pattern, name_stripped)) if name_stripped else False
        
        # Status indicators
        length_status = "✅" if length_ok else "⚠️ "
        reg_status = "✅" if registration_ok and length_ok else "❌"
        book_status = "✅" if booking_ok and length_ok else "❌"
        
        print(f'Name: "{name:30}" | Length: {length_status} | Registration: {reg_status} | Booking: {book_status}')
        
        # Track issues
        if registration_ok != booking_ok and length_ok:
            issues_found.append(f'Inconsistency: "{name}" - Registration: {reg_status}, Booking: {book_status}')
    
    print("-" * 80)
    
    if issues_found:
        print("\n🚨 VALIDATION INCONSISTENCIES FOUND:")
        for issue in issues_found:
            print(f"  • {issue}")
    else:
        print("\n✅ No inconsistencies found between registration and booking validation.")
    
    print("\n=== RECOMMENDATIONS ===")
    print("1. ⚠️  Registration pattern is more restrictive than booking pattern (missing apostrophe support)")
    print("2. 🌍 Consider supporting international characters for global users")
    print("3. 📏 Current minimum length: 2 characters")
    print("4. 🔤 Currently only supports: Letters, Spaces, Dots, Hyphens, Apostrophes (booking only)")

def check_current_database_names():
    """Check what names are currently stored in the database."""
    
    try:
        conn = sqlite3.connect('instance/healthcare_fresh.db')
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        print("\n=== CURRENT DATABASE NAMES ===")
        
        # Check user full_names
        print("\n📋 Registered User Names:")
        users = cur.execute('''
            SELECT id, username, full_name, role 
            FROM users 
            WHERE role = 'patient'
            ORDER BY id
        ''').fetchall()
        
        for user in users:
            print(f'  • ID {user["id"]}: "{user["full_name"]}" (Username: {user["username"]})')
        
        # Check appointment patient_names
        print("\n🏥 Appointment Patient Names (Recent):")
        appointments = cur.execute('''
            SELECT DISTINCT patient_name, COUNT(*) as count
            FROM appointments 
            WHERE patient_name IS NOT NULL 
            AND appointment_date >= date('now', '-7 days')
            GROUP BY patient_name
            ORDER BY count DESC
        ''').fetchall()
        
        if appointments:
            for apt in appointments:
                print(f'  • "{apt["patient_name"]}" ({apt["count"]} appointment(s))')
        else:
            print("  • No recent appointments with custom patient names")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")

if __name__ == "__main__":
    test_name_validation()
    check_current_database_names()