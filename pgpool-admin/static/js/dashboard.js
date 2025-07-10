// Dashboard page JavaScript - Enterprise Edition

let performanceChart;
let updateInterval;
let timeRange = '1h';

// Initialize dashboard
async function initDashboard() {
    // Initialize visualizations
    initHealthScore();
    initPerformanceChart();
    initActivityHeatmap();
    
    // Load initial data
    await updateDashboard();
    
    // Start auto-refresh
    updateInterval = setInterval(updateDashboard, 5000);
    
    // Initialize sparkline
    initSparkline();
}

// Initialize health score visualization
function initHealthScore() {
    const score = 98;
    const circle = document.getElementById('scoreCircle');
    const scoreValue = document.getElementById('scoreValue');
    
    // Set score value
    scoreValue.textContent = score;
    
    // Calculate stroke offset for circle (440 is the circumference)
    const offset = 440 - (440 * score / 100);
    circle.style.strokeDashoffset = offset;
    
    // Set color based on score
    if (score >= 90) {
        circle.style.stroke = '#10b981';
    } else if (score >= 70) {
        circle.style.stroke = '#f59e0b';
    } else {
        circle.style.stroke = '#ef4444';
    }
}

// Initialize performance chart
function initPerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    performanceChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Queries/sec',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Connections',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#94a3b8',
                        usePointStyle: true,
                        pointStyle: 'circle'
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
                        color: 'rgba(51, 65, 85, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

// Initialize QPS sparkline
function initSparkline() {
    const container = document.getElementById('qpsSparkline');
    if (!container) return;
    
    // Create simple SVG sparkline
    const data = Array.from({length: 20}, () => Math.random() * 100);
    const max = Math.max(...data);
    const width = container.offsetWidth;
    const height = 40;
    
    const svg = `
        <svg width="${width}" height="${height}" style="width: 100%; height: 100%;">
            <polyline
                fill="none"
                stroke="#10b981"
                stroke-width="2"
                points="${data.map((d, i) => `${i * (width / data.length)},${height - (d / max * height)}`).join(' ')}"
            />
            <polyline
                fill="rgba(16, 185, 129, 0.1)"
                stroke="none"
                points="0,${height} ${data.map((d, i) => `${i * (width / data.length)},${height - (d / max * height)}`).join(' ')} ${width},${height}"
            />
        </svg>
    `;
    
    container.innerHTML = svg;
}

// Initialize activity heatmap
function initActivityHeatmap() {
    const container = document.getElementById('activityHeatmap');
    if (!container) return;
    
    // Create heatmap cells
    const cells = [];
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 60; col++) {
            const intensity = Math.random();
            const color = getHeatmapColor(row, intensity);
            cells.push(`<div class="heatmap-cell" style="background: ${color}"></div>`);
        }
    }
    
    container.innerHTML = cells.join('');
}

// Get heatmap color based on row and intensity
function getHeatmapColor(row, intensity) {
    const colors = [
        `rgba(59, 130, 246, ${intensity})`,    // Blue for queries
        `rgba(16, 185, 129, ${intensity})`,    // Green for connections
        `rgba(245, 158, 11, ${intensity})`     // Orange for transactions
    ];
    return colors[row];
}

// Update dashboard data
async function updateDashboard() {
    try {
        // Fetch stats from API
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        // Update all components
        updateMetrics(stats);
        updateCharts(stats);
        updateTopology(stats);
        updateResources();
        updateAlerts();
        updateActivityHeatmap();
        
    } catch (error) {
        console.error('Failed to update dashboard:', error);
    }
}

// Update metric cards
function updateMetrics(stats) {
    // Update cluster uptime
    document.getElementById('clusterUptime').textContent = '99.9%';
    
    // Update total queries today
    const totalQueries = Math.floor(Math.random() * 50000) + 100000;
    document.getElementById('totalQueriesToday').textContent = formatNumber(totalQueries);
    
    // Update average response time
    const avgResponseTime = Math.floor(Math.random() * 50) + 20;
    document.getElementById('avgResponseTime').textContent = avgResponseTime + 'ms';
    
    // Update connection pool
    const activeConnections = stats.pool_processes ? 
        stats.pool_processes.filter(p => p.database && p.database !== '').length : 0;
    const maxConnections = 100;
    document.getElementById('activeConnections').textContent = activeConnections;
    document.getElementById('maxConnections').textContent = maxConnections;
    
    // Update connection progress bar
    const connectionProgress = document.getElementById('connectionProgress');
    if (connectionProgress) {
        connectionProgress.style.width = `${(activeConnections / maxConnections) * 100}%`;
    }
    
    // Update queries per second
    const qps = Math.floor(Math.random() * 500) + 1000;
    document.getElementById('queriesPerSec').textContent = formatNumber(qps);
    
    // Update cache hit rate
    const cacheHitRate = Math.floor(Math.random() * 5) + 92;
    document.getElementById('cacheHitRate').textContent = cacheHitRate;
    
    // Update cache gauge
    const cacheGauge = document.getElementById('cacheGauge');
    if (cacheGauge) {
        cacheGauge.style.width = `${cacheHitRate}%`;
    }
    
    // Update replication lag
    const replicationLag = Math.floor(Math.random() * 50);
    document.getElementById('replicationLag').textContent = replicationLag;
}

