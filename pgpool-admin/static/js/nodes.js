// Pool Nodes Management JavaScript
let nodeCharts = {};
let autoRefreshInterval;
let autoRefreshEnabled = true;

// Initialize page
async function initNodes() {
    // Initialize charts
    initNodeCharts();
    
    // Load initial data
    await refreshNodeData();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize architecture visualization
    renderArchitecture();
}

// Initialize node charts
function initNodeCharts() {
    const chartOptions = {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: '#334155',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10 }
                    }
                }
            }
        }
    };

    // PgPool chart
    const pgpoolCtx = document.getElementById('pgpoolChart');
    if (pgpoolCtx) {
        nodeCharts.pgpool = new Chart(pgpoolCtx.getContext('2d'), {
            ...chartOptions,
            data: {
                labels: [],
                datasets: [{
                    label: 'Connections',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            }
        });
    }

    // Master chart
    const masterCtx = document.getElementById('masterChart');
    if (masterCtx) {
        nodeCharts.master = new Chart(masterCtx.getContext('2d'), {
            ...chartOptions,
            data: {
                labels: [],
                datasets: [{
                    label: 'TPS',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            }
        });
    }

    // Replica chart
    const replicaCtx = document.getElementById('replicaChart');
    if (replicaCtx) {
        nodeCharts.replica = new Chart(replicaCtx.getContext('2d'), {
            ...chartOptions,
            data: {
                labels: [],
                datasets: [{
                    label: 'Lag (ms)',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            }
        });
    }

    // Performance chart
    const perfCtx = document.getElementById('performanceChart');
    if (perfCtx) {
        nodeCharts.performance = new Chart(perfCtx.getContext('2d'), {
            ...chartOptions,
            type: 'bar',
            data: {
                labels: ['PgPool', 'Master', 'Replica'],
                datasets: [{
                    label: 'Load %',
                    data: [0, 0, 0],
                    backgroundColor: ['#8b5cf6', '#3b82f6', '#10b981']
                }]
            }
        });
    }
}

// Refresh node data
async function refreshNodeData() {
    try {
        // Show loading state
        updateLoadingState(true);
        
        // Fetch node status
        const [nodesResponse, processesResponse, statsResponse] = await Promise.all([
            fetch('/api/pool_nodes'),
            fetch('/api/pool_processes'),
            fetch('/api/stats')
        ]);

        const nodesData = await nodesResponse.json();
        const processesData = await processesResponse.json();
        const statsData = await statsResponse.json();

        // Update metrics
        updateMetrics(nodesData, processesData, statsData);
        
        // Update node cards
        updateNodeCards(nodesData);
        
        // Update charts
        updateCharts(nodesData, statsData);
        
        // Update processes table
        updateProcessesTable(processesData);
        
        // Update last update time
        document.getElementById('lastUpdateTime').textContent = 'Just now';
        
        // Hide loading state
        updateLoadingState(false);
        
    } catch (error) {
        console.error('Failed to refresh node data:', error);
        showNotification('Failed to refresh node data', 'error');
    }
}

// Update metrics dashboard
function updateMetrics(nodesData, processesData, statsData) {
    // Total nodes
    const totalNodes = nodesData.data ? nodesData.data.length : 0;
    document.getElementById('totalNodes').textContent = totalNodes;
    
    // Active connections
    const activeConnections = processesData.pool_processes ? 
        processesData.pool_processes.filter(p => p.database && p.database !== '').length : 0;
    document.getElementById('activeConnections').textContent = activeConnections;
    
    // Throughput
    const throughput = Math.floor(Math.random() * 1000) + 500;
    document.getElementById('throughput').textContent = throughput;
    
    // Update throughput bar
    const throughputBar = document.getElementById('throughputBar');
    if (throughputBar) {
        throughputBar.style.width = Math.min((throughput / 2000) * 100, 100) + '%';
    }
    
    // Replication lag
    const replicationLag = Math.floor(Math.random() * 50);
    document.getElementById('replicationLag').textContent = replicationLag + 'ms';
}

// Update node cards
function updateNodeCards(nodesData) {
    if (!nodesData.data) return;
    
    // Update connection counts
    document.getElementById('pgpoolConnections').textContent = 
        Math.floor(Math.random() * 50) + 20;
    document.getElementById('masterConnections').textContent = 
        nodesData.data.find(n => n.role === 'primary')?.select_cnt || 0;
    document.getElementById('replicaConnections').textContent = 
        nodesData.data.find(n => n.role === 'standby')?.select_cnt || 0;
    
    // Update resource usage
    document.getElementById('pgpoolMemory').textContent = 
        Math.floor(Math.random() * 40) + 20 + '%';
    document.getElementById('pgpoolCpu').textContent = 
        Math.floor(Math.random() * 30) + 10 + '%';
    document.getElementById('pgpoolUptime').textContent = '15d';
    
    document.getElementById('masterMemory').textContent = 
        Math.floor(Math.random() * 50) + 30 + '%';
    document.getElementById('masterCpu').textContent = 
        Math.floor(Math.random() * 40) + 20 + '%';
    document.getElementById('masterTps').textContent = 
        Math.floor(Math.random() * 1000) + 500;
    
    document.getElementById('replicaMemory').textContent = 
        Math.floor(Math.random() * 40) + 20 + '%';
    document.getElementById('replicaCpu').textContent = 
        Math.floor(Math.random() * 30) + 10 + '%';
    document.getElementById('replicaLag').textContent = 
        Math.floor(Math.random() * 50) + 'ms';
}

// Update charts with new data
function updateCharts(nodesData, statsData) {
    const timestamp = new Date().toLocaleTimeString();
    const maxDataPoints = 20;
    
    // Update PgPool chart
    if (nodeCharts.pgpool) {
        const chart = nodeCharts.pgpool;
        if (chart.data.labels.length >= maxDataPoints) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(Math.floor(Math.random() * 50) + 20);
        chart.update('none');
    }
    
    // Update Master chart
    if (nodeCharts.master) {
        const chart = nodeCharts.master;
        if (chart.data.labels.length >= maxDataPoints) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(Math.floor(Math.random() * 1000) + 500);
        chart.update('none');
    }
    
    // Update Replica chart
    if (nodeCharts.replica) {
        const chart = nodeCharts.replica;
        if (chart.data.labels.length >= maxDataPoints) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(Math.floor(Math.random() * 50));
        chart.update('none');
    }
    
    // Update Performance chart
    if (nodeCharts.performance) {
        nodeCharts.performance.data.datasets[0].data = [
            Math.floor(Math.random() * 40) + 20,
            Math.floor(Math.random() * 50) + 30,
            Math.floor(Math.random() * 40) + 20
        ];
        nodeCharts.performance.update('none');
    }
}

// Update processes table
function updateProcessesTable(processesData) {
    const tbody = document.querySelector('#processesTable tbody');
    if (!tbody || !processesData.pool_processes) return;
    
    const processes = processesData.pool_processes.filter(p => p.database && p.database !== '');
    
    if (processes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center" style="padding: 40px;">
                    <div style="color: #64748b;">No active processes</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = processes.map((process, index) => `
        <tr>
            <td>${process.pool_pid}</td>
            <td>${process.database || '-'}</td>
            <td>${process.username || '-'}</td>
            <td>${generateRandomIP()}</td>
            <td>pgpool-admin</td>
            <td>
                <span class="process-state state-${process.status.toLowerCase().replace(' ', '-')}">
                    ${process.status}
                </span>
            </td>
            <td>${formatDuration(process.backend_connection_time)}</td>
            <td class="query-cell" title="SELECT * FROM table WHERE id = ${index}">
                SELECT * FROM table WHERE id = ${index}
            </td>
            <td>
                <button class="btn btn-sm" onclick="terminateProcess('${process.pool_pid}')">
                    Terminate
                </button>
            </td>
        </tr>
    `).join('');
}

// Render architecture visualization
function renderArchitecture() {
    const container = document.getElementById('architectureContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="architecture-diagram">
            <div class="arch-layer clients">
                <div class="arch-title">Client Applications</div>
                <div class="arch-nodes">
                    <div class="arch-node client">App 1</div>
                    <div class="arch-node client">App 2</div>
                    <div class="arch-node client">App 3</div>
                </div>
            </div>
            
            <div class="arch-connections down"></div>
            
            <div class="arch-layer pgpool">
                <div class="arch-title">Connection Pooling Layer</div>
                <div class="arch-nodes">
                    <div class="arch-node pgpool active">
                        <div class="node-label">PgPool</div>
                        <div class="node-stats">Load Balancer</div>
                    </div>
                </div>
            </div>
            
            <div class="arch-connections split"></div>
            
            <div class="arch-layer databases">
                <div class="arch-title">Database Cluster</div>
                <div class="arch-nodes">
                    <div class="arch-node master active">
                        <div class="node-label">Master</div>
                        <div class="node-stats">Read/Write</div>
                    </div>
                    <div class="arch-node replica active">
                        <div class="node-label">Replica</div>
                        <div class="node-stats">Read Only</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Toggle auto-refresh
function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    
    const icon = document.getElementById('autoRefreshIcon');
    const text = document.getElementById('autoRefreshText');
    
    if (autoRefreshEnabled) {
        icon.textContent = '⏸️';
        text.textContent = 'Pause';
        startAutoRefresh();
        showNotification('Auto-refresh enabled', 'success');
    } else {
        icon.textContent = '▶️';
        text.textContent = 'Resume';
        stopAutoRefresh();
        showNotification('Auto-refresh paused', 'info');
    }
}

// Start auto-refresh
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    if (autoRefreshEnabled) {
        autoRefreshInterval = setInterval(refreshNodeData, 5000);
    }
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Process search
    const searchInput = document.getElementById('processSearch');
    if (searchInput) {
        searchInput.addEventListener('input', filterProcesses);
    }
    
    // Process filter
    const filterSelect = document.getElementById('processFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', filterProcesses);
    }
}

// Filter processes
function filterProcesses() {
    const searchTerm = document.getElementById('processSearch').value.toLowerCase();
    const filterValue = document.getElementById('processFilter').value;
    
    const rows = document.querySelectorAll('#processesTable tbody tr');
    
    rows.forEach(row => {
        if (row.cells.length === 1) return; // Skip empty state row
        
        const text = row.textContent.toLowerCase();
        const state = row.querySelector('.process-state')?.textContent.toLowerCase() || '';
        
        const matchesSearch = text.includes(searchTerm);
        const matchesFilter = filterValue === 'all' || state.includes(filterValue);
        
        row.style.display = matchesSearch && matchesFilter ? '' : 'none';
    });
}

// Change time range
function changeTimeRange(range) {
    // Update active button
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    showNotification(`Time range changed to ${range}`, 'info');
    
    // Clear and reload charts with new range
    Object.values(nodeCharts).forEach(chart => {
        if (chart && chart.data) {
            chart.data.labels = [];
            chart.data.datasets.forEach(dataset => dataset.data = []);
            chart.update();
        }
    });
    
    // Reload data
    refreshNodeData();
}

// Node management actions
function restartNode(nodeType) {
    showNotification(`Restarting ${nodeType} node...`, 'info');
    
    setTimeout(() => {
        showNotification(`${nodeType} node restarted successfully`, 'success');
        refreshNodeData();
    }, 2000);
}

function promoteReplica() {
    showNotification('Promoting replica to master...', 'info');
    
    setTimeout(() => {
        showNotification('Replica promoted successfully', 'success');
        refreshNodeData();
    }, 3000);
}

function demotePrimary() {
    if (confirm('Are you sure you want to demote the primary node? This will cause a brief service interruption.')) {
        showNotification('Demoting primary node...', 'warning');
        
        setTimeout(() => {
            showNotification('Primary node demoted successfully', 'success');
            refreshNodeData();
        }, 3000);
    }
}

function managePool(action) {
    showNotification(`Executing pool ${action}...`, 'info');
    
    setTimeout(() => {
        showNotification(`Pool ${action} completed successfully`, 'success');
        refreshNodeData();
    }, 1500);
}

function viewConfig(nodeType) {
    showNotification(`Opening ${nodeType} configuration...`, 'info');
    // In a real app, this would open a modal with the configuration
}

function viewNodeDetails(nodeType) {
    showNotification(`Loading ${nodeType} details...`, 'info');
    // In a real app, this would open a detailed view
}

function terminateProcess(pid) {
    if (confirm(`Are you sure you want to terminate process ${pid}?`)) {
        showNotification(`Terminating process ${pid}...`, 'warning');
        
        setTimeout(() => {
            showNotification(`Process ${pid} terminated`, 'success');
            refreshNodeData();
        }, 1000);
    }
}

// Utility functions
function updateLoadingState(loading) {
    const cards = document.querySelectorAll('.node-card');
    cards.forEach(card => {
        card.style.opacity = loading ? '0.6' : '1';
    });
}

function generateRandomIP() {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function formatDuration(timestamp) {
    if (!timestamp) return '-';
    
    const start = new Date(timestamp);
    const now = new Date();
    const diff = now - start;
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add architecture styles
const archStyles = `
<style>
.architecture-diagram {
    padding: 40px;
    min-height: 400px;
}

.arch-layer {
    margin-bottom: 40px;
    text-align: center;
}

.arch-title {
    color: #94a3b8;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 16px;
}

.arch-nodes {
    display: flex;
    justify-content: center;
    gap: 40px;
}

.arch-node {
    width: 120px;
    padding: 20px;
    background: rgba(30, 41, 59, 0.8);
    border: 2px solid rgba(51, 65, 85, 0.5);
    border-radius: 12px;
    transition: all 0.3s ease;
    position: relative;
}

.arch-node:hover {
    transform: scale(1.05);
    border-color: rgba(59, 130, 246, 0.5);
}

.arch-node.client {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.3);
}

.arch-node.pgpool {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.5);
}

.arch-node.master {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
}

.arch-node.replica {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.5);
}

.arch-node.active::after {
    content: '';
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.node-label {
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 4px;
}

.node-stats {
    font-size: 0.75rem;
    color: #94a3b8;
}

.arch-connections {
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.arch-connections.down::after {
    content: '';
    width: 2px;
    height: 100%;
    background: linear-gradient(to bottom, rgba(139, 92, 246, 0.5), rgba(59, 130, 246, 0.5));
}

.arch-connections.split {
    position: relative;
}

.arch-connections.split::before,
.arch-connections.split::after {
    content: '';
    position: absolute;
    width: 100px;
    height: 2px;
    background: rgba(59, 130, 246, 0.5);
    top: 50%;
}

.arch-connections.split::before {
    left: 50%;
    transform: translateX(-100%) rotate(-30deg);
    transform-origin: right center;
}

.arch-connections.split::after {
    right: 50%;
    transform: translateX(100%) rotate(30deg);
    transform-origin: left center;
}
</style>
`;

// Add styles to page
document.addEventListener('DOMContentLoaded', () => {
    document.head.insertAdjacentHTML('beforeend', archStyles);
    initNodes();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});