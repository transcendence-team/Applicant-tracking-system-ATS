# ATS Architecture & Database Summary

## 1. Overview

The Enterprise Applicant Tracking System (ATS) is structured around clean microservice ownership boundaries:

- **Auth & User Service (`auth-api` — Spring Boot + `auth_db`):** Owns user authentication, RS256 JWT issuance, RBAC roles (`ROLE_APPLICANT`, `ROLE_HR`, `ROLE_ADMIN`), and all user/candidate/employee profile fields (`firstName`, `lastName`, `phone`, `location`, `linkedinUrl`, `githubUrl`, `portfolioUrl`, `bio`, `department`, `jobTitle`).
- **Core ATS Service (`ats-api` — Node.js / Express 5 / Prisma 7 / Socket.io + `ats_db`):** Owns recruitment-domain data (`jobs`, `job_recruiters`, `skills`, `job_skills`, `application_statuses`, `resumes`, `applications`, `application_status_history`, `resume_extractions`, `ai_analyses`, `ai_skill_matches`, `notifications`, `audit_logs`, `activity_events`, `gdpr_requests`) and real-time WebSocket broadcasts.
- **AI Worker (`ai-worker` — Python / FastAPI + Ollama):** Stateless compute worker for PDF resume extraction and LLM skill matching.
- **API Gateway (`nginx`):** Single HTTPS (`:443`) reverse-proxy entrypoint with WebSocket upgrade support on `/` and `/api/ats/`.

---

## 2. Database Separation & User Identity Contract

The project runs two isolated database containers on `backend_net`:
1. **`auth_db` (`auth_service_db` — MongoDB 8):** Managed by Spring Data MongoDB (`User.java`, `users` collection).
2. **`ats_db` (`ats_core_db` — PostgreSQL 18):** Managed by Prisma 7 (`schema.prisma`).

### Asymmetric RS256 JWT Verification
`auth-api` signs JWTs using `JWT_PRIVATE_KEY` (`RS256`). Downstream services (`ats-api`) receive **only** `JWT_PUBLIC_KEY` to verify tokens statelessly:

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

### Direct UUID Linking in `ats_db`
Because `auth_db.users` owns all user and candidate profile fields:
- `ats_db` does **not** duplicate `CandidateProfile` or `EmployeeProfile` tables.
- `Application.userId` and `Resume.userId` store the authenticated user's UUID (`req.user.sub`) directly (`@db.Uuid`), with `@@unique([jobId, userId])` preventing duplicate applications to the same job.
- Registration (`POST /api/auth/register`) requires only `firstName`, `lastName`, `email`, and `password`. Optional candidate fields (`phone`, `location`, `linkedinUrl`, `githubUrl`, `portfolioUrl`, `bio`) are updated via `PATCH /api/auth/me` prior to submitting the first job application.

---

## 3. Container Environment Isolation (`docker-compose.yml`)

Each container receives only the environment variables required for its responsibility via explicit `environment:` blocks in `docker-compose.yml`:
- **`frontend`:** `AUTH_API_URL`
- **`auth-api`:** `AUTH_DB_NAME`, `AUTH_DB_USER`, `AUTH_DB_PASS`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_EXPIRATION_MS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- **`ats-api`:** `DATABASE_URL`, `JWT_PUBLIC_KEY`
- **`auth_db`:** `MONGO_INITDB_DATABASE`, `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD` (from `AUTH_DB_*`)
- **`ats_db`:** `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (from `DB_*`)