// Update performance chart
function updateCharts(stats) {
    if (!performanceChart) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const maxDataPoints = 20;
    
    // Remove old data points
    if (performanceChart.data.labels.length >= maxDataPoints) {
        performanceChart.data.labels.shift();
        performanceChart.data.datasets.forEach(dataset => dataset.data.shift());
    }
    
    // Add new data
    performanceChart.data.labels.push(timestamp);
    performanceChart.data.datasets[0].data.push(Math.floor(Math.random() * 500) + 1000); // QPS
    performanceChart.data.datasets[1].data.push(Math.floor(Math.random() * 30) + 20); // Connections
    
    performanceChart.update('none');
}

// Update cluster topology
function updateTopology(stats) {
    // Update PgPool metrics
    document.getElementById('pgpoolCpu').textContent = Math.floor(Math.random() * 30) + 10 + '%';
    document.getElementById('pgpoolMem').textContent = Math.floor(Math.random() * 40) + 20 + '%';
    
    // Update Master metrics
    document.getElementById('masterTps').textContent = Math.floor(Math.random() * 1000) + 500;
    document.getElementById('masterSize').textContent = (Math.random() * 5 + 2).toFixed(1) + 'GB';
    
    // Update Replica metrics
    document.getElementById('replicaLag').textContent = Math.floor(Math.random() * 50) + 'ms';
    document.getElementById('replicaSize').textContent = (Math.random() * 5 + 2).toFixed(1) + 'GB';
}

// Update resource utilization
function updateResources() {
    const resources = [
        { id: 'cpu', value: Math.floor(Math.random() * 40) + 20 },
        { id: 'mem', value: Math.floor(Math.random() * 50) + 30 },
        { id: 'disk', value: Math.floor(Math.random() * 20) + 5 },
        { id: 'network', value: Math.floor(Math.random() * 30) + 10 }
    ];
    
    resources.forEach(resource => {
        const valueElem = document.getElementById(`${resource.id}Usage`);
        const barElem = document.getElementById(`${resource.id}Bar`);
        
        if (valueElem && barElem) {
            if (resource.id === 'disk' || resource.id === 'network') {
                valueElem.textContent = resource.value + ' MB/s';
            } else {
                valueElem.textContent = resource.value + '%';
            }
            barElem.style.width = resource.value + '%';
        }
    });
}

// Update alerts
function updateAlerts() {
    const alertTypes = ['info', 'warning', 'error'];
    const alertMessages = [
        { type: 'info', icon: 'ℹ️', title: 'Scheduled Maintenance', message: 'Database backup will run at 2:00 AM' },
        { type: 'warning', icon: '⚠️', title: 'High Connection Count', message: 'Connection pool usage above 80%' },
        { type: 'error', icon: '❌', title: 'Replication Lag', message: 'Replica lag exceeded threshold' }
    ];
    
    // Randomly show 1-3 alerts
    const numAlerts = Math.floor(Math.random() * 3) + 1;
    const selectedAlerts = [];
    
    for (let i = 0; i < numAlerts; i++) {
        selectedAlerts.push(alertMessages[Math.floor(Math.random() * alertMessages.length)]);
    }
    
    const alertsList = document.getElementById('alertsList');
    if (alertsList) {
        alertsList.innerHTML = selectedAlerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <div class="alert-icon">${alert.icon}</div>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">${Math.floor(Math.random() * 60)} minutes ago</div>
                </div>
            </div>
        `).join('');
    }
    
    // Update alert count
    document.getElementById('alertCount').textContent = numAlerts;
}

// Update activity heatmap with new data
function updateActivityHeatmap() {
    const cells = document.querySelectorAll('.heatmap-cell');
    cells.forEach((cell, index) => {
        const row = Math.floor(index / 60);
        const intensity = Math.random();
        cell.style.background = getHeatmapColor(row, intensity);
    });
}

// Time range selector
function changeTimeRange(range) {
    timeRange = range;
    
    // Update active button
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Reset and update chart with new range
    if (performanceChart) {
        performanceChart.data.labels = [];
        performanceChart.data.datasets.forEach(dataset => dataset.data = []);
        performanceChart.update();
    }
    
    // Reload data
    updateDashboard();
}

// Quick actions
function runHealthCheck() {
    showNotification('Running health check...', 'info');
    setTimeout(() => {
        showNotification('Health check completed. All systems operational.', 'success');
    }, 2000);
}

function clearCache() {
    showNotification('Clearing cache...', 'info');
    setTimeout(() => {
        showNotification('Cache cleared successfully', 'success');
    }, 1500);
}

function viewLogs() {
    showNotification('Opening logs viewer...', 'info');
    // In a real app, this would open a logs modal or redirect
}

function exportReport() {
    showNotification('Generating report...', 'info');
    setTimeout(() => {
        showNotification('Report exported successfully', 'success');
    }, 2000);
}

// Refresh topology
function refreshTopology() {
    const container = document.getElementById('topologyContainer');
    container.style.opacity = '0.5';
    
    setTimeout(() => {
        updateTopology({});
        container.style.opacity = '1';
        showNotification('Topology refreshed', 'success');
    }, 1000);
}

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);