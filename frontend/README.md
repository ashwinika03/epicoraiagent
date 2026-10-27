# Epicor AI Agent Frontend

## Purpose

This frontend is a React + Vite application that provides the user interface for the Epicor AI Agent backend. It enables team members to:

- authenticate using JWT credentials
- submit chat and database query requests
- inspect historical sessions and messages
- view health and dashboard metrics
- interact with the AI-driven Epicor ERP assistant in the browser

## Project Structure

- `src/main.jsx` — application entry point
- `src/App.jsx` — root app component; renders login or dashboard based on auth state
- `src/context/AuthContext.jsx` — auth provider and token state management
- `src/services/api.js` — Axios client and endpoint wrappers
- `src/pages/LoginPage.jsx` — login screen
- `src/pages/Dashboard.jsx` — authenticated dashboard
- `src/index.css` — shared global styling

## Key Technical Details

### Authentication

- Uses JWT stored in `localStorage` via `AuthContext`.
- Auth actions are exposed through `login()` and `logout()`.
- Login calls `POST /api/auth/login` and stores the `access_token`.
- The app renders `Dashboard` only when `isAuthenticated` is true.

### API Client

`frontend/src/services/api.js` configures Axios with:

- `baseURL: '/api'`
- `timeout: 60000`
- `Content-Type: application/json`

It also includes interceptors:

- request interceptor adds `Authorization: Bearer <token>` when present
- response interceptor handles HTTP `401` by clearing auth and reloading

### Page Flow

- `LoginPage` renders the login form and handles validation/error display.
- `Dashboard` is the main authenticated experience and exports summary/metrics UI.

## Dependencies

- `react`, `react-dom` — core UI
- `axios` — HTTP client
- `framer-motion` — animations
- `lucide-react` — iconography
- `vite` — build/dev toolchain
- `eslint` and plugins — linting

## Local Development

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the app:
   ```bash
   npm run dev
   ```
3. Open the dev server at `http://localhost:5173`.




## Notes for the Team

- The frontend assumes the backend API is reachable via `/api`.
- Ensure the backend CORS settings allow `http://localhost:5173`.
- The auth token is persisted in browser local storage, so logging out will clear it.
- The frontend currently supports only the login/dashboard flow; additional routes may need implementation as the API expands.

##Authentication flow 
1. Install dependencies:
   pip install -r requirements.txt
   frontend/npm install

2. make sure your .env file as: 
      FRONTEND_URL=http://localhost:5173
      JWT_EXPIRY_MINUTES=30
      REFRESH_TOKEN_EXPIRY_DAYS=7
  
3. Start the app:
      backend : uvicorn app.main:app --reload 
      fronend : npm run dev

4. Signup page:
      after submiting details check backend terminal logs you will recive link like:
      21:16:08 | INFO     | app.services.email_service | ======================================================================
      21:16:08 | INFO     | app.services.email_service | DEVELOPMENT EMAIL — EMAIL NOT ACTUALLY SENT
      21:16:08 | INFO     | app.services.email_service | To: ashwiniaruna02@gmail.com
      21:16:08 | INFO     | app.services.email_service | Subject: Verify your Epicor AI Agent account
      21:16:08 | INFO     | app.services.email_service | Verification/Login URL:
         21:16:08 | INFO     | app.services.email_service | http://localhost:5173/verify-email?token=0tfFxFyLoZY2mUYxwlbzZj70tWEebMBvfull31fawP5zLqv9j3SehqQ8sTatj-hI
      21:16:08 | INFO     | app.services.email_service | =====================================================================

      click and you will get email verified and get redirected to login page 

5. Login page:
      login with your email and password 

6. 2Factor authentication :
      go to setting page enable your 2 factor authentication 
            ##QR code will appear:
                  1.you can Scan  QR code with Google Authenticator or Microsoft Authenticator. 
                                             or
                  2.you can enter otp manually by running below given command in new terminal: 
                        python -c "import pyotp; print(pyotp.TOTP('YOUR_MANUAL_KEY').now())"
                        -you will get otp of 6 digits copy and fill ,and click on verify 

                  
   

