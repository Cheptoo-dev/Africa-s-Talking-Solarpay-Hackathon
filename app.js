 // SolarPay Landing Page JavaScript

let ussdSession = {
    sessionId: null,
    phoneNumber: '+254710677582', // Demo phone number
    currentText: '',
    isActive: false
};

// Load system stats on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSystemStats();
    setInterval(loadSystemStats, 30000); // Update every 30 seconds
});

// Load and display system statistics
async function loadSystemStats() {
    try {
        const response = await fetch('/api/stats');
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data;
            document.getElementById('total-households').textContent = stats.totalHouseholds;
            document.getElementById('avg-battery').textContent = stats.avgBatteryLevel + '%';
            document.getElementById('total-payments').textContent = stats.totalPayments;
            document.getElementById('total-alerts').textContent = stats.totalAlerts;
        }
    } catch (error) {
        console.error('Failed to load system stats:', error);
    }
}

// USSD Demo Functions
function startUSSDDemo() {
    ussdSession.sessionId = 'demo_' + Date.now();
    ussdSession.currentText = '';
    ussdSession.isActive = true;
    
    // Start USSD session
    makeUSSDRequest('');
    
    document.getElementById('demo-btn').textContent = 'Demo Running...';
    document.getElementById('demo-btn').disabled = true;
}

function demoUSSD() {
    startUSSDDemo();
    
    // Scroll to demo section
    document.querySelector('.ussd-demo').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

function resetUSSDDemo() {
    ussdSession.isActive = false;
    ussdSession.currentText = '';
    
    document.getElementById('ussd-content').innerHTML = 'Click "Start Demo" to begin...';
    document.getElementById('ussd-input-section').style.display = 'none';
    document.getElementById('demo-btn').textContent = 'Start Demo';
    document.getElementById('demo-btn').disabled = false;
    document.getElementById('ussd-input').value = '';
}

function processUSSDInput() {
    const input = document.getElementById('ussd-input').value.trim();
    if (!input) return;
    
    // Add input to current text
    if (ussdSession.currentText) {
        ussdSession.currentText += '*' + input;
    } else {
        ussdSession.currentText = input;
    }
    
    makeUSSDRequest(ussdSession.currentText);
    document.getElementById('ussd-input').value = '';
}

async function makeUSSDRequest(text) {
    try {
        const response = await fetch('/ussd/demo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: ussdSession.phoneNumber,
                text: text,
                sessionId: ussdSession.sessionId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayUSSDResponse(result.response, result.endSession);
        } else {
            displayUSSDResponse('Service error occurred', true);
        }
    } catch (error) {
        console.error('USSD request failed:', error);
        displayUSSDResponse('Connection error', true);
    }
}

function displayUSSDResponse(response, endSession) {
    const content = document.getElementById('ussd-content');
    const inputSection = document.getElementById('ussd-input-section');
    
    // Clean up the response (remove CON/END prefixes)
    const cleanResponse = response.replace(/^(CON|END)\s*/, '');
    
    // Format the response for display
    const formattedResponse = cleanResponse.replace(/\n/g, '<br>');
    content.innerHTML = formattedResponse;
    
    if (endSession) {
        // Session ended
        inputSection.style.display = 'none';
        ussdSession.isActive = false;
        
        setTimeout(() => {
            document.getElementById('demo-btn').textContent = 'Start Demo';
            document.getElementById('demo-btn').disabled = false;
        }, 3000);
    } else {
        // Continue session - show input
        inputSection.style.display = 'block';
        document.getElementById('ussd-input').focus();
    }
}

// Handle enter key in USSD input
document.addEventListener('keypress', function(e) {
    if (e.target.id === 'ussd-input' && e.key === 'Enter') {
        processUSSDInput();
    }
});

// Utility functions
function formatCurrency(amount) {
    return 'KES ' + amount.toLocaleString();
}

function formatPhoneNumber(phone) {
    // Format phone number for display
    if (phone.startsWith('+254')) {
        return '0' + phone.substring(4);
    }
    return phone;
}

function timeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000); // seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
    return Math.floor(diff / 86400) + ' days ago';
}

// Add some visual feedback for demo
function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}
