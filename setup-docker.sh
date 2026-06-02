#!/bin/bash

# ==========================================
# ArgoFarm Docker Setup Script
# For Linux and macOS
# ==========================================

set -e

echo ""
echo "========================================"
echo "  ArgoFarm Docker Setup Script"
echo "========================================"
echo ""

# Check if Docker is installed
echo "[*] Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed"
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo "[OK] Docker is installed: $(docker --version)"

# Check if Docker Compose is installed
echo "[*] Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "[ERROR] Docker Compose is not installed"
    echo "Please update Docker Desktop to include Compose"
    exit 1
fi
echo "[OK] Docker Compose is installed: $(docker-compose --version)"

# Check if Docker daemon is running
echo "[*] Checking Docker daemon..."
if ! docker info &> /dev/null; then
    echo "[ERROR] Docker daemon is not running"
    echo "Please start Docker Desktop"
    exit 1
fi
echo "[OK] Docker daemon is running"

# Check if Make is installed (optional)
echo "[*] Checking Make..."
if ! command -v make &> /dev/null; then
    echo "[WARNING] GNU Make not found - some commands won't work"
    echo "[INFO] Install it using: brew install make (macOS) or apt-get install make (Linux)"
else
    echo "[OK] Make is installed"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "[*] Creating .env file..."
    cp .env.example .env
    echo "[OK] .env file created"
    echo "[INFO] Please review .env and update security settings:"
    echo "      - DB_PASSWORD: Change from default"
    echo "      - JWT_SECRET: Generate a strong random value"
    echo "      - FLASK_ENV: Set to 'production' for production"
else
    echo "[OK] .env file already exists"
fi

# Create nginx directories
if [ ! -d "nginx/ssl" ]; then
    echo "[*] Creating nginx directories..."
    mkdir -p nginx/ssl
    echo "[OK] nginx directories created"
fi

# Ask to build images
echo ""
read -p "[?] Do you want to build Docker images now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "[*] Building Docker images..."
    echo "This may take several minutes..."
    echo ""
    docker-compose build
    echo "[OK] Build completed successfully"
else
    echo "[INFO] Skipping build - you can run 'docker-compose build' later"
fi

# Ask to start services
echo ""
read -p "[?] Do you want to start services now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "[*] Starting services..."
    docker-compose up -d
    echo "[OK] Services started successfully"
    echo ""
    echo "[*] Waiting for services to be ready (10 seconds)..."
    sleep 10
    echo ""
    
    # Initialize database
    echo "[*] Initializing database..."
    docker exec argofarm-backend python init_db.py || \
        echo "[WARNING] Database initialization may have failed"
    echo "[OK] Database ready"
else
    echo "[INFO] Skipping startup - you can run 'docker-compose up -d' later"
fi

# Print summary
echo ""
echo "========================================"
echo "   Setup Complete!"
echo "========================================"
echo ""
echo "Service URLs:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:5000"
echo "  Nginx:     http://localhost:80"
echo "  Database:  localhost:3306"
echo ""
echo "Useful commands:"
echo "  docker-compose up -d        Start all services"
echo "  docker-compose down         Stop all services"
echo "  docker-compose logs -f      View logs"
echo "  docker ps                   List containers"
echo "  make help                   Show all make commands"
echo ""
echo "For full documentation, see: DOCKER_SETUP.md"
echo "For quick reference, see: DOCKER_QUICK_REFERENCE.md"
echo ""
