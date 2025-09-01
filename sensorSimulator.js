// IoT Sensor Data Simulator for SolarPay Demo
class SensorSimulator {
    constructor() {
        this.simulations = new Map(); // householdId -> interval
        this.sensorStates = new Map(); // householdId -> current state
    }
    
    startSimulation(householdId, callback) {
        // Initialize sensor state for this household
        const initialState = {
            batteryLevel: Math.floor(Math.random() * 60) + 40, // Start between 40-100%
            voltage: 12.0,
            current: 0.5,
            powerConsumption: 0,
            solarGeneration: 0,
            temperature: 25,
            lastUpdate: Date.now(),
            timeOfDay: this.getTimeOfDay()
        };
        
        this.sensorStates.set(householdId, initialState);
        
        // Send initial reading
        callback(this.generateReading(householdId));
        
        // Start periodic simulation (every 5 seconds for demo)
        const interval = setInterval(() => {
            const reading = this.generateReading(householdId);
            callback(reading);
        }, 5000);
        
        this.simulations.set(householdId, interval);
        console.log(`Started sensor simulation for household ${householdId}`);
    }
    
    stopSimulation(householdId) {
        const interval = this.simulations.get(householdId);
        if (interval) {
            clearInterval(interval);
            this.simulations.delete(householdId);
            this.sensorStates.delete(householdId);
            console.log(`Stopped sensor simulation for household ${householdId}`);
        }
    }
    
    stopAllSimulations() {
        for (const householdId of this.simulations.keys()) {
            this.stopSimulation(householdId);
        }
    }
    
    generateReading(householdId) {
        const state = this.sensorStates.get(householdId);
        if (!state) return null;
        
        const currentTime = Date.now();
        const timeDelta = (currentTime - state.lastUpdate) / 1000; // seconds
        
        // Simulate time of day (accelerated for demo - 1 minute = 1 hour)
        const hour = Math.floor((currentTime / (60 * 1000)) % 24);
        const isDaytime = hour >= 6 && hour <= 18;
        
        // Solar generation based on time of day
        let solarGeneration = 0;
        if (isDaytime) {
            const peakHour = 12;
            const hourFromPeak = Math.abs(hour - peakHour);
            const maxGeneration = 5.0; // 5A max
            solarGeneration = Math.max(0, maxGeneration * (1 - hourFromPeak / 6)) + 
                             (Math.random() - 0.5) * 0.5; // Add some noise
        }
        
        // Power consumption simulation (random usage patterns)
        const baseConsumption = 0.3; // Base load
        const randomLoad = Math.random() * 1.5; // Random appliances
        const powerConsumption = baseConsumption + randomLoad;
        
        // Battery level calculation
        const netCurrent = solarGeneration - powerConsumption;
        const batteryCapacity = 100; // Ah
        const deltaCharge = (netCurrent * timeDelta / 3600) / batteryCapacity * 100; // % change
        
        // Update battery level
        state.batteryLevel = Math.max(0, Math.min(100, state.batteryLevel + deltaCharge));
        
        // Voltage calculation (simplified lithium battery curve)
        const voltage = this.calculateVoltage(state.batteryLevel);
        
        // Temperature simulation
        const ambientTemp = isDaytime ? 30 + Math.random() * 10 : 20 + Math.random() * 5;
        state.temperature = ambientTemp + (powerConsumption * 2); // Heat from load
        
        // Update state
        state.voltage = voltage;
        state.current = netCurrent;
        state.powerConsumption = powerConsumption;
        state.solarGeneration = solarGeneration;
        state.lastUpdate = currentTime;
        state.timeOfDay = hour;
        
        // Return sensor reading
        return {
            batteryLevel: Math.round(state.batteryLevel * 10) / 10,
            voltage: Math.round(voltage * 100) / 100,
            current: Math.round(netCurrent * 100) / 100,
            powerConsumption: Math.round(powerConsumption * 100) / 100,
            solarGeneration: Math.round(solarGeneration * 100) / 100,
            temperature: Math.round(state.temperature * 10) / 10,
            timeOfDay: hour,
            isDaytime: isDaytime,
            timestamp: new Date()
        };
    }
    
    calculateVoltage(batteryLevel) {
        // Simplified lithium battery voltage curve
        if (batteryLevel >= 90) return 12.6 + (batteryLevel - 90) * 0.02;
        if (batteryLevel >= 50) return 12.2 + (batteryLevel - 50) * 0.01;
        if (batteryLevel >= 20) return 11.8 + (batteryLevel - 20) * 0.013;
        return 11.0 + batteryLevel * 0.04;
    }
    
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }
    
    // Manual control for demo purposes
    setBatteryLevel(householdId, level) {
        const state = this.sensorStates.get(householdId);
        if (state) {
            state.batteryLevel = Math.max(0, Math.min(100, level));
            return true;
        }
        return false;
    }
    
    simulatePowerCut(householdId) {
        const state = this.sensorStates.get(householdId);
        if (state) {
            state.solarGeneration = 0;
            state.powerConsumption *= 0.1; // Minimal standby power
            return true;
        }
        return false;
    }
}

module.exports = new SensorSimulator(); 
