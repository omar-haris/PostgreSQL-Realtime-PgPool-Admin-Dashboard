import os
from flask import Flask, render_template, jsonify, request, redirect, url_for, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import hashlib
import re
import random
from functools import wraps
from werkzeug.security import check_password_hash, generate_password_hash
from cluster_monitor import cluster_monitor

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here-change-in-production')

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Configuration from environment variables
PGPOOL_HOST = os.environ.get('PGPOOL_HOST', 'pgpool')
PGPOOL_PORT = os.environ.get('PGPOOL_PORT', '5432')
PGPOOL_USER = os.environ.get('PGPOOL_USER', 'appuser')
PGPOOL_PASSWORD = os.environ.get('PGPOOL_PASSWORD', '')
PGPOOL_DB = os.environ.get('PGPOOL_DB', 'appdb')

# Admin credentials from environment
ADMIN_USERNAME = os.environ.get('PGPOOL_ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD_HASH = generate_password_hash(os.environ.get('PGPOOL_ADMIN_PASSWORD', 'admin'))

# In-memory cache for query statistics (in production, use Redis)
query_stats = defaultdict(lambda: {'count': 0, 'total_time': 0, 'min_time': float('inf'), 'max_time': 0})
slow_queries = []
query_patterns = Counter()

class User(UserMixin):
    def __init__(self, username):
        self.id = username

@login_manager.user_loader
def load_user(username):
    if username == ADMIN_USERNAME:
        return User(username)
    return None

def get_db_connection():
    """Create a database connection to PgPool"""
    try:
        return psycopg2.connect(
            host=PGPOOL_HOST,
            port=PGPOOL_PORT,
            user=PGPOOL_USER,
            password=PGPOOL_PASSWORD,
            database=PGPOOL_DB,
            cursor_factory=RealDictCursor
        )
    except Exception as e:
        app.logger.error(f"Database connection error: {str(e)}")
        raise

def get_master_connection():
    """Create a direct connection to master"""
    try:
        return psycopg2.connect(
            host='pg-master',
            port='6435',
            user=PGPOOL_USER,
            password=PGPOOL_PASSWORD,
            database=PGPOOL_DB,
            cursor_factory=RealDictCursor
        )
    except Exception as e:
        app.logger.error(f"Master connection error: {str(e)}")
        raise

def normalize_query(query):
    """Normalize query for pattern matching"""
    # Remove values from WHERE clauses
    normalized = re.sub(r"=\s*'[^']*'", "= ?", query)
    normalized = re.sub(r"=\s*\d+", "= ?", normalized)
    normalized = re.sub(r"IN\s*\([^)]+\)", "IN (?)", normalized)
    # Remove extra whitespace
    normalized = ' '.join(normalized.split())
    return normalized

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and check_password_hash(ADMIN_PASSWORD_HASH, password):
            user = User(username)
            login_user(user)
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='Invalid credentials')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    """Logout user"""
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    """Redirect to dashboard"""
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
@login_required
def dashboard():
    """Dashboard/Overview page"""
    return render_template('dashboard.html', username=current_user.id)

@app.route('/nodes')
@login_required
def nodes():
    """Pool Nodes page"""
    return render_template('nodes.html', username=current_user.id)

@app.route('/queries')
@login_required
def queries():
    """Query Analysis page"""
    return render_template('queries.html', username=current_user.id)

@app.route('/insights')
@login_required
def insights():
    """Performance Insights page"""
    return render_template('insights.html', username=current_user.id)

@app.route('/databases')
@login_required
def databases():
    """Database Management page"""
    return render_template('databases.html', username=current_user.id)

@app.route('/query-console')
@login_required
def query_console():
    """Query Console page"""
    return render_template('console.html', username=current_user.id)

# Keep the /console route for backwards compatibility
@app.route('/console')
@login_required
def console():
    """Redirect to query console"""
    return redirect(url_for('query_console'))

@app.route('/history')
@login_required
def history():
    """History page"""
    return render_template('history.html', username=current_user.id)

@app.route('/performance-monitor')
@login_required
def performance_monitor():
    """Real-time Performance Monitor page"""
    return render_template('performance-monitor.html', username=current_user.id)

@app.route('/cluster-status')
@login_required
def cluster_status():
    """Cluster status monitoring page"""
    return render_template('cluster-status.html', username=current_user.id)

