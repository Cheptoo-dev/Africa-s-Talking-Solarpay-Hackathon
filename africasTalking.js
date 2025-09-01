// services/africasTalking.js
const AfricasTalking = require('africastalking');

class AfricasTalkingService {
    constructor() {
        const apiKey = process.env.AFRICAS_TALKING_API_KEY || 'atsk_demo_key';
        const username = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';
        
        this.client = AfricasTalking({
            apiKey: apiKey,
            username: username
        });
        
        this.sms = this.client.SMS;
        this.voice = this.client.VOICE;
        this.airtime = this.client.AIRTIME;
        
        console.log('Africa\'s Talking service initialized');
    }
    
    async sendSMS(to, message) {
        try {
            const phoneNumber = this.formatPhoneNumber(to);
            
            const options = {
                to: phoneNumber,
                message: message,
                from: process.env.AFRICAS_TALKING_SHORTCODE || 'SolarPay'
            };
            
            console.log(`Sending SMS to ${phoneNumber}: ${message}`);
            
            if (process.env.NODE_ENV === 'demo' || !process.env.AFRICAS_TALKING_API_KEY) {
                console.log('DEMO SMS:', options);
                return {
                    SMSMessageData: {
                        Message: 'Sent to 1/1 Total Cost: KES 0.8000',
                        Recipients: [{
                            statusCode: 101,
                            number: phoneNumber,
                            status: 'Success',
                            cost: 'KES 0.8000',
                            messageId: 'demo_' + Date.now()
                        }]
                    }
                };
            }
            
            const result = await this.sms.send(options);
            console.log('SMS sent successfully:', result);
            return result;
            
        } catch (error) {
            console.error('SMS sending failed:', error);
            throw new Error(`Failed to send SMS: ${error.message}`);
        }
    }

