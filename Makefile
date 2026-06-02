.PHONY: help build up down logs clean reset init env db-init stop restart ps health

help:
	@echo "ArgoFarm Docker Commands"
	@echo "========================"
	@echo "make env           - Create .env file from .env.example"
	@echo "make build         - Build all Docker images"
	@echo "make up            - Start all services (use -d for detached mode)"
	@echo "make down          - Stop all services"
	@echo "make restart       - Restart all services"
	@echo "make stop          - Stop all services without removing"
	@echo "make logs          - View logs from all services"
	@echo "make logs-backend  - View backend logs"
	@echo "make logs-frontend - View frontend logs"
	@echo "make logs-db       - View database logs"
	@echo "make logs-nginx    - View nginx logs"
	@echo "make ps            - Show running containers"
	@echo "make health        - Check service health"
	@echo "make clean         - Stop services and remove containers"
	@echo "make reset         - Clean everything including volumes"
	@echo "make db-init       - Initialize database"
	@echo "make db-shell      - Enter database shell"
	@echo "make backend-shell - Enter backend container shell"
	@echo "make frontend-shell - Enter frontend container shell"

env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env file. Please review and update values as needed."; \
	else \
		echo "✓ .env file already exists."; \
	fi

build:
	docker-compose build --no-cache

up:
	docker-compose up

down:
	docker-compose down

restart: down up

stop:
	docker-compose stop

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f db

logs-nginx:
	docker-compose logs -f nginx

ps:
	docker-compose ps

health:
	@echo "Checking service health..."
	@docker-compose ps
	@echo "\nBackend health:"
	@docker exec argofarm-backend curl -s http://localhost:5000/api/auth/health || echo "Backend not responding"
	@echo "\nFrontend health:"
	@docker exec argofarm-frontend wget -q -O- http://localhost:80/ > /dev/null && echo "Frontend is healthy" || echo "Frontend not responding"

clean: down
	docker-compose rm -f

reset: clean
	docker volume rm argofarm_mysql_data || true
	@echo "✓ All containers and volumes removed"

db-init:
	docker exec argofarm-backend python init_db.py

db-shell:
	docker exec -it argofarm-db mysql -u argofarm -p argofarm

backend-shell:
	docker exec -it argofarm-backend bash

frontend-shell:
	docker exec -it argofarm-frontend sh

# Development commands
dev-build:
	docker-compose build --no-cache

dev-up:
	docker-compose up -d
	@echo "✓ Services started in background"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:5000"
	@echo "Nginx: http://localhost:80"

# Production commands
prod-up:
	docker-compose -f docker-compose.yml up -d
	@echo "✓ Production services started"

# Utility commands
prune:
	docker system prune -f
	docker volume prune -f

pull:
	docker-compose pull

version:
	docker-compose version
	docker version
	docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
