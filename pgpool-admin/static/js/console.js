// Query Console page JavaScript

let queryHistory = [];
let currentQuery = '';

// Initialize console page
function initConsole() {
    // Load query history from localStorage
    loadQueryHistory();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI
    updateHistoryDisplay();
    
    // Initialize database indicator
    updateDatabaseIndicator();
}

// Setup event listeners
function setupEventListeners() {
    const queryInput = document.getElementById('queryInput');
    const executeBtn = document.getElementById('executeBtn');
    
    if (queryInput) {
        // Save query as user types
        queryInput.addEventListener('input', (e) => {
            currentQuery = e.target.value;
        });
        
        // Execute on Ctrl+Enter
        queryInput.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                executeQuery();
            }
        });
    }
    
    if (executeBtn) {
        executeBtn.addEventListener('click', executeQuery);
    }
}

// Execute query
async function executeQuery() {
    const queryInput = document.getElementById('queryInput');
    const executeBtn = document.getElementById('executeBtn');
    const resultsContent = document.getElementById('resultsContent');
    const executionStats = document.getElementById('executionStats');
    
    if (!queryInput || !queryInput.value.trim()) {
        showNotification('Please enter a query', 'warning');
        return;
    }
    
    const query = queryInput.value.trim();
    
    // Update UI state
    executeBtn.disabled = true;
    executeBtn.innerHTML = '<span class="btn-icon">⏳</span>Executing...';
    resultsContent.innerHTML = `
        <div class="empty-state">
            <div class="loading"></div>
            <h4>Executing Query</h4>
            <p>Please wait while your query is being processed...</p>
        </div>
    `;
    
    try {
        const startTime = Date.now();
        
        // Get selected database
        const databaseSelect = document.getElementById('databaseSelect');
        const selectedDatabase = databaseSelect ? databaseSelect.value : 'pgpool';
        
        // Send query to backend
        const response = await fetch('/api/execute_query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                query: query,
                database: selectedDatabase 
            })
        });
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Display results
            displayResults(result.data, executionTime);
            
            // Add to history
            addToHistory(query, result.data, executionTime, 'success');
            
            showNotification('Query executed successfully', 'success');
        } else {
            // Display error
            displayError(result.message);
            
            // Add to history
            addToHistory(query, null, executionTime, 'error', result.message);
            
            showNotification('Query failed: ' + result.message, 'error');
        }
        
    } catch (error) {
        const executionTime = Date.now() - Date.now();
        
        displayError('Network error: ' + error.message);
        addToHistory(query, null, executionTime, 'error', error.message);
        showNotification('Network error: ' + error.message, 'error');
    } finally {
        // Reset UI state
        executeBtn.disabled = false;
        executeBtn.innerHTML = '<span class="btn-icon">▶️</span>Execute Query';
    }
}

