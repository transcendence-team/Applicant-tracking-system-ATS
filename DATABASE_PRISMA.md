# Database Inspection & Prisma 7 Guide

This guide explains how to inspect the two PostgreSQL 18 containers (`auth_db` and `ats_db`), verify tables and columns, and run Prisma 7 migrations and seeds.

Run all commands from the project root (the directory containing `docker-compose.yml`).

---

## 1. Database Architecture Overview

| Container Name | Database Name (`POSTGRES_DB`) | User (`POSTGRES_USER`) | Owner Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `auth_db` | `auth_service_db` | `auth_admin` | `auth-api` (Spring Boot JPA) | Owns `users` (credentials, RBAC roles, and all user/candidate/employee profile fields) |
| `ats_db` | `ats_core_db` | `ats_admin` | `ats-api` (Node.js / Prisma 7) | Owns 12 recruitment tables (`jobs`, `applications`, `resumes`, `skills`, `ai_analyses`, etc.) |

> **Ownership Rule:** `ats_db` never joins or declares foreign keys to `auth_db.users`. Every user reference in `ats_db` (`Application.userId`, `Resume.userId`, `Job.createdBy`, `JobRecruiter.userId`, `Notification.userId`, etc.) is a plain `@db.Uuid` column populated from the verified JWT `sub` claim.

---

## 2. Check Container Status & Readiness

```bash
docker compose ps
```

Check whether both PostgreSQL containers accept connections:

```bash
docker compose exec auth_db pg_isready -U auth_admin -d auth_service_db
docker compose exec ats_db pg_isready -U ats_admin -d ats_core_db
```

---

## 3. Inspect `auth_db` (Spring Boot Auth & User Service)

List tables in `auth_db`:
```bash
docker compose exec auth_db psql -U auth_admin -d auth_service_db -c '\dt'
```

Inspect the `users` table schema:
```bash
docker compose exec auth_db psql -U auth_admin -d auth_service_db -c '\d "users"'
```

View registered users (excluding password hashes):
```bash
docker compose exec auth_db psql -U auth_admin -d auth_service_db -c 'SELECT id, email, role, first_name, last_name, active, last_login_at FROM users;'
```

---

## 4. Inspect `ats_db` (Node.js Core ATS Service)

List tables in `ats_db`:
```bash
docker compose exec ats_db psql -U ats_admin -d ats_core_db -c '\dt'
```

Inspect specific tables (e.g., `jobs`, `applications`, `resumes`):
```bash
docker compose exec ats_db psql -U ats_admin -d ats_core_db -c '\d "jobs"'
docker compose exec ats_db psql -U ats_admin -d ats_core_db -c '\d "applications"'
docker compose exec ats_db psql -U ats_admin -d ats_core_db -c '\d "resumes"'
```

View seeded Kanban statuses and skills:
```bash
docker compose exec ats_db psql -U ats_admin -d ats_core_db -c 'SELECT * FROM "application_statuses" ORDER BY position;'
docker compose exec ats_db psql -U ats_admin -d ats_core_db -c 'SELECT * FROM "skills" ORDER BY id;'
```

---

## 5. Interactive `psql` Shells

Open an interactive shell in `auth_db`:
```bash
docker compose exec auth_db psql -U auth_admin -d auth_service_db
```

Open an interactive shell in `ats_db`:
```bash
docker compose exec ats_db psql -U ats_admin -d ats_core_db
```

Useful commands inside `psql`:
| Command | Meaning |
| :--- | :--- |
| `\l` | List databases |
| `\dt` | List tables in the current schema |
| `\d "table_name"` | Inspect a table's columns, types, and indexes |
| `\q` | Exit `psql` |

---

## 6. Prisma 7 Commands (`ats-api`)

```bash
# Generate the typed Prisma 7 client
docker compose run --rm ats-api npx prisma generate

# Apply pending migrations to ats_db
docker compose run --rm ats-api npx prisma migrate deploy

# Seed the 7 Kanban statuses and 12 starter skills
docker compose run --rm ats-api npx prisma db seed
```
