import { useEffect, useCallback } from 'react';
import { logger, rum } from '../utils/datadog';
import { useLocation } from 'react-router-dom';

export const useDatadog = () => {
  const location = useLocation();

  // Log page views automatically
  useEffect(() => {
    logger.logPageView(location.pathname);
  }, [location.pathname]);

  // Utility functions for common logging scenarios
  const logUserAction = useCallback((action, details = {}) => {
    logger.logUserAction(action, details);
    rum.addUserAction(action, details);
  }, []);

  const logError = useCallback((error, context = {}) => {
    logger.logError(error, context);
    rum.addError(error, context);
  }, []);

  const logAPICall = useCallback((endpoint, method, status, duration, details = {}) => {
    logger.logAPICall(endpoint, method, status, duration, details);
  }, []);

  return {
    logUserAction,
    logError,
    logAPICall,
    logger,
    rum,
  };
};