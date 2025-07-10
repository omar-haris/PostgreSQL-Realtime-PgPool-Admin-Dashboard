# PgPool Admin - Standalone Usage Guide

This guide explains how to use the PgPool Admin interface as a standalone monitoring tool for your existing PostgreSQL/PgPool infrastructure.

## Overview

PgPool Admin is a modern web-based administration interface that provides:
- Real-time monitoring of PostgreSQL clusters
- PgPool-II management and statistics
- Query performance analysis
- Visual cluster topology
- Performance insights and recommendations

## Quick Start with Docker

### Using Pre-built Image

```bash
docker run -d \
  --name pgpool-admin \
  -p 9000:9000 \
  -e PGPOOL_HOST=your-pgpool-host \
  -e PGPOOL_PORT=5432 \
  -e PGPOOL_USER=your-db-user \
  -e PGPOOL_PASSWORD=your-db-password \
  -e PGPOOL_DB=your-database \
  -e PGPOOL_ADMIN_USERNAME=admin \
  -e PGPOOL_ADMIN_PASSWORD=your-admin-password \
  ghcr.io/omar-haris/pgpool-dashboard:latest
```

### Using Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  pgpool-admin:
    image: ghcr.io/omar-haris/pgpool-admin:latest
    container_name: pgpool-admin
    ports:
      - "9000:9000"
    environment:
      # PgPool Connection Settings
      PGPOOL_HOST: ${PGPOOL_HOST:-pgpool.example.com}
      PGPOOL_PORT: ${PGPOOL_PORT:-5432}
      PGPOOL_USER: ${PGPOOL_USER:-pguser}
      PGPOOL_PASSWORD: ${PGPOOL_PASSWORD}
      PGPOOL_DB: ${PGPOOL_DB:-postgres}
      
      # Admin Interface Credentials
      PGPOOL_ADMIN_USERNAME: ${ADMIN_USERNAME:-admin}
      PGPOOL_ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      
      # Optional: Direct master connection for additional metrics
      # MASTER_HOST: ${MASTER_HOST:-master.example.com}
      # MASTER_PORT: ${MASTER_PORT:-5432}
    restart: unless-stopped
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
```

Then create a `.env` file:

```env
# PgPool Connection
PGPOOL_HOST=your-pgpool-host
PGPOOL_PORT=5432
PGPOOL_USER=your-db-user
PGPOOL_PASSWORD=your-db-password
PGPOOL_DB=your-database

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password-here
```

Start the service:

```bash
docker-compose up -d
```

## Building from Source

If you want to build the image yourself:

```bash
# Clone the repository
git clone https://github.com/omar-haris/PostgreSQL-Realtime-PgPool-Admin-Dashboard.git
cd PostgreSQL-Realtime-PgPool-Admin-Dashboard/pgpool-admin

# Build the image
docker build -t pgpool-admin:local .

# Run the container
docker run -d \
  --name pgpool-admin \
  -p 9000:9000 \
  -e PGPOOL_HOST=your-pgpool-host \
  -e PGPOOL_PORT=5432 \
  -e PGPOOL_USER=your-db-user \
  -e PGPOOL_PASSWORD=your-db-password \
  -e PGPOOL_DB=your-database \
  -e PGPOOL_ADMIN_USERNAME=admin \
  -e PGPOOL_ADMIN_PASSWORD=your-admin-password \
  pgpool-admin:local
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PGPOOL_HOST` | PgPool hostname/IP | pgpool | Yes |
| `PGPOOL_PORT` | PgPool port | 5432 | Yes |
| `PGPOOL_USER` | Database user | - | Yes |
| `PGPOOL_PASSWORD` | Database password | - | Yes |
| `PGPOOL_DB` | Database name | postgres | Yes |
| `PGPOOL_ADMIN_USERNAME` | Admin interface username | admin | Yes |
| `PGPOOL_ADMIN_PASSWORD` | Admin interface password | - | Yes |
| `SECRET_KEY` | Flask secret key | auto-generated | No |

### Network Requirements

The admin interface needs to connect to:
- PgPool instance (for pool statistics and management)
- PostgreSQL master (optional, for replication metrics)

Ensure your firewall rules allow:
- Inbound: Port 9000 (admin interface)
- Outbound: PgPool port (typically 5432 or 9999)
- Outbound: PostgreSQL port (if direct master access is configured)

## Features Available in Standalone Mode

### Full Features
- ✅ PgPool node status monitoring
- ✅ Connection pool statistics
- ✅ Active process monitoring
- ✅ Query execution via PgPool
- ✅ Basic performance metrics
- ✅ Health checks

### Limited Features
- ⚠️ Replication lag (requires direct master access)
- ⚠️ Advanced query statistics (requires pg_stat_statements)
- ⚠️ Some performance insights (requires full cluster access)

### Configuration for Full Features

To enable all features, provide direct master access:

```yaml
environment:
  # ... other variables ...
  MASTER_HOST: master.example.com
  MASTER_PORT: 5432
