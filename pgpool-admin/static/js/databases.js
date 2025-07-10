// Database Management JavaScript

let databaseList = [];
let activeQueries = [];
let updateInterval;

// Initialize database management page
async function initDatabases() {
    // Load initial data
    await loadDatabaseList();
    loadActiveQueries();
    
    // Set up auto-refresh
    updateInterval = setInterval(() => {
        loadDatabaseList();
        loadActiveQueries();
    }, 10000);
    
    // Set up search
    setupSearch();
}

// Load database list
async function loadDatabaseList() {
    try {
        // In production, this would fetch from the backend
        // For now, we'll use mock data
        databaseList = generateMockDatabases();
        
        updateDatabaseGrid();
        updateStatistics();
        populateSelects();
        
    } catch (error) {
        console.error('Failed to load databases:', error);
        showNotification('Failed to load databases', 'error');
    }
}

// Generate mock database data
function generateMockDatabases() {
    return [
        {
            name: 'app_production',
            size: '2.4 GB',
            sizeBytes: 2576980378,
            owner: 'app_user',
            encoding: 'UTF8',
            connections: 12,
            tables: 45,
            indexes: 78,
            status: 'active',
            created: '2024-01-15',
            lastBackup: '2025-07-08'
        },
        {
            name: 'analytics_db',
            size: '856 MB',
            sizeBytes: 897581056,
            owner: 'analytics_user',
            encoding: 'UTF8',
            connections: 3,
            tables: 23,
            indexes: 41,
            status: 'active',
            created: '2024-03-22',
            lastBackup: '2025-07-09'
        },
        {
            name: 'users_db',
            size: '512 MB',
            sizeBytes: 536870912,
            owner: 'postgres',
            encoding: 'UTF8',
            connections: 8,
            tables: 15,
            indexes: 22,
            status: 'active',
            created: '2023-12-10',
            lastBackup: '2025-07-09'
        },
        {
            name: 'logs_archive',
            size: '5.1 GB',
            sizeBytes: 5476377600,
            owner: 'postgres',
            encoding: 'UTF8',
            connections: 0,
            tables: 8,
            indexes: 12,
            status: 'idle',
            created: '2024-06-01',
            lastBackup: '2025-07-07'
        },
        {
            name: 'test_db',
            size: '128 MB',
            sizeBytes: 134217728,
            owner: 'dev_user',
            encoding: 'UTF8',
            connections: 1,
            tables: 10,
            indexes: 15,
            status: 'active',
            created: '2025-01-10',
            lastBackup: 'Never'
        }
    ];
}

// Update database grid
function updateDatabaseGrid() {
    const grid = document.getElementById('databaseGrid');
    if (!grid) return;
    
    grid.innerHTML = databaseList.map(db => `
        <div class="database-card ${db.status}" onclick="selectDatabase('${db.name}')">
            <div class="db-card-header">
                <div class="db-icon">🗄️</div>
                <div class="db-status-indicator ${db.status}"></div>
            </div>
            <div class="db-card-body">
                <h4 class="db-name">${db.name}</h4>
                <div class="db-meta">
                    <span class="db-owner">Owner: ${db.owner}</span>
                    <span class="db-size">${db.size}</span>
                </div>
                <div class="db-stats">
                    <div class="db-stat">
                        <span class="stat-icon">🔗</span>
                        <span class="stat-value">${db.connections}</span>
                        <span class="stat-label">Connections</span>
                    </div>
                    <div class="db-stat">
                        <span class="stat-icon">📊</span>
                        <span class="stat-value">${db.tables}</span>
                        <span class="stat-label">Tables</span>
                    </div>
                    <div class="db-stat">
                        <span class="stat-icon">📑</span>
                        <span class="stat-value">${db.indexes}</span>
                        <span class="stat-label">Indexes</span>
                    </div>
                </div>
                <div class="db-actions">
                    <button class="btn btn-sm" onclick="event.stopPropagation(); backupDatabase('${db.name}')">
                        💾 Backup
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); showDatabaseDetails('${db.name}')">
                        📋 Details
                    </button>
                </div>
            </div>
            <div class="db-card-footer">
                <span class="last-backup">Last backup: ${db.lastBackup}</span>
            </div>
        </div>
    `).join('');
}

