#!/bin/bash
# VPS Deployment Script for Batak server
# Run this on the VPS to deploy the latest code

set -e

APP_DIR="/home/batak/app"
BRANCH="${1:-main}"

echo "Starting deployment..."
echo "Branch: $BRANCH"
echo "Directory: $APP_DIR"

# Navigate to app directory
cd $APP_DIR

# Fetch latest changes
echo "Fetching latest changes..."
git fetch origin

# Reset to latest commit
echo "Resetting to origin/$BRANCH..."
git reset --hard origin/$BRANCH

# Pull latest submodules if any
git submodule update --init --recursive || true

# Build and restart containers
echo "Building Docker images..."
docker compose build

echo "Restarting containers..."
docker compose up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 5

# Check status
echo "Container status:"
docker compose ps

echo "Deployment completed successfully!"
echo "Check logs with: docker compose logs -f"
