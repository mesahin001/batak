#!/bin/bash
# Health check script for Batak server
# This script checks if the server is responding and restarts if needed

set -e

HEALTH_URL="http://localhost:3001/health"
MAX_RETRIES=3
RETRY_DELAY=5

echo "Checking Batak server health..."

for ((i=1; i<=$MAX_RETRIES; i++)); do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL 2>/dev/null || echo "000")

    if [ "$RESPONSE" = "200" ]; then
        echo "✓ Server is healthy (HTTP $RESPONSE)"
        exit 0
    else
        echo "✗ Attempt $i/$MAX_RETRIES: Server is unhealthy (HTTP $RESPONSE)"

        if [ $i -lt $MAX_RETRIES ]; then
            echo "Retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    fi
done

echo "Server failed health check after $MAX_RETRIES attempts"
echo "Restarting batak-server container..."

cd /home/batak/app
docker compose restart batak-server

echo "Waiting for server to start..."
sleep 10

# Final check
FINAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL 2>/dev/null || echo "000")
if [ "$FINAL_RESPONSE" = "200" ]; then
    echo "✓ Server recovered successfully"
    exit 0
else
    echo "✗ Server failed to recover (HTTP $FINAL_RESPONSE)"
    exit 1
fi
