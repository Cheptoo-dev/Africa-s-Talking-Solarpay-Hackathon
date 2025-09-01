const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');
const cors = require('cors');
const database = require('./services/database');
const sensorSimulator = require('./services/sensorSimulator');
const apiRoutes = require('./routes/api');
const ussdRoutes = require('./routes/ussd');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server on /ws path
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.use('/api', apiRoutes);
app.use('/ussd', ussdRoutes);

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// WebSocket connections for real-time updates
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    clients.add(ws);
    
    // Send current system status to new client
    const households = database.getAllHouseholds();
    ws.send(JSON.stringify({
        type: 'initial_data',
        households: households
    }));
    
    ws.on('close', () => {
        clients.delete(ws);
        console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Broadcast updates to all connected clients
function broadcastUpdate(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Initialize sample households and start sensor simulation
function initializeSystem() {
    // Create sample households
    const household1 = database.createHousehold({
        name: 'Cheptoo',
        phone: '+254710677582',
        location: 'Bomet County',
        balance: 150
    });
    
    const household2 = database.createHousehold({
        name: 'Akinyi Household',
        phone: '+254700000002', 
        location: 'Kisumu County',
        balance: 50
    });
    
    console.log('System initialized with sample households');
    
    // Start sensor simulation for all households
    const households = database.getAllHouseholds();
    households.forEach(household => {
        sensorSimulator.startSimulation(household.id, (sensorData) => {
            // Store sensor data
            database.addSensorReading(household.id, sensorData);
            
            // Broadcast update to all clients
            broadcastUpdate({
                type: 'sensor_update',
                householdId: household.id,
                data: sensorData
            });
            
            // Check for alerts
            checkAndSendAlerts(household.id, sensorData);
        });
    });
}

// Check for battery alerts and send SMS
async function checkAndSendAlerts(householdId, sensorData) {
    const household = database.getHousehold(householdId);
    if (!household) return;
    
    const africasTalking = require('./services/africasTalking');
    
    // Low battery alert (20% threshold)
    if (sensorData.batteryLevel <= 20 && sensorData.batteryLevel > 15) {
        const message = `⚠️ SolarPay Alert: Your battery is at ${sensorData.batteryLevel}%, recharge soon. Balance: KES ${household.balance}`;
        
        try {
            await africasTalking.sendSMS(household.phone, message);
            database.addAlert(householdId, 'low_battery', message);
            console.log(`Low battery alert sent to ${household.phone}`);
        } catch (error) {
            console.error('Failed to send low battery SMS:', error);
        }
    }
    
    // Critical battery alert (5% threshold)
    if (sensorData.batteryLevel <= 5 && sensorData.batteryLevel > 0) {
        const message = `🔴 SolarPay Critical: Battery at ${sensorData.batteryLevel}%! Power will be limited soon. Top up now: Dial *123#`;
        
        try {
            await africasTalking.sendSMS(household.phone, message);
            database.addAlert(householdId, 'critical_battery', message);
            console.log(`Critical battery alert sent to ${household.phone}`);
        } catch (error) {
            console.error('Failed to send critical battery SMS:', error);
        }
    }
    
    // Full battery notification (100%)
    if (sensorData.batteryLevel >= 100) {
        const lastReading = database.getLastSensorReading(householdId);
        if (lastReading && lastReading.batteryLevel < 100) {
            const message = `✅ SolarPay: Your solar battery is fully charged! Good sunshine today.`;
            
            try {
                await africasTalking.sendSMS(household.phone, message);
                database.addAlert(householdId, 'battery_full', message);
                console.log(`Battery full notification sent to ${household.phone}`);
            } catch (error) {
                console.error('Failed to send battery full SMS:', error);
            }
        }
    }
}

// ✅ Add SMS route BEFORE server.listen
app.post('/send-sms', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ success: false, error: 'Missing "to" or "message"' });
    }

    const response = await africasTalking.sendSMS(to, message);
    res.json({ success: true, response });
  } catch (error) {
    console.error("SMS sending failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test API route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'SolarPay API is running 🚀',
    endpoints: [
      '/send-sms',
      '/api/households',
      '/api/readings',
      '/api/alerts'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    sensorSimulator.stopAllSimulations();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`SolarPay server running on port ${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`API: http://localhost:${PORT}/api`);
    
    // Initialize the system after server starts
    setTimeout(initializeSystem, 1000);
});

module.exports = { app, server, broadcastUpdate }; 
