#!/bin/bash

# Load environment variables
source .env

# Set PostgreSQL password for docker exec commands
export PGPASSWORD=$POSTGRES_PASSWORD

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker exec -e PGPASSWORD=$PGPASSWORD pg-master pg_isready -h localhost -U $POSTGRES_USER -d postgres > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo " Ready!"

# Create ums database if it doesn't exist
echo "Creating ums database if it doesn't exist..."
docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'ums'" | grep -q 1 || \
docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d postgres -c "CREATE DATABASE ums"

# Check if ums database is empty (no tables)
TABLE_COUNT=$(docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d ums -tc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')

# Handle empty TABLE_COUNT
if [ -z "$TABLE_COUNT" ]; then
    TABLE_COUNT=0
fi

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "Database 'ums' already contains $TABLE_COUNT tables. Skipping dump load."
    exit 0
fi

# Check if dump file exists
if [ ! -f "ums.dump" ]; then
    echo "Error: ums.dump file not found in current directory"
    exit 1
fi

# Create ums role if it doesn't exist (required by the dump)
echo "Creating ums role if it doesn't exist..."
docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d postgres -tc "SELECT 1 FROM pg_roles WHERE rolname = 'ums'" | grep -q 1 || \
docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d postgres -c "CREATE ROLE ums WITH LOGIN PASSWORD 'ums_password'"

# Grant privileges to ums role
docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE ums TO ums"

# Detect dump format
echo "Detecting dump format..."
if file ums.dump | grep -q "PostgreSQL custom database dump"; then
    echo "Custom format dump detected. Using pg_restore..."
    # Load the dump file into ums database using pg_restore
    docker exec -i -e PGPASSWORD=$PGPASSWORD pg-master pg_restore -h localhost -U $POSTGRES_USER -d ums --no-owner --no-privileges --verbose < ums.dump
else
    echo "SQL format dump detected. Using psql..."
    # Load the dump file into ums database using psql
    docker exec -i -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d ums < ums.dump
fi

if [ $? -eq 0 ]; then
    echo "Database dump loaded successfully into ums database!"
else
    echo "Error loading database dump"
    exit 1
fi