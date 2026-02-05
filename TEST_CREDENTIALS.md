# Test Credentials for Queue-Free Healthcare System

## Patient Account
- **Username/Email:** `patient@123`
- **Password:** `patient123`
- **Expected Redirect:** `/dashboard/patient`

## Doctor Account
- **Username/Email:** `doctor@123`
- **Password:** `doctor123`
- **Expected Redirect:** `/dashboard/doctor`

## Pharmacy Account
- **Username/Email:** `pharmacy@123`
- **Password:** `pharmacy123`
- **Expected Redirect:** `/dashboard/pharmacy`

## Testing Instructions

1. Open http://localhost:3000 in your browser
2. You should see the login page
3. Enter one of the credentials above
4. Click "Login"
5. You should be redirected to the appropriate dashboard based on your role

## Troubleshooting

If login doesn't work:
1. Open browser console (F12)
2. Look for console.log messages showing:
   - "Login response"
   - "Response data"
   - "User data"
   - "User role"
   - "Navigating based on role"
3. Check for any error messages in red

The console logs will help identify where the issue is occurring.
