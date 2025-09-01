const express = require('express');
const router = express.Router();
const database = require('../services/database');
const sensorSimulator = require('../services/sensorSimulator');
const africasTalking = require('../services/africasTalking');

// Get all households
router.get('/households', (req, res) => {
    try {
        const households = database.getAllHouseholds();
        res.json({
            success: true,
            data: households
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get specific household
router.get('/households/:id', (req, res) => {
    try {
        const household = database.getHousehold(parseInt(req.params.id));
        if (!household) {
            return res.status(404).json({
                success: false,
                error: 'Household not found'
            });
        }
        
        const sensorData = database.getSensorReadings(household.id, 10);
        const alerts = database.getAlerts(household.id);
        const payments = database.getPayments(household.id);
        
        res.json({
            success: true,
            data: {
                household,
                sensorData,
                alerts,
                payments
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get sensor data for a household
router.get('/households/:id/sensors', (req, res) => {
    try {
        const householdId = parseInt(req.params.id);
        const limit = parseInt(req.query.limit) || 50;
        
        const readings = database.getSensorReadings(householdId, limit);
        res.json({
            success: true,
            data: readings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create new household
router.post('/households', (req, res) => {
    try {
        const { name, phone, location, balance } = req.body;
        
        if (!name || !phone || !location) {
            return res.status(400).json({
                success: false,
                error: 'Name, phone, and location are required'
            });
        }
        
        const household = database.createHousehold({
            name,
            phone,
            location,
            balance: balance || 0
        });
        
        // Start sensor simulation for new household
        sensorSimulator.startSimulation(household.id, (sensorData) => {
            database.addSensorReading(household.id, sensorData);
        });
        
        res.status(201).json({
            success: true,
            data: household
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Power control
router.post('/households/:id/power', async (req, res) => {
    try {
        const householdId = parseInt(req.params.id);
        const { action } = req.body; // 'on' or 'off'
        
        const household = database.getHousehold(householdId);
        if (!household) {
            return res.status(404).json({
                success: false,
                error: 'Household not found'
            });
        }
        
        if (action === 'on' && household.balance < 10) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance. Minimum KES 10 required.'
            });
        }
        
        const updatedHousehold = database.setPowerStatus(householdId, action);
        
        // Send SMS notification
        const message = action === 'on' 
            ? '✅ SolarPay: Power restored successfully!'
            : '⚠️ SolarPay: Power has been turned off.';
        
        try {
            await africasTalking.sendSMS(household.phone, message);
        } catch (smsError) {
            console.error('Failed to send power control SMS:', smsError);
        }
        
        res.json({
            success: true,
            data: updatedHousehold,
            message: `Power ${action} successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Process payment
router.post('/households/:id/payment', async (req, res) => {
    try {
        const householdId = parseInt(req.params.id);
        const { amount, method } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid amount is required'
            });
        }
        
        const household = database.getHousehold(householdId);
        if (!household) {
            return res.status(404).json({
                success: false,
                error: 'Household not found'
            });
        }
        
        // Process payment based on method
        let paymentSuccess = false;
        
        if (method === 'airtime') {
            paymentSuccess = await africasTalking.processAirtimePayment(household.phone, amount);
        } else {
            // For demo, assume other payment methods succeed
            paymentSuccess = true;
        }
        
        if (!paymentSuccess) {
            return res.status(400).json({
                success: false,
                error: 'Payment processing failed'
            });
        }
        
        // Add payment to database
        const payment = database.addPayment(householdId, amount, method);
        
        // Send confirmation SMS
        const message = `✅ SolarPay Payment Confirmed!\nAmount: KES ${amount}\nNew Balance: KES ${household.balance}\nThank you for using SolarPay!`;
        
        try {
            await africasTalking.sendSMS(household.phone, message);
        } catch (smsError) {
            console.error('Failed to send payment confirmation SMS:', smsError);
        }
        
        res.json({
            success: true,
            data: payment,
            household: household,
            message: 'Payment processed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Send custom SMS
router.post('/households/:id/sms', async (req, res) => {
    try {
        const householdId = parseInt(req.params.id);
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }
        
        const household = database.getHousehold(householdId);
        if (!household) {
            return res.status(404).json({
                success: false,
                error: 'Household not found'
            });
        }
        
        const result = await africasTalking.sendSMS(household.phone, message);
        
        res.json({
            success: true,
            data: result,
            message: 'SMS sent successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get system statistics
router.get('/stats', (req, res) => {
    try {
        const stats = database.getSystemStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Demo controls for hackathon
router.post('/demo/battery/:id', (req, res) => {
    try {
        const householdId = parseInt(req.params.id);
        const { level } = req.body;
        
        if (level < 0 || level > 100) {
            return res.status(400).json({
                success: false,
                error: 'Battery level must be between 0 and 100'
            });
        }
        
        const success = sensorSimulator.setBatteryLevel(householdId, level);
        
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Household not found or simulation not running'
            });
        }
        
        res.json({
            success: true,
            message: `Battery level set to ${level}% for demo`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router; 