    // ✅ FIXED: USSD handler with improved phone number matching
    async handleUSSD(sessionId, serviceCode, phoneNumber, text) {
        try {
            console.log(`🔄 USSD Session: ${sessionId}`);
            console.log(`📞 Service Code: ${serviceCode}`);
            console.log(`📱 Phone Number: ${phoneNumber}`);
            console.log(`💬 Text Input: "${text}"`);
            
            const database = require('./database');
            
            // ✅ Format the incoming phone number and try multiple formats
            const rawPhone = phoneNumber;
            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            console.log(`📱 Raw phone: "${rawPhone}" -> Formatted: "${formattedPhone}"`);
            
            // ✅ Get all households and log them for debugging
            const households = database.getAllHouseholds();
            console.log(`🏠 Total households in database: ${households.length}`);
            households.forEach(h => console.log(`   - ${h.name}: "${h.phone}"`));
            
            // ✅ Try to find household with multiple phone number formats
            let household = households.find(h => h.phone === formattedPhone);
            
            // If not found, try without the + prefix
            if (!household) {
                const phoneWithoutPlus = formattedPhone.replace('+', '');
                household = households.find(h => h.phone.replace('+', '') === phoneWithoutPlus);
                console.log(`🔄 Trying without +: "${phoneWithoutPlus}"`);
            }
            
            // If still not found, try the raw phone number
            if (!household) {
                household = households.find(h => h.phone === rawPhone);
                console.log(`🔄 Trying raw phone: "${rawPhone}"`);
            }
            
            if (!household) {
                console.log(`❌ No household found for any phone format`);
                console.log(`📋 Available phones in DB:`);
                households.forEach(h => console.log(`   - "${h.phone}"`));
                console.log(`🔍 Searched for: "${rawPhone}", "${formattedPhone}"`);
                
                return {
                    response: 'END Sorry, your phone number is not registered with SolarPay.\nContact support or check registration.',
                    endSession: true
                };
            }
            
            console.log(`✅ Found household: ${household.name} (ID: ${household.id})`);
            
            const menuPath = text.split('*').filter(item => item !== '');
            console.log('📍 Menu path:', menuPath);
            
            if (menuPath.length === 0) {
                console.log('🏠 Showing main menu');
                return {
                    response: `CON Welcome to SolarPay, ${household.name}\n1. Check Battery Level\n2. Check Balance\n3. Pay with Airtime\n4. Power Control\n5. View Alerts`,
                    endSession: false
                };
            }
            
            const choice = menuPath[0];
            console.log('🎯 User choice:', choice);
            
            switch (choice) {
                case '1': {
                    console.log('🔋 Battery level requested');
                    const lastReading = database.getLastSensorReading(household.id);
                    
                    if (!lastReading) {
                        return {
                            response: `END SolarPay Battery Status\nNo sensor data available\nPower: ${household.powerStatus.toUpperCase()}`,
                            endSession: true
                        };
                    }
                    
                    const batteryInfo = `Battery: ${lastReading.batteryLevel}%\nVoltage: ${lastReading.voltage}V\nStatus: ${lastReading.batteryLevel > 20 ? 'Good' : 'Low'}`;
                    
                    return {
                        response: `END SolarPay Battery Status\n${batteryInfo}\nPower: ${household.powerStatus.toUpperCase()}`,
                        endSession: true
                    };
                }
                
                case '2': {
                    console.log('💰 Balance requested');
                    const payments = database.getPayments(household.id);
                    const lastPayment = payments[payments.length - 1];
                    const lastPaymentText = lastPayment 
                        ? `\nLast top-up: KES ${lastPayment.amount} on ${lastPayment.timestamp.toLocaleDateString()}`
                        : '';
                    
                    return {
                        response: `END SolarPay Balance\nCurrent: KES ${household.balance.toFixed(2)}${lastPaymentText}`,
                        endSession: true
                    };
                }
                
                case '3':
                    return this.handlePaymentMenu(menuPath, household, phoneNumber, database);
                
                case '4':
                    return this.handlePowerControl(menuPath, household, database);
                
                case '5': {
                    console.log('🚨 Alerts requested');
                    const alerts = database.getAlerts(household.id);
                    const recentAlerts = alerts.slice(-3).reverse();
                    
                    if (recentAlerts.length === 0) {
                        return {
                            response: 'END No recent alerts.',
                            endSession: true
                        };
                    }
                    
                    const alertText = recentAlerts
                        .map(alert => `${alert.type}: ${alert.message.substring(0, 50)}...`)
                        .join('\n');
                    
                    return {
                        response: `END Recent Alerts:\n${alertText}`,
                        endSession: true
                    };
                }
                
                default:
                    console.log('❌ Invalid choice:', choice);
                    return {
                        response: 'END Invalid option. Please try again.',
                        endSession: true
                    };
            }
            
        } catch (error) {
            console.error('🔥 CRITICAL USSD ERROR:', error);
            console.error('Stack trace:', error.stack);
            return {
                response: 'END Service temporarily unavailable. Please try again later.',
                endSession: true
            };
        }
    }

    // ✅ New helper method for payment menu
    async handlePaymentMenu(menuPath, household, phoneNumber, database) {
        if (menuPath.length === 1) {
            return {
                response: 'CON Pay with Airtime\nSelect amount:\n1. KES 50\n2. KES 100\n3. KES 200\n4. Custom amount',
                endSession: false
            };
        } else {
            const paymentChoice = menuPath[1];
            let amount = 0;
            
            switch (paymentChoice) {
                case '1': amount = 50; break;
                case '2': amount = 100; break;
                case '3': amount = 200; break;
                case '4':
                    if (menuPath.length === 2) {
                        return {
                            response: 'CON Enter amount (KES):',
                            endSession: false
                        };
                    } else {
                        amount = parseInt(menuPath[2]) || 0;
                    }
                    break;
            }
            
            if (amount > 0 && amount <= 1000) {
                const success = await this.processAirtimePayment(phoneNumber, amount);
                if (success) {
                    database.addPayment(household.id, amount, 'airtime');
                    const updatedHousehold = database.getHousehold(household.id);
                    return {
                        response: `END Payment successful!\nKES ${amount} added to your SolarPay account.\nNew balance: KES ${updatedHousehold.balance.toFixed(2)}`,
                        endSession: true
                    };
                } else {
                    return {
                        response: 'END Payment failed. Please ensure you have sufficient airtime and try again.',
                        endSession: true
                    };
                }
            } else {
                return {
                    response: 'END Invalid amount. Please enter between KES 1-1000.',
                    endSession: true
                };
            }
        }
    }

