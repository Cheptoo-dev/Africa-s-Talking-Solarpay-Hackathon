// ussd.js
const express = require('express');
const router = express.Router();

// Import your USSD business logic service
const africasTalking = require('../services/africasTalking');

/**
 * USSD Callback - Endpoint hit by Africa's Talking
 * DO NOT return JSON or HTML — must be text/plain with CON/END
 */
router.post('/callback', async (req, res) => {
    try {
        console.log('📥 USSD Callback received:', JSON.stringify(req.body, null, 2));

        const { sessionId, serviceCode, phoneNumber, text } = req.body;

        // Validate required fields
        if (!sessionId || !serviceCode || !phoneNumber) {
            console.error('❌ Missing required USSD parameters:', { sessionId, serviceCode, phoneNumber });
            return res.status(400)
                      .set('Content-Type', 'text/plain')
                      .send('END Invalid request. Missing required data.');
        }

        // Normalize input
        const userInput = text ? text.trim() : '';

        // Delegate logic to service
        const result = await africasTalking.handleUSSD(sessionId, serviceCode, phoneNumber, userInput);

        // Ensure response is a string
        let responseMessage = result?.response;
        if (typeof responseMessage !== 'string') {
            console.error('❌ handleUSSD did not return a string:', result);
            responseMessage = 'END Service error. Please try again.';
        }

        // Trim and send as plain text
        responseMessage = responseMessage.trim();

        // Set correct headers and respond
        res.set('Content-Type', 'text/plain');
        res.send(responseMessage);

        // Log successful response
        console.log(`📤 Responded to ${phoneNumber}: ${responseMessage.substring(0, 100)}...`);

    } catch (error) {
        console.error('🔥 Critical USSD callback error:', error);
        res.set('Content-Type', 'text/plain');
        res.send('END Service temporarily unavailable. Please try again later.');
    }
});

/**
 * Demo Endpoint - Test USSD flow without dialing
 * Use this for frontend, Postman, or testing
 */
router.post('/demo', async (req, res) => {
    try {
        const { phoneNumber, text, sessionId } = req.body;

        // Use defaults for testing
        const demoSessionId = sessionId || `demo_${Date.now()}`;
        const demoServiceCode = '*384*71176#'; // Your actual shortcode
        const demoPhoneNumber = phoneNumber || '+254711111111';
        const demoText = (text || '').trim();

        console.log('🧪 Demo USSD request:', { demoSessionId, demoServiceCode, demoPhoneNumber, demoText });

        const result = await africasTalking.handleUSSD(demoSessionId, demoServiceCode, demoPhoneNumber, demoText);

        const responseMessage = typeof result?.response === 'string' ? result.response.trim() : 'END Error';

        res.json({
            success: true,
            sessionId: demoSessionId,
            phoneNumber: demoPhoneNumber,
            text: demoText,
            response: responseMessage,
            endSession: responseMessage.startsWith('END'),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('🐞 Demo USSD error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            response: 'END Service is currently unavailable.',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Health Check - Confirm USSD service is running
 */
router.get('/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'USSD service is live and healthy',
        service: 'Africa\'s Talking USSD Handler',
        endpoints: {
            callback: 'POST /ussd/callback - Africa\'s Talking webhook',
            demo: 'POST /ussd/demo - Simulate USSD interaction',
            test: 'GET /ussd/test - Health check'
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
