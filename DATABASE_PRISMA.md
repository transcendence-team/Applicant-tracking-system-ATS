# Database Inspection & Prisma 7 Guide

This guide explains how to inspect the two database containers (`auth_db` on MongoDB 8 and `ats_db` on PostgreSQL 18), verify collections/tables and fields, and run Prisma 7 migrations and seeds.

Run all commands from the project root (the directory containing `docker-compose.yml`).

---

## 1. Database Architecture Overview

| Container Name | Engine | Database Name | User | Owner Service | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `auth_db` | MongoDB 8 (`mongo:8`) | `auth_service_db` (`MONGO_INITDB_DATABASE`) | `auth_admin` (`MONGO_INITDB_ROOT_USERNAME`) | `auth-api` (Spring Data MongoDB) | Owns `users` collection (credentials, RBAC roles, and all user/candidate/employee profile fields) |
| `ats_db` | PostgreSQL 18 (`postgres:18-alpine`) | `ats_core_db` (`POSTGRES_DB`) | `ats_admin` (`POSTGRES_USER`) | `ats-api` (Node.js / Prisma 7) | Owns 12 recruitment tables (`jobs`, `applications`, `resumes`, `skills`, `ai_analyses`, etc.) |

> **Ownership Rule:** `ats_db` never joins or declares foreign keys to `auth_db.users`. Every user reference in `ats_db` (`Application.userId`, `Resume.userId`, `Job.createdBy`, `JobRecruiter.userId`, `Notification.userId`, etc.) is a plain `@db.Uuid` column populated from the verified JWT `sub` claim.

---

## 2. Check Container Status & Readiness

```bash
docker compose ps
```

Check whether both database containers accept connections:

```bash
docker compose exec auth_db mongosh --quiet --eval "db.adminCommand('ping').ok"
docker compose exec ats_db pg_isready -U ats_admin -d ats_core_db
```

---

## 3. Inspect `auth_db` (Spring Boot Auth & User Service — MongoDB)

List collections in `auth_db`:
```bash
docker compose exec auth_db mongosh -u auth_admin -p auth_password123 --authenticationDatabase admin auth_service_db --quiet --eval "db.getCollectionNames()"
```

View indexes on the `users` collection:
```bash
docker compose exec auth_db mongosh -u auth_admin -p auth_password123 --authenticationDatabase admin auth_service_db --quiet --eval "db.users.getIndexes()"
```

View registered users (excluding password hashes):
```bash
docker compose exec auth_db mongosh -u auth_admin -p auth_password123 --authenticationDatabase admin auth_service_db --quiet --eval "db.users.find({}, { passwordHash: 0 }).pretty()"
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

## 5. Interactive Database Shells

Open an interactive `mongosh` shell in `auth_db`:
```bash
docker compose exec auth_db mongosh -u auth_admin -p auth_password123 --authenticationDatabase admin auth_service_db
```

Open an interactive `psql` shell in `ats_db`:
```bash
docker compose exec ats_db psql -U ats_admin -d ats_core_db
```

Useful commands inside `psql` (`ats_db`):
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
