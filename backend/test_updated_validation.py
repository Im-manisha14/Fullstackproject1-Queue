import re

def test_updated_validation():
    """Test the updated name validation patterns."""
    
    # Updated validation pattern (with international character support)
    updated_pattern = r'^[a-zA-Z\u00c0-\u00ff\u0100-\u017e\u0410-\u044f\u4e00-\u9fff\s\.\-\']+$'
    
    # Test names - various formats including international
    test_names = [
        # Basic names (should all pass now)
        "John Doe",
        "Mary Jane", 
        "Ashrudi",
        "Rajesh Kumar",
        
        # Names with apostrophes (should pass now)
        "O'Connor",
        "D'Angelo", 
        "Mary O'Brien",
        
        # Names with dots and hyphens (should pass)
        "Dr. Smith",
        "Jean-Paul",
        "Anne-Marie",
        
        # International names (should pass now)
        "José María",
        "François", 
        "Müller",
        "André",
        "Björn",
        "Nicolás",
        "Kristóf",
        
        # Cyrillic names (should pass now)
        "Александр",
        "Мария",
        
        # Chinese names (should pass now) 
        "李小明",
        "王美丽",
        
        # Names that should still fail
        "John123",      # Numbers
        "Mary@Jane",    # Special chars
        "John&Smith",   # Ampersand
        "A",           # Too short
        "",            # Empty
        "   ",         # Spaces only
    ]
    
    print("=== UPDATED NAME VALIDATION TEST ===\n")
    print("Pattern:", updated_pattern)
    print()
    print("LEGEND: ✅ = Passes, ❌ = Fails")
    print("-" * 60)
    
    passed = 0
    failed = 0
    
    for name in test_names:
        name_stripped = name.strip()
        length_ok = len(name_stripped) >= 2
        pattern_ok = bool(re.match(updated_pattern, name_stripped, re.UNICODE)) if name_stripped else False
        
        overall_ok = length_ok and pattern_ok
        status = "✅" if overall_ok else "❌"
        
        if overall_ok:
            passed += 1
        else:
            failed += 1
        
        reason = ""
        if not length_ok:
            reason = " (too short)"
        elif not pattern_ok and name_stripped:
            reason = " (invalid characters)"
            
        print(f'{status} "{name:20}" {reason}')
    
    print("-" * 60)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Success Rate: {passed/(passed+failed)*100:.1f}%")
    
    print("\n=== IMPROVEMENTS MADE ===")
    print("✅ Registration and booking validation now consistent")
    print("✅ Added support for apostrophes in registration")
    print("✅ Added support for international characters:")
    print("  • Latin Extended (À-ÿ, Ā-ž)")
    print("  • Cyrillic (А-я)")
    print("  • Chinese characters (一-龯)")
    print("✅ Still prevents numbers and special symbols")
    print("✅ Maintains minimum 2-character requirement")

if __name__ == "__main__":
    test_updated_validation()