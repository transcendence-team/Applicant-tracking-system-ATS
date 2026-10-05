# Enterprise Applicant Tracking System (ATS) - Tech Stack & Architecture

## 1. Tech Stack Overview

Our Enterprise Applicant Tracking System (ATS) utilizes a polyglot microservices architecture to enforce strict decoupling and single-responsibility principles.

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **API Gateway** | NGINX | TLS termination (HTTPS), reverse proxy, and path routing. |
| **Frontend UI** | Next.js (React) + Tailwind CSS | Client interface and Server-Side Rendering (SSR) for job boards. |
| **Auth Service (IAM)** | Java (Spring Boot) + Spring Security + Spring Data JPA (Hibernate) | JWT generation, password hashing, RBAC, and ORM entity persistence. |
| **Core ATS API** | Node.js (Express) | Kanban business logic, file uploads, and job management. |
| **Real-Time API** | Node.js + Socket.io | Persistent WebSocket connections for live Kanban board updates. |
| **AI Worker** | Python (FastAPI) | Background PDF parsing and prompt orchestration. |
| **LLM Engine** | Ollama | Local AI inference utilizing open-source models. |
| **Database** | PostgreSQL | Relational database (ACID compliant) with strict schema design. |
| **Monitoring** | Prometheus + Grafana | Service metrics scraping, system health, and API load visualization. |

---

## 2. Architecture & Service Specifications

### 2.1 Internal Port Mapping & DNS
Internal services communicate via Docker's internal DNS using container names across two isolated networks (`frontend_net` and `backend_net`). No internal traffic routes out to the public internet.

| Container Name | Docker Network | Internal Port | Internal DNS Route | Ingress / Public Route |
| :--- | :--- | :--- | :--- | :--- |
| `nginx-gateway` | `frontend_net` | `443` (Exposed) | `https://localhost` | Ingress Entrypoint |
| `frontend-ui` | `frontend_net` | `[ e.g., 3000 ]` | `http://frontend-ui:3000` | `GET /` |
| `auth-service` | `frontend_net` + `backend_net` | `[ e.g., 8080 ]` | `http://auth-service:8080` | `POST /api/auth/*` |
| `core-api` | `frontend_net` + `backend_net` | `[ e.g., 4000 ]` | `http://core-api:4000` | `CRUD /api/ats/*` |
| `ws-service` | `frontend_net` | `[ e.g., 5000 ]` | `http://ws-service:5000` | `WS /ws/` |
| `ai-worker` | `backend_net` | `[ e.g., 8000 ]` | `http://ai-worker:8000` | Internal (`POST /parse` from ATS) |
| `ollama` | `backend_net` | `[ e.g., 11434 ]` | `http://ollama:11434` | Internal (from AI Worker) |
| `db-postgres` | `backend_net` | `[ e.g., 5432 ]` | `postgres://db-postgres:5432` | Internal (DB for IAM, ATS, AI) |
| `prometheus` | `backend_net` | `[ e.g., 9090 ]` | `http://prometheus:9090` | Internal metrics |
| `grafana` | `frontend_net` | `[ e.g., 3001 ]` | `http://grafana:3001` | Internal dashboards |

### 2.2 Database Schema Ownership & ORM
Because services share a single PostgreSQL container on the backend network, services adhere to strict table ownership boundaries. No service should use a raw SQL JOIN on a table it does not own.
* **Auth Service (Spring Boot)** owns: `[ e.g., users, roles, sessions ]`
* **Core ATS (Node.js)** owns: `[ e.g., jobs, applications, attachments ]`
* **AI Worker (Python)** owns: `[ e.g., ai_summaries, parse_logs ]`
* **Database Management & ORM:** Spring Data JPA with Hibernate for Auth Service (Java/Spring Boot); Prisma ORM for Core ATS (Node.js). Migrations managed via Flyway/Liquibase or Prisma schema.

### 2.3 Inter-Service API Contract (The JWT Payload)
To ensure Spring Boot (Auth) and downstream services (Core ATS, WebSocket API) can verify user identity statelessly without synchronous network round-trips, all services agree on the following standard JWT payload:

```json
{
  "sub": "user_id_here",
  "email": "user@domain.com",
  "role": "ROLE_HR",
  "exp": 1711900000
}
```

* **JWT Secret Key Location:** Passed via Docker Compose `.env` file (never hardcoded in source code).
* **JWT Expiration Time:** `[ e.g., 2 hours ]`

---