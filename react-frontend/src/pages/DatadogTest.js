import React from 'react';
import { Container, Button, Card } from 'react-bootstrap';
import { logger } from '../utils/datadog';

const DatadogTest = () => {
  const testLogs = () => {
    console.log('Testing Datadog logs...');
    
    logger.info('Test Info Log', { 
      test: true, 
      timestamp: new Date().toISOString(),
      page: 'datadog-test'
    });
    
    logger.warn('Test Warning Log', { 
      test: true, 
      level: 'warning' 
    });
    
    logger.error('Test Error Log', { 
      test: true, 
      level: 'error' 
    });
    
    logger.debug('Test Debug Log', { 
      test: true, 
      level: 'debug' 
    });
    
    alert('Test logs sent! Check browser console and Datadog in a few minutes.');
  };

  const testError = () => {
    try {
      throw new Error('This is a test error for Datadog');
    } catch (error) {
      logger.error('Caught test error', {
        error: error.message,
        stack: error.stack,
        test: true
      });
      alert('Test error logged! Check Datadog logs.');
    }
  };

  return (
    <Container className="mt-4">
      <Card>
        <Card.Header>
          <h3>Datadog Logging Test</h3>
        </Card.Header>
        <Card.Body>
          <p>Use these buttons to test if Datadog logging is working:</p>
          
          <div className="d-grid gap-2">
            <Button variant="primary" onClick={testLogs}>
              Send Test Logs
            </Button>
            
            <Button variant="danger" onClick={testError}>
              Test Error Logging
            </Button>
          </div>
          
          <hr />
          
          <h5>Environment Variables Status:</h5>
          <ul>
            <li>Client Token: {process.env.REACT_APP_DATADOG_CLIENT_TOKEN ? '✅ Set' : '❌ Not Set'}</li>
            <li>Site: {process.env.REACT_APP_DATADOG_SITE || 'datadoghq.com'}</li>
            <li>Environment: {process.env.REACT_APP_ENVIRONMENT || 'development'}</li>
            <li>Version: {process.env.REACT_APP_VERSION || '1.0.0'}</li>
            <li>Application ID: {process.env.REACT_APP_DATADOG_APPLICATION_ID ? '✅ Set' : '❌ Not Set (RUM disabled)'}</li>
          </ul>
          
          <hr />
          
          <small className="text-muted">
            After clicking the buttons, check:
            <br />1. Browser console for debug messages
            <br />2. Datadog Log Explorer (may take 1-2 minutes to appear)
            <br />3. Filter by: service:prospere-crm-frontend @test:true
          </small>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DatadogTest;