// SolarPay Dashboard JavaScript

let websocket = null;
let households = [];
let batteryChart = null;
let connectionRetries = 0;
const maxRetries = 5;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeWebSocket();
    loadHouseholds();
    initializeBatteryChart();
    
    // Set up periodic updates as fallback
    setInterval(loadHouseholds, 30000); // Every 30 seconds
});

// WebSocket connection for real-time updates
function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = function() {
            console.log('WebSocket connected');
            updateConnectionStatus(true);
            connectionRetries = 0;
        };
        
        websocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        websocket.onclose = function() {
            console.log('WebSocket disconnected');
            updateConnectionStatus(false);
            
            // Attempt to reconnect
            if (connectionRetries < maxRetries) {
                connectionRetries++;
                setTimeout(() => {
                    console.log(`Attempting to reconnect... (${connectionRetries}/${maxRetries})`);
                    initializeWebSocket();
                }, 5000 * connectionRetries);
            }
        };
        
        websocket.onerror = function(error) {
            console.error('WebSocket error:', error);
            updateConnectionStatus(false);
        };
    } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        updateConnectionStatus(false);
    }
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'initial_data':
            households = data.households;
            updateDashboard();
            break;
            
        case 'sensor_update':
            updateHouseholdData(data.householdId, data.data);
            break;
            
        case 'household_added':
            households.push(data.household);
            updateDashboard();
            break;
            
        case 'alert':
            showAlert(data.alert);
            break;
            
        default:
            console.log('Unknown message type:', data.type);
    }
}

// Update connection status indicator
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    if (connected) {
        statusElement.innerHTML = `
            <span class="badge bg-success">
                <i class="fas fa-wifi me-1"></i>
                Connected
            </span>
        `;
    } else {
        statusElement.innerHTML = `
            <span class="badge bg-danger">
                <i class="fas fa-wifi me-1"></i>
                Disconnected
            </span>
        `;
    }
}

// Load households data from API
async function loadHouseholds() {
    try {
        const response = await fetch('/api/households');
        const result = await response.json();
        
        if (result.success) {
            households = result.data;
            updateDashboard();
        }
    } catch (error) {
        console.error('Failed to load households:', error);
    }
}

// Update the entire dashboard
function updateDashboard() {
    updateSystemStats();
    updateHouseholdsList();
    updateBatteryChart();
    loadRecentAlerts();
}

// Update system statistics
function updateSystemStats() {
    const totalHouseholds = households.length;
    const activeHouseholds = households.filter(h => h.powerStatus === 'on').length;
    const totalBalance = households.reduce((sum, h) => sum + h.balance, 0);
    
    // Calculate average battery level (would need latest sensor data)
    let avgBattery = 0;
    if (households.length > 0) {
        // This is simplified - in real implementation, get latest sensor readings
        avgBattery = Math.floor(Math.random() * 40) + 60; // Demo data
    }
    
    document.getElementById('stat-households').textContent = totalHouseholds;
    document.getElementById('stat-active').textContent = activeHouseholds;
    document.getElementById('stat-battery').textContent = avgBattery + '%';
    document.getElementById('stat-balance').textContent = formatCurrency(totalBalance);
}

