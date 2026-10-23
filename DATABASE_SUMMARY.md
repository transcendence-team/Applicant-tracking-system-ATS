# ATS Core Service — Work Summary & Integration Documentation

> **Purpose:** This document summarizes the ATS Core Service work completed or designed so far, the technologies and architecture involved, and the current handoff point for the team.
>
> **Status note:** This document is based on the project details discussed so far. Items described as *planned*, *configured*, or *being debugged* should not be treated as fully tested or production-ready until verified in the repository.

---

## 1. Overview

The ATS (Applicant Tracking System) is being developed as an internal recruitment platform for one company. The ATS Core Service is responsible for recruitment-domain data, such as job postings, candidate applications, recruitment statuses, and related skills.

Authentication and authorization are handled by a separate **Auth Service**. The ATS service has its own database and uses the authenticated user's identity from a JWT rather than creating a direct database relationship to the Auth Service's user table.

### Service ownership

- **Auth Service:** owns users, roles, and permissions in `auth_db`.
- **ATS Core Service:** owns ATS-domain data in `ats_db`.
- **AI Worker (planned/optional):** can handle AI-related CV analysis separately from the ATS API.
- **PostgreSQL:** database engine used by the services.
- **Docker Compose:** intended to run the services and supporting tools together.

Keeping the services separate helps define clear ownership and avoids coupling the ATS database schema to the Auth Service schema.

---

## 2. Technologies and Tools

| Technology / Tool | How it is used |
|---|---|
| **Node.js** | Runtime for the ATS Core Service |
| **TypeScript / JavaScript modules** | Service code and configuration; exact language usage should be confirmed against the current repository |
| **Express / HTTP API** | Intended API layer for the ATS service; verify implemented routes in the source |
| **Prisma ORM** | Database schema, client generation, migrations, and database access |
| **PostgreSQL** | Persistent storage for ATS data |
| **Docker & Docker Compose** | Containerized development environment and service networking |
| **NGINX** | Planned gateway/reverse-proxy entry point |
| **Adminer** | Optional browser-based database inspection tool |
| **JWT** | Identity information passed from the Auth Service to downstream services |
| **Makefile** | Short commands for common project and database operations |

---

## 3. Database Separation and User Identity

The project uses separate logical databases:

- `auth_db` — managed by the Auth Service.
- `ats_db` — managed by the ATS Core Service.

The ATS service should run its Prisma schema and migrations against **`ats_db` only**.

### How the ATS service identifies a user

The Auth Service issues a JWT. Its `sub` claim contains the user's ID as a UUID string. The ATS service can validate the token and use that value to identify the caller.

For example, the decoded token may contain:

```json
{
  "sub": "b2f67623-1d02-4bb3-a3d8-5b43de268e37",
  "email": "candidate@example.com",
  "role": "ROLE_APPLICANT"
}
```

The values above are illustrative, not a real user record.

**Important design decision:** an ATS record that needs to remember who created or owns it can store the Auth Service user ID as a UUID string. It should not define a Prisma relation to the `users` table in `auth_db`, because that table belongs to another service/database and is not part of the ATS Prisma schema.

The ATS service should verify the JWT using the shared `JWT_SECRET` and enforce role/ownership rules in its own API. It should never trust a user ID supplied only in the request body when the identity can be obtained from the verified token.

---

## 4. Prisma and ATS Database Work

Prisma is used to describe the ATS database structure and manage access to PostgreSQL.

### Prisma configuration

The configuration discussed for the ATS service points to:

- Schema: `prisma/schema.prisma`
- Migrations directory: `prisma/migrations`
- Seed script: `tsx prisma/seed.ts`
- Database connection: `DATABASE_URL`, supplied through the environment

The Prisma client generator was configured with a custom output path:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

> Check the current `schema.prisma` and installed Prisma version before changing this configuration. Generated-client paths and generator options must match the version used in the project.

### Seed data

The seed data discussed for the ATS service includes these recruitment statuses:

- `Applied`
- `Screening`
- `Interview`
- `Offer`
- `Hired`
- `Rejected`
- `Withdrawn`

It also includes a starter list of skills:

- JavaScript
- TypeScript
- Python
- Java
- Node.js
- React
- Next.js
- Spring Boot
- PostgreSQL
- Docker
- Git
- SQL

These are initial/reference values for development. Confirm that the seed command completes successfully and that the values exist in `ats_db` before considering seeding finished.

### Why migrations and seeds matter

- **Schema:** defines the data model and its constraints.
- **Migration:** records a database structure change so the database can be updated consistently.
- **Generated Prisma Client:** gives application code typed access to the schema.
- **Seed:** inserts initial development/reference data.

A successful Prisma command alone does not prove that the API works end to end; the database connection, migrations, generated client, seed, and service startup should each be checked.

---

## 5. Docker Compose and Networking

The intended development setup uses Docker Compose to run the application and supporting services.

The service/network design discussed so far includes:

- `nginx` on `frontend_net`
- `auth-api` / Auth Service on `frontend_net` and `backend_net`
- `ats-api` / ATS Core Service on `backend_net`
- `postgres_db` on `backend_net`
- optional `ai-worker` on `backend_net`
- optional `adminer` for database inspection

### Network purpose

- `frontend_net` connects the gateway/front-facing layer to services that need to receive routed requests.
- `backend_net` connects internal services to the database and other backend components.
- The ATS API should connect to PostgreSQL using the Compose service hostname from inside the Docker network, for example `postgres_db`, rather than `localhost`.

### Environment variables

The container configuration needs the correct values for items such as:

- `DATABASE_URL` — ATS service connection string pointing to `ats_db`
- `JWT_SECRET` — the same signing secret expected by the Auth Service
- database credentials
- application port and other service-specific configuration

