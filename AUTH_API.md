# ATS Auth Service - API & Integration Documentation

This document serves as the official specification for frontend developers, downstream microservice maintainers, and team contributors integrating with the **Auth Service (IAM)**.

---

## 1. Overview & Service Networking

The Auth Service manages identity, user credentials, role assignment, and stateless JSON Web Token (JWT) generation.

### Network Routes & Endpoints

| Environment / Caller | Base URL | Routing Context |
| :--- | :--- | :--- |
| **Local Host Development** | `http://localhost:8081` | Direct host port mapped from container port `8080` |
| **Internal Docker Network** | `http://auth-service:8080` | For services on `frontend_net` / `backend_net` |
| **Gateway / Production** | `https://<gateway-host>/api/auth` | Reverse-proxied via NGINX API Gateway |

---

## 2. Authentication & JWT Architecture

- **Token Type:** Stateless JWT signed with HMAC-SHA256 (`HS256`).
- **Default Expiration:** 2 hours (`7200` seconds / `7200000` ms).
- **Bearer Header:** All protected endpoints require the HTTP header:
  ```http
  Authorization: Bearer <accessToken>
  ```
- **Roles in the System:**
  - `ROLE_APPLICANT`: Default role for all public self-registrations.
  - `ROLE_HR`: Recruiter / HR manager accounts (provisioned by Admins).
  - `ROLE_ADMIN`: Platform administrators (seeded via database).

---

## 3. Standard Error Response Contract

All non-2xx responses from Auth Service return a predictable, standardized JSON payload:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable explanation of what went wrong"
}
```

### Common Error Codes

| HTTP Status | Error Code (`error`) | Typical Cause |
| :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_FAILED` | Missing or invalid request field (e.g., malformed email, password < 6 chars) |
| `400 Bad Request` | `MALFORMED_JSON` | Body is not valid JSON |
| `401 Unauthorized` | `INVALID_CREDENTIALS` | Incorrect email or password on login |
| `403 Forbidden` | *Spring Security 403* | Missing, invalid, or expired JWT on protected endpoints |
| `409 Conflict` | `EMAIL_ALREADY_EXISTS` | Attempting to register an email already in PostgreSQL |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Unhandled server error |

---

## 4. Endpoints Specification

### 4.1 Register New Applicant

Creates a new user account. Public registrations automatically receive the role `ROLE_APPLICANT`.

- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Access:** Public (No authorization required)
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "email": "candidate@example.com",
  "password": "securePassword123"
}
```

| Field | Type | Validation Rules | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | Required, valid email format | Candidate's unique email address |
| `password` | `string` | Required, minimum 6 characters | Plain-text password (hashed with BCrypt on server) |

#### Responses

- **`201 Created`**
  - Content-Type: `text/plain`
  - Body:
    ```
    User registered successfully
    ```

- **`400 Bad Request`** (Validation failure)
  ```json
  {
    "error": "VALIDATION_FAILED",
    "message": "Password must be at least 6 characters"
  }
  ```

- **`409 Conflict`** (Duplicate email)
  ```json
  {
    "error": "EMAIL_ALREADY_EXISTS",
    "message": "Email is already registered: candidate@example.com"
  }
  ```

#### Example cURL
```bash
curl -i -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "candidate@example.com", "password": "password123"}'
```

---

### 4.2 Login / Generate JWT

Authenticates user credentials against the database and returns a signed JWT access token.

- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Access:** Public (No authorization required)
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "email": "candidate@example.com",
  "password": "securePassword123"
}
```

| Field | Type | Validation Rules | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | Required, valid email | User's registered email |
| `password` | `string` | Required | User's plain-text password |

#### Responses