    // ✅ New helper method for power control
    async handlePowerControl(menuPath, household, database) {
        if (menuPath.length === 1) {
            return {
                response: `CON Power Control\nCurrent: ${household.powerStatus.toUpperCase()}\n1. Turn ON\n2. Turn OFF\n3. Check Status`,
                endSession: false
            };
        } else {
            const powerChoice = menuPath[1];
            let message = '';
            
            switch (powerChoice) {
                case '1':
                    if (household.balance >= 10) {
                        database.setPowerStatus(household.id, 'on');
                        message = 'Power turned ON successfully.';
                    } else {
                        message = 'Insufficient balance. Minimum KES 10 required.';
                    }
                    break;
                case '2':
                    database.setPowerStatus(household.id, 'off');
                    message = 'Power turned OFF successfully.';
                    break;
                case '3':
                    const updatedHousehold = database.getHousehold(household.id);
                    message = `Power status: ${updatedHousehold.powerStatus.toUpperCase()}\nBalance: KES ${updatedHousehold.balance.toFixed(2)}`;
                    break;
                default:
                    message = 'Invalid option.';
            }
            
            return {
                response: `END ${message}`,
                endSession: true
            };
        }
    }

    async processAirtimePayment(phoneNumber, amount) {
        try {
            console.log(`Processing airtime payment: ${phoneNumber} -> KES ${amount}`);
            
            if (process.env.NODE_ENV === 'demo' || !process.env.AFRICAS_TALKING_API_KEY) {
                console.log('DEMO AIRTIME PAYMENT:', { phoneNumber, amount });
                return true;
            }
            
            const options = {
                recipients: [{
                    phoneNumber: this.formatPhoneNumber(phoneNumber),
                    currencyCode: 'KES',
                    amount: amount
                }]
            };
            
            const result = await this.airtime.send(options);
            console.log('Airtime payment result:', result);
            
            return result.responses?.[0]?.status === 'Success';
            
        } catch (error) {
            console.error('Airtime payment error:', error);
            return false;
        }
    }

    async makeVoiceCall(to, message) {
        try {
            const phoneNumber = this.formatPhoneNumber(to);
            
            console.log(`Making voice call to ${phoneNumber}: ${message}`);
            
            if (process.env.NODE_ENV === 'demo' || !process.env.AFRICAS_TALKING_API_KEY) {
                console.log('DEMO VOICE CALL:', { phoneNumber, message });
                return { success: true, callId: 'demo_' + Date.now() };
            }
            
            const result = await this.voice.call({
                to: phoneNumber,
                from: process.env.AFRICAS_TALKING_PHONE_NUMBER || '+254711XXXXXX'
            });
            
            console.log('Voice call initiated:', result);
            return result;
            
        } catch (error) {
            console.error('Voice call failed:', error);
            throw new Error(`Failed to make voice call: ${error.message}`);
        }
    }

    formatPhoneNumber(phoneNumber) {
        let cleaned = phoneNumber.replace(/\D/g, '');
        
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.substring(1);
        } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
            cleaned = '254' + cleaned;
        } else if (!cleaned.startsWith('254')) {
            cleaned = '254' + cleaned;
        }
        
        return '+' + cleaned;
    }
}

module.exports = new AfricasTalkingService();