// Update households list display
function updateHouseholdsList() {
    const container = document.getElementById('households-list');
    
    if (households.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-home fa-3x mb-3"></i>
                <p>No households registered yet.</p>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addHouseholdModal">
                    Add First Household
                </button>
            </div>
        `;
        return;
    }
    
    const householdsHtml = households.map(household => `
        <div class="household-card card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-4">
                        <h6 class="mb-1">${household.name}</h6>
                        <small class="text-muted">
                            <i class="fas fa-map-marker-alt me-1"></i>
                            ${household.location}
                        </small>
                        <br>
                        <small class="text-muted">
                            <i class="fas fa-phone me-1"></i>
                            ${formatPhoneNumber(household.phone)}
                        </small>
                    </div>
                    <div class="col-md-2">
                        <div class="text-center">
                            <div class="battery-indicator mb-1" data-household="${household.id}">
                                <i class="fas fa-battery-half fa-2x text-warning"></i>
                            </div>
                            <small class="battery-level">Loading...</small>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="text-center">
                            <h6 class="mb-0">${formatCurrency(household.balance)}</h6>
                            <small class="text-muted">Balance</small>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="text-center">
                            <span class="badge ${household.powerStatus === 'on' ? 'bg-success' : 'bg-danger'}">
                                <i class="fas fa-power-off me-1"></i>
                                ${household.powerStatus.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="togglePower(${household.id})">
                                <i class="fas fa-power-off"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="addPayment(${household.id})">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="sendSMS(${household.id})">
                                <i class="fas fa-sms"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = householdsHtml;
    
    // Load sensor data for each household
    households.forEach(loadHouseholdSensorData);
}

// Load sensor data for a specific household
async function loadHouseholdSensorData(household) {
    try {
        const response = await fetch(`/api/households/${household.id}/sensors?limit=1`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            const sensorData = result.data[0];
            updateBatteryDisplay(household.id, sensorData.batteryLevel);
        }
    } catch (error) {
        console.error(`Failed to load sensor data for household ${household.id}:`, error);
    }
}

// Update battery display for a household
function updateBatteryDisplay(householdId, batteryLevel) {
    const indicator = document.querySelector(`[data-household="${householdId}"]`);
    const levelElement = indicator?.parentElement.querySelector('.battery-level');
    
    if (indicator && levelElement) {
        // Update battery icon based on level
        let iconClass = 'fas fa-battery-empty text-danger';
        if (batteryLevel > 75) iconClass = 'fas fa-battery-full text-success';
        else if (batteryLevel > 50) iconClass = 'fas fa-battery-three-quarters text-info';
        else if (batteryLevel > 25) iconClass = 'fas fa-battery-half text-warning';
        else if (batteryLevel > 10) iconClass = 'fas fa-battery-quarter text-warning';
        
        indicator.innerHTML = `<i class="${iconClass} fa-2x"></i>`;
        levelElement.textContent = `${batteryLevel}%`;
    }
}

// Update household data from WebSocket
function updateHouseholdData(householdId, sensorData) {
    const household = households.find(h => h.id === householdId);
    if (household) {
        updateBatteryDisplay(householdId, sensorData.batteryLevel);
        updateBatteryChart();
    }
}

// Initialize battery chart
function initializeBatteryChart() {
    const ctx = document.getElementById('batteryChart').getContext('2d');
    
    batteryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Good (>50%)', 'Warning (20-50%)', 'Critical (<20%)'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    '#28a745',
                    '#ffc107',
                    '#dc3545'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Battery Status Distribution'
                }
            }
        }
    });
}

// Update battery chart with current data
function updateBatteryChart() {
    if (!batteryChart) return;
    
    // This is simplified - in real implementation, get actual battery levels
    const good = Math.floor(Math.random() * households.length);
    const warning = Math.floor(Math.random() * (households.length - good));
    const critical = households.length - good - warning;
    
    batteryChart.data.datasets[0].data = [good, warning, critical];
    batteryChart.update();
}