- **`200 OK`**
  - Content-Type: `application/json`
  - Body:
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMmUzNGU1Ni03OGRhLTljZGU...",
      "tokenType": "Bearer",
      "expiresIn": 7200
    }
    ```

| Response Property | Type | Description |
| :--- | :--- | :--- |
| `accessToken` | `string` | Compact signed JWT token containing identity claims |
| `tokenType` | `string` | Always `"Bearer"` |
| `expiresIn` | `number` | Lifetime of the token in seconds (`7200` = 2 hours) |

- **`401 Unauthorized`** (Invalid credentials)
  ```json
  {
    "error": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
  ```

- **`400 Bad Request`** (Validation error)
  ```json
  {
    "error": "VALIDATION_FAILED",
    "message": "Email is required"
  }
  ```

#### Example cURL
```bash
curl -i -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "candidate@example.com", "password": "password123"}'
```

---

### 4.3 Get Current Authenticated User (Identity Smoke Test)

Protected endpoint to verify token validity, authentication state, and role claims.

- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Access:** Protected (Requires valid Bearer token)
- **Headers:**
  ```http
  Authorization: Bearer <accessToken>
  ```

#### Responses

- **`200 OK`**
  - Content-Type: `text/plain`
  - Body:
    ```
    Hello! You are authenticated as: candidate@example.com with role: [ROLE_APPLICANT]
    ```

- **`403 Forbidden`** (Token missing, expired, or invalid signature)
  - HTTP 403 Forbidden generated by Spring Security filter chain.

#### Example cURL
```bash
curl -i -X GET http://localhost:8081/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### 4.4 Smoke Test Endpoint

- **Method:** `GET`
- **Path:** `/api/auth/hello`
- **Access:** Public
- **Response:** `200 OK` -> `"Hello from auth-service!"`

---

## 5. Downstream Services Integration Guide (Node.js, Python, WebSockets)

Because this is a decoupled microservices architecture, **downstream services (Core ATS, AI Worker, WebSocket service) DO NOT need to call `auth-service` to verify user requests.**

Verification is completely **stateless**: every service has access to the shared `JWT_SECRET` environment variable and validates tokens locally.

### 5.1 Token Payload Contract (`TECH_STACK.md`)

When decoded, the `accessToken` contains the following claims:

```json
{
  "sub": "b2f67623-1d02-4bb3-a3d8-5b43de268e37",
  "email": "candidate@example.com",
  "role": "ROLE_APPLICANT",
  "iat": 1711892800,
  "exp": 1711900000
}
```

- **`sub` (Subject):** The user's PostgreSQL UUID string (`users.id`). Use this as the foreign key when referencing user records in `jobs`, `applications`, or `resumes`.
- **`email`:** User's registered email address.
- **`role`:** Assigned authority (`ROLE_APPLICANT`, `ROLE_HR`, or `ROLE_ADMIN`). Use this to gate permissions in endpoints (e.g. only `ROLE_HR` can move Kanban cards).
- **`exp`:** Expiration time in Unix epoch seconds.

---

### 5.2 Verification in Node.js / Express (`core-api`, `ws-service`)

Install:
```bash
npm install jsonwebtoken
```

Middleware Implementation:
```javascript
import jwt from 'jsonwebtoken';

export function authenticateJwt(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.substring(7);
  const secret = process.env.JWT_SECRET;

  jwt.verify(token, secret, { algorithms: ['HS256'] }, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Token is invalid or expired' });
    }

    // Attach user identity to request object
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  });
}
```

Role-based guard:
```javascript
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    next();
  };
}
```

---

### 5.3 Verification in Python / FastAPI (`ai-worker`)

Install:
```bash
pip install pyjwt cryptography
```

Dependency Implementation:
```python
import os
import jwt
from fastapi import Header, HTTPException, status

JWT_SECRET = os.getenv("JWT_SECRET")

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token")
```

---

## 6. Frontend Integration Guide (Next.js / React)

### 6.1 Authentication Flow in the UI

1. **User Sign Up:**
   Submit `POST /api/auth/register`. On success (201), redirect user to login or immediately trigger login.
2. **User Sign In:**
   Submit `POST /api/auth/login`. Extract `accessToken` from response.
3. **Storage & Forwarding:**
   - Store `accessToken` securely (e.g. in secure HTTP-only cookies via Next.js Route Handlers, or React state / local session).
   - In subsequent API calls to `core-api` or `auth-service`, include `Authorization: Bearer ${accessToken}` in headers.
4. **Session Expiration:**
   If any service returns `401 Unauthorized` or `403 Forbidden`, clear the stored token and redirect to `/login`.

### 6.2 TypeScript Fetch Helper Example

```typescript
interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Login failed');
  }

  return res.json();
}
```
