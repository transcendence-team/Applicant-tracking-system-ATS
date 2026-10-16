# Database Inspection Guide

This guide explains how to check PostgreSQL, verify that `auth_db` and `ats_db` exist, list their tables, inspect table columns, and view table data.

Run all commands from the project root (the directory containing `docker-compose.yml` or `compose.yaml`).

> **Note:** Replace `user` in the examples with the value of `POSTGRES_USER` in `src/.env` if it is different.

## 1. Check that the PostgreSQL container is running

```bash
docker compose ps
```

Find `postgres_db`. It should be running; if a health check is configured, wait until its status is `healthy`.

Check whether PostgreSQL accepts connections:

```bash
docker compose exec postgres_db pg_isready -U user -d postgres
```

A successful result includes `accepting connections`.

## 2. Check that `auth_db` and `ats_db` exist

List all databases:

```bash
docker compose exec postgres_db psql -U user -d postgres -c '\l'
```

Look for both `auth_db` and `ats_db` in the output.

You can check each database individually too:

```bash
docker compose exec postgres_db psql -U user -d auth_db -c 'SELECT current_database();'
docker compose exec postgres_db psql -U user -d ats_db -c 'SELECT current_database();'
```

If a command says the database does not exist, check the PostgreSQL initialization scripts and `src/.env`.

## 3. List tables in `auth_db`

```bash
docker compose exec postgres_db psql -U user -d auth_db -c '\dt'
```

This shows tables in the current schema (usually `public`). If no tables are listed, the auth service's migrations may not have run yet.

## 4. List tables in `ats_db`

```bash
docker compose exec postgres_db psql -U user -d ats_db -c '\dt'
```

This should show tables created by the ATS Prisma migrations, including `_prisma_migrations` if migrations have been applied. The exact table names depend on the Prisma schema and migration history.

To list tables across all schemas:

```bash
docker compose exec postgres_db psql -U user -d ats_db -c '\dt *.*'
```

## 5. Inspect a table's columns and indexes

Use the exact table name returned by `\dt`. For example, if the table is named `jobs`:

```bash
docker compose exec postgres_db psql -U user -d ats_db -c '\d "jobs"'
```

For an auth table, replace the database and table name as needed:

```bash
docker compose exec postgres_db psql -U user -d auth_db -c '\d "users"'
```

PostgreSQL table names are case-sensitive when created with quoted mixed-case names. Use the exact spelling shown by `\dt`.

## 6. View rows inside a table

Only use this for development/test data. Avoid printing sensitive user data or password hashes in shared logs.

Example for the ATS database:

```bash
docker compose exec postgres_db psql -U user -d ats_db -c 'SELECT * FROM "jobs" LIMIT 10;'
```

Example for an auth table (replace `users` with the actual table name):

```bash
docker compose exec postgres_db psql -U user -d auth_db -c 'SELECT * FROM "users" LIMIT 10;'
```

If the table uses a different capitalization or naming convention, adjust the command to match the exact table name.

## 7. Open an interactive PostgreSQL shell

Connect to ATS:

```bash
docker compose exec postgres_db psql -U user -d ats_db
```

Or connect to auth:

```bash
docker compose exec postgres_db psql -U user -d auth_db
```

Useful commands inside `psql`:

| Command | Meaning |
|---|---|
| `\l` | List databases |
| `\dt` | List tables in the current schema |
| `\dt *.*` | List tables across schemas |
| `\d "jobs"` | Inspect a table's columns and indexes (use an actual table name) |
| `\dn` | List schemas |
| `\q` | Exit `psql` |

## 8. Quick checks to copy and run

```bash
# PostgreSQL status
docker compose ps
docker compose exec postgres_db pg_isready -U user -d postgres

# Databases
docker compose exec postgres_db psql -U user -d postgres -c '\l'

# Tables in each database
docker compose exec postgres_db psql -U user -d auth_db -c '\dt'
docker compose exec postgres_db psql -U user -d ats_db -c '\dt'
```

## Troubleshooting

- **`service "postgres_db" is not running`:** Start it with `docker compose up -d postgres_db`.
- **`database "auth_db" does not exist` or `database "ats_db" does not exist`:** The database creation script may not have run. PostgreSQL initialization scripts run automatically only when initializing an empty data directory. You can create a missing database manually without deleting existing data.
- **`Did not find any relations`:** The database exists, but no tables are visible in the current schema. Check whether the appropriate service migrations have run.
- **Permission/authentication error:** Confirm `POSTGRES_USER` and `POSTGRES_PASSWORD` in `src/.env`. Do not commit secrets to this guide.
- **No `user` role:** Replace `user` in the commands with the configured `POSTGRES_USER`.
