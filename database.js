// In-memory database for hackathon MVP
class Database {
    constructor() {
        this.households = new Map();
        this.sensorData = new Map(); // householdId -> array of readings
        this.alerts = new Map(); // householdId -> array of alerts
        this.payments = new Map(); // householdId -> array of payments
        this.nextId = 1;
        
        // ✅ ADD TEST DATA FOR USSD TESTING
        this.initializeTestData();
    }
    
    // ✅ Initialize with test data matching server.js
    initializeTestData() {
        // Only initialize if no households exist (avoid duplicates)
        if (this.households.size > 0) {
            console.log('📋 Database already has households, skipping initialization');
            return;
        }
        
        console.log('🔄 Initializing database with test data...');
        
        // Match the households from server.js
        const household1 = this.createHousehold({
            name: 'Cheptoo',
            phone: '+254710677582', // Exactly as in server.js
            location: 'Bomet County',
            balance: 150
        });
        
        const household2 = this.createHousehold({
            name: 'Akinyi Household', 
            phone: '+254700000002', // Exactly as in server.js
            location: 'Kisumu County',
            balance: 50
        });
        
        // Add some sample sensor data for both
        this.addSensorReading(household1.id, {
            batteryLevel: 75,
            voltage: 12.2,
            current: 5.5,
            temperature: 28.5
        });
        
        this.addSensorReading(household2.id, {
            batteryLevel: 60,
            voltage: 11.8,
            current: 4.2,
            temperature: 26.0
        });
        
        // Add sample payments and alerts
        this.addPayment(household1.id, 100, 'airtime');
        this.addAlert(household1.id, 'LOW_BATTERY', 'Battery level dropped below 20%');
        
        console.log(`✅ Test data initialized. Created ${this.households.size} households.`);
        console.log('📱 Households created:');
        this.getAllHouseholds().forEach(h => {
            console.log(`   - ${h.name}: ${h.phone} (Balance: KES ${h.balance})`);
        });
    }
    
    // Household management
    createHousehold(data) {
        const household = {
            id: this.nextId++,
            name: data.name,
            phone: data.phone,
            location: data.location,
            balance: data.balance || 0,
            powerStatus: 'on', // 'on' or 'off'
            createdAt: new Date(),
            lastSeen: new Date()
        };
        
        this.households.set(household.id, household);
        this.sensorData.set(household.id, []);
        this.alerts.set(household.id, []);
        this.payments.set(household.id, []);
        
        console.log(`✅ Created household: ${household.name} (${household.phone})`);
        return household;
    }
    
    getHousehold(id) {
        return this.households.get(id);
    }
    
    getAllHouseholds() {
        return Array.from(this.households.values());
    }
    
    // ✅ ADD METHOD TO FIND HOUSEHOLD BY PHONE
    getHouseholdByPhone(phone) {
        return Array.from(this.households.values()).find(h => h.phone === phone);
    }
    
    updateHousehold(id, updates) {
        const household = this.households.get(id);
        if (household) {
            Object.assign(household, updates);
            household.lastSeen = new Date();
            return household;
        }
        return null;
    }
    
    // Sensor data management
    addSensorReading(householdId, data) {
        const readings = this.sensorData.get(householdId) || [];
        const reading = {
            ...data,
            timestamp: new Date(),
            id: Date.now()
        };
        
        readings.push(reading);
        
        // Keep only last 100 readings for memory efficiency
        if (readings.length > 100) {
            readings.shift();
        }
        
        this.sensorData.set(householdId, readings);
        return reading;
    }
    
    getSensorReadings(householdId, limit = 50) {
        const readings = this.sensorData.get(householdId) || [];
        return readings.slice(-limit);
    }
    
    getLastSensorReading(householdId) {
        const readings = this.sensorData.get(householdId) || [];
        return readings[readings.length - 1] || null;
    }
    
    // Alert management
    addAlert(householdId, type, message) {
        const alerts = this.alerts.get(householdId) || [];
        const alert = {
            id: Date.now(),
            type: type,
            message: message,
            timestamp: new Date(),
            read: false
        };
        
        alerts.push(alert);
        
        // Keep only last 50 alerts
        if (alerts.length > 50) {
            alerts.shift();
        }
        
        this.alerts.set(householdId, alerts);
        return alert;
    }
    
    getAlerts(householdId) {
        return this.alerts.get(householdId) || [];
    }
    
    markAlertAsRead(householdId, alertId) {
        const alerts = this.alerts.get(householdId) || [];
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
            alert.read = true;
        }
        return alert;
    }
    
    // Payment management
    addPayment(householdId, amount, method = 'airtime') {
        const payments = this.payments.get(householdId) || [];
        const payment = {
            id: Date.now(),
            amount: amount,
            method: method,
            timestamp: new Date(),
            status: 'completed'
        };
        
        payments.push(payment);
        
        // Update household balance
        const household = this.getHousehold(householdId);
        if (household) {
            household.balance += amount;
            household.lastSeen = new Date();
        }
        
        this.payments.set(householdId, payments);
        return payment;
    }
    
    getPayments(householdId) {
        return this.payments.get(householdId) || [];
    }
    
    deductBalance(householdId, amount) {
        const household = this.getHousehold(householdId);
        if (household && household.balance >= amount) {
            household.balance -= amount;
            household.lastSeen = new Date();
            return true;
        }
        return false;
    }
    
    // Power control
    setPowerStatus(householdId, status) {
        const household = this.getHousehold(householdId);
        if (household) {
            household.powerStatus = status;
            household.lastSeen = new Date();
            return household;
        }
        return null;
    }
    
    // Statistics
    getSystemStats() {
        const households = this.getAllHouseholds();
        const totalHouseholds = households.length;
        const activeHouseholds = households.filter(h => h.powerStatus === 'on').length;
        const totalBalance = households.reduce((sum, h) => sum + h.balance, 0);
        
        const allReadings = [];
        for (const readings of this.sensorData.values()) {
            allReadings.push(...readings);
        }
        
        const avgBatteryLevel = allReadings.length > 0 
            ? allReadings.reduce((sum, r) => sum + r.batteryLevel, 0) / allReadings.length 
            : 0;
        
        return {
            totalHouseholds,
            activeHouseholds,
            totalBalance,
            avgBatteryLevel: Math.round(avgBatteryLevel),
            totalAlerts: Array.from(this.alerts.values()).reduce((sum, alerts) => sum + alerts.length, 0),
            totalPayments: Array.from(this.payments.values()).reduce((sum, payments) => sum + payments.length, 0)
        };
    }
}

// Export singleton instance
module.exports = new Database();