// Load recent alerts
async function loadRecentAlerts() {
    const alertsContainer = document.getElementById('recent-alerts');
    
    try {
        // Get alerts for all households
        const alertPromises = households.slice(0, 3).map(async (household) => {
            const response = await fetch(`/api/households/${household.id}`);
            const result = await response.json();
            return result.success ? result.data.alerts.slice(-2) : [];
        });
        
        const allAlerts = await Promise.all(alertPromises);
        const recentAlerts = allAlerts.flat().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
        
        if (recentAlerts.length === 0) {
            alertsContainer.innerHTML = '<p class="text-muted small">No recent alerts</p>';
            return;
        }
        
        const alertsHtml = recentAlerts.map(alert => `
            <div class="alert-item small mb-2">
                <div class="d-flex justify-content-between">
                    <span class="badge bg-${getAlertColor(alert.type)} me-2">${alert.type}</span>
                    <small class="text-muted">${timeAgo(alert.timestamp)}</small>
                </div>
                <div class="mt-1 small">${alert.message.substring(0, 50)}...</div>
            </div>
        `).join('');
        
        alertsContainer.innerHTML = alertsHtml;
    } catch (error) {
        console.error('Failed to load recent alerts:', error);
        alertsContainer.innerHTML = '<p class="text-muted small">Failed to load alerts</p>';
    }
}

// Control functions
async function togglePower(householdId) {
    const household = households.find(h => h.id === householdId);
    if (!household) return;
    
    const newStatus = household.powerStatus === 'on' ? 'off' : 'on';
    
    try {
        const response = await fetch(`/api/households/${householdId}/power`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: newStatus })
        });
        
        const result = await response.json();
        if (result.success) {
            household.powerStatus = newStatus;
            updateDashboard();
            showNotification(`Power ${newStatus} for ${household.name}`, 'success');
        } else {
            showNotification(result.error || 'Failed to toggle power', 'danger');
        }
    } catch (error) {
        console.error('Power toggle failed:', error);
        showNotification('Failed to toggle power', 'danger');
    }
}

async function addPayment(householdId) {
    const amount = prompt('Enter payment amount (KES):');
    if (!amount || isNaN(amount) || amount <= 0) return;
    
    try {
        const response = await fetch(`/api/households/${householdId}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amount: parseFloat(amount), 
                method: 'manual' 
            })
        });
        
        const result = await response.json();
        if (result.success) {
            const household = households.find(h => h.id === householdId);
            if (household) {
                household.balance = result.household.balance;
            }
            updateDashboard();
            showNotification(`Payment of KES ${amount} added successfully`, 'success');
        } else {
            showNotification(result.error || 'Payment failed', 'danger');
        }
    } catch (error) {
        console.error('Payment failed:', error);
        showNotification('Payment failed', 'danger');
    }
}

async function sendSMS(householdId) {
    const message = prompt('Enter SMS message:');
    if (!message) return;
    
    try {
        const response = await fetch(`/api/households/${householdId}/sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('SMS sent successfully', 'success');
        } else {
            showNotification(result.error || 'Failed to send SMS', 'danger');
        }
    } catch (error) {
        console.error('SMS failed:', error);
        showNotification('Failed to send SMS', 'danger');
    }
}

async function addHousehold() {
    const name = document.getElementById('householdName').value;
    const phone = document.getElementById('householdPhone').value;
    const location = document.getElementById('householdLocation').value;
    const balance = document.getElementById('householdBalance').value || 0;
    
    if (!name || !phone || !location) {
        showNotification('Please fill all required fields', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/households', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, location, balance: parseFloat(balance) })
        });
        
        const result = await response.json();
        if (result.success) {
            households.push(result.data);
            updateDashboard();
            
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addHouseholdModal'));
            modal.hide();
            document.getElementById('addHouseholdForm').reset();
            
            showNotification(`Household "${name}" added successfully`, 'success');
        } else {
            showNotification(result.error || 'Failed to add household', 'danger');
        }
    } catch (error) {
        console.error('Add household failed:', error);
        showNotification('Failed to add household', 'danger');
    }
}

// Utility functions
function formatCurrency(amount) {
    return 'KES ' + amount.toLocaleString();
}

function formatPhoneNumber(phone) {
    if (phone.startsWith('+254')) {
        return '0' + phone.substring(4);
    }
    return phone;
}

function timeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

function getAlertColor(type) {
    switch (type) {
        case 'low_battery': return 'warning';
        case 'critical_battery': return 'danger';
        case 'battery_full': return 'success';
        default: return 'info';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
} 