Secrets should be supplied through environment configuration and should not be committed to the repository. Ensure the ATS service receives the correct database name and credentials, and avoid accidentally pointing its migrations at `auth_db`.

### Container-only development goal

The intended workflow is to install project dependencies and run Prisma/npm commands inside containers, rather than relying on a locally installed Node.js version. The current Compose configuration and scripts should be checked to ensure commands actually execute inside the intended container.

---

## 6. Makefile / Developer Commands

A Makefile was being organized to make common development tasks easier to run and keep the workflow readable. The intended commands included database startup/checking and project setup/generation tasks.

Typical tasks to expose through the Makefile are:

| Task | Purpose |
|---|---|
| `db-up` | Start the database container |
| `db-check` | Check that PostgreSQL is ready |
| `install` | Install dependencies in the appropriate container |
| `db-generate` | Generate the Prisma Client |
| migration command | Apply/create migrations using the project's chosen workflow |
| seed command | Run the Prisma seed script |
| `up` / `down` | Start or stop the Compose stack |

The exact command names and implementation should be taken from the current `Makefile`; the table above describes the intended workflow, not a guarantee that every target is currently working.

---

## 7. Issues Encountered During Setup

The following issues came up during development and are important context for whoever continues the work.

### 7.1 PostgreSQL credentials (`P1000`)

A Prisma connection attempt returned a database authentication error (`P1000`). The likely area to inspect is the consistency between:

- PostgreSQL's configured username/password,
- the credentials in `DATABASE_URL`,
- the target database (`ats_db`),
- and whether the existing database volume was initialized with older credentials.

Changing environment variables does not necessarily change credentials already stored in a persistent PostgreSQL data volume.

### 7.2 Prisma generated-client import

The seed process encountered an error similar to:

```text
ERR_MODULE_NOT_FOUND
../src/generated/prisma/client.js
```

This indicates that the seed script could not resolve the generated Prisma Client at that path. The generator output, generated files, import path, and Prisma version need to agree. Regenerate the client inside the environment used to run the seed script, then verify the actual generated file path.

### 7.3 Migration state

A migration command reported that there were no pending migrations. That message only means Prisma did not find a migration to apply for the database/schema state it inspected; it does not confirm that the intended schema is complete or that the application is functioning.

### 7.4 WSL2 / Docker runtime problem

The development environment is Windows with Ubuntu running under WSL2. The reported environment included Docker CLI and Compose, but `sudo systemctl start docker` failed because `docker.service` was not available inside that Ubuntu environment. Later, `docker compose up -d` returned:

```text
Bus error (core dumped)
```

This is an unresolved environment/runtime issue, not evidence of an ATS application bug. Before diagnosing the application itself, confirm that Docker Desktop (if used) is running, WSL integration is enabled for the Ubuntu distribution, and basic Docker commands work reliably.

---

## 8. Current End Point / Handoff Status

Based on the work discussed so far, the current endpoint is best described as **the ATS service architecture and database setup are being established, but the full containerized workflow still needs verification**.

### Work covered so far

- Defined the ATS Core Service as a separate microservice with its own `ats_db`.
- Kept Auth Service data (`auth_db`, users, roles, permissions) separate from ATS-domain data.
- Established the cross-service identity approach: use the JWT `sub` UUID string rather than a Prisma relation to the Auth Service database.
- Worked on Prisma configuration, schema/migration workflow, generated-client output, and seed data for recruitment statuses and skills.
- Designed the Docker Compose service/network layout and environment-variable connections.
- Organized a Makefile workflow for database and project commands.
- Investigated database authentication, generated-client resolution, migration-state, and WSL2/Docker startup issues.

### Still to verify / next steps

1. **Restore a working Docker runtime in WSL2** and confirm `docker compose ps` and basic container commands work.
2. **Verify environment variables** and confirm the ATS connection string points to `ats_db`.
3. **Generate Prisma Client inside the intended container** and verify its actual output/import path.
4. **Apply migrations** and inspect the resulting schema in `ats_db`.
5. **Run the seed script** and confirm the recruitment statuses and skills are present.
6. **Start the ATS API** and verify its health/startup endpoint, if implemented.
7. **Verify JWT middleware and role checks** against tokens from the Auth Service.
8. **Test the implemented ATS endpoints** with successful and failing requests.
9. **Document the actual API routes and request/response contracts** after checking the current source code.
10. **Run the complete Compose stack** and confirm that the gateway, Auth Service, ATS service, and database can communicate over the intended networks.

### Definition of done for this handoff

The ATS Core Service setup can be considered verified when the team can start the intended containers, connect the ATS service to `ats_db`, generate the Prisma Client, apply migrations, seed reference data, authenticate a request with a valid JWT, and successfully call the implemented ATS API endpoints.

---

## 9. Scope Boundaries

This document does **not** claim that all recruitment features or API endpoints are complete. In particular, the existence and completion of job management, applications, CV/resume upload, candidate pipeline transitions, AI CV analysis, analytics, audit logs, and production deployment must be confirmed in the current codebase.

The Auth Service's own endpoints and authentication implementation are documented separately. This document focuses on the ATS Core Service's architecture, database integration, container setup, and current handoff point.

---

## 10. Quick Summary for the Team

The ATS Core Service is being developed as a Node.js/Prisma/PostgreSQL microservice, isolated from the Auth Service's database. It owns `ats_db`, while user identity is taken from the verified JWT issued by the Auth Service. Work so far has focused on the service/database architecture, Prisma schema and seed workflow, Docker Compose networking, environment configuration, and developer commands. The main blocker discussed most recently is the WSL2/Docker runtime failing with `Bus error (core dumped)`, so the container environment must be stabilized before the database migration, seed, and API flow can be fully verified end to end.
