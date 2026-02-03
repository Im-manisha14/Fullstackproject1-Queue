from flask import Flask, jsonify, request
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

# In-memory user store for demo
users = {
    'devimanisha1411@gmail.com': {
        'username': 'devimanisha1411',
        'email': 'devimanisha1411@gmail.com',
        'password': 'test123',
        'full_name': 'Devi Manisha',
        'role': 'patient',
        'id': 1
    }
}

@app.route('/')
def home():
    return '''
    <h1 style="color: #20b2aa; text-align: center; font-family: Arial, sans-serif; margin-top: 100px;">
    Healthcare Management System Backend
    </h1>
    <p style="text-align: center; font-family: Arial, sans-serif;">Backend is running successfully!</p>
    '''

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'OK'}), 200
        
    try:
        data = request.get_json()
        username = data.get('username', '')
        password = data.get('password', '')
        
        # Find user by email (username field contains email)
        user = None
        for email, user_data in users.items():
            if user_data['username'] == username and user_data['password'] == password:
                user = user_data
                break
        
        if user:
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'access_token': 'demo-token-123',
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'full_name': user['full_name'],
                    'email': user['email'],
                    'role': user['role']
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid credentials'
            }), 401
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Login error: {str(e)}'
        }), 500

@app.route('/api/auth/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'OK'}), 200
        
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        username = data.get('username', email.split('@')[0])
        password = data.get('password', '')
        full_name = data.get('full_name', '')
        
        if email in users:
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 400
        
        if len(password) < 3:
            return jsonify({
                'success': False, 
                'message': 'Password must be at least 3 characters'
            }), 400
        
        # Add new user
        users[email] = {
            'username': username,
            'email': email,
            'password': password,
            'full_name': full_name,
            'role': 'patient',
            'id': len(users) + 1
        }
        
        return jsonify({
            'success': True,
            'message': 'User created successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Registration error: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'OK', 'message': 'Backend is healthy'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)