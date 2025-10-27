const axios = require('axios');

// Your Railway webhook URL
const WEBHOOK_URL = 'https://your-railway-app.up.railway.app/api/webhooks/hubspot';

// Test webhook payload (simulates HubSpot webhook)
const testPayload = [
  {
    subscriptionType: 'contact',
    eventType: 'contact.propertyChange',
    objectId: '12345',
    propertyName: 'firstname',
    changeSource: 'CRM',
    subscriptionId: 12345,
    portalId: 21093594,
    occurredAt: Date.now()
  }
];

async function testWebhook() {
  try {
    console.log('🧪 Testing webhook endpoint...');
    console.log('📡 URL:', WEBHOOK_URL);
    console.log('📋 Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await axios.post(WEBHOOK_URL, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-HubSpot-Signature': 'test-signature',
        'X-HubSpot-Request-Timestamp': Date.now().toString()
      }
    });
    
    console.log('✅ Webhook test successful!');
    console.log('📊 Response:', response.data);
    
  } catch (error) {
    console.error('❌ Webhook test failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data);
    console.error('URL:', error.config?.url);
  }
}

testWebhook();