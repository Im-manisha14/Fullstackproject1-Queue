"""Check if appointments blueprint is registered"""
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app

print("Registered Routes:")
print("=" * 60)
for rule in app.url_map.iter_rules():
    if 'appointment' in rule.rule.lower():
        print(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods - {'HEAD', 'OPTIONS'})}]")

print("\nAll /api routes:")
for rule in app.url_map.iter_rules():
    if '/api/' in rule.rule:
        print(f"  {rule.rule}")