// Update statistics
function updateStatistics() {
    const totalDbs = databaseList.length;
    const totalSize = databaseList.reduce((sum, db) => sum + db.sizeBytes, 0);
    const totalConnections = databaseList.reduce((sum, db) => sum + db.connections, 0);
    
    document.getElementById('totalDatabases').textContent = totalDbs;
    document.getElementById('totalSize').textContent = formatBytes(totalSize);
    document.getElementById('activeConnections').textContent = totalConnections;
    document.getElementById('queryRate').textContent = Math.floor(Math.random() * 100) + '/s';
}

// Format bytes to human readable
function formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

// Populate select dropdowns
function populateSelects() {
    const selects = [
        'analyzerDatabase',
        'statsDatabase',
        'inspectorDatabase',
        'maintenanceDatabase'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Database</option>' +
                databaseList.map(db => 
                    `<option value="${db.name}">${db.name}</option>`
                ).join('');
            select.value = currentValue;
        }
    });
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('dbSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.database-card');
            
            cards.forEach(card => {
                const dbName = card.querySelector('.db-name').textContent.toLowerCase();
                card.style.display = dbName.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

// Analyze query
async function analyzeQuery() {
    const database = document.getElementById('analyzerDatabase').value;
    const query = document.getElementById('analyzerQuery').value;
    
    if (!database || !query) {
        showNotification('Please select a database and enter a query', 'warning');
        return;
    }
    
    const resultsDiv = document.getElementById('analyzerResults');
    resultsDiv.innerHTML = '<div class="loading"></div><p>Analyzing query...</p>';
    
    // Simulate analysis
    setTimeout(() => {
        resultsDiv.innerHTML = `
            <div class="analysis-results">
                <h5>Query Analysis Results</h5>
                <div class="result-item">
                    <span class="result-label">Execution Time:</span>
                    <span class="result-value">${Math.floor(Math.random() * 100) + 10}ms</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Rows Examined:</span>
                    <span class="result-value">${Math.floor(Math.random() * 10000)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Index Usage:</span>
                    <span class="result-value">Yes (idx_users_email)</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Query Cost:</span>
                    <span class="result-value">${(Math.random() * 100).toFixed(2)}</span>
                </div>
                <div class="suggestions">
                    <h6>Optimization Suggestions:</h6>
                    <ul>
                        <li>Consider adding an index on column 'created_at'</li>
                        <li>Query would benefit from table statistics update</li>
                    </ul>
                </div>
            </div>
        `;
    }, 1500);
}

// Explain query plan
function explainQuery() {
    const database = document.getElementById('analyzerDatabase').value;
    const query = document.getElementById('analyzerQuery').value;
    
    if (!database || !query) {
        showNotification('Please select a database and enter a query', 'warning');
        return;
    }
    
    const resultsDiv = document.getElementById('analyzerResults');
    resultsDiv.innerHTML = `
        <div class="explain-plan">
            <h5>Query Execution Plan</h5>
            <pre>
Seq Scan on users  (cost=0.00..35.50 rows=10 width=200)
  Filter: (status = 'active'::text)
Planning Time: 0.152 ms
Execution Time: 0.841 ms
            </pre>
        </div>
    `;
}

// Load database statistics
function loadDatabaseStats() {
    const database = document.getElementById('statsDatabase').value;
    const statsDiv = document.getElementById('databaseStats');
    
    if (!database) {
        statsDiv.innerHTML = '<div class="stats-placeholder">Select a database to view statistics</div>';
        return;
    }
    
    const db = databaseList.find(d => d.name === database);
    if (!db) return;
    
    statsDiv.innerHTML = `
        <div class="db-stats-detail">
            <div class="stat-section">
                <h5>General Information</h5>
                <div class="stat-row">
                    <span class="stat-label">Database Name:</span>
                    <span class="stat-value">${db.name}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Owner:</span>
                    <span class="stat-value">${db.owner}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Encoding:</span>
                    <span class="stat-value">${db.encoding}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Created:</span>
                    <span class="stat-value">${db.created}</span>
                </div>
            </div>
            
            <div class="stat-section">
                <h5>Size Information</h5>
                <div class="stat-row">
                    <span class="stat-label">Total Size:</span>
                    <span class="stat-value">${db.size}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Tables:</span>
                    <span class="stat-value">${db.tables}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Indexes:</span>
                    <span class="stat-value">${db.indexes}</span>
                </div>
            </div>
            
            <div class="stat-section">
                <h5>Activity</h5>
                <div class="stat-row">
                    <span class="stat-label">Active Connections:</span>
                    <span class="stat-value">${db.connections}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Transaction Rate:</span>
                    <span class="stat-value">${Math.floor(Math.random() * 100)}/s</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Cache Hit Ratio:</span>
                    <span class="stat-value">${(95 + Math.random() * 4).toFixed(1)}%</span>
                </div>
            </div>
        </div>
    `;
}

// Load database tables
function loadDatabaseTables() {
    const database = document.getElementById('inspectorDatabase').value;
    const tableSelect = document.getElementById('inspectorTable');
    
    if (!database) {
        tableSelect.innerHTML = '<option value="">Select Table</option>';
        return;
    }
    
    // Mock table list
    const tables = [
        'users', 'orders', 'products', 'categories', 
        'customers', 'transactions', 'logs', 'sessions'
    ];
    
    tableSelect.innerHTML = '<option value="">Select Table</option>' +
        tables.map(table => `<option value="${table}">${table}</option>`).join('');
}

// Inspect table
function inspectTable() {
    const table = document.getElementById('inspectorTable').value;
    const infoDiv = document.getElementById('tableInfo');
    
    if (!table) {
        infoDiv.innerHTML = '';
        return;
    }
    
    infoDiv.innerHTML = `
        <div class="table-inspection">
            <h5>Table: ${table}</h5>
            
            <div class="inspection-section">
                <h6>Columns</h6>
                <table class="inspection-table">
                    <thead>
                        <tr>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Nullable</th>
                            <th>Default</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>id</td>
                            <td>serial</td>
                            <td>NO</td>
                            <td>nextval('${table}_id_seq')</td>
                        </tr>
                        <tr>
                            <td>name</td>
                            <td>varchar(255)</td>
                            <td>NO</td>
                            <td>NULL</td>
                        </tr>
                        <tr>
                            <td>created_at</td>
                            <td>timestamp</td>
                            <td>NO</td>
                            <td>CURRENT_TIMESTAMP</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="inspection-section">
                <h6>Indexes</h6>
                <ul class="index-list">
                    <li>PRIMARY KEY (id)</li>
                    <li>INDEX idx_${table}_name (name)</li>
                    <li>INDEX idx_${table}_created (created_at)</li>
                </ul>
            </div>
            
            <div class="inspection-section">
                <h6>Statistics</h6>
                <div class="table-stats">
                    <span>Rows: ${Math.floor(Math.random() * 100000)}</span>
                    <span>Size: ${Math.floor(Math.random() * 100)} MB</span>
                    <span>Last Vacuum: ${new Date().toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `;
}

// Database operations
function backupDatabase(dbName) {
    const database = dbName || document.getElementById('maintenanceDatabase').value;
    if (!database) {
        showNotification('Please select a database', 'warning');
        return;
    }
    
    showNotification(`Backup started for database: ${database}`, 'info');
    
    // Update log
    const logDiv = document.getElementById('maintenanceLog');
    if (logDiv) {
        const timestamp = new Date().toLocaleString();
        logDiv.innerHTML = `
            <div class="log-entry info">
                <span class="log-time">${timestamp}</span>
                <span class="log-message">Backup initiated for ${database}...</span>
            </div>
        ` + logDiv.innerHTML;
    }
}

function vacuumDatabase() {
    const database = document.getElementById('maintenanceDatabase').value;
    if (!database) {
        showNotification('Please select a database', 'warning');
        return;
    }
    
    showNotification(`VACUUM started for database: ${database}`, 'info');
}

function analyzeDatabase() {
    const database = document.getElementById('maintenanceDatabase').value;
    if (!database) {
        showNotification('Please select a database', 'warning');
        return;
    }
    
    showNotification(`ANALYZE started for database: ${database}`, 'info');
}

function reindexDatabase() {
    const database = document.getElementById('maintenanceDatabase').value;
    if (!database) {
        showNotification('Please select a database', 'warning');
        return;
    }
    
    showNotification(`REINDEX started for database: ${database}`, 'info');
}

// Load active queries
function loadActiveQueries() {
    const tbody = document.querySelector('#activeQueriesTable tbody');
    if (!tbody) return;
    
    // Generate mock active queries
    const queries = generateMockActiveQueries();
    
    if (queries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #94a3b8;">
                    No active queries
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = queries.map(query => `
        <tr>
            <td>${query.pid}</td>
            <td>${query.database}</td>
            <td>${query.user}</td>
            <td>
                <div class="query-text" title="${escapeHtml(query.query)}">
                    ${truncateText(query.query, 50)}
                </div>
            </td>
            <td>${formatDuration(query.duration)}</td>
            <td>
                <span class="query-state ${query.state}">
                    ${query.state}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="terminateQuery(${query.pid})">
                    Terminate
                </button>
            </td>
        </tr>
    `).join('');
}

// Generate mock active queries
function generateMockActiveQueries() {
    const queries = [];
    const count = Math.floor(Math.random() * 10);
    
    for (let i = 0; i < count; i++) {
        queries.push({
            pid: 10000 + i,
            database: databaseList[Math.floor(Math.random() * databaseList.length)].name,
            user: ['app_user', 'postgres', 'analytics_user'][Math.floor(Math.random() * 3)],
            query: generateMockQuery(),
            duration: Math.floor(Math.random() * 3000),
            state: ['active', 'idle', 'idle in transaction'][Math.floor(Math.random() * 3)]
        });
    }
    
    return queries;
}

function generateMockQuery() {
    const queries = [
        'SELECT * FROM users WHERE status = $1',
        'UPDATE orders SET status = $1 WHERE id = $2',
        'INSERT INTO logs (event, data) VALUES ($1, $2)',
        'SELECT COUNT(*) FROM transactions WHERE date > $1',
        'DELETE FROM temp_data WHERE created_at < $1'
    ];
    return queries[Math.floor(Math.random() * queries.length)];
}

// Utility functions
function formatDuration(ms) {
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    return Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Modal functions
function showCreateDatabaseModal() {
    document.getElementById('createDatabaseModal').style.display = 'flex';
}

function closeCreateDatabaseModal() {
    document.getElementById('createDatabaseModal').style.display = 'none';
    document.getElementById('createDatabaseForm').reset();
}

function createDatabase() {
    const name = document.getElementById('newDbName').value;
    const owner = document.getElementById('newDbOwner').value;
    
    if (!name || !owner) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    showNotification(`Database "${name}" created successfully`, 'success');
    closeCreateDatabaseModal();
    loadDatabaseList();
}

function refreshDatabaseList() {
    showNotification('Refreshing database list...', 'info');
    loadDatabaseList();
}

function selectDatabase(dbName) {
    // Populate all selects with this database
    ['analyzerDatabase', 'statsDatabase', 'inspectorDatabase', 'maintenanceDatabase'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.value = dbName;
            if (id === 'statsDatabase') loadDatabaseStats();
            if (id === 'inspectorDatabase') loadDatabaseTables();
        }
    });
}

function showDatabaseDetails(dbName) {
    const db = databaseList.find(d => d.name === dbName);
    if (!db) return;
    
    showNotification(`Showing details for ${dbName}`, 'info');
    selectDatabase(dbName);
    
    // Scroll to stats section
    document.getElementById('statsDatabase').scrollIntoView({ behavior: 'smooth' });
}

function terminateQuery(pid) {
    if (confirm(`Are you sure you want to terminate query with PID ${pid}?`)) {
        showNotification(`Query ${pid} terminated`, 'success');
        loadActiveQueries();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initDatabases();
    
    // Add modal click handler
    const modal = document.getElementById('createDatabaseModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCreateDatabaseModal();
            }
        });
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});