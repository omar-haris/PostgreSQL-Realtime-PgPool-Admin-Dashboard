# PostgreSQL Master-Replica with PgPool-II and Advanced Admin Interface

> **⚠️ Development Status**: This project is under active development and not yet ready for production use. If you'd like to use it or contribute to finish the missing features, you are welcome! Please check the [Contributing](#contributing) section.

A PostgreSQL cluster setup with master-replica replication, PgPool-II load balancing, and a comprehensive web-based administration interface.

## Features

- **High Availability PostgreSQL Cluster** with automatic failover
- **Advanced Web Administration Interface** with real-time monitoring
- **Connection Pooling & Load Balancing** via PgPool-II
- **Streaming Replication** for data redundancy
- **Performance Analytics** and query optimization insights
- **Docker-based deployment** for easy setup and portability

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Client Apps     │────▶│   PgPool-II     │────▶│ Master (RW)     │
└─────────────────┘     │ Load Balancer   │     └─────────────────┘
                        │ Port: 6436      │              │
                        └─────────────────┘              │ Streaming
                                 │                       │ Replication
                                 └──────────────▶┌─────────────────┐
                                                │ Replica (RO)     │
┌─────────────────┐                            └─────────────────┘
│ PgPool Admin    │
│ Port: 9000      │
└─────────────────┘
```

## Screenshots

| Feature | Screenshot | Description |
|---------|------------|-------------|
| **Login Page** | ![Login](docs/Screenshot%202025-07-10%20at%207.02.43%20PM.png) | Secure enterprise portal with authentication |
| **Dashboard Overview** | ![Dashboard](docs/Screenshot%202025-07-10%20at%207.03.57%20PM.png) | Real-time cluster health monitoring with key metrics |
| **Pool Nodes Management** | ![Pool Nodes](docs/Screenshot%202025-07-10%20at%207.04.16%20PM.png) | Visual cluster architecture and node status |
| **Performance Monitor** | ![Performance](docs/Screenshot%202025-07-10%20at%207.04.21%20PM.png) | Enterprise performance analytics with real-time metrics |
| **Cluster Status** | ![Cluster Status](docs/Screenshot%202025-07-10%20at%207.04.25%20PM.png) | Component health monitoring and status history |
| **Query Analysis** | ![Query Analysis](docs/Screenshot%202025-07-10%20at%207.04.29%20PM.png) | Query patterns, slow query detection, and optimization |
| **Query Console** | ![Query Console](docs/Screenshot%202025-07-10%20at%207.04.50%20PM.png) | Interactive SQL console with execution statistics |
| **History** | ![History](docs/Screenshot%202025-07-10%20at%207.04.57%20PM.png) | Event history and audit logs |
| **Pool Nodes Detail** | ![Nodes Detail](docs/Screenshot%202025-07-10%20at%207.05.26%20PM.png) | Detailed node metrics and connection analytics |
| **Infrastructure View** | ![Infrastructure](docs/Screenshot%202025-07-10%20at%207.05.35%20PM.png) | Complete infrastructure overview with topology |

## Prerequisites

- Docker and Docker Compose v2.0+
- 8GB RAM minimum (16GB recommended for production)
- Available ports: 6435, 6436, 6437, 9000
- Disk space: 10GB minimum

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd PgPool
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# PostgreSQL Database Configuration
POSTGRES_DB=appdb
POSTGRES_USER=appuser
POSTGRES_PASSWORD=SecurePass123!

# PgPool Admin Configuration
PGPOOL_ADMIN_USERNAME=admin
PGPOOL_ADMIN_PASSWORD=AdminPass456!
```

### 3. Start the Cluster

```bash
docker-compose up -d
```

### 4. Verify Services

```bash
docker-compose ps
```

All services should show as "Up" and healthy.

### 5. Access Admin Interface

Open your browser and navigate to: http://localhost:9000

Login with the admin credentials from your `.env` file.

## Installation Guide

### Using Docker Compose (Recommended)

1. **System Requirements Check**
   ```bash
   docker --version  # Should be 20.10+
   docker-compose --version  # Should be 2.0+
   ```

2. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd PgPool
   cp .env.example .env  # If example exists
   ```

3. **Configure Environment**
   Edit `.env` file with your preferred settings

4. **Launch Stack**
   ```bash
   docker-compose up -d
   ```

5. **Verify Health**
   ```bash
   docker-compose ps
   docker-compose logs -f  # Check for any errors
   ```

### Manual Installation

For bare-metal installation, refer to the [manual installation guide](docs/MANUAL_INSTALL.md).

## How to Use

### Connecting to the Database

#### Via PgPool Load Balancer (Recommended)
```bash
psql -h localhost -p 6436 -U appuser -d appdb
```

#### Direct Connections
```bash
# Master (Read/Write)
psql -h localhost -p 6435 -U appuser -d appdb

# Replica (Read-Only)
psql -h localhost -p 6437 -U appuser -d appdb
```

### Using the Admin Interface

1. **Access Dashboard**: Navigate to http://localhost:9000
2. **Login**: Use credentials from `.env` file
3. **Monitor**: View real-time cluster health and metrics
4. **Analyze**: Check query performance and get optimization tips
5. **Execute**: Run queries directly from the web console

### Common Operations

#### Check Replication Status
```sql
-- On master
SELECT * FROM pg_stat_replication;

-- On replica
SELECT * FROM pg_stat_wal_receiver;
```

#### View PgPool Node Status
```bash
docker exec -it pgpool psql -h localhost -p 5432 -U appuser -c "show pool_nodes"
```

#### Load Sample Data
```bash
# Using the provided script
./load-dump.sh

# Or manually
docker exec -i pg-master psql -U appuser appdb < your_dump.sql
```

## PgPool Admin Features

### Dashboard Overview
- **Health Score**: Real-time cluster health indicator (0-100)
- **System Metrics**: CPU, Memory, Disk I/O monitoring
- **Connection Pool Status**: Active/Idle/Waiting connections
- **Query Performance**: QPS, response time, cache hit rate
- **Replication Status**: Lag monitoring and sync state

### Pool Nodes Management
- **Visual Cluster Topology**: Interactive diagram of your database architecture
- **Node Health Monitoring**: Individual node status and metrics
- **Connection Distribution**: See how connections are balanced
- **Resource Utilization**: Per-node CPU, memory, and connection usage
- **Failover Management**: Manual failover controls

### Performance Monitor
- **Real-time Metrics**: Live performance data with 5-second refresh
- **Historical Graphs**: Trend analysis over multiple time windows
- **Resource Usage**: CPU, Memory, Disk I/O breakdown
- **Query Rate Analysis**: QPS trends and patterns
- **Cache Performance**: Hit rates and optimization suggestions

### Cluster Status
- **Component Health**: Individual service status monitoring
- **Status History**: Track changes and incidents over time
- **Response Time**: Per-component latency measurements
- **Connection Counts**: Active connections per service
- **Alert System**: Visual indicators for issues

### Query Analysis
- **Query Patterns**: Automatic query pattern detection
- **Slow Query Log**: Identify and analyze slow queries
- **Execution Statistics**: Average time, count, total time
- **Query Optimization**: Get recommendations for improvements
- **Table Usage**: See which tables are accessed most

### Query Console
- **Interactive SQL Editor**: Syntax highlighting and auto-completion
- **Multi-target Execution**: Run queries on specific nodes
- **Result Visualization**: Table and chart views
- **Export Options**: CSV, JSON export functionality
- **Query History**: Access previously executed queries

### Insights & Recommendations
- **Performance Insights**: AI-powered performance analysis
- **Index Recommendations**: Missing index detection
- **Table Maintenance**: Bloat detection and vacuum suggestions
- **Configuration Tuning**: Parameter optimization tips
- **Capacity Planning**: Growth projections and recommendations

### Database Management
- **Database List**: Overview of all databases
- **Size Monitoring**: Track database and table sizes
- **Schema Browser**: Explore database schemas
- **User Management**: View connected users and sessions
- **Lock Monitoring**: Detect and resolve lock conflicts

### History & Audit
- **Event Timeline**: Comprehensive event history
- **Query Audit**: Track who ran what and when
- **Configuration Changes**: Monitor setting modifications
- **Performance History**: Historical performance data
- **Export Reports**: Generate PDF/CSV reports

## API Endpoints

The PgPool Admin interface provides REST APIs for integration:

- `/api/pool_nodes` - Get pool nodes status
- `/api/pool_status` - Get pool configuration status
- `/api/pool_processes` - Get active pool processes
- `/api/replication_status` - Get replication lag and status
- `/api/performance_metrics` - Get performance metrics
- `/api/query_statistics` - Get query performance stats
- `/api/database_statistics` - Get database-level statistics
- `/api/cluster_status` - Get overall cluster health
- `/api/execute_query` - Execute SQL queries (POST)

## Maintenance

### Daily Operations

#### Health Check
```bash
# Quick health check
docker-compose ps
curl -s http://localhost:9000/api/health_check | jq
```

#### Monitor Replication Lag
```bash
docker exec -it pgpool psql -h localhost -p 5432 -U appuser -c "show pool_nodes"
```

### Backup & Restore

#### Automated Backup
```bash
# Create backup with timestamp
docker exec -t pg-master pg_dump -U appuser appdb > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Point-in-Time Recovery
```bash
# Restore to specific point
docker exec -i pg-master psql -U appuser appdb < backup.sql
```

