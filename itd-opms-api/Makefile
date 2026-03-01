.PHONY: build run dev test lint migrate-up migrate-down migrate-create seed sqlc docker-up docker-down clean

# Variables
APP_NAME := itd-opms-api
BUILD_DIR := bin
MIGRATIONS_DIR := migrations
DB_DSN ?= postgres://opms:opms_secret@localhost:5432/itd_opms?sslmode=disable

# Build
build:
	@echo "Building $(APP_NAME)..."
	go build -o $(BUILD_DIR)/$(APP_NAME) ./cmd/api

# Run
run: build
	@echo "Starting $(APP_NAME)..."
	./$(BUILD_DIR)/$(APP_NAME)

dev:
	@echo "Starting $(APP_NAME) in dev mode..."
	go run ./cmd/api

# Test
test:
	go test -v -race -coverprofile=coverage.out ./...

test-coverage: test
	go tool cover -html=coverage.out -o coverage.html

# Lint
lint:
	golangci-lint run ./...

# Database Migrations
migrate-up:
	@echo "Running migrations..."
	goose -dir $(MIGRATIONS_DIR) postgres "$(DB_DSN)" up

migrate-down:
	@echo "Rolling back last migration..."
	goose -dir $(MIGRATIONS_DIR) postgres "$(DB_DSN)" down

migrate-reset:
	@echo "Resetting all migrations..."
	goose -dir $(MIGRATIONS_DIR) postgres "$(DB_DSN)" reset

migrate-status:
	@echo "Migration status..."
	goose -dir $(MIGRATIONS_DIR) postgres "$(DB_DSN)" status

migrate-create:
	@read -p "Migration name: " name; \
	goose -dir $(MIGRATIONS_DIR) create $$name sql

# sqlc
sqlc:
	@echo "Generating sqlc code..."
	sqlc generate

# Seed
seed:
	@echo "Seeding database..."
	go run ./cmd/seed

# Docker
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

# Clean
clean:
	rm -rf $(BUILD_DIR)
	rm -f coverage.out coverage.html
