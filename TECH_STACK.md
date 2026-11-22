# Enterprise Applicant Tracking System (ATS) - Tech Stack & Architecture

## 1. Tech Stack Overview

Our Enterprise Applicant Tracking System (ATS) utilizes a polyglot microservices architecture to enforce strict decoupling and single-responsibility principles.

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **API Gateway** | NGINX | TLS termination (HTTPS), reverse proxy, and path routing. |
| **Frontend UI** | Next.js (React) + Tailwind CSS | Client interface and Server-Side Rendering (SSR) for job boards. |
| **Auth & User Service (IAM)** | Java (Spring Boot) + Spring Security + Spring Data JPA (Hibernate) | RS256 JWT generation, password hashing, RBAC, and user/candidate profile persistence. |
| **Core ATS API & Real-Time** | Node.js (Express + Socket.io) | Kanban business logic, file uploads, job/application management, and persistent WebSocket connections. |
| **AI Worker** | Python (FastAPI) | Background PDF parsing and prompt orchestration. |
| **LLM Engine** | Ollama | Local AI inference utilizing open-source models. |
| **Databases** | PostgreSQL 18 (`auth_db` & `ats_db`) | Two isolated relational databases with strict service ownership boundaries. |
| **Database UI** | Adminer | Browser-based database inspection tool (`/adminer/`). |
| **Monitoring** | Prometheus + Grafana | Service metrics scraping, system health, and API load visualization. |

---

## 2. Architecture & Service Specifications

### 2.1 Internal Port Mapping & DNS
Internal services communicate via Docker's internal DNS using container names across two isolated networks (`frontend_net` and `backend_net`). No internal traffic routes out to the public internet.

| Container Name | Docker Network | Internal Port | Internal DNS Route | Ingress / Public Route |
| :--- | :--- | :--- | :--- | :--- |
| `nginx` | `frontend_net` | `443` (Exposed) | `https://localhost` | Ingress Entrypoint |
| `frontend` | `frontend_net` | `3000` | `http://frontend:3000` | `GET /` |
| `auth-api` | `frontend_net` + `backend_net` | `8080` | `http://auth-api:8080` | `/api/auth/*` |
| `ats-api` | `frontend_net` + `backend_net` | `3000` | `http://ats-api:3000` | `/api/ats/*`, `WS /api/ats/ws` |
| `ai-worker` | `backend_net` | `8000` | `http://ai-worker:8000` | Internal (`POST /parse` from ATS) |
| `ollama` | `backend_net` | `11434` | `http://ollama:11434` | Internal (from AI Worker) |
| `auth_db` | `backend_net` | `5432` | `postgres://auth_db:5432` | Internal (`auth_service_db` for `auth-api`) |
| `ats_db` | `backend_net` | `5432` | `postgres://ats_db:5432` | Internal (`ats_core_db` for `ats-api`) |
| `adminer` | `frontend_net` + `backend_net` | `8080` | `http://adminer:8080` | `/adminer/` |
| `prometheus` | `backend_net` | `9090` | `http://prometheus:9090` | Internal metrics |
| `grafana` | `frontend_net` | `3001` | `http://grafana:3001` | Internal dashboards |

### 2.2 Database Schema Ownership & ORM
Services run against isolated PostgreSQL containers (`auth_db` and `ats_db`) on `backend_net` with per-container environment variable isolation in `docker-compose.yml`. No service ever queries or joins against another service's database.
* **Auth Service (`auth-api` — Spring Boot / JPA)** owns `auth_db` (`users` table: credentials, roles, and all user/candidate/employee profile fields).
* **Core ATS (`ats-api` — Node.js / Prisma 7)** owns `ats_db` (`jobs`, `job_recruiters`, `skills`, `job_skills`, `application_statuses`, `resumes`, `applications`, `application_status_history`, `resume_extractions`, `ai_analyses`, `ai_skill_matches`, `notifications`, `audit_logs`, `activity_events`, `gdpr_requests`). All user references (`Application.userId`, `Resume.userId`, `Job.createdBy`, etc.) store the user's UUID from the JWT `sub` claim.

### 2.3 Inter-Service API Contract (Asymmetric RS256 JWT)
To ensure `auth-api` is the sole service capable of minting tokens while downstream services (`ats-api`) verify user identity statelessly without network round-trips, tokens are signed using **RSA-SHA256 (`RS256`)**:

```json
{
  "sub": "b2f67623-1d02-4bb3-a3d8-5b43de268e37",
  "email": "user@domain.com",
  "role": "ROLE_HR",
  "firstName": "Jane",
  "lastName": "Doe",
  "iat": 1711892800,
  "exp": 1711900000
}
```

* **Key Isolation:** `auth-api` receives both `JWT_PRIVATE_KEY` (for signing) and `JWT_PUBLIC_KEY` (for verification). `ats-api` receives **only** `JWT_PUBLIC_KEY`.
* **JWT Expiration Time:** `7200000` ms (2 hours).

---