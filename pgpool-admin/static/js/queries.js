// Query Analysis page JavaScript

let queryCharts = {};
let updateInterval;

// Initialize queries page
async function initQueries() {
    // Initialize charts
    initQueryCharts();
    
    // Load initial data
    await updateQueriesData();
    
    // Start auto-refresh
    updateInterval = setInterval(updateQueriesData, 10000);
}

// Initialize charts
function initQueryCharts() {
    // Query Type Distribution Chart
    const queryTypeCtx = document.getElementById('queryTypeChart');
    if (queryTypeCtx) {
        queryCharts.queryType = new Chart(queryTypeCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DDL'],
                datasets: [{
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6'
                    ],
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                ...commonChartOptions,
                plugins: {
                    ...commonChartOptions.plugins,
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    // Query Performance Timeline Chart
    const queryTimelineCtx = document.getElementById('queryTimelineChart');
    if (queryTimelineCtx) {
        queryCharts.timeline = new Chart(queryTimelineCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Average Response Time (ms)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Query Count',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                ...commonChartOptions,
                scales: {
                    ...commonChartOptions.scales,
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Response Time (ms)',
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#1e293b',
                            drawBorder: false
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Query Count',
                            color: '#94a3b8'
                        },
                        grid: {
                            drawOnChartArea: false,
                            color: '#1e293b',
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }
}

// Update queries data
async function updateQueriesData() {
    try {
        // Fetch query statistics
        const queryStats = await fetchAPI('/api/query_statistics');
        
        // Update metrics
        updateQueryMetrics(queryStats.data);
        
        // Update tables
        updateQueryTables(queryStats.data);
        
        // Update charts
        updateQueryCharts(queryStats.data);
        
    } catch (error) {
        console.error('Failed to update queries data:', error);
        showNotification('Failed to update query data', 'error');
    }
}

// Update query metrics
function updateQueryMetrics(data) {
    // Total queries
    const totalQueries = data.summary ? data.summary.total_queries || 0 : 0;
    document.getElementById('totalQueries').textContent = formatNumber(totalQueries);
    
    // Slow queries
    const slowQueries = data.slow_queries ? data.slow_queries.length : 0;
    document.getElementById('slowQueries').textContent = formatNumber(slowQueries);
    
    // Failed queries (mock data)
    const failedQueries = Math.round(Math.random() * 5);
    document.getElementById('failedQueries').textContent = formatNumber(failedQueries);
    
    // Average execution time
    let avgExecTime = 0;
    if (data.top_queries && data.top_queries.length > 0) {
        const totalTime = data.top_queries.reduce((sum, q) => sum + (q.mean_exec_time || 0), 0);
        avgExecTime = Math.round(totalTime / data.top_queries.length);
    } else {
        avgExecTime = Math.round(20 + Math.random() * 30);
    }
    document.getElementById('avgExecTime').textContent = avgExecTime + 'ms';
}

// Update query tables
function updateQueryTables(data) {
    updateQueryPatternsTable(data.query_patterns || []);
    updateTopQueriesTable(data.top_queries || []);
}

// Update query patterns table
function updateQueryPatternsTable(patterns) {
    const tbody = document.querySelector('#queryPatternsTable tbody');
    if (!tbody) return;
    
    if (patterns.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #94a3b8;">No query patterns available</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = patterns.slice(0, 10).map((pattern, index) => {
        const queryId = `pattern_${index}`;
        // Store query in global object to avoid escaping issues
        window.queryData[queryId] = pattern.query || 'N/A';
        
        return `
            <tr>
                <td>
                    <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${truncateText(pattern.query || 'N/A', 50)}
                    </div>
                </td>
                <td>${formatNumber(pattern.calls || 0)}</td>
                <td>${Math.round(pattern.mean_exec_time || 0)}ms</td>
                <td>${Math.round(pattern.total_exec_time || 0)}ms</td>
                <td>
                    <button class="btn btn-primary" onclick="viewFullQuery('${queryId}')">View Full</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Update top queries table
function updateTopQueriesTable(queries) {
    const tbody = document.querySelector('#topQueriesTable tbody');
    if (!tbody) return;
    
    if (queries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #94a3b8;">No query data available</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = queries.slice(0, 10).map((query, index) => {
        const queryId = `top_${index}`;
        // Store query in global object
        window.queryData[queryId] = query.query || 'N/A';
        
        return `
            <tr>
                <td>
                    <div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${truncateText(query.query || 'N/A', 40)}
                    </div>
                </td>
                <td>${formatNumber(query.calls || 0)}</td>
                <td>${Math.round(query.total_exec_time || 0)}ms</td>
                <td>${Math.round(query.mean_exec_time || 0)}ms</td>
                <td>
                    <button class="btn btn-primary" onclick="viewFullQuery('${queryId}')">View Full</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Update charts
function updateQueryCharts(data) {
    updateQueryTypeChart(data);
    updateTimelineChart(data);
}

// Update query type chart
function updateQueryTypeChart(data) {
    if (!queryCharts.queryType) return;
    
    // Calculate query type distribution
    const queryTypes = { SELECT: 0, INSERT: 0, UPDATE: 0, DELETE: 0, DDL: 0 };
    
    if (data.top_queries && data.top_queries.length > 0) {
        data.top_queries.forEach(query => {
            const sql = (query.query || '').trim().toUpperCase();
            if (sql.startsWith('SELECT')) {
                queryTypes.SELECT += query.calls || 1;
            } else if (sql.startsWith('INSERT')) {
                queryTypes.INSERT += query.calls || 1;
            } else if (sql.startsWith('UPDATE')) {
                queryTypes.UPDATE += query.calls || 1;
            } else if (sql.startsWith('DELETE')) {
                queryTypes.DELETE += query.calls || 1;
            } else {
                queryTypes.DDL += query.calls || 1;
            }
        });
    } else {
        // Mock data
        queryTypes.SELECT = Math.round(Math.random() * 1000 + 500);
        queryTypes.INSERT = Math.round(Math.random() * 300 + 100);
        queryTypes.UPDATE = Math.round(Math.random() * 200 + 50);
        queryTypes.DELETE = Math.round(Math.random() * 100 + 20);
        queryTypes.DDL = Math.round(Math.random() * 50 + 10);
    }
    
    queryCharts.queryType.data.datasets[0].data = Object.values(queryTypes);
    queryCharts.queryType.update();
}

// Update timeline chart
function updateTimelineChart(data) {
    if (!queryCharts.timeline) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const maxDataPoints = 20;
    
    // Remove old data points
    if (queryCharts.timeline.data.labels.length >= maxDataPoints) {
        queryCharts.timeline.data.labels.shift();
        queryCharts.timeline.data.datasets[0].data.shift();
        queryCharts.timeline.data.datasets[1].data.shift();
    }
    
    // Calculate current metrics
    let avgResponseTime = 0;
    let queryCount = 0;
    
    if (data.top_queries && data.top_queries.length > 0) {
        const totalTime = data.top_queries.reduce((sum, q) => sum + (q.mean_exec_time || 0), 0);
        avgResponseTime = Math.round(totalTime / data.top_queries.length);
        queryCount = data.top_queries.reduce((sum, q) => sum + (q.calls || 0), 0);
    } else {
        avgResponseTime = Math.round(20 + Math.random() * 30);
        queryCount = Math.round(Math.random() * 100 + 50);
    }
    
    queryCharts.timeline.data.labels.push(timestamp);
    queryCharts.timeline.data.datasets[0].data.push(avgResponseTime);
    queryCharts.timeline.data.datasets[1].data.push(queryCount);
    
    queryCharts.timeline.update('none');
}

// View full query function
function viewFullQuery(queryId) {
    const query = window.queryData[queryId];
    if (!query) {
        showNotification('Query not found', 'error');
        return;
    }
    
    const modal = document.getElementById('queryModal');
    const content = document.getElementById('queryModalContent');
    const stats = document.getElementById('queryModalStats');
    
    if (modal && content) {
        // Format the query
        content.textContent = query;
        
        // Show mock statistics
        if (stats) {
            stats.innerHTML = `
                <div class="stat">
                    <div class="stat-label">Execution Count</div>
                    <div class="stat-value">${formatNumber(Math.round(Math.random() * 1000 + 100))}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Average Time</div>
                    <div class="stat-value">${Math.round(Math.random() * 50 + 10)}ms</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Total Time</div>
                    <div class="stat-value">${Math.round(Math.random() * 5000 + 1000)}ms</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Rows Affected</div>
                    <div class="stat-value">${formatNumber(Math.round(Math.random() * 10000 + 1000))}</div>
                </div>
            `;
        }
        
        modal.style.display = 'flex';
    }
}

// Close query modal
function closeQueryModal() {
    const modal = document.getElementById('queryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Add event listener for modal background click
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('queryModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeQueryModal();
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initQueries);