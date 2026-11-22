# ATS Auth & User Service - API & Integration Documentation

This document serves as the official specification for frontend developers, downstream microservice maintainers, and team contributors integrating with the **Auth & User Service (`auth-api`)**.

---

## 1. Overview & Service Networking

The Auth Service (`src/auth-service/`) owns user credentials, role-based access control (RBAC), user/candidate/employee profile information (`auth_db.users`), and asymmetric **RS256 JSON Web Token (JWT)** generation.

### Network Routes & Endpoints

| Environment / Caller | Base URL | Routing Context |
| :--- | :--- | :--- |
| **Internal Docker Network** | `http://auth-api:8080/api/auth` | For services on `frontend_net` / `backend_net` |
| **Gateway / Production** | `https://localhost/api/auth` | Reverse-proxied via NGINX API Gateway (`:443`) |

---

## 2. Authentication & Asymmetric JWT Architecture (`RS256`)

- **Token Type:** Stateless JWT signed with RSA-SHA256 (`RS256`).
- **Key Isolation:**
  - `JWT_PRIVATE_KEY` (PKCS#8 PEM, Base64-encoded in `.env`): Passed **only** to `auth-api` for signing tokens.
  - `JWT_PUBLIC_KEY` (X.509 PEM, Base64-encoded in `.env`): Passed to `auth-api` and `ats-api` so downstream services can verify tokens locally without being able to mint or forge tokens.
- **Default Expiration:** 2 hours (`7200` seconds / `7200000` ms).
- **Bearer Header:** All protected endpoints require the HTTP header:
  ```http
  Authorization: Bearer <accessToken>
  ```
- **Roles in the System:**
  - `ROLE_APPLICANT`: Default role for all public self-registrations.
  - `ROLE_HR`: Recruiter / HR manager accounts (provisioned by Admins).
  - `ROLE_ADMIN`: Platform administrators (seeded on startup via `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

---

## 3. Standard Error Response Contract

All non-2xx responses from `auth-api` return a standardized JSON payload:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable explanation of what went wrong"
}
```

### Common Error Codes

| HTTP Status | Error Code (`error`) | Typical Cause |
| :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_FAILED` | Missing or invalid request field (e.g., missing name/email, password < 6 chars, or missing password when changing email) |
| `400 Bad Request` | `MALFORMED_JSON` | Request body is invalid or malformed JSON |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing, invalid, or expired Bearer JWT token |
| `401 Unauthorized` | `INVALID_CREDENTIALS` | Incorrect email or password on login, password change, email update, or account deletion |
| `403 Forbidden` | `FORBIDDEN` | Authenticated user lacks required role (`ROLE_ADMIN` / `ROLE_HR`) |
| `403 Forbidden` | `ACCOUNT_DISABLED` | User account has `active = false` |
| `404 Not Found` | `USER_NOT_FOUND` | Target user UUID does not exist in `auth_db` |
| `409 Conflict` | `EMAIL_ALREADY_EXISTS` | Attempting to register or update to an email already in `auth_db` |

---

## 4. Endpoints Specification

### 4.1 Register New Applicant (`POST /api/auth/register`)

Creates a new user account with `ROLE_APPLICANT`. Requires only `firstName`, `lastName`, `email`, and `password` for a frictionless sign-up experience; additional candidate profile fields (`phone`, `location`, `linkedinUrl`, `githubUrl`, `portfolioUrl`, `bio`) are optional and updated later via `PATCH /api/auth/me` before submitting a job application.

- **Access:** Public

#### Request Body
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "candidate@example.com",
  "password": "securePassword123"
}
```

| Field | Type | Validation Rules |
| :--- | :--- | :--- |
| `firstName` | `string` | Required, non-blank, max 100 chars |
| `lastName` | `string` | Required, non-blank, max 100 chars |
| `email` | `string` | Required, valid email format |
| `password` | `string` | Required, minimum 6 characters |

#### Responses
- **`201 Created`** (`text/plain`): `"User registered successfully"`
- **`400 Bad Request`** (`VALIDATION_FAILED`) / **`409 Conflict`** (`EMAIL_ALREADY_EXISTS`)

---

### 4.2 Login / Generate RS256 JWT (`POST /api/auth/login`)

Authenticates user credentials, verifies `active == true`, records `lastLoginAt`, and returns a signed RS256 JWT access token.

- **Access:** Public

#### Request Body
```json
{
  "email": "candidate@example.com",
  "password": "securePassword123"
}
```

#### Responses
- **`200 OK`** (`application/json`):
  ```json
  {
    "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 7200
  }
  ```
- **`401 Unauthorized`** (`INVALID_CREDENTIALS`) / **`403 Forbidden`** (`ACCOUNT_DISABLED`)

---

### 4.3 Self-Service Profile & Account Endpoints (`/api/auth/me`)

All `/api/auth/me` endpoints require `Authorization: Bearer <accessToken>`.

#### `GET /api/auth/me` — Get Current User Profile
Returns `200 OK` with `AccountProfileResponse`:
```json
{
  "id": "b2f67623-1d02-4bb3-a3d8-5b43de268e37",
  "email": "candidate@example.com",
  "role": "ROLE_APPLICANT",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+1-555-0199",
  "location": "Paris, France",
  "linkedinUrl": "https://linkedin.com/in/janedoe",
  "githubUrl": "https://github.com/janedoe",
  "portfolioUrl": "https://janedoe.dev",
  "bio": "Full-stack engineer with 4 years of experience.",
  "department": null,
  "jobTitle": null,
  "active": true,
  "lastLoginAt": "2026-11-17T19:00:00",
  "createdAt": "2026-11-17T18:30:00",
  "updatedAt": "2026-11-17T19:05:00"
}
```

#### `PATCH /api/auth/me` — Update Profile or Email
Updates any subset of profile fields (`firstName`, `lastName`, `phone`, `location`, `linkedinUrl`, `githubUrl`, `portfolioUrl`, `bio`, `department`, `jobTitle`).
- **Password requirement:** `password` is **not required** when updating profile fields, and is **only required** if changing `email` to a new address.

```json
{
  "phone": "+1-555-0199",
  "location": "Paris, France",
  "linkedinUrl": "https://linkedin.com/in/janedoe",
  "githubUrl": "https://github.com/janedoe",
  "portfolioUrl": "https://janedoe.dev",
  "bio": "Full-stack engineer with 4 years of experience."
}
```

#### `DELETE /api/auth/me` — Delete Own Account
Requires current password verification in the request body. Returns `204 No Content`.
```json
{
  "password": "securePassword123"
}
```

---

### 4.4 Change Password (`POST /api/auth/change-password`)

- **Access:** Protected (Bearer Token)
- **Request Body:**
  ```json
  {
    "currentPassword": "securePassword123",
    "newPassword": "newSecurePassword456"
  }
  ```
- **Response:** `200 OK` (`text/plain`): `"Password changed successfully"`

---

### 4.5 Admin & HR Account Management (`/api/auth/create-user` & `/api/auth/users`)

| Method & Path | Access | Description |
| :--- | :--- | :--- |
| `POST /api/auth/create-user` | `ROLE_ADMIN` | Creates a user with an explicit role (`{ "firstName", "lastName", "email", "password", "role" }`). |
| `GET /api/auth/users` | `ROLE_ADMIN` | Lists all users in `auth_db` (`List<AccountProfileResponse>`). |
| `GET /api/auth/users/{id}` | `ROLE_ADMIN`, `ROLE_HR`, or self | Fetches a specific user's profile by UUID (used by HR/ATS to view applicant profiles). |
| `PATCH /api/auth/users/{id}` | `ROLE_ADMIN` | Updates a user's `role`, `active` status, `department`, or `jobTitle`. |
| `DELETE /api/auth/users/{id}` | `ROLE_ADMIN` | Permanently deletes a user account by UUID (`204 No Content`). |

---

## 5. Downstream Services Integration Guide (`ats-api` & WebSockets)

Downstream services verify JWT tokens locally using **`JWT_PUBLIC_KEY`** (`RS256`).

### 5.1 Token Payload Claims
```json
{
  "sub": "b2f67623-1d02-4bb3-a3d8-5b43de268e37",
  "email": "candidate@example.com",
  "role": "ROLE_APPLICANT",
  "firstName": "Jane",
  "lastName": "Doe",
  "iat": 1711892800,
  "exp": 1711900000
}
```

### 5.2 Verification in Node.js / Express (`src/ats-service/src/middleware/verifyToken.ts`)
```ts
const publicKey = resolvePublicKey(process.env.JWT_PUBLIC_KEY);
const verified = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;
req.user = verified;
```
