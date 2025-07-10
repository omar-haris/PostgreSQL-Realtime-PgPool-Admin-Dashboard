// Cluster Status Monitoring System
// OPENSEWAVE PgPool Admin Dashboard

class ClusterStatusMonitor {
    constructor() {
        this.charts = {};
        this.currentTimeRange = 1; // hours
        this.currentEventFilter = 'all';
        this.updateInterval = 30000; // 30 seconds
        this.monitoring = false;
        this.monitoringInterval = null;
    }

    async initialize() {
        console.log('Initializing Cluster Status Monitor...');
        
        // Initialize charts
        this.initializeCharts();
        
        // Load initial data
        await this.loadClusterStatus();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start monitoring
        this.startMonitoring();
    }

    initializeCharts() {
        // Response Time Chart
        this.charts.responseTime = new Chart(document.getElementById('responseTimeChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'PG Master',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'PG Replica',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'PgPool',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: this.getChartOptions('Response Time (ms)')
        });

        // Availability Chart
        this.charts.availability = new Chart(document.getElementById('availabilityChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['PG Master', 'PG Replica', 'PgPool'],
                datasets: [{
                    label: 'Availability %',
                    data: [100, 100, 100],
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                    borderColor: ['#059669', '#2563eb', '#d97706'],
                    borderWidth: 2
                }]
            },
            options: this.getChartOptions('Availability Percentage', false, true)
        });
    }

    getChartOptions(title, dualAxis = false, horizontal = false) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    color: '#f1f5f9',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        color: '#94a3b8',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: '#334155',
                    borderWidth: 1,
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        maxRotation: 0
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b'
                    },
                    beginAtZero: true
                }
            }
        };
    }

    async loadClusterStatus() {
        try {
            const response = await fetch('/api/cluster_status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.updateClusterOverview(data.data);
                this.updateComponentsGrid(data.data.components);
                this.updateRecentEvents(data.data.recent_events);
                this.updateLastCheckTime(data.data.summary.last_check);
            } else {
                throw new Error(data.message || 'Failed to load cluster status');
            }
        } catch (error) {
            console.error('Failed to load cluster status:', error);
            this.showNotification('Failed to load cluster status', 'error');
        }
    }

    updateClusterOverview(data) {
        // Update health score
        const healthScore = Math.round(data.cluster_health);
        document.getElementById('clusterHealthScore').textContent = healthScore;
        
        // Update health score circle
        const circle = document.getElementById('healthScoreCircle');
        const circumference = 2 * Math.PI * 40;
        const offset = circumference - (circumference * healthScore / 100);
        circle.style.strokeDashoffset = offset;
        
        // Update color based on health
        if (healthScore >= 90) {
            circle.style.stroke = '#10b981';
        } else if (healthScore >= 70) {
            circle.style.stroke = '#f59e0b';
        } else {
            circle.style.stroke = '#ef4444';
        }
        
        // Update summary cards
        document.getElementById('onlineComponents').textContent = data.summary.online_components;
        document.getElementById('offlineComponents').textContent = data.summary.offline_components;
        
        // Calculate warnings (components with errors or slow response)
        const warningCount = data.components.filter(c => 
            c.status === 'error' || c.response_time_ms > 1000
        ).length;
        document.getElementById('warningComponents').textContent = warningCount;
        
        // Calculate average response time
        const avgResponseTime = data.components.reduce((sum, c) => sum + c.response_time_ms, 0) / data.components.length;
        document.getElementById('avgResponseTime').textContent = Math.round(avgResponseTime) + 'ms';
    }

    updateComponentsGrid(components) {
        const grid = document.getElementById('componentsGrid');
        grid.innerHTML = '';
        
        components.forEach(component => {
            const card = this.createComponentCard(component);
            grid.appendChild(card);
        });
    }

    createComponentCard(component) {
        const card = document.createElement('div');
        card.className = `component-card ${component.status}`;
        card.setAttribute('data-component', component.name);
        
        const statusIcon = {
            'online': '🟢',
            'offline': '🔴',
            'error': '⚠️',
            'unknown': '❓'
        };
        
        const statusColor = {
            'online': 'online',
            'offline': 'offline',
            'error': 'warning',
            'unknown': 'warning'
        };
        
        card.innerHTML = `
            <div class="component-header">
                <div class="component-name">${component.name}</div>
                <div class="component-status ${statusColor[component.status]}">
                    ${statusIcon[component.status]} ${component.status.toUpperCase()}
                </div>
            </div>
            <div class="component-details">
                <div class="component-metric">
                    <span class="metric-label">Type:</span>
                    <span class="metric-value">${component.type}</span>
                </div>
                <div class="component-metric">
                    <span class="metric-label">Response Time:</span>
                    <span class="metric-value">${component.response_time_ms}ms</span>
                </div>
                <div class="component-metric">
                    <span class="metric-label">Last Check:</span>
                    <span class="metric-value">${this.formatTimestamp(component.last_check)}</span>
                </div>
                ${component.metadata.active_connections ? `
                    <div class="component-metric">
                        <span class="metric-label">Connections:</span>
                        <span class="metric-value">${component.metadata.active_connections}/${component.metadata.total_connections}</span>
                    </div>
                ` : ''}
                ${component.metadata.is_in_recovery !== undefined ? `
                    <div class="component-metric">
                        <span class="metric-label">Role:</span>
                        <span class="metric-value">${component.metadata.is_in_recovery ? 'Replica' : 'Master'}</span>
                    </div>
                ` : ''}
            </div>
            ${component.error_message ? `
                <div class="component-error">
                    Error: ${component.error_message}
                </div>
            ` : ''}
        `;
        
        // Add click handler for modal
        card.addEventListener('click', () => this.showComponentDetails(component));
        
        return card;
    }

    updateRecentEvents(events) {
        const container = document.getElementById('eventsContainer');
        container.innerHTML = '';
        
        if (events.length === 0) {
            container.innerHTML = `
                <div class="event-item">
                    <div class="event-content">
                        <div class="event-message">No recent events</div>
                        <div class="event-meta">
                            <span>All systems operating normally</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        events.forEach(event => {
            const eventElement = this.createEventElement(event);
            container.appendChild(eventElement);
        });
    }

    createEventElement(event) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event-item';
        eventDiv.setAttribute('data-severity', event.severity);
        
        eventDiv.innerHTML = `
            <div class="event-severity ${event.severity}"></div>
            <div class="event-content">
                <div class="event-message">${event.message}</div>
                <div class="event-meta">
                    <span>Component: ${event.component}</span>
                    <span>Type: ${event.type}</span>
                </div>
            </div>
            <div class="event-timestamp">${this.formatTimestamp(event.timestamp)}</div>
        `;
        
        return eventDiv;
    }

    showComponentDetails(component) {
        const modal = document.getElementById('componentModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        
        title.textContent = `${component.name} Details`;
        
        body.innerHTML = `
            <div class="component-details-grid">
                <div class="detail-section">
                    <h4>General Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Component Name:</span>
                        <span class="detail-value">${component.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">${component.type}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value status-${component.status}">${component.status.toUpperCase()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Response Time:</span>
                        <span class="detail-value">${component.response_time_ms}ms</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Check:</span>
                        <span class="detail-value">${this.formatTimestamp(component.last_check)}</span>
                    </div>
                </div>
                
                ${component.metadata && Object.keys(component.metadata).length > 0 ? `
                    <div class="detail-section">
                        <h4>Metadata</h4>
                        ${Object.entries(component.metadata).map(([key, value]) => `
                            <div class="detail-item">
                                <span class="detail-label">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                                <span class="detail-value">${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${component.error_message ? `
                    <div class="detail-section">
                        <h4>Error Details</h4>
                        <div class="error-message">${component.error_message}</div>
                    </div>
                ` : ''}
            </div>
        `;
        
        modal.classList.add('active');
    }

    async loadHistoricalData(hours = 1) {
        try {
            const response = await fetch(`/api/cluster_history?hours=${hours}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.updateHistoricalCharts(data.data);
            } else {
                throw new Error(data.message || 'Failed to load historical data');
            }
        } catch (error) {
            console.error('Failed to load historical data:', error);
            this.showNotification('Failed to load historical data', 'error');
        }
    }

    updateHistoricalCharts(historyData) {
        // Process data for charts
        const timePoints = [];
        const componentData = {
            'pg-master': { response_times: [], availability: 0 },
            'pg-replica': { response_times: [], availability: 0 },
            'pgpool': { response_times: [], availability: 0 }
        };
        
        // Group data by timestamp
        const dataByTime = {};
        historyData.forEach(record => {
            const timestamp = new Date(record.timestamp).toLocaleTimeString();
            if (!dataByTime[timestamp]) {
                dataByTime[timestamp] = {};
            }
            dataByTime[timestamp][record.component] = record;
        });
        
        // Build time series data
        Object.entries(dataByTime).forEach(([timestamp, components]) => {
            timePoints.push(timestamp);
            
            Object.keys(componentData).forEach(componentName => {
                const record = components[componentName];
                if (record) {
                    componentData[componentName].response_times.push(record.response_time_ms);
                } else {
                    componentData[componentName].response_times.push(null);
                }
            });
        });
        
        // Update response time chart
        const responseChart = this.charts.responseTime;
        responseChart.data.labels = timePoints.slice(-20); // Last 20 points
        responseChart.data.datasets[0].data = componentData['pg-master'].response_times.slice(-20);
        responseChart.data.datasets[1].data = componentData['pg-replica'].response_times.slice(-20);
        responseChart.data.datasets[2].data = componentData['pgpool'].response_times.slice(-20);
        responseChart.update();
        
        // Calculate availability percentages
        Object.keys(componentData).forEach((componentName, index) => {
            const records = historyData.filter(r => r.component === componentName);
            const onlineCount = records.filter(r => r.status === 'online').length;
            const availability = records.length > 0 ? (onlineCount / records.length) * 100 : 100;
            componentData[componentName].availability = Math.round(availability);
        });
        
        // Update availability chart
        const availabilityChart = this.charts.availability;
        availabilityChart.data.datasets[0].data = [
            componentData['pg-master'].availability,
            componentData['pg-replica'].availability,
            componentData['pgpool'].availability
        ];
        availabilityChart.update();
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshClusterStatus').addEventListener('click', () => {
            this.loadClusterStatus();
            this.loadHistoricalData(this.currentTimeRange);
            this.showNotification('Cluster status refreshed', 'success');
        });
        
        // Export button
        document.getElementById('exportClusterReport').addEventListener('click', () => {
            this.exportClusterReport();
        });
        
        // Time range buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const hours = parseInt(e.target.dataset.hours);
                this.changeTimeRange(hours);
            });
        });
        
        // Event filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const severity = e.target.dataset.severity;
                this.filterEvents(severity);
            });
        });
        
        // Modal close
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('componentModal').classList.remove('active');
        });
        
        // Modal overlay click
        document.getElementById('componentModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                document.getElementById('componentModal').classList.remove('active');
            }
        });
    }

    changeTimeRange(hours) {
        this.currentTimeRange = hours;
        
        // Update active button
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Load historical data
        this.loadHistoricalData(hours);
        
        this.showNotification(`Time range changed to ${hours} hour(s)`, 'info');
    }

    filterEvents(severity) {
        this.currentEventFilter = severity;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Filter events
        const events = document.querySelectorAll('.event-item');
        events.forEach(event => {
            const eventSeverity = event.getAttribute('data-severity');
            if (severity === 'all' || eventSeverity === severity) {
                event.style.display = 'flex';
            } else {
                event.style.display = 'none';
            }
        });
        
        this.showNotification(`Events filtered by: ${severity}`, 'info');
    }

    async exportClusterReport() {
        try {
            const response = await fetch('/api/cluster_status');
            const data = await response.json();
            
            if (data.status === 'success') {
                const report = {
                    timestamp: new Date().toISOString(),
                    cluster_health: data.data.cluster_health,
                    components: data.data.components,
                    recent_events: data.data.recent_events,
                    summary: data.data.summary
                };
                
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cluster-status-report-${new Date().toISOString()}.json`;
                a.click();
                
                this.showNotification('Cluster report exported', 'success');
            }
        } catch (error) {
            console.error('Failed to export report:', error);
            this.showNotification('Failed to export report', 'error');
        }
    }

    updateLastCheckTime(timestamp) {
        const element = document.getElementById('lastUpdateTime');
        element.textContent = this.formatTimestamp(timestamp);
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
        return date.toLocaleDateString();
    }

    startMonitoring() {
        if (this.monitoring) return;
        
        this.monitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.loadClusterStatus();
            this.loadHistoricalData(this.currentTimeRange);
        }, this.updateInterval);
        
        console.log('Cluster status monitoring started');
    }

    stopMonitoring() {
        if (!this.monitoring) return;
        
        this.monitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('Cluster status monitoring stopped');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} show`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize cluster status monitor when DOM is loaded
let clusterStatusMonitor;
document.addEventListener('DOMContentLoaded', () => {
    clusterStatusMonitor = new ClusterStatusMonitor();
    clusterStatusMonitor.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (clusterStatusMonitor) {
        clusterStatusMonitor.stopMonitoring();
    }
});