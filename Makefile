# Namma MedMate developer tasks. Run `make` or `make help`.

.DEFAULT_GOAL := help
SHELL := /usr/bin/env bash

PHARMACY := namma-pharmacy
WEBSITE := medmate-website

CONTAINER_RUNTIME ?= $(shell command -v podman >/dev/null 2>&1 && echo podman || echo docker)
COMPOSE           ?= $(CONTAINER_RUNTIME) compose
COMPOSE_FILE      ?= compose.yaml

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: dev up down logs
dev: ## Run the pharmacy dashboard (http://localhost:3000)
	./scripts/dev.sh

up: ## Build and start the public site container
	$(COMPOSE) -f compose.yaml up -d --build

down: ## Stop local compose services
	$(COMPOSE) -f compose.yaml down

logs: ## Follow compose logs (ARGS=website)
	$(COMPOSE) -f compose.yaml logs -f $(ARGS)

.PHONY: pharmacy website
pharmacy: ## Run the pharmacy dashboard
	cd $(PHARMACY) && npm run dev

website: ## Run the public Next.js site (http://localhost:3200)
	cd $(WEBSITE) && npm run dev

.PHONY: compose-config
compose-config: ## Validate compose files
	$(COMPOSE) -f compose.yaml config
	$(COMPOSE) -f compose.prod.yaml config