```

## Security Considerations

### Production Deployment

1. **Use HTTPS**: Deploy behind a reverse proxy with SSL
   ```nginx
   server {
       listen 443 ssl;
       server_name pgpool-admin.example.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:9000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **Strong Passwords**: Use strong, unique passwords for admin interface

3. **Network Isolation**: Run in a private network, not exposed to internet

4. **Access Control**: Implement IP whitelisting or VPN access

5. **Read-Only User**: Consider using a read-only database user for monitoring

### Database User Permissions

Minimal permissions required:

```sql
-- Create monitoring user
CREATE USER pgpool_monitor WITH PASSWORD 'secure-password';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE your_database TO pgpool_monitor;
GRANT USAGE ON SCHEMA public TO pgpool_monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO pgpool_monitor;

-- For PgPool statistics (if using PgPool's internal database)
GRANT SELECT ON pgpool_catalog.* TO pgpool_monitor;
```

## Kubernetes Deployment

### Using Helm (Coming Soon)

```bash
helm repo add pgpool-admin https://omar-haris.github.io/pgpool-admin-charts
helm install pgpool-admin pgpool-admin/pgpool-admin \
  --set pgpool.host=your-pgpool-service \
  --set pgpool.password=your-password \
  --set admin.password=admin-password
```

### Manual Kubernetes Deployment

Create `pgpool-admin-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgpool-admin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pgpool-admin
  template:
    metadata:
      labels:
        app: pgpool-admin
    spec:
      containers:
      - name: pgpool-admin
        image: ghcr.io/omar-haris/pgpool-admin:latest
        ports:
        - containerPort: 9000
        env:
        - name: PGPOOL_HOST
          value: "pgpool-service"
        - name: PGPOOL_PORT
          value: "5432"
        - name: PGPOOL_USER
          valueFrom:
            secretKeyRef:
              name: pgpool-credentials
              key: username
        - name: PGPOOL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: pgpool-credentials
              key: password
        - name: PGPOOL_DB
          value: "postgres"
        - name: PGPOOL_ADMIN_USERNAME
          value: "admin"
        - name: PGPOOL_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: pgpool-admin-credentials
              key: password
---
apiVersion: v1
kind: Service
metadata:
  name: pgpool-admin-service
spec:
  selector:
    app: pgpool-admin
  ports:
  - port: 9000
    targetPort: 9000
  type: LoadBalancer
```

## Monitoring Multiple Clusters

To monitor multiple PgPool clusters, deploy multiple instances:

```yaml
version: '3.8'

services:
  pgpool-admin-prod:
    image: ghcr.io/omar-haris/pgpool-admin:latest
    ports:
      - "9001:9000"
    environment:
      PGPOOL_HOST: prod-pgpool.example.com
      # ... other prod settings
    container_name: pgpool-admin-prod

  pgpool-admin-staging:
    image: ghcr.io/omar-haris/pgpool-admin:latest
    ports:
      - "9002:9000"
    environment:
      PGPOOL_HOST: staging-pgpool.example.com
      # ... other staging settings
    container_name: pgpool-admin-staging
```

## API Integration

The admin interface provides REST APIs for integration:

```bash
# Get authentication token (if implemented)
TOKEN=$(curl -X POST http://localhost:9000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' \
  | jq -r '.token')

# Get pool nodes status
curl http://localhost:9000/api/pool_nodes \
  -H "Authorization: Bearer $TOKEN"

# Get performance metrics
curl http://localhost:9000/api/performance_metrics \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Connection Issues

1. **Cannot connect to PgPool**
   ```bash
   # Test connection from container
   docker exec -it pgpool-admin bash
   psql -h $PGPOOL_HOST -p $PGPOOL_PORT -U $PGPOOL_USER -d $PGPOOL_DB
   ```

2. **Authentication failures**
   - Verify credentials in environment variables
   - Check PgPool's pool_hba.conf allows connections
   - Ensure pg_hba.conf on PostgreSQL allows PgPool connections

3. **Missing statistics**
   - Some features require specific PgPool configuration
   - Enable `log_statement` and `log_per_node_statement` in pgpool.conf
   - Install `pg_stat_statements` extension for query statistics

### Performance Issues

1. **Slow dashboard loading**
   - Increase container resources
   - Check network latency to PgPool
   - Enable caching in the application

2. **High memory usage**
   ```yaml
   # Limit container resources
   deploy:
     resources:
       limits:
         memory: 512M
         cpu: '0.5'
   ```

## Support

- **Issues**: [GitHub Issues](https://github.com/omar-haris/PostgreSQL-Realtime-PgPool-Admin-Dashboard/issues)
- **Documentation**: [Full Documentation](https://github.com/omar-haris/PostgreSQL-Realtime-PgPool-Admin-Dashboard/tree/main/docs)
- **GitHub Packages**: [ghcr.io/omar-haris/pgpool-dashboard](https://github.com/omar-haris/PostgreSQL-Realtime-PgPool-Admin-Dashboard/pkgs/container/pgpool-dashboard)