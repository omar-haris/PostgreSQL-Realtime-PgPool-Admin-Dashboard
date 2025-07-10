// History page JavaScript

let historyChart;
let historyData = [];
let currentFilters = {
    startDate: '',
    endDate: '',
    eventType: '',
    database: ''
};

// Initialize history page
function initHistory() {
    // Initialize date inputs with default values
    initDateInputs();
    
    // Initialize timeline chart
    initTimelineChart();
    
    // Generate mock history data first
    generateMockHistoryData();
    
    // Then load initial data which will use the generated data
    loadHistoryData();
}

// Initialize date inputs
function initDateInputs() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    if (startDate && endDate) {
        // Set default date range (last 30 days)
        const today = new Date();
        const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        endDate.value = today.toISOString().split('T')[0];
        startDate.value = last30Days.toISOString().split('T')[0];
        
        currentFilters.startDate = startDate.value;
        currentFilters.endDate = endDate.value;
    }
}

// Initialize timeline chart
function initTimelineChart() {
    const timelineCtx = document.getElementById('timelineChart');
    if (!timelineCtx) return;
    
    historyChart = new Chart(timelineCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Query Events',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Connection Events',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Error Events',
                data: [],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Event Count',
                        color: '#94a3b8'
                    }
                }
            },
            plugins: {
                ...commonChartOptions.plugins,
                title: {
                    display: true,
                    text: 'Activity Timeline',
                    color: '#f1f5f9'
                }
            }
        }
    });
}

