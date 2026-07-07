# ============================================================================
# ElderAssist AI — operator shortcuts
# ============================================================================
# Thin wrappers around docker compose + the helper scripts. Run from the repo
# root:  make up | make down | make logs | make ps | make update | make backup
#        make restore ARCHIVE=backups/elderassist_ha_config-YYYYMMDD-HHMMSS.tar.gz
#        make validate
#
# Profiles are read from .env (COMPOSE_PROFILES), which setup.sh writes. To run
# a one-off with the GPU override:
#   docker compose -f docker/docker-compose.yml -f docker/docker-compose.gpu.yml up -d
# ============================================================================

COMPOSE_FILE := docker/docker-compose.yml
ENV_FILE     := .env
DC           := docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE)

# Use bash so recipes behave consistently.
SHELL := /bin/bash

.DEFAULT_GOAL := help
.PHONY: help up down logs ps update backup restore validate pull

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Start the stack (profiles come from .env)
	$(DC) up -d

down: ## Stop the stack (keeps data volumes)
	$(DC) down

logs: ## Follow logs for all running services
	$(DC) logs -f --tail=100

ps: ## Show running services and health
	$(DC) ps

pull: ## Pull the latest images (does not restart)
	$(DC) pull

update: ## Pull latest images and re-create containers
	$(DC) pull
	$(DC) up -d

backup: ## Back up data volumes to ./backups (excludes LLM models)
	./scripts/backup.sh

restore: ## Restore a volume archive: make restore ARCHIVE=backups/<file>.tar.gz
	@if [ -z "$(ARCHIVE)" ]; then \
	  echo "Usage: make restore ARCHIVE=backups/elderassist_ha_config-YYYYMMDD-HHMMSS.tar.gz"; \
	  exit 2; \
	fi
	./scripts/restore.sh "$(ARCHIVE)"

validate: ## Validate compose config, YAML, and shell scripts
	@echo "== docker compose config (core) =="
	@$(DC) config -q && echo "  core OK"
	@echo "== docker compose config (all profiles) =="
	@$(DC) --profile voice --profile inventory --profile grocy --profile webui config -q && echo "  all-profiles OK"
	@echo "== yamllint =="
	@if command -v yamllint >/dev/null 2>&1; then \
	  yamllint docker/ $$( [ -d ha ] && echo ha/ ) && echo "  yamllint OK"; \
	else echo "  (yamllint not installed — skipping)"; fi
	@echo "== shellcheck =="
	@if command -v shellcheck >/dev/null 2>&1; then \
	  shellcheck setup.sh scripts/*.sh && echo "  shellcheck OK"; \
	else echo "  (shellcheck not installed — skipping)"; fi
