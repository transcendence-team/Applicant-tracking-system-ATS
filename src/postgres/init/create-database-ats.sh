#!/bin/bash
# Runs once, on first start with an empty PostgreSQL data volume.
# Creates the ATS database.
set -e

psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE "$POSTGRES_ATS_DB";
EOSQL
