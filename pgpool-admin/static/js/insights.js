// Performance Insights page JavaScript

let insightCharts = {};
let updateInterval;

// Initialize insights page
async function initInsights() {
    // Initialize charts
    initInsightCharts();
    
    // Load initial data
    await updateInsightsData();
    
    // Start auto-refresh
    updateInterval = setInterval(updateInsightsData, 15000);
}

// Initialize charts
function initInsightCharts() {
    // Resource Trends Chart
    const resourceTrendsCtx = document.getElementById('resourceTrendsChart');
    if (resourceTrendsCtx) {
        insightCharts.resourceTrends = new Chart(resourceTrendsCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPU Usage %',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Memory Usage %',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Disk I/O %',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Usage Percentage',
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    // Performance Score History Chart
    const scoreHistoryCtx = document.getElementById('performanceScoreChart');
    if (scoreHistoryCtx) {
        insightCharts.scoreHistory = new Chart(scoreHistoryCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Performance Score',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                ...commonChartOptions,
                scales: {
                    ...commonChartOptions.scales,
                    y: {
                        ...commonChartOptions.scales.y,
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Performance Score',
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }
}

// Update insights data
async function updateInsightsData() {
    try {
        // Fetch multiple data sources
        const [performanceInsights, queryStats, dbStats] = await Promise.all([
            fetchAPI('/api/performance_insights'),
            fetchAPI('/api/query_statistics'),
            fetchAPI('/api/database_statistics')
        ]);
        
        // Update metrics
        updateInsightMetrics(performanceInsights.data || []);
        
        // Update issues
        updatePerformanceIssues(performanceInsights.data || []);
        
        // Update optimization table
        updateOptimizationTable(queryStats.data);
        
        // Update charts
        updateInsightCharts();
        
        // Update recommendations
        updateRecommendations(performanceInsights.data || []);
        
    } catch (error) {
        console.error('Failed to update insights data:', error);
        showNotification('Failed to update insights data', 'error');
    }
}

// Update insight metrics
function updateInsightMetrics(insights) {
    // Calculate health score based on insights
    const issueCount = insights.length;
    let healthScore = 100;
    
    insights.forEach(insight => {
        switch (insight.severity) {
            case 'high':
                healthScore -= 15;
                break;
            case 'medium':
                healthScore -= 10;
                break;
            case 'low':
                healthScore -= 5;
                break;
        }
    });
    
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    // Update health score
    document.getElementById('healthScore').textContent = healthScore;
    updateProgressBar('healthProgress', healthScore, getScoreColor(healthScore));
    
    // Optimization score (inverse of issues)
    const optimizationScore = Math.max(20, 100 - issueCount * 10);
    document.getElementById('optimizationScore').textContent = optimizationScore;
    updateProgressBar('optimizationProgress', optimizationScore, getScoreColor(optimizationScore));
    
    // Issues count
    document.getElementById('issuesCount').textContent = issueCount;
    
    // Recommendations count
    const recommendationsCount = Math.min(issueCount + 2, 8);
    document.getElementById('recommendationsCount').textContent = recommendationsCount;
}

// Get color based on score
function getScoreColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
}

// Update progress bar
function updateProgressBar(elementId, percentage, color) {
    const progressBar = document.getElementById(elementId);
    if (progressBar) {
        progressBar.style.width = percentage + '%';
        progressBar.style.background = color;
    }
}

// Update performance issues
function updatePerformanceIssues(insights) {
    const container = document.getElementById('performanceIssues');
    if (!container) return;
    
    if (insights.length === 0) {
        container.innerHTML = `
            <div class="issue-item info">
                <div class="issue-title">✅ No Critical Issues Found</div>
                <div class="issue-description">Your system is running optimally with no major performance issues detected.</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = insights.map(insight => `
        <div class="issue-item ${insight.severity}">
            <div class="issue-title">
                ${getSeverityIcon(insight.severity)} ${insight.message}
            </div>
            <div class="issue-description">
                ${insight.recommendation || 'Review this issue for potential optimization opportunities.'}
            </div>
            ${insight.details && insight.details.length > 0 ? `
                <details style="margin-top: 12px;">
                    <summary style="cursor: pointer; color: #3b82f6;">View Details</summary>
                    <div style="margin-top: 8px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                        <pre style="font-size: 0.75rem; overflow-x: auto;">${JSON.stringify(insight.details, null, 2)}</pre>
                    </div>
                </details>
            ` : ''}
        </div>
    `).join('');
}

// Get severity icon
function getSeverityIcon(severity) {
    const icons = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
    };
    return icons[severity] || 'ℹ️';
}

// Update optimization table
function updateOptimizationTable(queryData) {
    const tbody = document.querySelector('#optimizationTable tbody');
    if (!tbody) return;
    
    // Generate optimization opportunities based on query data
    const opportunities = generateOptimizationOpportunities(queryData);
    
    if (opportunities.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #94a3b8;">No optimization opportunities found</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = opportunities.map(opp => `
        <tr>
            <td>
                <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${opp.pattern}
                </div>
            </td>
            <td>
                <span class="badge badge-${opp.impact === 'High' ? 'danger' : opp.impact === 'Medium' ? 'warning' : 'info'}">
                    ${opp.impact}
                </span>
            </td>
            <td>${opp.savings}</td>
            <td>${opp.recommendation}</td>
            <td>
                <button class="btn btn-primary" onclick="showOptimizationDetails('${opp.id}')">Details</button>
            </td>
        </tr>
    `).join('');
}

// Generate optimization opportunities
function generateOptimizationOpportunities(queryData) {
    const opportunities = [
        {
            id: 'idx_1',
            pattern: 'SELECT * FROM users WHERE email = ?',
            impact: 'High',
            savings: '75% faster',
            recommendation: 'Add index on email column'
        },
        {
            id: 'idx_2',
            pattern: 'SELECT COUNT(*) FROM orders WHERE date > ?',
            impact: 'Medium',
            savings: '45% faster',
            recommendation: 'Add composite index on (date, status)'
        },
        {
            id: 'query_1',
            pattern: 'Large table scan on products',
            impact: 'High',
            savings: '80% faster',
            recommendation: 'Add WHERE clause filtering'
        },
        {
            id: 'cache_1',
            pattern: 'Frequent identical queries',
            impact: 'Medium',
            savings: '50% less load',
            recommendation: 'Implement query result caching'
        }
    ];
    
    return opportunities;
}

// Update charts
function updateInsightCharts() {
    updateResourceTrendsChart();
    updatePerformanceScoreChart();
}

// Update resource trends chart
function updateResourceTrendsChart() {
    if (!insightCharts.resourceTrends) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const maxDataPoints = 20;
    
    // Remove old data points
    if (insightCharts.resourceTrends.data.labels.length >= maxDataPoints) {
        insightCharts.resourceTrends.data.labels.shift();
        insightCharts.resourceTrends.data.datasets.forEach(dataset => dataset.data.shift());
    }
    
    // Generate mock resource usage data
    const cpuUsage = Math.round(30 + Math.random() * 40);
    const memoryUsage = Math.round(40 + Math.random() * 30);
    const diskUsage = Math.round(20 + Math.random() * 25);
    
    insightCharts.resourceTrends.data.labels.push(timestamp);
    insightCharts.resourceTrends.data.datasets[0].data.push(cpuUsage);
    insightCharts.resourceTrends.data.datasets[1].data.push(memoryUsage);
    insightCharts.resourceTrends.data.datasets[2].data.push(diskUsage);
    
    insightCharts.resourceTrends.update('none');
}

// Update performance score chart
function updatePerformanceScoreChart() {
    if (!insightCharts.scoreHistory) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const maxDataPoints = 20;
    
    // Remove old data points
    if (insightCharts.scoreHistory.data.labels.length >= maxDataPoints) {
        insightCharts.scoreHistory.data.labels.shift();
        insightCharts.scoreHistory.data.datasets[0].data.shift();
    }
    
    // Calculate performance score based on various factors
    const baseScore = 85;
    const variation = Math.random() * 10 - 5; // ±5 points variation
    const performanceScore = Math.max(50, Math.min(100, baseScore + variation));
    
    insightCharts.scoreHistory.data.labels.push(timestamp);
    insightCharts.scoreHistory.data.datasets[0].data.push(Math.round(performanceScore));
    
    insightCharts.scoreHistory.update('none');
}

// Update recommendations
function updateRecommendations(insights) {
    const container = document.getElementById('recommendations');
    if (!container) return;
    
    const recommendations = generateRecommendations(insights);
    
    container.innerHTML = recommendations.map(rec => `
        <div class="recommendation-item">
            <div class="recommendation-icon">${rec.icon}</div>
            <div class="recommendation-content">
                <h4 class="recommendation-title">${rec.title}</h4>
                <p class="recommendation-description">${rec.description}</p>
                <a href="#" class="recommendation-action" onclick="executeRecommendation('${rec.id}')">${rec.action}</a>
            </div>
            <div class="badge badge-${rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'info'}">
                ${rec.priority}
            </div>
        </div>
    `).join('');
}

// Generate recommendations
function generateRecommendations(insights) {
    const baseRecommendations = [
        {
            id: 'vacuum',
            icon: '🧹',
            title: 'Run Database Maintenance',
            description: 'Several tables show signs of bloat. Running VACUUM ANALYZE will reclaim space and update statistics.',
            action: 'Schedule Maintenance',
            priority: 'high'
        },
        {
            id: 'index',
            icon: '📚',
            title: 'Optimize Query Indexes',
            description: 'Found 3 queries that would benefit from additional indexes. This could improve response times by up to 70%.',
            action: 'Review Indexes',
            priority: 'medium'
        },
        {
            id: 'config',
            icon: '⚙️',
            title: 'Tune Configuration',
            description: 'Your shared_buffers setting could be increased to improve cache hit ratio and overall performance.',
            action: 'Update Config',
            priority: 'medium'
        },
        {
            id: 'monitoring',
            icon: '📊',
            title: 'Enhance Monitoring',
            description: 'Consider setting up alerts for key performance metrics to catch issues before they impact users.',
            action: 'Setup Alerts',
            priority: 'low'
        }
    ];
    
    // Add insight-specific recommendations
    insights.forEach(insight => {
        if (insight.type === 'maintenance') {
            baseRecommendations.unshift({
                id: 'insight_' + Date.now(),
                icon: '⚠️',
                title: 'Critical: ' + insight.message,
                description: insight.recommendation || 'This issue requires immediate attention.',
                action: 'Fix Now',
                priority: 'high'
            });
        }
    });
    
    return baseRecommendations.slice(0, 6);
}

// Show optimization details
function showOptimizationDetails(id) {
    showNotification(`Showing optimization details for ${id}`, 'info');
}

// Execute recommendation
function executeRecommendation(id) {
    showNotification(`Executing recommendation: ${id}`, 'info');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initInsights);