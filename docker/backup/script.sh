#!/bin/sh
# Database backup script — placeholder for Sprint 0
# In production, this will use age encryption and S3 upload
TIMESTAMP=$(date +%Y-%m-%d)
FILENAME="likecord-$TIMESTAMP.dump"

echo "[$(date)] Starting database backup..."

# Dump PostgreSQL database
pg_dump -Fc likecord > "/backups/daily/$FILENAME"

# TODO: Add age encryption when production credentials are available
# pg_dump -Fc likecord | age -r "$AGE_PUBLIC_KEY" > "/backups/daily/$FILENAME.age"

# TODO: Add S3 upload when production credentials are available
# aws s3 cp "/backups/daily/$FILENAME" "s3://likecord-backups/daily/$FILENAME"

# Cleanup local backups older than 30 days
find /backups/daily -name "*.dump" -mtime +30 -delete

echo "[$(date)] Backup complete: $FILENAME"
