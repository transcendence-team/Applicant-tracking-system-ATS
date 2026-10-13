COMPOSE      ?= docker compose
ENV_FILE     := src/.env
ENV_EXAMPLE  := src/.env.example
ATS_DIR      := src/ats-service

DB_SERVICE   ?= postgres_db
DB_PORT      ?= 5433

POSTGRES_DB       ?= postgres
POSTGRES_USER     ?= postgres
POSTGRES_AUTH_DB  ?= auth_db
POSTGRES_ATS_DB   ?= ats_db

# Load development environment variables.
-include $(ENV_EXAMPLE)
-include $(ENV_FILE)
export

.DEFAULT_GOAL := help

.PHONY: help env up down restart build rebuild logs ps \
        clean fclean re db-up db-init db-down db-status \
        db-check db-shell db-logs install db-generate \
        db-migrate db-deploy db-seed db-studio db-reset psql

up: env ## Build and start all services
	$(COMPOSE) up -d --build

down: ## Stop services and keep database data
	$(COMPOSE) down

restart: ## Restart running services
	$(COMPOSE) restart

build: env ## Build service images
	$(COMPOSE) build

rebuild: env ## Rebuild images without cache
	$(COMPOSE) build --no-cache

logs: ## Follow logs (make logs s=postgres_db)
	$(COMPOSE) logs -f $(s)

ps: ## Show service status
	$(COMPOSE) ps

clean: ## Stop services and DELETE database volumes
	$(COMPOSE) down -v

fclean: ## Remove services, database volumes, and local images
	$(COMPOSE) down --rmi local -v

re: fclean up ## Full reset (DELETES DATABASE DATA)

# ============================================================
# PostgreSQL
# ============================================================

db-up: env ## Start PostgreSQL and wait until ready
	$(COMPOSE) up -d $(DB_SERVICE)
	@echo "Waiting for PostgreSQL..."
	@i=0; \
	while [ $$i -lt 30 ]; do \
		if $(COMPOSE) exec -T $(DB_SERVICE) \
			pg_isready -U "$(POSTGRES_USER)" \
			-d "$(POSTGRES_DB)" >/dev/null 2>&1; then \
			echo "PostgreSQL is ready!"; \
			exit 0; \
		fi; \
		i=$$((i + 1)); \
		sleep 2; \
	done; \
	$(COMPOSE) ps $(DB_SERVICE); \
	echo "PostgreSQL did not become ready. Run: make db-logs"; \
	exit 1

db-init: db-up ## Ensure auth_db and ats_db exist
	@set -e; \
	for database in "$(POSTGRES_AUTH_DB)" "$(POSTGRES_ATS_DB)"; do \
		if $(COMPOSE) exec -T $(DB_SERVICE) \
			psql -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" \
			-tAc "SELECT 1 FROM pg_database WHERE datname='$$database'" \
			| grep -q 1; then \
			echo "Database $$database already exists."; \
		else \
			echo "Creating database $$database..."; \
			$(COMPOSE) exec -T $(DB_SERVICE) \
				createdb -U "$(POSTGRES_USER)" "$$database"; \
			echo "Database $$database created."; \
		fi; \
	done

db-down: ## Stop PostgreSQL only
	$(COMPOSE) stop $(DB_SERVICE)

db-status: ## Show PostgreSQL status
	$(COMPOSE) ps $(DB_SERVICE)

db-check: ## Check readiness and list databases
	$(COMPOSE) exec -T $(DB_SERVICE) \
		pg_isready -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)"
	$(COMPOSE) exec -T $(DB_SERVICE) \
		psql -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" -c '\l'

db-shell: ## Open a PostgreSQL shell
	$(COMPOSE) exec $(DB_SERVICE) \
		psql -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)"

db-logs: ## Follow PostgreSQL logs
	$(COMPOSE) logs -f $(DB_SERVICE)

psql: ## Open a database shell (make psql db=ats_db)
	$(COMPOSE) exec $(DB_SERVICE) \
		psql -U "$(POSTGRES_USER)" \
		-d "$(or $(db),$(POSTGRES_DB))"

# ============================================================
# ATS - Prisma
# ============================================================

# Commands run on the host.
# DB_PORT must match the published host port in Docker Compose.

DATABASE_URL = postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:$(DB_PORT)/$(POSTGRES_ATS_DB)

install: ## Install ATS npm dependencies
	cd $(ATS_DIR) && npm install

db-generate: ## Generate Prisma client
	cd $(ATS_DIR) && \
		DATABASE_URL="$(DATABASE_URL)" npx prisma generate

db-migrate: ## Create and apply migration (make db-migrate name=init)
	cd $(ATS_DIR) && \
		DATABASE_URL="$(DATABASE_URL)" \
		npx prisma migrate dev --name $(or $(name),update)

db-deploy: ## Apply existing migrations
	cd $(ATS_DIR) && \
		DATABASE_URL="$(DATABASE_URL)" npx prisma migrate deploy

db-seed: ## Seed application statuses and skills
	cd $(ATS_DIR) && \
		DATABASE_URL="$(DATABASE_URL)" npx prisma db seed

db-studio: ## Open Prisma Studio
	cd $(ATS_DIR) && \
		DATABASE_URL="$(DATABASE_URL)" npx prisma studio

db-reset: ## Reset ATS database (DELETES ATS DATA)
	cd $(ATS_DIR) && \
		DATABASE_URL="$(DATABASE_URL)" \
		npx prisma migrate reset --force

save: ## Generate ,migrate, seed  
	docker compose run --rm ats-api npx prisma generate \
	docker compose run --rm ats-api npx prisma migrate deploy \
	docker compose run --rm ats-api npx prisma db seed