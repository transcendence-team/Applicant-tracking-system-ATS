#!/bin/bash
# Runs only when PostgreSQL initializes an empty data volume.
# Creates separate databases for the Spring Boot auth service and ATS service.
set -euo pipefail

create_database() {
    local database_name="$1"
    psql \
        --set ON_ERROR_STOP=1 \
        --set database_name="$database_name" \
        --username "$POSTGRES_USER" \
        --dbname "$POSTGRES_DB" <<'EOSQL'
SELECT format('CREATE DATABASE %I', :'database_name')
WHERE NOT EXISTS (
    SELECT 1 FROM pg_database WHERE datname = :'database_name'
)
\gexec
EOSQL
}

: "${POSTGRES_AUTH_DB:?POSTGRES_AUTH_DB must be set in src/.env}"
: "${POSTGRES_ATS_DB:?POSTGRES_ATS_DB must be set in src/.env}"

create_database "$POSTGRES_AUTH_DB"
create_database "$POSTGRES_ATS_DB"
