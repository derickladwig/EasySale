@echo off
setlocal enabledelayedexpansion

REM ============================================
REM EasySale - Docker Clean Script (Windows)
REM ============================================

echo.
echo ============================================
echo   EasySale - Docker Clean
echo ============================================
echo.
echo [WARNING] This will remove all EasySale Docker resources!
echo.
set /p CONFIRM="Type 'yes' to continue: "
if /i not "%CONFIRM%"=="yes" (
    echo Clean cancelled.
    pause
    exit /b 0
)

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    pause
    exit /b 1
)

echo.
echo [1/5] Stopping containers...
docker-compose -p EasySale down --remove-orphans >nul 2>&1
docker-compose -p EasySale -f docker-compose.prod.yml down --remove-orphans >nul 2>&1
docker rm -f EasySale-frontend EasySale-backend EasySale-storybook >nul 2>&1
docker rm -f EasySale-frontend-dev EasySale-backend-dev EasySale-storybook-dev >nul 2>&1
REM Also clean up old caps-pos containers
docker rm -f caps-pos-frontend caps-pos-backend caps-pos-storybook >nul 2>&1
docker rm -f caps-pos-frontend-dev caps-pos-backend-dev caps-pos-storybook-dev >nul 2>&1
REM Clean up any auto-generated project containers
docker rm -f dynamous-kiro-hackathon-frontend dynamous-kiro-hackathon-backend >nul 2>&1

echo [2/5] Removing EasySale volumes...
docker volume rm EasySale-data EasySale-data-dev >nul 2>&1
docker volume rm EasySale-frontend-modules EasySale-cargo-registry >nul 2>&1
docker volume rm EasySale-cargo-git EasySale-target >nul 2>&1
REM Also clean up old caps-pos volumes
docker volume rm caps-pos-data caps-pos-data-dev >nul 2>&1
docker volume rm caps-pos-frontend-modules caps-pos-cargo-registry >nul 2>&1
docker volume rm caps-pos-cargo-git caps-pos-target >nul 2>&1

echo [3/5] Removing legacy hackathon resources...
docker volume rm dynamous-kiro-hackathon_pos-data >nul 2>&1
docker volume rm dynamous-kiro-hackathon_backend_cargo_git >nul 2>&1
docker volume rm dynamous-kiro-hackathon_backend_cargo_registry >nul 2>&1
docker volume rm dynamous-kiro-hackathon_backend_target >nul 2>&1
docker volume rm dynamous-kiro-hackathon_frontend_node_modules >nul 2>&1
docker network rm dynamous-kiro-hackathon_caps-network >nul 2>&1

echo [4/5] Removing images...
docker rmi EasySale-backend:latest EasySale-frontend:latest >nul 2>&1
docker rmi caps-pos-backend:latest caps-pos-frontend:latest >nul 2>&1
docker rmi dynamous-kiro-hackathon-backend:latest dynamous-kiro-hackathon-frontend:latest >nul 2>&1

echo [5/5] Pruning build cache...
docker builder prune -f >nul 2>&1
docker network rm EasySale-network >nul 2>&1
docker network rm caps-pos-network >nul 2>&1

echo.
echo ============================================
echo   Clean Complete!
echo ============================================
echo.
pause