### Service Management

#### Graceful Restart
```bash
# Restart with zero downtime
docker-compose restart pgpool
docker-compose restart postgres-replica
docker-compose restart postgres-master
```

#### View Logs
```bash
# Real-time logs
docker-compose logs -f --tail=100

# Service-specific logs
docker-compose logs -f pgpool
docker-compose logs -f postgres-master
docker-compose logs -f postgres-replica
docker-compose logs -f pgpool-admin
```

### Scaling Operations

#### Add New Replica
1. Update `docker-compose.yml` with new replica service
2. Update PgPool configuration
3. Restart PgPool to recognize new node

#### Remove Node
```bash
# Detach node from pool
docker exec -it pgpool pcp_detach_node -h localhost -U appuser -n 1
```

## Troubleshooting

### Common Issues

#### Replica Not Syncing
```bash
# Check replication status
docker exec -it pg-master psql -U appuser -c "SELECT * FROM pg_stat_replication;"

# Check replica logs
docker-compose logs postgres-replica | grep -E "ERROR|FATAL"

# Rebuild replica
docker-compose stop postgres-replica
docker-compose rm -f postgres-replica
docker volume rm pgpool_replica_data
docker-compose up -d postgres-replica
```

#### PgPool Connection Issues
```bash
# Test PgPool connectivity
docker exec -it pgpool psql -h localhost -p 5432 -U appuser -c "SELECT 1"

# Check PgPool status
docker exec -it pgpool pcp_pool_status -h localhost -U appuser

# Reload PgPool configuration
docker exec -it pgpool pgpool reload
```

#### High Memory Usage
```bash
# Check memory usage
docker stats --no-stream

# Adjust shared_buffers in PostgreSQL config
# Adjust num_init_children in PgPool config
```

#### Port Conflicts
```bash
# Find process using port
lsof -i :6436
netstat -tulpn | grep 6436

# Update ports in docker-compose.yml
```

### Debug Mode

Enable debug logging:
```bash
# PgPool debug
docker exec -it pgpool pgpool -d -D

# PostgreSQL debug
docker exec -it pg-master psql -U appuser -c "SET log_min_messages TO DEBUG5;"
```

## Performance Tuning

### PostgreSQL Optimization
```conf
# postgres-master/custom-postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### PgPool Optimization
```conf
# pgpool/pgpool.conf
num_init_children = 32
max_pool = 4
connection_cache = on
memory_cache_enabled = on
```

## Security Best Practices

### Network Security
```yaml
# docker-compose.yml - Internal network only
networks:
  pgnet:
    internal: true
```

### Authentication
```conf
# postgres-master/pg_hba.conf
host all all 0.0.0.0/0 scram-sha-256
```

### SSL/TLS Configuration
1. Generate certificates
2. Mount certificates in containers
3. Enable SSL in PostgreSQL and PgPool
4. Update connection strings

### Regular Updates
```bash
# Update images
docker-compose pull
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## Support

- Documentation: Check `/docs` folder
- Issues: GitHub Issues
- Community: Discord/Slack channel

## License

This project is licensed under the MIT License - see LICENSE file for details.