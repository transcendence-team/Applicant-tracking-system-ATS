#!/bin/bash
# Runs once, on first start with an empty data volume.
# Creates one database per service, named from src/.env.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE "$POSTGRES_AUTH_DB";
EOSQL
# later: CREATE DATABASE "$POSTGRES_ATS_DB";