// Load history data
async function loadHistoryData() {
    try {
        // Show loading state
        const tbody = document.querySelector('#historyTable tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-cell">
                        <div class="loading"></div>
                        <p>Loading history data...</p>
                    </td>
                </tr>
            `;
        }
        
        // Simulate async loading with a small delay
        setTimeout(() => {
            // In a real implementation, this would fetch from the backend
            // For now, we'll use the mock data
            updateHistoryTable();
            updateTimelineChart();
            updateStatistics();
        }, 500);
        
    } catch (error) {
        console.error('Failed to load history data:', error);
        showNotification('Failed to load history data', 'error');
    }
}

// Generate mock history data
function generateMockHistoryData() {
    const eventTypes = ['query', 'connection', 'error', 'performance'];
    const databases = ['pgpool', 'master', 'replica'];
    const users = ['admin', 'appuser', 'readonly'];
    
    historyData = [];
    
    // Generate events for the last 30 days
    const now = new Date();
    
    // Generate more data (300 events) to cover 30 days
    for (let i = 0; i < 300; i++) {
        // Random time in the last 30 days
        const timestamp = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const database = databases[Math.floor(Math.random() * databases.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        
        let description, duration, status;
        
        switch (eventType) {
            case 'query':
                description = generateQueryDescription();
                duration = Math.round(Math.random() * 1000 + 10) + 'ms';
                status = Math.random() > 0.1 ? 'success' : 'error';
                break;
            case 'connection':
                description = Math.random() > 0.5 ? 'Connection established' : 'Connection closed';
                duration = Math.round(Math.random() * 100 + 5) + 'ms';
                status = 'success';
                break;
            case 'error':
                description = generateErrorDescription();
                duration = 'N/A';
                status = 'error';
                break;
            case 'performance':
                description = generatePerformanceDescription();
                duration = 'N/A';
                status = Math.random() > 0.2 ? 'success' : 'warning';
                break;
        }
        
        historyData.push({
            id: i + 1,
            timestamp: timestamp.toISOString(),
            eventType: eventType,
            database: database,
            user: user,
            description: description,
            duration: duration,
            status: status
        });
    }
    
    // Sort by timestamp (newest first)
    historyData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Generate query descriptions
function generateQueryDescription() {
    const queries = [
        'SELECT query execution on users table',
        'INSERT operation on orders table',
        'UPDATE query on products table',
        'DELETE operation on logs table',
        'Complex JOIN query across multiple tables',
        'Aggregation query with GROUP BY',
        'Index creation on user_email column',
        'VACUUM operation on large table'
    ];
    return queries[Math.floor(Math.random() * queries.length)];
}

// Generate error descriptions
function generateErrorDescription() {
    const errors = [
        'Connection timeout to database',
        'Query execution failed: syntax error',
        'Deadlock detected and resolved',
        'Connection pool exhausted',
        'Authentication failed for user',
        'Database connection lost',
        'Query canceled due to timeout',
        'Insufficient permissions for operation'
    ];
    return errors[Math.floor(Math.random() * errors.length)];
}

// Generate performance descriptions
function generatePerformanceDescription() {
    const events = [
        'Slow query detected (>1s execution time)',
        'High CPU usage alert triggered',
        'Memory usage exceeded threshold',
        'Connection pool usage spike',
        'Automatic vacuum started on table',
        'Index maintenance completed',
        'Checkpoint operation completed',
        'Statistics updated for query planner'
    ];
    return events[Math.floor(Math.random() * events.length)];
}

// Apply filters
function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const eventType = document.getElementById('eventType').value;
    const database = document.getElementById('databaseFilter').value;
    
    currentFilters = { startDate, endDate, eventType, database };
    
    updateHistoryTable();
    updateTimelineChart();
    
    showNotification('Filters applied', 'info');
}

// Reset filters
function resetFilters() {
    // Reset to default 30 days
    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    document.getElementById('startDate').value = last30Days.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    document.getElementById('eventType').value = '';
    document.getElementById('databaseFilter').value = '';
    
    currentFilters = { 
        startDate: last30Days.toISOString().split('T')[0], 
        endDate: today.toISOString().split('T')[0], 
        eventType: '', 
        database: '' 
    };
    
    updateHistoryTable();
    updateTimelineChart();
    
    showNotification('Filters reset to last 30 days', 'info');
}

// Update history table
function updateHistoryTable() {
    const tbody = document.querySelector('#historyTable tbody');
    if (!tbody) return;
    
    // Filter data based on current filters
    let filteredData = historyData.filter(item => {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
        
        // Date filter
        if (currentFilters.startDate && itemDate < currentFilters.startDate) return false;
        if (currentFilters.endDate && itemDate > currentFilters.endDate) return false;
        
        // Event type filter
        if (currentFilters.eventType && item.eventType !== currentFilters.eventType) return false;
        
        // Database filter
        if (currentFilters.database && item.database !== currentFilters.database) return false;
        
        return true;
    });
    
    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #94a3b8; padding: 40px;">
                    No events found matching the current filters
                </td>
            </tr>
        `;
        return;
    }
    
    // Show first 100 results for better visibility
    filteredData = filteredData.slice(0, 100);
    
    tbody.innerHTML = filteredData.map(item => `
        <tr>
            <td>${formatTimestamp(item.timestamp)}</td>
            <td>
                <span class="badge ${getEventTypeBadge(item.eventType)}">
                    ${item.eventType}
                </span>
            </td>
            <td>${item.database}</td>
            <td>${item.user}</td>
            <td>
                <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${item.description}
                </div>
            </td>
            <td>${item.duration}</td>
            <td>
                <span class="status-badge ${getStatusClass(item.status)}">
                    ${item.status}
                </span>
            </td>
            <td>
                <button class="details-btn" onclick="showEventDetails(${item.id})">Details</button>
            </td>
        </tr>
    `).join('');
}

// Get event type badge class
function getEventTypeBadge(eventType) {
    const badges = {
        query: 'badge-info',
        connection: 'badge-success',
        error: 'badge-danger',
        performance: 'badge-warning'
    };
    return badges[eventType] || 'badge-info';
}

// Get status class
function getStatusClass(status) {
    const classes = {
        success: 'status-success',
        error: 'status-error',
        warning: 'status-warning'
    };
    return classes[status] || 'status-success';
}

// Update timeline chart
function updateTimelineChart() {
    if (!historyChart) return;
    
    // Group events by hour for the chart
    const eventsByHour = {};
    const now = new Date();
    
    // Initialize last 24 hours
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourKey = hour.toISOString().split('T')[1].split(':')[0] + ':00';
        eventsByHour[hourKey] = { query: 0, connection: 0, error: 0 };
    }
    
    // Count events in each hour
    historyData.forEach(item => {
        const itemTime = new Date(item.timestamp);
        const hourKey = itemTime.toISOString().split('T')[1].split(':')[0] + ':00';
        
        if (eventsByHour[hourKey]) {
            if (item.eventType === 'query') eventsByHour[hourKey].query++;
            else if (item.eventType === 'connection') eventsByHour[hourKey].connection++;
            else if (item.eventType === 'error') eventsByHour[hourKey].error++;
        }
    });
    
    // Update chart data
    const labels = Object.keys(eventsByHour);
    const queryData = labels.map(label => eventsByHour[label].query);
    const connectionData = labels.map(label => eventsByHour[label].connection);
    const errorData = labels.map(label => eventsByHour[label].error);
    
    historyChart.data.labels = labels;
    historyChart.data.datasets[0].data = queryData;
    historyChart.data.datasets[1].data = connectionData;
    historyChart.data.datasets[2].data = errorData;
    
    historyChart.update();
}

