#!/bin/bash
# Database backup script for Batak server
# Backs up SQLite database and retains last 7 days

set -e

BACKUP_DIR="/home/batak/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="batak-server"
DB_PATH="/app/data"

mkdir -p $BACKUP_DIR

echo "Starting backup at $(date)"

# Check if container is running
if ! docker ps | grep -q $DB_CONTAINER; then
    echo "Error: Container $DB_CONTAINER is not running"
    exit 1
fi

# Create backup
echo "Backing up database..."
docker cp $DB_CONTAINER:$DB_PATH/batak.db $BACKUP_DIR/batak.db.$TIMESTAMP

# Compress backup
echo "Compressing backup..."
gzip $BACKUP_DIR/batak.db.$TIMESTAMP

# Remove backups older than 7 days
echo "Cleaning old backups..."
find $BACKUP_DIR -name "batak.db.*.gz" -mtime +7 -delete

# List current backups
echo "Current backups:"
ls -lh $BACKUP_DIR/batak.db.*.gz 2>/dev/null || echo "No backups found"

echo "Backup completed at $(date)"
