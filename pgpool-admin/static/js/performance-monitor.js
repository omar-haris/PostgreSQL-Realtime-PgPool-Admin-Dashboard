// Enterprise Performance Monitoring System
// OPENSEWAVE PgPool Admin Dashboard

class PerformanceMonitor {
    constructor() {
        this.charts = {};
        this.metrics = {};
        this.alerts = [];
        this.updateInterval = 5000; // 5 seconds
        this.historyLimit = 100;
        this.thresholds = {
            cpu: { warning: 70, critical: 90 },
            memory: { warning: 80, critical: 95 },
            connections: { warning: 80, critical: 95 },
            queryTime: { warning: 1000, critical: 5000 }, // ms
            replicationLag: { warning: 100, critical: 1000 }, // bytes
            cacheHitRate: { warning: 90, critical: 80 }, // reverse - lower is worse
            errorRate: { warning: 0.01, critical: 0.05 } // percentage
        };
    }

    async initialize() {
        console.log('Initializing Performance Monitor...');
        
        // Initialize all monitoring components
        this.initializeCharts();
        this.initializeMetrics();
        this.initializeAlerts();
        this.initializeWebSocket();
        
        // Load initial data
        await this.loadDashboardData();
        
        // Start monitoring
        this.startMonitoring();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    initializeCharts() {
        // Connection Pool Chart
        this.charts.connectionPool = new Chart(document.getElementById('connectionPoolChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Active Connections',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Idle Connections',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Waiting Connections',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: this.getChartOptions('Connection Pool Status')
        });

        // Query Performance Chart
        this.charts.queryPerformance = new Chart(document.getElementById('queryPerformanceChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Queries/sec',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                }, {
                    label: 'Avg Response Time (ms)',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }]
            },
            options: this.getChartOptions('Query Performance Metrics', true)
        });

        // Resource Utilization Chart
        this.charts.resourceUtilization = new Chart(document.getElementById('resourceChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPU %',
                    data: [],
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Memory %',
                    data: [],
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Disk I/O %',
                    data: [],
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: this.getChartOptions('Resource Utilization')
        });

        // Replication Status Chart
        this.charts.replication = new Chart(document.getElementById('replicationChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Master', 'Replica 1', 'Replica 2'],
                datasets: [{
                    label: 'Replication Lag (MB)',
                    data: [0, 0, 0],
                    backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6'],
                    borderColor: ['#059669', '#2563eb', '#7c3aed'],
                    borderWidth: 2
                }]
            },
            options: this.getChartOptions('Replication Status', false, true)
        });

        // Cache Performance Gauge
        this.initializeCacheGauge();
        
        // Error Rate Chart
        this.charts.errorRate = new Chart(document.getElementById('errorRateChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Error Rate %',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: this.getChartOptions('Error Rate')
        });
    }

    initializeCacheGauge() {
        const canvas = document.getElementById('cacheHitGauge');
        const ctx = canvas.getContext('2d');
        this.charts.cacheGauge = {
            ctx: ctx,
            canvas: canvas,
            draw: (percentage) => {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radius = 80;
                
                // Clear canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw background arc
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, Math.PI * 0.75, Math.PI * 2.25);
                ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
                ctx.lineWidth = 20;
                ctx.stroke();
                
                // Draw percentage arc
                const endAngle = Math.PI * 0.75 + (Math.PI * 1.5 * percentage / 100);
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, Math.PI * 0.75, endAngle);
                ctx.strokeStyle = this.getGaugeColor(percentage);
                ctx.lineWidth = 20;
                ctx.lineCap = 'round';
                ctx.stroke();
                
                // Draw text
                ctx.fillStyle = '#f1f5f9';
                ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(percentage + '%', centerX, centerY - 10);
                
                ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText('Cache Hit Rate', centerX, centerY + 20);
            }
        };
    }

    getGaugeColor(percentage) {
        if (percentage >= 95) return '#10b981';
        if (percentage >= 90) return '#3b82f6';
        if (percentage >= 80) return '#f59e0b';
        return '#ef4444';
    }

    getChartOptions(title, dualAxis = false, horizontal = false) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
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
                    cornerRadius: 8,
                    displayColors: true
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

        if (dualAxis) {
            options.scales.y1 = {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                    color: 'rgba(51, 65, 85, 0.3)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b'
                },
                beginAtZero: true
            };
        }

        if (horizontal) {
            options.indexAxis = 'y';
        }

        return options;
    }

    initializeMetrics() {
        this.metrics = {
            totalQueries: 0,
            activeConnections: 0,
            qps: 0,
            avgResponseTime: 0,
            cacheHitRate: 0,
            errorCount: 0,
            replicationLag: 0,
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: 0
        };
    }

    initializeAlerts() {
        this.alertContainer = document.getElementById('performanceAlerts');
    }

    initializeWebSocket() {
        // In production, use WebSocket for real-time updates
        // For now, we'll use polling
        console.log('WebSocket initialization skipped - using polling');
    }

    async loadDashboardData() {
        try {
            // Fetch comprehensive performance metrics
            const metricsResponse = await this.fetchAPI('/api/performance_metrics');
            
            if (metricsResponse && metricsResponse.status === 'success') {
                const metrics = metricsResponse.data;
                
                // Also fetch additional data for completeness
                const [stats, poolProcesses] = await Promise.all([
                    this.fetchAPI('/api/stats'),
                    this.fetchAPI('/api/pool_processes')
                ]);
                
                // Process all data
                this.processPerformanceData({
                    metrics,
                    stats,
                    poolProcesses
                });
            } else {
                throw new Error('Failed to fetch performance metrics');
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showAlert('Failed to load performance data', 'error');
        }
    }

    async fetchAPI(endpoint) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API fetch error for ${endpoint}:`, error);
            return null;
        }
    }

    processPerformanceData(data) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Process metrics data from new API
        if (data.metrics) {
            const metrics = data.metrics;
            
            // Process activity stats
            if (metrics.activity) {
                const activity = metrics.activity;
                const active = activity.active_queries || 0;
                const idle = activity.idle_connections || 0;
                const waiting = activity.waiting_queries || 0;
                const total = activity.total_connections || 0;
                
                this.updateConnectionPoolChart(timestamp, active, idle, waiting);
                this.updateMetric('activeConnections', active);
                this.updateMetric('totalConnections', total);
                
                // Update connection pool progress
                const maxConnections = 100; // Configure based on your pool size
                const usagePercent = (active / maxConnections) * 100;
                this.updateProgressBar('connectionPoolProgress', usagePercent);
                this.checkThreshold('connections', usagePercent);
                
                // Update average response time
                const avgTime = activity.avg_query_time ? Math.round(activity.avg_query_time * 1000) : 0;
                this.updateMetric('avgResponseTime', avgTime);
                this.checkThreshold('queryTime', avgTime);
            }
            
            // Process database stats
            if (metrics.database) {
                const cacheHitRate = Math.round(metrics.database.cache_hit_ratio || 0);
                this.updateCacheGauge(cacheHitRate);
                this.updateMetric('cacheHitRate', cacheHitRate);
                this.checkThreshold('cacheHitRate', cacheHitRate);
                
                // Update cache gauge bar
                const gaugeBar = document.getElementById('cacheHitGaugeBar');
                if (gaugeBar) {
                    gaugeBar.style.width = cacheHitRate + '%';
                }
            }
            
            // Process replication data
            if (metrics.replication && metrics.replication.length > 0) {
                this.updateReplicationChart(metrics.replication);
                
                // Calculate max lag
                const maxLag = Math.max(...metrics.replication.map(r => r.replay_lag_bytes || 0));
                this.updateMetric('replicationLag', maxLag);
                this.checkThreshold('replicationLag', maxLag);
                
                // Update replication status
                const replStatus = document.querySelector('.replication-status');
                if (replStatus) {
                    if (maxLag > 10485760) { // 10MB
                        replStatus.className = 'replication-status lagging';
                        replStatus.textContent = 'Lagging';
                    } else {
                        replStatus.className = 'replication-status online';
                        replStatus.textContent = 'Synchronized';
                    }
                }
            }
            
            // Process resource utilization
            if (metrics.resources) {
                const resources = metrics.resources;
                const cpu = Math.round(resources.cpu_percent);
                const memory = Math.round(resources.memory_percent);
                const diskIO = Math.round(resources.disk_io_percent);
                
                this.updateResourceChart(timestamp, cpu, memory, diskIO);
                this.updateMetric('cpuUsage', cpu);
                this.updateMetric('memoryUsage', memory);
                this.updateMetric('diskIO', diskIO);
                
                // Update resource bars
                this.updateResourceBar('cpu', cpu);
                this.updateResourceBar('mem', memory);
                this.updateResourceBar('disk', diskIO);
                
                this.checkThreshold('cpu', cpu);
                this.checkThreshold('memory', memory);
            }
            
            // Process error rate
            const errorRate = metrics.error_rate || 0;
            this.updateErrorRateChart(timestamp, errorRate);
            this.updateMetric('errorRate', errorRate.toFixed(2) + '%');
            this.checkThreshold('errorRate', errorRate);
            
            // Process summary metrics
            if (metrics.summary) {
                const summary = metrics.summary;
                this.updateMetric('qps', summary.queries_per_second);
                this.updateMetric('totalQueries', summary.total_queries_today);
                
                // Update QPS chart
                const avgTime = metrics.activity ? Math.round((metrics.activity.avg_query_time || 0) * 1000) : 50;
                this.updateQueryPerformanceChart(timestamp, summary.queries_per_second, avgTime);
                
                // Update performance score
                this.updatePerformanceScore(summary.performance_score);
            }
        }
        
        // Process connection pool data from legacy API if needed
        if (data.poolProcesses && data.poolProcesses.data) {
            const processes = data.poolProcesses.data;
            // Additional processing if needed
        }

        // Update summary metrics
        this.updateSummaryMetrics();
        
        // Update alert count
        document.getElementById('alertCount').textContent = this.alerts.length;
    }

    updateConnectionPoolChart(timestamp, active, idle, waiting) {
        const chart = this.charts.connectionPool;
        
        // Add new data
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(active);
        chart.data.datasets[1].data.push(idle);
        chart.data.datasets[2].data.push(waiting);
        
        // Remove old data if exceeds limit
        if (chart.data.labels.length > this.historyLimit) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        
        chart.update('none');
    }

    updateQueryPerformanceChart(timestamp, qps, avgTime) {
        const chart = this.charts.queryPerformance;
        
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(qps);
        chart.data.datasets[1].data.push(avgTime);
        
        if (chart.data.labels.length > this.historyLimit) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        
        chart.update('none');
    }

    updateResourceChart(timestamp, cpu, memory, diskIO) {
        const chart = this.charts.resourceUtilization;
        
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(cpu);
        chart.data.datasets[1].data.push(memory);
        chart.data.datasets[2].data.push(diskIO);
        
        if (chart.data.labels.length > this.historyLimit) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        
        chart.update('none');
    }

    updateReplicationChart(replicas) {
        const chart = this.charts.replication;
        const labels = ['Master'];
        const data = [0];
        
        replicas.forEach((replica, index) => {
            labels.push(`Replica ${index + 1}`);
            data.push((replica.replay_lag_bytes || 0) / 1024 / 1024); // Convert to MB
        });
        
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update('none');
    }

    updateCacheGauge(percentage) {
        this.charts.cacheGauge.draw(percentage);
    }

    updateErrorRateChart(timestamp, errorRate) {
        const chart = this.charts.errorRate;
        
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(errorRate * 100); // Convert to percentage
        
        if (chart.data.labels.length > this.historyLimit) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        
        chart.update('none');
    }

    updateMetric(name, value) {
        this.metrics[name] = value;
        const element = document.getElementById(`metric-${name}`);
        if (element) {
            if (name === 'avgResponseTime') {
                element.textContent = value + 'ms';
            } else if (name === 'qps' || name === 'totalQueries') {
                element.textContent = this.formatNumber(value);
            } else if (name === 'cacheHitRate' || name === 'cpuUsage' || name === 'memoryUsage') {
                element.textContent = value + '%';
            } else if (name === 'replicationLag') {
                element.textContent = this.formatBytes(value);
            } else if (name === 'errorRate') {
                element.textContent = value;
            } else {
                element.textContent = value;
            }
        }
    }

    updateResourceBar(resourceType, percentage) {
        const barElement = document.getElementById(`${resourceType}Bar`);
        if (barElement) {
            barElement.style.width = percentage + '%';
        }
    }

    updateProgressBar(id, percentage) {
        const element = document.getElementById(id);
        if (element) {
            element.style.width = percentage + '%';
            
            // Change color based on percentage
            if (percentage >= 90) {
                element.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
            } else if (percentage >= 70) {
                element.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
            } else {
                element.style.background = 'linear-gradient(90deg, #10b981, #059669)';
            }
        }
    }

    updateSummaryMetrics() {
        // Update performance score
        const score = this.calculatePerformanceScore();
        this.updatePerformanceScore(score);
        
        // Update trends
        this.updateTrends();
    }

    calculatePerformanceScore() {
        // Calculate weighted performance score
        const weights = {
            cpu: 0.2,
            memory: 0.2,
            cacheHitRate: 0.2,
            queryTime: 0.15,
            errorRate: 0.15,
            replicationLag: 0.1
        };
        
        let score = 100;
        
        // Deduct points based on threshold violations
        if (this.metrics.cpuUsage > this.thresholds.cpu.warning) {
            score -= (this.metrics.cpuUsage - this.thresholds.cpu.warning) * weights.cpu;
        }
        
        if (this.metrics.memoryUsage > this.thresholds.memory.warning) {
            score -= (this.metrics.memoryUsage - this.thresholds.memory.warning) * weights.memory;
        }
        
        if (this.metrics.cacheHitRate < this.thresholds.cacheHitRate.warning) {
            score -= (this.thresholds.cacheHitRate.warning - this.metrics.cacheHitRate) * weights.cacheHitRate;
        }
        
        return Math.max(0, Math.round(score));
    }

    updatePerformanceScore(score) {
        const element = document.getElementById('performanceScore');
        const circle = document.getElementById('performanceScoreCircle');
        
        if (element && circle) {
            element.textContent = score;
            
            // Update circle
            const circumference = 2 * Math.PI * 70; // radius = 70
            const offset = circumference - (circumference * score / 100);
            circle.style.strokeDashoffset = offset;
            
            // Update color
            if (score >= 90) {
                circle.style.stroke = '#10b981';
            } else if (score >= 70) {
                circle.style.stroke = '#f59e0b';
            } else {
                circle.style.stroke = '#ef4444';
            }
        }
    }

    updateTrends() {
        // Calculate and display trend indicators
        const trends = {
            qps: this.calculateTrend('qps'),
            responseTime: this.calculateTrend('avgResponseTime'),
            errorRate: this.calculateTrend('errorRate')
        };
        
        Object.keys(trends).forEach(key => {
            const element = document.getElementById(`trend-${key}`);
            if (element) {
                const trend = trends[key];
                element.className = `trend-indicator ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'}`;
                element.textContent = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
            }
        });
    }

    calculateTrend(metric) {
        // Simple trend calculation (would be more sophisticated in production)
        return Math.random() > 0.5 ? 1 : -1;
    }

    checkThreshold(metric, value) {
        const threshold = this.thresholds[metric];
        if (!threshold) return;
        
        let level = 'normal';
        let message = '';
        
        if (metric === 'cacheHitRate') {
            // Reverse logic for cache hit rate
            if (value < threshold.critical) {
                level = 'critical';
                message = `Cache hit rate critically low: ${value}%`;
            } else if (value < threshold.warning) {
                level = 'warning';
                message = `Cache hit rate below optimal: ${value}%`;
            }
        } else {
            if (value > threshold.critical) {
                level = 'critical';
                message = `${metric} critical: ${value}`;
            } else if (value > threshold.warning) {
                level = 'warning';
                message = `${metric} warning: ${value}`;
            }
        }
        
        if (level !== 'normal') {
            this.showAlert(message, level);
        }
    }

    showAlert(message, level) {
        const alert = {
            id: Date.now(),
            message,
            level,
            timestamp: new Date()
        };
        
        this.alerts.unshift(alert);
        
        // Keep only recent alerts
        if (this.alerts.length > 10) {
            this.alerts.pop();
        }
        
        this.renderAlerts();
    }

    renderAlerts() {
        if (!this.alertContainer) return;
        
        const alertsHtml = this.alerts.slice(0, 5).map(alert => `
            <div class="performance-alert ${alert.level}">
                <div class="alert-icon">${this.getAlertIcon(alert.level)}</div>
                <div class="alert-content">
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">${this.formatTime(alert.timestamp)}</div>
                </div>
                <button class="alert-close" onclick="performanceMonitor.dismissAlert(${alert.id})">×</button>
            </div>
        `).join('');
        
        this.alertContainer.innerHTML = alertsHtml;
    }

    getAlertIcon(level) {
        switch (level) {
            case 'critical': return '🚨';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '✓';
        }
    }

    dismissAlert(id) {
        this.alerts = this.alerts.filter(alert => alert.id !== id);
        this.renderAlerts();
    }

    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            this.loadDashboardData();
        }, this.updateInterval);
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshPerformance');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadDashboardData();
                this.showNotification('Performance data refreshed', 'success');
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportPerformance');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportPerformanceReport();
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('performanceSettings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettingsModal();
            });
        }

        // Time range selector
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = e.target.dataset.range;
                this.changeTimeRange(range);
            });
        });
    }

    changeTimeRange(range) {
        // Update active button
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Clear and reload data for new range
        this.clearCharts();
        this.loadDashboardData();
        
        this.showNotification(`Time range changed to ${range}`, 'info');
    }

    clearCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart.data) {
                chart.data.labels = [];
                chart.data.datasets.forEach(dataset => {
                    dataset.data = [];
                });
                chart.update();
            }
        });
    }

    exportPerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            alerts: this.alerts,
            performanceScore: this.calculatePerformanceScore()
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString()}.json`;
        a.click();
        
        this.showNotification('Performance report exported', 'success');
    }

    showSettingsModal() {
        // TODO: Implement settings modal
        this.showNotification('Settings modal coming soon', 'info');
    }

    // Utility functions
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
        return date.toLocaleDateString();
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

// Initialize performance monitor when DOM is loaded
let performanceMonitor;
document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor = new PerformanceMonitor();
    performanceMonitor.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (performanceMonitor) {
        performanceMonitor.stopMonitoring();
    }
});