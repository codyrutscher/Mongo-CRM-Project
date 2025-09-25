import axios from 'axios';
import { logger } from './datadog';

// Create axios instance with interceptors
const apiClient = axios.create();

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add request timestamp for duration calculation
    config.metadata = { startTime: new Date() };
    
    logger.debug('API Request Started', {
      url: config.url,
      method: config.method?.toUpperCase(),
      headers: config.headers,
    });
    
    return config;
  },
  (error) => {
    logger.logError(error, { type: 'request_error' });
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime;
    
    logger.logAPICall(
      response.config.url,
      response.config.method?.toUpperCase(),
      response.status,
      duration,
      {
        responseSize: JSON.stringify(response.data).length,
        success: true,
      }
    );
    
    return response;
  },
  (error) => {
    const duration = error.config?.metadata ? 
      new Date() - error.config.metadata.startTime : 0;
    
    logger.logAPICall(
      error.config?.url || 'unknown',
      error.config?.method?.toUpperCase() || 'unknown',
      error.response?.status || 0,
      duration,
      {
        error: error.message,
        success: false,
      }
    );
    
    logger.logError(error, { 
      type: 'api_error',
      url: error.config?.url,
      status: error.response?.status,
    });
    
    return Promise.reject(error);
  }
);

export default apiClient;