// Display query results
function displayResults(data, executionTime) {
    const resultsContent = document.getElementById('resultsContent');
    const executionStats = document.getElementById('executionStats');
    const resultCount = document.getElementById('resultCount');
    
    // Update execution stats
    if (executionStats) {
        document.getElementById('rowsAffected').textContent = data.row_count || 0;
        document.getElementById('executionTime').textContent = executionTime + 'ms';
        document.getElementById('queryType').textContent = detectQueryType(currentQuery);
        
        // Update target database
        const targetDb = document.getElementById('targetDatabase');
        const dbSelect = document.getElementById('databaseSelect');
        if (targetDb && dbSelect) {
            const dbName = dbSelect.options[dbSelect.selectedIndex].text;
            targetDb.textContent = dbName;
        }
        
        executionStats.style.display = 'block';
        executionStats.classList.add('fade-in');
    }
    
    // Update result count and show export button
    if (resultCount) {
        resultCount.textContent = data.row_count ? `${data.row_count} rows` : 'Query completed';
        resultCount.className = 'result-count-badge';
    }
    
    // Show export button if there are results
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn && data.columns && data.rows) {
        exportBtn.style.display = 'inline-flex';
    }
    
    if (data.columns && data.rows) {
        // Display table results
        const table = createResultsTable(data.columns, data.rows);
        resultsContent.innerHTML = '';
        resultsContent.appendChild(table);
    } else {
        // Display success message
        resultsContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h4>Query Executed Successfully</h4>
                <p>${data.message || 'Command completed successfully'}</p>
            </div>
        `;
    }
}

// Display error
function displayError(message) {
    const resultsContent = document.getElementById('resultsContent');
    const executionStats = document.getElementById('executionStats');
    
    executionStats.style.display = 'none';
    
    resultsContent.innerHTML = `
        <div class="message error">
            <div class="message-icon">❌</div>
            <div>
                <h4>Query Error</h4>
                <p>${message}</p>
            </div>
        </div>
    `;
}

// Create results table
function createResultsTable(columns, rows) {
    const tableContainer = document.createElement('div');
    tableContainer.style.overflowX = 'auto';
    tableContainer.style.maxHeight = '400px';
    
    const table = document.createElement('table');
    table.className = 'results-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    rows.forEach(row => {
        const tr = document.createElement('tr');
        
        columns.forEach(column => {
            const td = document.createElement('td');
            const value = row[column];
            
            if (value === null) {
                td.innerHTML = '<span style="color: #94a3b8; font-style: italic;">NULL</span>';
            } else if (typeof value === 'object') {
                td.textContent = JSON.stringify(value);
            } else {
                td.textContent = String(value);
            }
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    return tableContainer;
}

// Detect query type
function detectQueryType(query) {
    const sql = query.trim().toUpperCase();
    
    if (sql.startsWith('SELECT')) return 'SELECT';
    if (sql.startsWith('INSERT')) return 'INSERT';
    if (sql.startsWith('UPDATE')) return 'UPDATE';
    if (sql.startsWith('DELETE')) return 'DELETE';
    if (sql.startsWith('CREATE')) return 'CREATE';
    if (sql.startsWith('ALTER')) return 'ALTER';
    if (sql.startsWith('DROP')) return 'DROP';
    if (sql.startsWith('SHOW')) return 'SHOW';
    if (sql.startsWith('EXPLAIN')) return 'EXPLAIN';
    
    return 'OTHER';
}

// Add query to history
function addToHistory(query, result, executionTime, status, error = null) {
    const databaseSelect = document.getElementById('databaseSelect');
    const database = databaseSelect ? databaseSelect.value : 'pgpool';
    const databaseName = databaseSelect ? databaseSelect.options[databaseSelect.selectedIndex].text : 'PgPool';
    
    const historyItem = {
        id: Date.now(),
        query: query,
        timestamp: new Date().toISOString(),
        executionTime: executionTime,
        status: status,
        rowCount: result ? result.row_count : 0,
        error: error,
        database: database,
        databaseName: databaseName
    };
    
    queryHistory.unshift(historyItem);
    
    // Keep only last 50 queries
    if (queryHistory.length > 50) {
        queryHistory = queryHistory.slice(0, 50);
    }
    
    // Save to localStorage
    saveQueryHistory();
    
    // Update display
    updateHistoryDisplay();
}

// Update history display
function updateHistoryDisplay() {
    const historyContainer = document.getElementById('queryHistory');
    if (!historyContainer) return;
    
    if (queryHistory.length === 0) {
        historyContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📜</div>
                <p>No queries executed yet</p>
            </div>
        `;
        return;
    }
    
    historyContainer.innerHTML = queryHistory.map(item => `
        <div class="history-item slide-in" onclick="loadHistoryQuery('${item.id}')">
            <div class="history-query">${truncateText(item.query, 100)}</div>
            <div class="history-meta">
                <span class="history-timestamp">${new Date(item.timestamp).toLocaleString()}</span>
                <span class="history-database">
                    <span class="database-badge database-${item.database || 'pgpool'}">
                        ${item.databaseName || 'PgPool'}
                    </span>
                </span>
                <span>
                    <span class="history-status ${item.status}">
                        ${item.status}
                    </span>
                    ${item.executionTime}ms
                </span>
            </div>
        </div>
    `).join('');
}

// Load query from history
function loadHistoryQuery(id) {
    const historyItem = queryHistory.find(item => item.id == id);
    if (historyItem) {
        const queryInput = document.getElementById('queryInput');
        const databaseSelect = document.getElementById('databaseSelect');
        
        if (queryInput) {
            queryInput.value = historyItem.query;
            currentQuery = historyItem.query;
        }
        
        // Restore database selection if available
        if (databaseSelect && historyItem.database) {
            databaseSelect.value = historyItem.database;
            updateDatabaseIndicator();
        }
        
        showNotification('Query loaded from history', 'info');
    }
}

