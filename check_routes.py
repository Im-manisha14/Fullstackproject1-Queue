from backend.app import app

print("Registered Flask Routes:")
print("=" * 50)

for rule in app.url_map.iter_rules():
    methods = ','.join(rule.methods - {'HEAD', 'OPTIONS'})
    print(f"{rule.endpoint:30} {methods:15} {rule.rule}")