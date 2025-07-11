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

# Create your testing database if it doesn't exist
echo "Creating testing database if it doesn't exist..."
docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'testing'" | grep -q 1 || \
docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d postgres -c "CREATE DATABASE testing"

# Check if testing database is empty (no tables)
TABLE_COUNT=$(docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d testing -tc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')

# Handle empty TABLE_COUNT
if [ -z "$TABLE_COUNT" ]; then
    TABLE_COUNT=0
fi

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "Database 'testing' already contains $TABLE_COUNT tables. Skipping dump load."
    exit 0
fi

# Check if dump file exists
if [ ! -f "testing.dump" ]; then
    echo "Error: testing.dump file not found in current directory"
    exit 1
fi

# Create testing role if it doesn't exist (required by the dump)
echo "Creating testing role if it doesn't exist..."
docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d postgres -tc "SELECT 1 FROM pg_roles WHERE rolname = 'testing'" | grep -q 1 || \
docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d postgres -c "CREATE ROLE testing WITH LOGIN PASSWORD 'testing_password'"

# Grant privileges to testing role
docker exec -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE testing TO testing"

# Detect dump format
echo "Detecting dump format..."
if file testing.dump | grep -q "PostgreSQL custom database dump"; then
    echo "Custom format dump detected. Using pg_restore..."
    # Load the dump file into testing database using pg_restore
    docker exec -i -e PGPASSWORD=$PGPASSWORD pg-master pg_restore -h localhost -U $POSTGRES_USER -d testing --no-owner --no-privileges --verbose < testing.dump
else
    echo "SQL format dump detected. Using psql..."
    # Load the dump file into testing database using psql
    docker exec -i -e PGPASSWORD=$PGPASSWORD pg-master psql -h localhost -U $POSTGRES_USER -d testing < testing.dump
fi

if [ $? -eq 0 ]; then
    echo "Database dump loaded successfully into testing database!"
else
    echo "Error loading database dump"
    exit 1
fi