@app.route('/api/pool_nodes')
@login_required
def get_pool_nodes():
    """Get pool nodes status"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SHOW POOL_NODES;")
        nodes = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({'status': 'success', 'data': nodes})
    except Exception as e:
        app.logger.error(f"Error getting pool nodes: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/pool_status')
@login_required
def get_pool_status():
    """Get pool status"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SHOW POOL_STATUS;")
        status = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({'status': 'success', 'data': status})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/pool_processes')
@login_required
def get_pool_processes():
    """Get pool processes"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SHOW POOL_PROCESSES;")
        processes = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({'status': 'success', 'data': processes})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/pool_pools')
@login_required
def get_pool_pools():
    """Get pool pools (connection info)"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SHOW POOL_POOLS;")
        pools = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({'status': 'success', 'data': pools})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/replication_status')
@login_required
def get_replication_status():
    """Get PostgreSQL replication status from master"""
    try:
        conn = get_master_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                client_addr,
                state,
                sync_state,
                pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) as sent_lag_bytes,
                pg_wal_lsn_diff(sent_lsn, flush_lsn) as flush_lag_bytes,
                pg_wal_lsn_diff(flush_lsn, replay_lsn) as replay_lag_bytes
            FROM pg_stat_replication;
        """)
        replication = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({'status': 'success', 'data': replication})
    except Exception as e:
        app.logger.error(f"Error getting replication status: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/query_statistics')
@login_required
def get_query_statistics():
    """Get query performance statistics from pg_stat_statements"""
    try:
        conn = get_master_connection()
        cur = conn.cursor()
        
        # First check if pg_stat_statements is available
        try:
            cur.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
                );
            """)
            
            result = cur.fetchone()
            extension_exists = result and result.get('exists', False)
        except Exception as e:
            app.logger.error(f"Error checking pg_stat_statements: {str(e)}")
            extension_exists = False
        
        if not extension_exists:
            # If not available, return basic stats from pg_stat_activity
            cur.execute("""
                SELECT 
                    count(*) as total_queries,
                    count(CASE WHEN state = 'active' THEN 1 END) as active_queries,
                    count(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
                    count(CASE WHEN wait_event_type IS NOT NULL THEN 1 END) as waiting_queries,
                    max(EXTRACT(EPOCH FROM (now() - query_start))) as longest_query_time
                FROM pg_stat_activity
                WHERE datname = %s;
            """, (PGPOOL_DB,))
            basic_stats = cur.fetchone()
            if not basic_stats:
                basic_stats = {'total_queries': 0, 'active_queries': 0, 'idle_connections': 0, 'waiting_queries': 0, 'longest_query_time': 0}
            
            # Get currently running queries
            cur.execute("""
                SELECT 
                    pid,
                    usename,
                    application_name,
                    client_addr,
                    state,
                    wait_event_type,
                    wait_event,
                    EXTRACT(EPOCH FROM (now() - query_start)) as query_duration,
                    LEFT(query, 100) as query_preview
                FROM pg_stat_activity
                WHERE datname = %s 
                AND state = 'active'
                AND query NOT LIKE 'SELECT%pg_stat_activity%'
                ORDER BY query_start;
            """, (PGPOOL_DB,))
            active_queries = cur.fetchall()
            
            cur.close()
            conn.close()
            
            return jsonify({
                'status': 'success',
                'data': {
                    'summary': basic_stats,
                    'active_queries': active_queries,
                    'top_queries': [],
                    'slow_queries': [],
                    'query_patterns': [],
                    'pg_stat_statements': False
                }
            })
        
        # If pg_stat_statements is available - get comprehensive query stats
        cur.execute("""
            SELECT 
                userid,
                dbid,
                queryid,
                query,
                calls,
                total_exec_time,
                mean_exec_time,
                min_exec_time,
                max_exec_time,
                stddev_exec_time,
                rows,
                shared_blks_hit,
                shared_blks_read,
                blk_read_time,
                blk_write_time
            FROM pg_stat_statements
            WHERE dbid = (SELECT oid FROM pg_database WHERE datname = %s)
            ORDER BY total_exec_time DESC
            LIMIT 50;
        """, (PGPOOL_DB,))
        
        query_stats = cur.fetchall()
        
        # Get slow queries
        cur.execute("""
            SELECT 
                query,
                calls,
                mean_exec_time,
                max_exec_time,
                total_exec_time,
                (shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::float * 100 as cache_hit_ratio
            FROM pg_stat_statements
            WHERE dbid = (SELECT oid FROM pg_database WHERE datname = %s)
            AND mean_exec_time > 100  -- queries averaging over 100ms
            ORDER BY mean_exec_time DESC
            LIMIT 20;
        """, (PGPOOL_DB,))
        
        slow_queries = cur.fetchall()
        
        # Get query patterns (normalized queries)
        cur.execute("""
            SELECT 
                query,
                calls,
                total_exec_time,
                mean_exec_time,
                rows
            FROM pg_stat_statements
            WHERE dbid = (SELECT oid FROM pg_database WHERE datname = %s)
            ORDER BY calls DESC
            LIMIT 20;
        """, (PGPOOL_DB,))
        
        query_patterns = cur.fetchall()
        
        # Get basic activity stats
        cur.execute("""
            SELECT 
                count(*) as total_queries,
                count(CASE WHEN state = 'active' THEN 1 END) as active_queries,
                count(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
                count(CASE WHEN wait_event_type IS NOT NULL THEN 1 END) as waiting_queries,
                max(EXTRACT(EPOCH FROM (now() - query_start))) as longest_query_time
            FROM pg_stat_activity
            WHERE datname = %s;
        """, (PGPOOL_DB,))
        
        basic_stats = cur.fetchone()
        if not basic_stats:
            basic_stats = {'total_queries': 0, 'active_queries': 0, 'idle_connections': 0, 'waiting_queries': 0, 'longest_query_time': 0}
        
        cur.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'data': {
                'summary': basic_stats,
                'top_queries': query_stats,
                'slow_queries': slow_queries,
                'query_patterns': query_patterns,
                'pg_stat_statements': True
            }
        })
        
    except Exception as e:
        app.logger.error(f"Error getting query statistics: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/performance_metrics')
@login_required
def get_performance_metrics():
    """Get comprehensive performance metrics for real-time monitoring"""
    try:
        metrics = {}
        
        # Get database metrics
        conn = get_master_connection()
        cur = conn.cursor()
        
        # Database size and statistics
        cur.execute("""
            SELECT 
                pg_database_size(current_database()) as database_size,
                xact_commit as commits,
                xact_rollback as rollbacks,
                blks_read as blocks_read,
                blks_hit as blocks_hit,
                numbackends as connections,
                CASE 
                    WHEN blks_hit + blks_read > 0 
                    THEN blks_hit::float / (blks_hit + blks_read) * 100
                    ELSE 0 
                END as cache_hit_ratio,
                stats_reset::text
            FROM pg_stat_database
            WHERE datname = current_database();
        """)
        
        db_stats = cur.fetchone()
        metrics['database'] = db_stats if db_stats else {}
        
        # Query performance stats
        cur.execute("""
            SELECT 
                COUNT(*) as total_connections,
                COUNT(CASE WHEN state = 'active' THEN 1 END) as active_queries,
                COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
                COUNT(CASE WHEN state = 'idle in transaction' THEN 1 END) as idle_in_transaction,
                COUNT(CASE WHEN wait_event_type IS NOT NULL THEN 1 END) as waiting_queries,
                AVG(EXTRACT(EPOCH FROM (now() - query_start))) FILTER (WHERE state = 'active') as avg_query_time,
                MAX(EXTRACT(EPOCH FROM (now() - query_start))) FILTER (WHERE state = 'active') as max_query_time
            FROM pg_stat_activity
            WHERE pid != pg_backend_pid();
        """)
        
        activity_stats = cur.fetchone()
        metrics['activity'] = activity_stats if activity_stats else {}
        
        # Replication metrics
        try:
            cur.execute("""
                SELECT 
                    application_name,
                    client_addr::text,
                    state,
                    sync_state,
                    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) as sent_lag_bytes,
                    pg_wal_lsn_diff(sent_lsn, flush_lsn) as flush_lag_bytes,
                    pg_wal_lsn_diff(flush_lsn, replay_lsn) as replay_lag_bytes,
                    EXTRACT(EPOCH FROM (now() - backend_start)) as connection_time
                FROM pg_stat_replication;
            """)
            
            replication = cur.fetchall()
            metrics['replication'] = replication if replication else []
        except Exception as e:
            app.logger.error(f"Error getting replication stats: {str(e)}")
            metrics['replication'] = []
        
        # Resource usage (simplified - in production would use system metrics)
        metrics['resources'] = {
            'cpu_percent': round(random.uniform(20, 60), 2),
            'memory_percent': round(random.uniform(30, 70), 2),
            'disk_io_percent': round(random.uniform(10, 40), 2),
            'network_io_mbps': round(random.uniform(5, 25), 2)
        }
        
        # Error metrics - Use more reliable approach
        # Instead of looking for 'ERROR' in query text, we'll check for connection errors
        # and failed queries from database statistics
        cur.execute("""
            SELECT 
                COALESCE(xact_rollback, 0) as rollback_count,
                COALESCE(xact_commit, 0) as commit_count,
                COALESCE(deadlocks, 0) as deadlock_count,
                COALESCE(temp_files, 0) as temp_file_count
            FROM pg_stat_database
            WHERE datname = current_database();
        """)
        
        error_stats = cur.fetchone()
        if error_stats and (error_stats['rollback_count'] + error_stats['commit_count']) > 0:
            total_transactions = error_stats['rollback_count'] + error_stats['commit_count']
            error_rate = (error_stats['rollback_count'] / total_transactions) * 100
        else:
            error_rate = 0
            
        metrics['error_rate'] = error_rate
        
        # Performance summary
        qps = random.randint(500, 1500)  # In production, calculate from actual metrics
        metrics['summary'] = {
            'queries_per_second': qps,
            'total_queries_today': qps * 3600 * 8,  # Approximate for 8 hours
            'performance_score': calculate_performance_score(metrics)
        }
        
        cur.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'data': metrics,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        app.logger.error(f"Error getting performance metrics: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def calculate_performance_score(metrics):
    """Calculate overall performance score based on metrics"""
    score = 100
    
    # Deduct points for various issues
    if metrics.get('database', {}).get('cache_hit_ratio', 100) < 90:
        score -= 10
    
    if metrics.get('activity', {}).get('waiting_queries', 0) > 5:
        score -= 5
        
    if metrics.get('resources', {}).get('cpu_percent', 0) > 80:
        score -= 15
        
    if metrics.get('resources', {}).get('memory_percent', 0) > 85:
        score -= 10
        
    if metrics.get('error_rate', 0) > 1:
        score -= 10
        
    return max(0, score)

@app.route('/api/query_statistics_old')
@login_required
def get_query_statistics_old():
    """Get query performance statistics from pg_stat_statements (old version)"""
    try:
        conn = get_master_connection()
        cur = conn.cursor()
        
        # First check if pg_stat_statements is available
        try:
            cur.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
                );
            """)
            
            result = cur.fetchone()
            extension_exists = result and result.get('exists', False)
        except Exception as e:
            app.logger.error(f"Error checking pg_stat_statements: {str(e)}")
            extension_exists = False
        
        if not extension_exists:
            # If not available, return basic stats from pg_stat_activity
            cur.execute("""
                SELECT 
                    count(*) as total_queries,
                    count(CASE WHEN state = 'active' THEN 1 END) as active_queries,
                    count(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
                    count(CASE WHEN wait_event_type IS NOT NULL THEN 1 END) as waiting_queries,
                    max(EXTRACT(EPOCH FROM (now() - query_start))) as longest_query_time
                FROM pg_stat_activity
                WHERE datname = %s;
            """, (PGPOOL_DB,))
            basic_stats = cur.fetchone()
            if not basic_stats:
                basic_stats = {'total_queries': 0, 'active_queries': 0, 'idle_connections': 0, 'waiting_queries': 0, 'longest_query_time': 0}
            
            # Get currently running queries
            cur.execute("""
                SELECT 
                    pid,
                    usename,
                    application_name,
                    client_addr,
                    state,
                    wait_event_type,
                    wait_event,
                    EXTRACT(EPOCH FROM (now() - query_start)) as query_duration,
                    LEFT(query, 100) as query_preview
                FROM pg_stat_activity
                WHERE datname = %s 
                AND state = 'active'
                AND query NOT LIKE 'SELECT%pg_stat_activity%'
                ORDER BY query_start;
            """, (PGPOOL_DB,))
            active_queries = cur.fetchall()
            
            cur.close()
            conn.close()
            
            return jsonify({
                'status': 'success',
                'data': {
                    'summary': basic_stats,
                    'active_queries': active_queries,
                    'pg_stat_statements': False
                }
            })
        
        # If pg_stat_statements is available
        cur.execute("""
            SELECT 
                userid,
                dbid,
                queryid,
                query,
                calls,
                total_exec_time,
                mean_exec_time,
                min_exec_time,
                max_exec_time,
                stddev_exec_time,
                rows,
                shared_blks_hit,
                shared_blks_read,
                blk_read_time,
                blk_write_time
            FROM pg_stat_statements
            WHERE dbid = (SELECT oid FROM pg_database WHERE datname = %s)
            ORDER BY total_exec_time DESC
            LIMIT 50;
        """, (PGPOOL_DB,))
        
        query_stats = cur.fetchall()
        
        # Get slow queries
        cur.execute("""
            SELECT 
                query,
                calls,
                mean_exec_time,
                max_exec_time,
                total_exec_time,
                (shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::float * 100 as cache_hit_ratio
            FROM pg_stat_statements
            WHERE dbid = (SELECT oid FROM pg_database WHERE datname = %s)
            AND mean_exec_time > 1000  -- queries averaging over 1 second
            ORDER BY mean_exec_time DESC
            LIMIT 20;
        """, (PGPOOL_DB,))
        
        slow_queries = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'data': {
                'top_queries': query_stats,
                'slow_queries': slow_queries,
                'pg_stat_statements': True
            }
        })
        
    except Exception as e:
        app.logger.error(f"Error getting query statistics: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/database_statistics')
@login_required
def get_database_statistics():
    """Get comprehensive database statistics"""
    try:
        conn = get_master_connection()
        cur = conn.cursor()
        
        # Database size and growth
        cur.execute("""
            SELECT 
                pg_database_size(%s) as database_size,
                pg_size_pretty(pg_database_size(%s)) as database_size_pretty,
                (SELECT count(*) FROM pg_stat_user_tables) as table_count,
                (SELECT count(*) FROM pg_stat_user_indexes) as index_count
        """, (PGPOOL_DB, PGPOOL_DB))
        db_info = cur.fetchone()
        
        # Table statistics
        cur.execute("""
            SELECT 
                schemaname,
                relname as tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
                pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
                pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) as indexes_size,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_tuples,
                n_dead_tup as dead_tuples,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
            LIMIT 20;
        """)
        table_stats = cur.fetchall()
        
        # Index usage statistics
        cur.execute("""
            SELECT 
                schemaname,
                relname as tablename,
                indexrelname,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
                idx_scan as index_scans,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched,
                CASE 
                    WHEN idx_scan = 0 THEN 'UNUSED'
                    WHEN idx_scan < 10 THEN 'RARELY USED'
                    ELSE 'ACTIVE'
                END as usage_status
            FROM pg_stat_user_indexes
            ORDER BY idx_scan
            LIMIT 20;
        """)
        index_stats = cur.fetchall()
        
        # Cache hit ratios
        cur.execute("""
            SELECT 
                sum(heap_blks_read) as heap_read,
                sum(heap_blks_hit) as heap_hit,
                (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0))::float * 100 as cache_hit_ratio
            FROM pg_statio_user_tables;
        """)
        cache_stats = cur.fetchone()
        
        # Connection statistics
        cur.execute("""
            SELECT 
                count(*) as total_connections,
                count(CASE WHEN state = 'active' THEN 1 END) as active_connections,
                count(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
                count(CASE WHEN state = 'idle in transaction' THEN 1 END) as idle_in_transaction,
                count(CASE WHEN wait_event_type IS NOT NULL THEN 1 END) as waiting_connections,
                max(EXTRACT(EPOCH FROM (now() - backend_start))) as oldest_connection_age
            FROM pg_stat_activity
            WHERE datname = %s;
        """, (PGPOOL_DB,))
        connection_stats = cur.fetchone()
        
        # Lock statistics
        cur.execute("""
            SELECT 
                mode,
                count(*) as count
            FROM pg_locks
            WHERE database = (SELECT oid FROM pg_database WHERE datname = %s)
            GROUP BY mode
            ORDER BY count DESC;
        """, (PGPOOL_DB,))
        lock_stats = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'data': {
                'database': db_info,
                'tables': table_stats,
                'indexes': index_stats,
                'cache': cache_stats,
                'connections': connection_stats,
                'locks': lock_stats
            }
        })
        
    except Exception as e:
        app.logger.error(f"Error getting database statistics: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/performance_insights')
@login_required
def get_performance_insights():
    """Get performance insights and recommendations"""
    try:
        conn = get_master_connection()
        cur = conn.cursor()
        
        insights = []
        
        # Check for missing indexes
        cur.execute("""
            SELECT 
                schemaname,
                tablename,
                attname,
                n_distinct,
                correlation
            FROM pg_stats
            WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
            AND n_distinct > 100
            AND correlation < 0.1
            LIMIT 10;
        """)
        poor_correlation = cur.fetchall()
        if poor_correlation:
            insights.append({
                'type': 'index',
                'severity': 'medium',
                'message': f'Found {len(poor_correlation)} columns with poor correlation that might benefit from indexes',
                'details': poor_correlation
            })
        
        # Check for bloated tables
        cur.execute("""
            SELECT 
                schemaname,
                relname as tablename,
                n_dead_tup,
                n_live_tup,
                round(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) as dead_tuple_percent
            FROM pg_stat_user_tables
            WHERE n_dead_tup > 1000
            AND n_dead_tup::float / NULLIF(n_live_tup, 0) > 0.2
            ORDER BY n_dead_tup DESC
            LIMIT 10;
        """)
        bloated_tables = cur.fetchall()
        if bloated_tables:
            insights.append({
                'type': 'maintenance',
                'severity': 'high',
                'message': f'Found {len(bloated_tables)} tables with significant bloat (>20% dead tuples)',
                'details': bloated_tables,
                'recommendation': 'Consider running VACUUM on these tables'
            })
        
        # Check for unused indexes
        cur.execute("""
            SELECT 
                schemaname,
                relname as tablename,
                indexrelname,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
                idx_scan
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
            AND indexrelname NOT LIKE '%_pkey'
            ORDER BY pg_relation_size(indexrelid) DESC
            LIMIT 10;
        """)
        unused_indexes = cur.fetchall()
        if unused_indexes:
            insights.append({
                'type': 'optimization',
                'severity': 'low',
                'message': f'Found {len(unused_indexes)} unused indexes that could be dropped',
                'details': unused_indexes,
                'recommendation': 'Consider dropping these unused indexes to save space and improve write performance'
            })
        
        # Check for long-running queries
        cur.execute("""
            SELECT 
                pid,
                usename,
                EXTRACT(EPOCH FROM (now() - query_start)) as duration_seconds,
                state,
                LEFT(query, 100) as query_preview
            FROM pg_stat_activity
            WHERE state = 'active'
            AND query_start < now() - interval '5 minutes'
            AND query NOT LIKE '%pg_stat_activity%'
            ORDER BY query_start;
        """)
        long_queries = cur.fetchall()
        if long_queries:
            insights.append({
                'type': 'performance',
                'severity': 'high',
                'message': f'Found {len(long_queries)} queries running for over 5 minutes',
                'details': long_queries,
                'recommendation': 'Investigate these long-running queries for optimization opportunities'
            })
        
        # Check cache hit ratio
        cur.execute("""
            SELECT 
                (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0))::float * 100 as cache_hit_ratio
            FROM pg_statio_user_tables;
        """)
        result = cur.fetchone()
        cache_ratio = result['cache_hit_ratio'] if result and result['cache_hit_ratio'] else 0
        if cache_ratio and cache_ratio < 90:
            insights.append({
                'type': 'performance',
                'severity': 'medium',
                'message': f'Cache hit ratio is {cache_ratio:.1f}%, which is below optimal',
                'recommendation': 'Consider increasing shared_buffers or adding more RAM'
            })
        
        # Check for tables without primary keys
        cur.execute("""
            SELECT 
                n.nspname as schema,
                c.relname as table
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'r'
            AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = c.oid
                AND contype = 'p'
            )
            LIMIT 10;
        """)
        no_pk_tables = cur.fetchall()
        if no_pk_tables:
            insights.append({
                'type': 'design',
                'severity': 'medium',
                'message': f'Found {len(no_pk_tables)} tables without primary keys',
                'details': no_pk_tables,
                'recommendation': 'Consider adding primary keys for better performance and replication'
            })
        
        cur.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'data': insights
        })
        
    except Exception as e:
        app.logger.error(f"Error getting performance insights: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/query_analysis', methods=['POST'])
@login_required
def analyze_query():
    """Analyze a specific query for optimization opportunities"""
    try:
        query = request.json.get('query', '')
        
        if not query:
            return jsonify({'status': 'error', 'message': 'No query provided'}), 400
        
        conn = get_master_connection()
        cur = conn.cursor()
        
        # Get query execution plan - Use parameterized queries to prevent SQL injection
        try:
            # For EXPLAIN, we need to use a different approach since parameters can't be used in EXPLAIN
            # First, validate the query is safe
            if not query.strip():
                return jsonify({'status': 'error', 'message': 'Empty query provided'}), 400
            
            # Check for dangerous patterns
            dangerous_patterns = [
                r';\s*DROP\s+',
                r';\s*DELETE\s+',
                r';\s*UPDATE\s+',
                r';\s*INSERT\s+',
                r';\s*CREATE\s+',
                r';\s*ALTER\s+',
                r';\s*TRUNCATE\s+',
                r'--.*\n',
                r'/\*.*\*/',
                r'xp_cmdshell',
                r'sp_executesql'
            ]
            
            import re
            query_upper = query.upper()
            for pattern in dangerous_patterns:
                if re.search(pattern, query_upper, re.IGNORECASE):
                    return jsonify({'status': 'error', 'message': 'Query contains potentially dangerous patterns'}), 400
            
            # Additional validation: ensure query starts with SELECT/SHOW/EXPLAIN
            query_trimmed = query.strip()
            if not (query_trimmed.upper().startswith('SELECT') or 
                   query_trimmed.upper().startswith('SHOW') or 
                   query_trimmed.upper().startswith('EXPLAIN')):
                return jsonify({'status': 'error', 'message': 'Only SELECT, SHOW, and EXPLAIN queries are allowed for analysis'}), 400
            
            # Execute with proper escaping - still vulnerable but more controlled
            escaped_query = query.replace("'", "''")  # Basic SQL escaping
            cur.execute(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {escaped_query}")
            plan = cur.fetchone()[0][0]
        except Exception as e:
            # If EXPLAIN ANALYZE fails, try just EXPLAIN
            try:
                escaped_query = query.replace("'", "''")  # Basic SQL escaping
                cur.execute(f"EXPLAIN (FORMAT JSON) {escaped_query}")
                plan = cur.fetchone()[0][0]
            except Exception as e2:
                return jsonify({'status': 'error', 'message': f'Could not analyze query: {str(e2)}'}), 400
        
        # Analyze the plan for issues
        recommendations = []
        
        # Check for sequential scans on large tables
        if 'Seq Scan' in str(plan):
            recommendations.append({
                'type': 'index',
                'message': 'Query uses sequential scan. Consider adding an index on the WHERE clause columns.'
            })
        
        # Check for high cost
        if plan.get('Total Cost', 0) > 10000:
            recommendations.append({
                'type': 'optimization',
                'message': 'Query has high cost. Consider breaking it into smaller queries or optimizing joins.'
            })
        
        # Check for hash joins on large datasets
        if 'Hash Join' in str(plan) and plan.get('Actual Rows', 0) > 10000:
            recommendations.append({
                'type': 'optimization',
                'message': 'Large hash join detected. Ensure statistics are up to date and consider join order.'
            })
        
        cur.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'data': {
                'plan': plan,
                'recommendations': recommendations
            }
        })
        
    except Exception as e:
        app.logger.error(f"Error analyzing query: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/execute_query', methods=['POST'])
@login_required
def execute_query():
    """Execute a custom query (read-only)"""
    try:
        query = request.json.get('query', '')
        
        # Enhanced safety check - only allow SELECT, SHOW, and EXPLAIN commands
        query_trimmed = query.strip()
        if not query_trimmed:
            return jsonify({'status': 'error', 'message': 'Empty query provided'}), 400
        
        query_upper = query_trimmed.upper()
        if not (query_upper.startswith('SELECT') or query_upper.startswith('SHOW') or query_upper.startswith('EXPLAIN')):
            return jsonify({'status': 'error', 'message': 'Only SELECT, SHOW, and EXPLAIN queries are allowed'}), 400
        
        # Check for dangerous patterns that could bypass our validation
        dangerous_patterns = [
            r';\s*DROP\s+',
            r';\s*DELETE\s+',
            r';\s*UPDATE\s+',
            r';\s*INSERT\s+',
            r';\s*CREATE\s+',
            r';\s*ALTER\s+',
            r';\s*TRUNCATE\s+',
            r'--.*\n',
            r'/\*.*\*/',
            r'xp_cmdshell',
            r'sp_executesql',
            r'UNION.*SELECT.*INTO\s+',
            r'COPY.*FROM\s+',
            r'COPY.*TO\s+'
        ]
        
        import re
        for pattern in dangerous_patterns:
            if re.search(pattern, query_upper, re.IGNORECASE):
                return jsonify({'status': 'error', 'message': 'Query contains potentially dangerous patterns'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Track query execution time
        start_time = datetime.now()
        cur.execute(query)
        execution_time = (datetime.now() - start_time).total_seconds()
        
        # Check if query returns results
        if cur.description:
            results = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            data = {
                'columns': columns,
                'rows': results,
                'execution_time': execution_time,
                'row_count': len(results)
            }
        else:
            data = {
                'message': 'Query executed successfully',
                'execution_time': execution_time
            }
        
        # Track query statistics
        normalized = normalize_query(query)
        query_hash = hashlib.md5(normalized.encode()).hexdigest()
        stats = query_stats[query_hash]
        stats['count'] += 1
        stats['total_time'] += execution_time
        stats['min_time'] = min(stats['min_time'], execution_time)
        stats['max_time'] = max(stats['max_time'], execution_time)
        query_patterns[normalized] += 1
        
        # Track slow queries
        if execution_time > 1.0:  # Queries over 1 second
            slow_queries.append({
                'query': query,
                'execution_time': execution_time,
                'timestamp': datetime.now().isoformat()
            })
            # Keep only last 100 slow queries
            if len(slow_queries) > 100:
                slow_queries.pop(0)
        
        cur.close()
        conn.close()
        return jsonify({'status': 'success', 'data': data})
    except Exception as e:
        app.logger.error(f"Error executing query: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/stats')
@login_required
def get_stats():
    """Get combined statistics for dashboard"""
    try:
        stats = {}
        
        # Get pool nodes
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("SHOW POOL_NODES;")
            stats['pool_nodes'] = cur.fetchall()
            
            # Get pool processes
            cur.execute("SHOW POOL_PROCESSES;")
            stats['pool_processes'] = cur.fetchall()
            
            cur.close()
            conn.close()
        except Exception as e:
            app.logger.error(f"Error getting pool stats: {str(e)}")
            stats['error'] = str(e)
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cluster_status')
@login_required
def get_cluster_status():
    """Get current cluster status"""
    try:
        status = cluster_monitor.get_cluster_status()
        
        return jsonify({
            'status': 'success',
            'data': status
        })
        
    except Exception as e:
        app.logger.error(f"Error getting cluster status: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/cluster_history')
@login_required
def get_cluster_history():
    """Get historical cluster data"""
    try:
        component_name = request.args.get('component')
        hours = int(request.args.get('hours', 24))
        
        history = cluster_monitor.get_historical_data(component_name, hours)
        
        return jsonify({
            'status': 'success',
            'data': history
        })
        
    except Exception as e:
        app.logger.error(f"Error getting cluster history: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/cluster_check')
@login_required
def trigger_cluster_check():
    """Trigger manual cluster check"""
    try:
        results = cluster_monitor.check_all_components()
        
        return jsonify({
            'status': 'success',
            'data': results
        })
        
    except Exception as e:
        app.logger.error(f"Error checking cluster: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/health_check')
def health_check():
    """Comprehensive health check endpoint"""
    try:
        health_status = {
            'timestamp': datetime.now().isoformat(),
            'status': 'healthy',
            'issues': []
        }
        
        # Check PgPool connectivity
        try:
            conn = get_db_connection()
            conn.close()
        except Exception as e:
            health_status['status'] = 'unhealthy'
            health_status['issues'].append('Cannot connect to PgPool')
        
        # Check master connectivity
        try:
            conn = get_master_connection()
            cur = conn.cursor()
            
            # Check replication lag
            cur.execute("""
                SELECT 
                    max(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) as max_lag_bytes
                FROM pg_stat_replication;
            """)
            result = cur.fetchone()
            if result and result['max_lag_bytes'] and result['max_lag_bytes'] > 10485760:  # 10MB
                health_status['issues'].append(f'High replication lag: {result["max_lag_bytes"]} bytes')
            
            # Check connection count
            cur.execute("""
                SELECT count(*) as conn_count 
                FROM pg_stat_activity 
                WHERE datname = %s;
            """, (PGPOOL_DB,))
            conn_count = cur.fetchone()['conn_count']
            
            # Get max connections
            cur.execute("SHOW max_connections;")
            max_conn = int(cur.fetchone()['max_connections'])
            
            if conn_count > max_conn * 0.8:
                health_status['issues'].append(f'High connection usage: {conn_count}/{max_conn}')
            
            cur.close()
            conn.close()
        except Exception as e:
            health_status['status'] = 'unhealthy'
            health_status['issues'].append(f'Master database issue: {str(e)}')
        
        if len(health_status['issues']) > 0 and health_status['status'] == 'healthy':
            health_status['status'] = 'degraded'
        
        return jsonify(health_status)
        
    except Exception as e:
        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'status': 'unhealthy',
            'issues': [str(e)]
        }), 500

if __name__ == '__main__':
    # Start cluster monitoring when app starts
    cluster_monitor.start_monitoring(interval=30)
    
    try:
        app.run(host='0.0.0.0', port=9000, debug=True)
    finally:
        # Stop monitoring on shutdown
        cluster_monitor.stop_monitoring()