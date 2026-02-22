"""Check what routes are actually registered"""
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app

print("\n" + "=" * 60)
print("ALL /api/ ROUTES:")
print("=" * 60)
for rule in app.url_map.iter_rules():
    if '/api/' in str(rule):
        methods = ', '.join(rule.methods - {'HEAD', 'OPTIONS'})
        print(f"{rule.rule:50} -> {rule.endpoint:30} [{methods}]")
print("=" * 60)

# Specifically check for appointments
print("\nLooking for appointments routes:")
appointments_routes = [r for r in app.url_map.iter_rules() if 'appointment' in str(r).lower()]
if appointments_routes:
    for r in appointments_routes:
        print(f"  FOUND: {r.rule} -> {r.endpoint}")
else:
    print("  NO appointments routes found!")