// Clear query
function clearQuery() {
    const queryInput = document.getElementById('queryInput');
    const resultsContent = document.getElementById('resultsContent');
    const executionStats = document.getElementById('executionStats');
    
    if (queryInput) {
        queryInput.value = '';
        currentQuery = '';
    }
    
    if (resultsContent) {
        resultsContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h4>No Results Yet</h4>
                <p>Execute a query to see results here</p>
            </div>
        `;
    }
    
    // Hide export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.style.display = 'none';
    }
    
    if (executionStats) {
        executionStats.style.display = 'none';
    }
}

// Save query history to localStorage
function saveQueryHistory() {
    try {
        localStorage.setItem('pgpool_query_history', JSON.stringify(queryHistory));
    } catch (error) {
        console.warn('Failed to save query history:', error);
    }
}

// Load query history from localStorage
function loadQueryHistory() {
    try {
        const saved = localStorage.getItem('pgpool_query_history');
        if (saved) {
            queryHistory = JSON.parse(saved);
        }
    } catch (error) {
        console.warn('Failed to load query history:', error);
        queryHistory = [];
    }
}

// Clear history
function clearHistory() {
    if (confirm('Are you sure you want to clear all query history?')) {
        queryHistory = [];
        saveQueryHistory();
        updateHistoryDisplay();
        showNotification('Query history cleared', 'info');
    }
}

// Export results (placeholder)
function exportResults() {
    showNotification('Export functionality coming soon', 'info');
}

// Sample queries for different databases
const sampleQueries = {
    pgpool: [
        'SHOW POOL_NODES;',
        'SHOW POOL_PROCESSES;',
        'SHOW POOL_POOLS;',
        'SHOW POOL_STATUS;'
    ],
    master: [
        'SELECT * FROM pg_stat_activity LIMIT 10;',
        'SELECT * FROM pg_stat_database;',
        'SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;',
        'EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM information_schema.tables;'
    ],
    replica: [
        'SELECT * FROM pg_stat_activity LIMIT 10;',
        'SELECT * FROM pg_stat_replication;',
        'SELECT pg_is_in_recovery();',
        'SELECT * FROM pg_stat_wal_receiver;'
    ]
};

// Insert sample query
function insertSampleQuery(type) {
    const databaseSelect = document.getElementById('databaseSelect');
    const queryInput = document.getElementById('queryInput');
    
    if (!queryInput) return;
    
    const database = databaseSelect ? databaseSelect.value : 'pgpool';
    let query;
    
    // Use specific query type or random
    if (type === 'select') {
        query = 'SELECT * FROM pg_stat_activity LIMIT 10;';
    } else if (type === 'stats') {
        query = 'SELECT * FROM pg_stat_database;';
    } else if (type === 'activity') {
        query = 'SHOW POOL_PROCESSES;';
    } else {
        const queries = sampleQueries[database] || sampleQueries.pgpool;
        query = queries[Math.floor(Math.random() * queries.length)];
    }
    
    queryInput.value = query;
    currentQuery = query;
    
    showNotification(`Sample ${type || 'query'} inserted`, 'info');
}

// Update database indicator
function updateDatabaseIndicator() {
    const databaseSelect = document.getElementById('databaseSelect');
    const selectedDbName = document.getElementById('selectedDbName');
    const databaseIndicator = document.getElementById('databaseIndicator');
    
    if (databaseSelect && selectedDbName) {
        const selectedOption = databaseSelect.options[databaseSelect.selectedIndex];
        selectedDbName.textContent = selectedOption.text;
        
        // Update indicator styling based on database type
        if (databaseIndicator) {
            databaseIndicator.className = 'database-indicator';
            switch (databaseSelect.value) {
                case 'master':
                    databaseIndicator.classList.add('indicator-master');
                    break;
                case 'replica':
                    databaseIndicator.classList.add('indicator-replica');
                    break;
                default:
                    databaseIndicator.classList.add('indicator-pgpool');
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initConsole);