# Namma MedMate developer tasks. Run `make` or `make help`.

.DEFAULT_GOAL := help
SHELL := /usr/bin/env bash

SERVER := server
DISPENSARY := dispensary
ADMIN := admin

CONTAINER_RUNTIME ?= $(shell command -v podman >/dev/null 2>&1 && echo podman || echo docker)
COMPOSE           ?= $(CONTAINER_RUNTIME) compose
COMPOSE_FILE      ?= compose.yaml

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: clone-db db-tunnel
clone-db: ## Clone prod Postgres into local dev (ARGS=--yes --keep-dump, SOURCE=s3)
	./scripts/clone-prod-db.sh $(ARGS)

db-tunnel: ## SSM port-forward localhost:15432 -> prod RDS
	./scripts/tunnel-prod-db.sh

.PHONY: deps up down logs
deps: ## Start local Postgres + Redis
	$(COMPOSE) -f compose.yaml up -d postgres redis

up: ## Build and start full local stack
	$(COMPOSE) -f compose.yaml up -d --build

down: ## Stop local compose services
	$(COMPOSE) -f compose.yaml down

logs: ## Follow compose logs (ARGS=server)
	$(COMPOSE) -f compose.yaml logs -f $(ARGS)

.PHONY: backend dispensary admin
backend: deps ## Run Spring Boot on host (local profile)
	cd $(SERVER) && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local

dispensary: ## Run dispensary Vite dev server
	cd $(DISPENSARY) && npm run dev

admin: ## Run admin Vite dev server
	cd $(ADMIN) && npm run dev

.PHONY: build test format
build: build-server ## Build backend JAR

build-server: ## Package server JAR (skip tests)
	cd $(SERVER) && ./mvnw clean package -DskipTests

test: test-server ## Run server tests

test-server: ## Run server unit tests
	cd $(SERVER) && ./mvnw test

format: ## Format Java (Spotless)
	cd $(SERVER) && ./mvnw spotless:apply

.PHONY: compose-config
compose-config: ## Validate compose files
	$(COMPOSE) -f compose.yaml config
	$(COMPOSE) -f compose.prod.yaml config
