#!/usr/bin/env python3
"""
Cluster Status Monitoring Service
OPENSEWAVE PgPool Admin Dashboard

This service monitors PostgreSQL cluster components and tracks their status in SQLite database.
"""

import sqlite3
import time
import psycopg2
import subprocess
import json
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClusterMonitor:
    def __init__(self, db_path: str = "cluster_status.db"):
        self.db_path = db_path
        self.init_database()
        self.monitoring = False
        self.monitor_thread = None
        
        # Configuration
        self.components = {
            'pg-master': {
                'type': 'postgres',
                'host': 'pg-master',
                'port': 6435,
                'user': os.environ.get('PGPOOL_USER', 'appuser'),
                'password': os.environ.get('PGPOOL_PASSWORD', ''),
                'database': os.environ.get('PGPOOL_DB', 'appdb')
            },
            'pg-replica': {
                'type': 'postgres',
                'host': 'pg-replica',
                'port': 6435,
                'user': os.environ.get('PGPOOL_USER', 'appuser'),
                'password': os.environ.get('PGPOOL_PASSWORD', ''),
                'database': os.environ.get('PGPOOL_DB', 'appdb')
            },
            'pgpool': {
                'type': 'pgpool',
                'host': 'pgpool',
                'port': 5432,
                'user': os.environ.get('PGPOOL_USER', 'appuser'),
                'password': os.environ.get('PGPOOL_PASSWORD', ''),
                'database': os.environ.get('PGPOOL_DB', 'appdb')
            }
        }
        
        # Status thresholds
        self.thresholds = {
            'connection_timeout': 5,  # seconds
            'query_timeout': 10,      # seconds
            'max_response_time': 1000,  # milliseconds
            'critical_errors': ['connection refused', 'timeout', 'authentication failed']
        }
    
    def init_database(self):
        """Initialize SQLite database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create cluster_status table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cluster_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                component_name TEXT NOT NULL,
                component_type TEXT NOT NULL,
                status TEXT NOT NULL,
                response_time_ms INTEGER,
                last_check TIMESTAMP NOT NULL,
                error_message TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create cluster_events table for significant events
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cluster_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                component_name TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved BOOLEAN DEFAULT FALSE,
                resolved_at TIMESTAMP
            )
        ''')
        
        # Create cluster_summary table for daily statistics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cluster_summary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                component_name TEXT NOT NULL,
                total_checks INTEGER DEFAULT 0,
                successful_checks INTEGER DEFAULT 0,
                failed_checks INTEGER DEFAULT 0,
                avg_response_time_ms REAL DEFAULT 0,
                max_response_time_ms INTEGER DEFAULT 0,
                downtime_seconds INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, component_name)
            )
        ''')
        
        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cluster_status_component ON cluster_status(component_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cluster_status_timestamp ON cluster_status(last_check)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cluster_events_component ON cluster_events(component_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cluster_events_timestamp ON cluster_events(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cluster_summary_date ON cluster_summary(date)')
        
        conn.commit()
        conn.close()
        logger.info(f"Database initialized: {self.db_path}")
    
    def check_postgres_component(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Check PostgreSQL component status"""
        start_time = time.time()
        status = {
            'name': name,
            'type': config['type'],
            'status': 'unknown',
            'response_time_ms': 0,
            'error_message': None,
            'metadata': {}
        }
        
        try:
            # Test connection
            conn = psycopg2.connect(
                host=config['host'],
                port=config['port'],
                user=config['user'],
                password=config['password'],
                database=config['database'],
                connect_timeout=self.thresholds['connection_timeout']
            )
            
            cursor = conn.cursor()
            
            # Test basic query
            cursor.execute("SELECT version(), pg_is_in_recovery(), current_database(), current_user")
            result = cursor.fetchone()
            
            response_time = int((time.time() - start_time) * 1000)
            
            # Get additional metrics
            cursor.execute('''
                SELECT 
                    pg_database_size(current_database()) as db_size,
                    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
                    (SELECT count(*) FROM pg_stat_activity) as total_connections
            ''')
            metrics = cursor.fetchone()
            
            # Check replication status if not in recovery
            replication_info = {}
            if not result[1]:  # Not in recovery (master)
                cursor.execute("SELECT * FROM pg_stat_replication")
                replication_info = {
                    'is_master': True,
                    'replicas': len(cursor.fetchall())
                }
            else:  # In recovery (replica)
                cursor.execute("SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()")
                wal_info = cursor.fetchone()
                replication_info = {
                    'is_master': False,
                    'receive_lsn': str(wal_info[0]) if wal_info[0] else None,
                    'replay_lsn': str(wal_info[1]) if wal_info[1] else None
                }
            
            status.update({
                'status': 'online',
                'response_time_ms': response_time,
                'metadata': {
                    'version': result[0],
                    'is_in_recovery': result[1],
                    'database': result[2],
                    'user': result[3],
                    'database_size': metrics[0],
                    'active_connections': metrics[1],
                    'total_connections': metrics[2],
                    'replication': replication_info
                }
            })
            
            conn.close()
            
        except psycopg2.OperationalError as e:
            response_time = int((time.time() - start_time) * 1000)
            status.update({
                'status': 'offline',
                'response_time_ms': response_time,
                'error_message': str(e)
            })
            logger.error(f"PostgreSQL component {name} check failed: {e}")
            
        except Exception as e:
            response_time = int((time.time() - start_time) * 1000)
            status.update({
                'status': 'error',
                'response_time_ms': response_time,
                'error_message': str(e)
            })
            logger.error(f"Unexpected error checking {name}: {e}")
        
        return status
    
    def check_pgpool_component(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Check PgPool component status"""
        start_time = time.time()
        status = {
            'name': name,
            'type': config['type'],
            'status': 'unknown',
            'response_time_ms': 0,
            'error_message': None,
            'metadata': {}
        }
        
        try:
            # Test connection through PgPool
            conn = psycopg2.connect(
                host=config['host'],
                port=config['port'],
                user=config['user'],
                password=config['password'],
                database=config['database'],
                connect_timeout=self.thresholds['connection_timeout']
            )
            
            cursor = conn.cursor()
            
            # Test basic query
            cursor.execute("SELECT version(), current_database()")
            result = cursor.fetchone()
            
            response_time = int((time.time() - start_time) * 1000)
            
            # Get PgPool specific information
            try:
                cursor.execute("SHOW pool_nodes")
                pool_nodes = cursor.fetchall()
            except:
                pool_nodes = []
            
            # Get connection pool stats
            try:
                cursor.execute("SELECT count(*) FROM pg_stat_activity")
                connection_count = cursor.fetchone()[0]
            except:
                connection_count = 0
            
            status.update({
                'status': 'online',
                'response_time_ms': response_time,
                'metadata': {
                    'version': result[0],
                    'database': result[1],
                    'pool_nodes': len(pool_nodes),
                    'active_connections': connection_count,
                    'nodes_info': [{'node_id': i, 'status': 'active'} for i in range(len(pool_nodes))]
                }
            })
            
            conn.close()
            
        except psycopg2.OperationalError as e:
            response_time = int((time.time() - start_time) * 1000)
            status.update({
                'status': 'offline',
                'response_time_ms': response_time,
                'error_message': str(e)
            })
            logger.error(f"PgPool component {name} check failed: {e}")
            
        except Exception as e:
            response_time = int((time.time() - start_time) * 1000)
            status.update({
                'status': 'error',
                'response_time_ms': response_time,
                'error_message': str(e)
            })
            logger.error(f"Unexpected error checking {name}: {e}")
        
        return status
    
    def check_component(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Check individual component status"""
        if config['type'] == 'postgres':
            return self.check_postgres_component(name, config)
        elif config['type'] == 'pgpool':
            return self.check_pgpool_component(name, config)
        else:
            return {
                'name': name,
                'type': config['type'],
                'status': 'unknown',
                'response_time_ms': 0,
                'error_message': f"Unknown component type: {config['type']}",
                'metadata': {}
            }
    
    def save_status(self, status: Dict[str, Any]):
        """Save component status to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO cluster_status 
            (component_name, component_type, status, response_time_ms, last_check, error_message, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            status['name'],
            status['type'],
            status['status'],
            status['response_time_ms'],
            datetime.now(),
            status['error_message'],
            json.dumps(status['metadata'])
        ))
        
        conn.commit()
        conn.close()
    
    def log_event(self, event_type: str, component_name: str, severity: str, message: str, details: str = None):
        """Log significant cluster events"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO cluster_events 
            (event_type, component_name, severity, message, details)
            VALUES (?, ?, ?, ?, ?)
        ''', (event_type, component_name, severity, message, details))
        
        conn.commit()
        conn.close()
        logger.info(f"Event logged: {severity} - {component_name} - {message}")
    
    def update_daily_summary(self, status: Dict[str, Any]):
        """Update daily statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        today = datetime.now().date()
        component_name = status['name']
        is_successful = status['status'] == 'online'
        
        cursor.execute('''
            INSERT OR REPLACE INTO cluster_summary 
            (date, component_name, total_checks, successful_checks, failed_checks, 
             avg_response_time_ms, max_response_time_ms, downtime_seconds)
            VALUES (?, ?, 
                COALESCE((SELECT total_checks FROM cluster_summary WHERE date = ? AND component_name = ?), 0) + 1,
                COALESCE((SELECT successful_checks FROM cluster_summary WHERE date = ? AND component_name = ?), 0) + ?,
                COALESCE((SELECT failed_checks FROM cluster_summary WHERE date = ? AND component_name = ?), 0) + ?,
                (COALESCE((SELECT avg_response_time_ms FROM cluster_summary WHERE date = ? AND component_name = ?), 0) + ?) / 2,
                MAX(COALESCE((SELECT max_response_time_ms FROM cluster_summary WHERE date = ? AND component_name = ?), 0), ?),
                COALESCE((SELECT downtime_seconds FROM cluster_summary WHERE date = ? AND component_name = ?), 0) + ?
            )
        ''', (
            today, component_name,
            today, component_name,
            today, component_name, 1 if is_successful else 0,
            today, component_name, 0 if is_successful else 1,
            today, component_name, status['response_time_ms'],
            today, component_name, status['response_time_ms'],
            today, component_name, 0 if is_successful else 30  # 30 seconds downtime per failed check
        ))
        
        conn.commit()
        conn.close()
    
    def check_all_components(self) -> List[Dict[str, Any]]:
        """Check all cluster components"""
        results = []
        
        for name, config in self.components.items():
            status = self.check_component(name, config)
            results.append(status)
            
            # Save to database
            self.save_status(status)
            self.update_daily_summary(status)
            
            # Log significant events
            if status['status'] == 'offline':
                self.log_event('component_down', name, 'critical', 
                             f"Component {name} is offline", status['error_message'])
            elif status['status'] == 'error':
                self.log_event('component_error', name, 'warning', 
                             f"Component {name} has errors", status['error_message'])
            elif status['response_time_ms'] > self.thresholds['max_response_time']:
                self.log_event('slow_response', name, 'warning', 
                             f"Component {name} response time is high: {status['response_time_ms']}ms")
        
        return results
    
    def get_cluster_status(self) -> Dict[str, Any]:
        """Get current cluster status summary"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get latest status for each component
        cursor.execute('''
            SELECT component_name, component_type, status, response_time_ms, 
                   last_check, error_message, metadata
            FROM cluster_status
            WHERE (component_name, last_check) IN (
                SELECT component_name, MAX(last_check)
                FROM cluster_status
                GROUP BY component_name
            )
            ORDER BY component_name
        ''')
        
        components = []
        for row in cursor.fetchall():
            components.append({
                'name': row[0],
                'type': row[1],
                'status': row[2],
                'response_time_ms': row[3],
                'last_check': row[4],
                'error_message': row[5],
                'metadata': json.loads(row[6]) if row[6] else {}
            })
        
        # Get recent events
        cursor.execute('''
            SELECT event_type, component_name, severity, message, details, timestamp
            FROM cluster_events
            WHERE timestamp > datetime('now', '-1 day')
            ORDER BY timestamp DESC
            LIMIT 10
        ''')
        
        events = []
        for row in cursor.fetchall():
            events.append({
                'type': row[0],
                'component': row[1],
                'severity': row[2],
                'message': row[3],
                'details': row[4],
                'timestamp': row[5]
            })
        
        conn.close()
        
        # Calculate overall cluster health
        online_count = sum(1 for c in components if c['status'] == 'online')
        total_count = len(components)
        health_percentage = (online_count / total_count * 100) if total_count > 0 else 0
        
        return {
            'cluster_health': health_percentage,
            'components': components,
            'recent_events': events,
            'summary': {
                'total_components': total_count,
                'online_components': online_count,
                'offline_components': total_count - online_count,
                'last_check': datetime.now().isoformat()
            }
        }
    
    def get_historical_data(self, component_name: str = None, hours: int = 24) -> List[Dict[str, Any]]:
        """Get historical status data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = '''
            SELECT component_name, component_type, status, response_time_ms, 
                   last_check, error_message
            FROM cluster_status
            WHERE last_check > datetime('now', '-{} hours')
        '''.format(hours)
        
        params = []
        if component_name:
            query += ' AND component_name = ?'
            params.append(component_name)
        
        query += ' ORDER BY last_check DESC'
        
        cursor.execute(query, params)
        
        history = []
        for row in cursor.fetchall():
            history.append({
                'component': row[0],
                'type': row[1],
                'status': row[2],
                'response_time_ms': row[3],
                'timestamp': row[4],
                'error_message': row[5]
            })
        
        conn.close()
        return history
    
    def start_monitoring(self, interval: int = 30):
        """Start continuous monitoring"""
        self.monitoring = True
        
        def monitor_loop():
            while self.monitoring:
                try:
                    logger.info("Checking cluster components...")
                    self.check_all_components()
                    time.sleep(interval)
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}")
                    time.sleep(interval)
        
        self.monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info(f"Cluster monitoring started with {interval}s interval")
    
    def stop_monitoring(self):
        """Stop continuous monitoring"""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logger.info("Cluster monitoring stopped")
    
    def cleanup_old_data(self, days: int = 30):
        """Clean up old data from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Clean old status records
        cursor.execute('DELETE FROM cluster_status WHERE created_at < ?', (cutoff_date,))
        deleted_status = cursor.rowcount
        
        # Clean old events
        cursor.execute('DELETE FROM cluster_events WHERE timestamp < ?', (cutoff_date,))
        deleted_events = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        logger.info(f"Cleanup completed: {deleted_status} status records, {deleted_events} events removed")
        return {'deleted_status': deleted_status, 'deleted_events': deleted_events}

# Global monitor instance
cluster_monitor = ClusterMonitor()

if __name__ == "__main__":
    # Start monitoring if run directly
    try:
        cluster_monitor.start_monitoring(interval=30)
        print("Cluster monitoring started. Press Ctrl+C to stop.")
        
        # Keep the script running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nStopping cluster monitoring...")
        cluster_monitor.stop_monitoring()
        print("Monitoring stopped.")