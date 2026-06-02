@echo off
REM ==========================================
REM ArgoFarm Docker Setup Script for Windows
REM ==========================================
REM This script automates the initial setup

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   ArgoFarm Docker Setup Script
echo ========================================
echo.

REM Check if Docker is installed
echo [*] Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [OK] Docker is installed

REM Check if Docker Compose is installed
echo [*] Checking Docker Compose...
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed
    echo Please update Docker Desktop to include Compose
    pause
    exit /b 1
)
echo [OK] Docker Compose is installed

REM Check if Make is installed (optional)
echo [*] Checking Make...
where make >nul 2>&1
if errorlevel 1 (
    echo [WARNING] GNU Make not found - some commands won't work
    echo [INFO] Install it from: http://gnuwin32.sourceforge.net/packages/make.htm
) else (
    echo [OK] Make is installed
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo.
    echo [*] Creating .env file...
    copy .env.example .env >nul
    echo [OK] .env file created
    echo [INFO] Please edit .env and update security settings
    echo [INFO] At minimum, change:
    echo        - DB_PASSWORD
    echo        - JWT_SECRET
) else (
    echo [OK] .env file already exists
)

REM Create nginx directories if they don't exist
if not exist "nginx\ssl" (
    echo [*] Creating nginx directories...
    mkdir nginx\ssl >nul 2>&1
    echo [OK] nginx directories created
)

REM Offer to build images
echo.
echo [?] Do you want to build Docker images now? (y/n)
set /p build_choice=
if /i "%build_choice%"=="y" (
    echo.
    echo [*] Building Docker images...
    echo This may take several minutes...
    echo.
    docker-compose build
    if errorlevel 1 (
        echo [ERROR] Build failed!
        pause
        exit /b 1
    )
    echo [OK] Build completed successfully
) else (
    echo [INFO] Skipping build - you can run 'docker-compose build' later
)

REM Offer to start services
echo.
echo [?] Do you want to start services now? (y/n)
set /p start_choice=
if /i "%start_choice%"=="y" (
    echo.
    echo [*] Starting services...
    docker-compose up -d
    if errorlevel 1 (
        echo [ERROR] Failed to start services!
        pause
        exit /b 1
    )
    echo [OK] Services started successfully
    echo.
    echo [*] Waiting for services to be ready...
    timeout /t 10 /nobreak
    echo.
    echo [*] Initializing database...
    docker exec argofarm-backend python init_db.py
    if errorlevel 1 (
        echo [WARNING] Database initialization may have failed
    ) else (
        echo [OK] Database initialized
    )
) else (
    echo [INFO] Skipping startup - you can run 'docker-compose up -d' later
)

REM Print summary
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Service URLs:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:5000
echo   Nginx:     http://localhost:80
echo   Database:  localhost:3306
echo.
echo Useful commands:
echo   docker-compose up -d        Start all services
echo   docker-compose down         Stop all services
echo   docker-compose logs -f      View logs
echo   docker ps                   List containers
echo   docker exec -it argofarm-db mysql -u argofarm -p
echo.
echo For more commands, see: make help
echo For full documentation, see: DOCKER_SETUP.md
echo.
pause
