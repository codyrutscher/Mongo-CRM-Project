import { datadogLogs } from '@datadog/browser-logs';
import { datadogRum } from '@datadog/browser-rum';

// Initialize Datadog Logs
export const initializeDatadog = () => {
  console.log('Starting Datadog initialization...');
  
  if (!process.env.REACT_APP_DATADOG_CLIENT_TOKEN) {
    console.error('DATADOG ERROR: REACT_APP_DATADOG_CLIENT_TOKEN is not set');
    throw new Error('Datadog client token is required');
  }

  try {
    // Initialize Logs (always required)
    const logsConfig = {
      clientToken: process.env.REACT_APP_DATADOG_CLIENT_TOKEN,
      site: process.env.REACT_APP_DATADOG_SITE || 'datadoghq.com',
      forwardErrorsToLogs: true,
      sessionSampleRate: 100,
      service: 'prospere-crm-frontend',
      env: process.env.REACT_APP_ENVIRONMENT || 'development',
      version: process.env.REACT_APP_VERSION || '1.0.0',
    };
    
    console.log('Initializing Datadog Logs with config:', {
      ...logsConfig,
      clientToken: '***HIDDEN***'
    });
    
    datadogLogs.init(logsConfig);
    console.log('Datadog Logs initialized successfully');

    // Initialize RUM (Real User Monitoring) - only if Application ID is provided
    if (process.env.REACT_APP_DATADOG_APPLICATION_ID) {
      console.log('Initializing Datadog RUM...');
      datadogRum.init({
        applicationId: process.env.REACT_APP_DATADOG_APPLICATION_ID,
        clientToken: process.env.REACT_APP_DATADOG_CLIENT_TOKEN,
        site: process.env.REACT_APP_DATADOG_SITE || 'datadoghq.com',
        service: 'prospere-crm-frontend',
        env: process.env.REACT_APP_ENVIRONMENT || 'development',
        version: process.env.REACT_APP_VERSION || '1.0.0',
        sessionSampleRate: 100,
        sessionReplaySampleRate: 20,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input',
      });
      console.log('Datadog RUM initialized successfully');
    } else {
      console.log('Skipping RUM initialization (no Application ID provided)');
    }
  } catch (error) {
    console.error('Error during Datadog initialization:', error);
    throw error;
  }
};

// Logger utility functions
export const logger = {
  info: (message, context = {}) => {
    console.log('DATADOG LOG (INFO):', message, context);
    try {
      datadogLogs.logger.info(message, context);
    } catch (error) {
      console.error('Failed to send info log to Datadog:', error);
    }
  },
  
  warn: (message, context = {}) => {
    console.log('DATADOG LOG (WARN):', message, context);
    try {
      datadogLogs.logger.warn(message, context);
    } catch (error) {
      console.error('Failed to send warn log to Datadog:', error);
    }
  },
  
  error: (message, context = {}) => {
    console.log('DATADOG LOG (ERROR):', message, context);
    try {
      datadogLogs.logger.error(message, context);
    } catch (error) {
      console.error('Failed to send error log to Datadog:', error);
    }
  },
  
  debug: (message, context = {}) => {
    console.log('DATADOG LOG (DEBUG):', message, context);
    try {
      datadogLogs.logger.debug(message, context);
    } catch (error) {
      console.error('Failed to send debug log to Datadog:', error);
    }
  },

  // Custom methods for common CRM actions
  logUserAction: (action, details = {}) => {
    datadogLogs.logger.info('User Action', {
      action,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },

  logAPICall: (endpoint, method, status, duration, details = {}) => {
    datadogLogs.logger.info('API Call', {
      endpoint,
      method,
      status,
      duration,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },

  logError: (error, context = {}) => {
    datadogLogs.logger.error('Application Error', {
      error: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date().toISOString(),
    });
  },

  logPageView: (page, user = null) => {
    datadogLogs.logger.info('Page View', {
      page,
      user,
      timestamp: new Date().toISOString(),
    });
  },
};

// RUM utilities (only work if RUM is initialized)
export const rum = {
  addUserAction: (name, context = {}) => {
    if (process.env.REACT_APP_DATADOG_APPLICATION_ID) {
      datadogRum.addAction(name, context);
    }
  },
  
  addError: (error, context = {}) => {
    if (process.env.REACT_APP_DATADOG_APPLICATION_ID) {
      datadogRum.addError(error, context);
    }
  },
  
  setUser: (user) => {
    if (process.env.REACT_APP_DATADOG_APPLICATION_ID) {
      datadogRum.setUser(user);
    }
  },
  
  addAttribute: (key, value) => {
    if (process.env.REACT_APP_DATADOG_APPLICATION_ID) {
      datadogRum.addAttribute(key, value);
    }
  },
};