// Update statistics in metric cards
function updateStatistics() {
    // Calculate statistics from history data
    const totalEvents = historyData.length;
    const successEvents = historyData.filter(item => item.status === 'success').length;
    const errorEvents = historyData.filter(item => item.status === 'error').length;
    const successRate = totalEvents > 0 ? ((successEvents / totalEvents) * 100).toFixed(1) : 0;
    
    // Calculate average duration for queries
    const queryEvents = historyData.filter(item => item.eventType === 'query' && item.duration !== 'N/A');
    const avgDuration = queryEvents.length > 0 
        ? Math.round(queryEvents.reduce((sum, item) => sum + parseInt(item.duration), 0) / queryEvents.length)
        : 0;
    
    // Update DOM elements
    const totalEventsEl = document.getElementById('totalEvents');
    const successRateEl = document.getElementById('successRate');
    const errorCountEl = document.getElementById('errorCount');
    const avgDurationEl = document.getElementById('avgDuration');
    
    if (totalEventsEl) totalEventsEl.textContent = totalEvents.toLocaleString();
    if (successRateEl) {
        successRateEl.textContent = successRate + '%';
        // Update progress bar
        const progressBar = document.querySelector('.progress-fill');
        if (progressBar) {
            progressBar.style.width = successRate + '%';
        }
    }
    if (errorCountEl) errorCountEl.textContent = errorEvents;
    if (avgDurationEl) avgDurationEl.textContent = avgDuration + 'ms';
}

// Show event details
function showEventDetails(eventId) {
    const event = historyData.find(item => item.id === eventId);
    if (!event) return;
    
    const modal = document.getElementById('eventModal');
    const details = document.getElementById('eventDetails');
    
    if (modal && details) {
        details.innerHTML = `
            <div class="event-detail-row">
                <span class="event-detail-label">Event ID</span>
                <span class="event-detail-value">${event.id}</span>
            </div>
            <div class="event-detail-row">
                <span class="event-detail-label">Timestamp</span>
                <span class="event-detail-value">${formatTimestamp(event.timestamp)}</span>
            </div>
            <div class="event-detail-row">
                <span class="event-detail-label">Type</span>
                <span class="event-detail-value">
                    <span class="badge ${getEventTypeBadge(event.eventType)}">${event.eventType}</span>
                </span>
            </div>
            <div class="event-detail-row">
                <span class="event-detail-label">Database</span>
                <span class="event-detail-value">${event.database}</span>
            </div>
            <div class="event-detail-row">
                <span class="event-detail-label">User</span>
                <span class="event-detail-value">${event.user}</span>
            </div>
            <div class="event-detail-row">
                <span class="event-detail-label">Description</span>
                <span class="event-detail-value">${event.description}</span>
            </div>
            <div class="event-detail-row">
                <span class="event-detail-label">Duration</span>
                <span class="event-detail-value">${event.duration}</span>
            </div>
            <div class="event-detail-row">
                <span class="event-detail-label">Status</span>
                <span class="event-detail-value">
                    <span class="status-badge ${getStatusClass(event.status)}">${event.status}</span>
                </span>
            </div>
        `;
        
        modal.style.display = 'flex';
    }
}

// Close event modal
function closeEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Export history
function exportHistory() {
    // Create CSV content
    const headers = ['Timestamp', 'Event Type', 'Database', 'User', 'Description', 'Duration', 'Status'];
    const csvContent = [
        headers.join(','),
        ...historyData.map(item => [
            item.timestamp,
            item.eventType,
            item.database,
            item.user,
            `"${item.description.replace(/"/g, '""')}"`,
            item.duration,
            item.status
        ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pgpool-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('History exported to CSV', 'success');
}

// Change time range
function changeTimeRange(range) {
    // Update active button
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch(range) {
        case '1h':
            startDate.setHours(endDate.getHours() - 1);
            break;
        case '6h':
            startDate.setHours(endDate.getHours() - 6);
            break;
        case '24h':
            startDate.setDate(endDate.getDate() - 1);
            break;
        case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
    }
    
    // Update date inputs
    document.getElementById('startDate').value = formatDateForInput(startDate);
    document.getElementById('endDate').value = formatDateForInput(endDate);
    
    // Apply filters
    applyFilters();
}

// Pagination functions
function nextPage() {
    const currentPage = parseInt(document.querySelector('.page-number.active')?.textContent || 1);
    const totalPages = parseInt(document.querySelector('.page-number:last-child')?.textContent || 1);
    
    if (currentPage < totalPages) {
        updatePage(currentPage + 1);
    }
}

function previousPage() {
    const currentPage = parseInt(document.querySelector('.page-number.active')?.textContent || 1);
    
    if (currentPage > 1) {
        updatePage(currentPage - 1);
    }
}

function updatePage(page) {
    // Update active page button
    document.querySelectorAll('.page-number').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.textContent) === page) {
            btn.classList.add('active');
        }
    });
    
    // Reload data for new page
    loadHistoryData();
}

// Copy event details to clipboard
function copyEventDetails() {
    const modal = document.getElementById('eventModal');
    const details = [];
    
    modal.querySelectorAll('.event-detail-row').forEach(row => {
        const label = row.querySelector('.event-detail-label').textContent;
        const value = row.querySelector('.event-detail-value').textContent;
        details.push(`${label}: ${value}`);
    });
    
    const text = details.join('\n');
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Event details copied to clipboard', 'success');
    }).catch(() => {
        showNotification('Failed to copy to clipboard', 'error');
    });
}

// Add event listener for modal background click
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeEventModal();
            }
        });
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initHistory);