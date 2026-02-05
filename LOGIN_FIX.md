# Login and Register Page Access - FIXED

## What Was Changed

Modified `frontend/src/contexts/AuthContext.js` to **clear the authentication token on every page load**.

### Before:
- Token was stored in localStorage
- On page refresh, the app would automatically fetch user profile
- User stayed logged in after refresh
- Could not see login page without manually logging out

### After:
- Token is cleared on every page load
- User must login every time they visit the site
- Login page is always shown first
- Full flow: Login → Register → Login → Dashboard

## How to Test

1. Open http://localhost:3000
2. You should see the **Login Page**
3. Click "Register" link to see the **Register Page**
4. After registration, you'll be redirected to **Login Page**
5. Login with credentials to access the **Dashboard**
6. Refresh the page → You'll be back at the **Login Page** (logged out)

## Test Credentials

- **Patient:** `patient@123` / `patient123`
- **Doctor:** `doctor@123` / `doctor123`
- **Pharmacy:** `pharmacy@123` / `pharmacy123`

## Note

This behavior (logging out on refresh) is intentional based on your request. If you want to stay logged in after refresh in the future, we can re-enable the auto-login feature.
