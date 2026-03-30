# Testing Secured API

Since the backend now uses Spring Security (stateful session-based authentication), you must ensure your client handles cookies correctly.

## Option 1: Using Postman (Recommended)
1. **Login**: Send `POST http://localhost:8080/api/login` with JSON body.
   - Postman automatically stores the `JSESSIONID` cookie.
2. **Create User**: Send `POST http://localhost:8080/api/users` with the `admin` user body.
   - Postman will send the stored cookie automatically.

## Option 2: Using Curl
1. Login and save cookies:
   ```bash
   curl -v -c cookies.txt -X POST http://localhost:8080/api/login -H "Content-Type: application/json" -d "{\"username\": \"admin\", \"password\": \"admin123\"}"
   ```
2. Use the cookie to create a user:
   ```bash
   curl -v -b cookies.txt -X POST http://localhost:8080/api/users -H "Content-Type: application/json" -d "{\"username\": \"newuser\", \"password\": \"pass123\", \"role\": {\"name\": \"STAFF\"}}"
   ```

## Option 3: Using Basic Auth (Disabled)
HTTP Basic Auth is **disabled** in `SecurityConfig` to support the Angular login system.
You **must** use the `/api/login` endpoint to get a `JSESSIONID` cookie and include it in subsequent requests.

## Troubleshooting
- **403 Forbidden**:
  - Are you including the `JSESSIONID` cookie?
  - Did you login successfully first?
  - Does your user have the `ADMIN` role?
- Access `GET http://localhost:8080/api/me` to see if you are authenticated.

