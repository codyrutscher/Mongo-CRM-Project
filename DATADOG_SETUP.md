# Datadog Client-Side Logging Setup

This document explains how to set up and use Datadog logging in the Prospere CRM frontend application.

## Prerequisites

1. A Datadog account
2. A Datadog organization with RUM (Real User Monitoring) enabled
3. Client token and Application ID from Datadog

## Getting Datadog Credentials

### 1. Get Client Token
1. Go to Datadog → Organization Settings → Client Tokens
2. Create a new client token or use an existing one
3. Copy the token value

### 2. Get Application ID (for RUM)
1. Go to Datadog → UX Monitoring → RUM Applications
2. Create a new application or select existing one
3. Copy the Application ID

### 3. Determine Your Datadog Site
- US1: `datadoghq.com` (default)
- US3: `us3.datadoghq.com`
- US5: `us5.datadoghq.com`
- EU1: `datadoghq.eu`
- AP1: `ap1.datadoghq.com`
- GOV: `ddog-gov.com`

## Environment Configuration

Create a `.env` file in the `react-frontend` directory with the following variables:

```bash
# Datadog Configuration
REACT_APP_DATADOG_CLIENT_TOKEN=your_actual_client_token_here
REACT_APP_DATADOG_APPLICATION_ID=your_actual_application_id_here
REACT_APP_DATADOG_SITE=datadoghq.com
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
```

## Installation

The required packages are already added to package.json:
- `@datadog/browser-logs`
- `@datadog/browser-rum`

Install dependencies:
```bash
cd react-frontend
npm install
```

## Usage Examples

### Basic Logging
```javascript
import { logger } from '../utils/datadog';

// Info log
logger.info('User performed action', { action: 'button_click', page: 'dashboard' });

// Error log
logger.error('API call failed', { endpoint: '/api/contacts', error: 'Network timeout' });

// Warning log
logger.warn('Slow API response', { endpoint: '/api/contacts', duration: 5000 });
```

### Using the Custom Hook
```javascript
import { useDatadog } from '../hooks/useDatadog';

function MyComponent() {
  const { logUserAction, logError } = useDatadog();

  const handleButtonClick = () => {
    logUserAction('button_clicked', { 
      buttonName: 'export_contacts',
      page: 'contacts_list' 
    });
  };

  const handleError = (error) => {
    logError(error, { 
      component: 'MyComponent',
      action: 'data_fetch' 
    });
  };

  return <button onClick={handleButtonClick}>Export</button>;
}
```

### API Call Logging
The axios interceptor automatically logs all API calls. To use it:

```javascript
import apiClient from '../utils/axiosInterceptor';

// This will automatically log the request and response
const response = await apiClient.get('/api/contacts');
```

### Custom Logging Methods
```javascript
import { logger } from '../utils/datadog';

// Log user actions
logger.logUserAction('contact_created', {
  contactId: '12345',
  source: 'manual_entry',
  category: 'lead'
});

// Log API calls manually
logger.logAPICall('/api/contacts', 'POST', 201, 1200, {
  contactsCreated: 5,
  source: 'csv_import'
});

// Log page views (automatically done by useDatadog hook)
logger.logPageView('/dashboard', { userId: 'user123' });
```

## What Gets Logged Automatically

1. **Page Views**: Every route change is logged
2. **API Calls**: All HTTP requests/responses via axios interceptor
3. **Errors**: JavaScript errors and exceptions
4. **User Actions**: Login attempts, form submissions, button clicks (when implemented)
5. **Performance**: Page load times, resource loading (via RUM)

## Viewing Logs in Datadog

### Log Explorer
1. Go to Datadog → Logs → Log Explorer
2. Filter by service: `service:prospere-crm-frontend`
3. Use these common filters:
   - `@action:login_attempt` - View login attempts
   - `@action:api_call` - View API calls
   - `@level:error` - View errors only
   - `@page:/dashboard` - View dashboard-specific logs

### RUM Dashboard
1. Go to Datadog → UX Monitoring → RUM Applications
2. Select your application
3. View user sessions, page performance, and errors

## Common Log Attributes

All logs include these standard attributes:
- `service`: prospere-crm-frontend
- `env`: development/staging/production
- `version`: Application version
- `timestamp`: ISO timestamp
- `session_id`: User session identifier
- `user_id`: Authenticated user ID (when available)

## Custom Attributes for CRM

- `action`: Type of user action (login_attempt, contact_created, etc.)
- `page`: Current page/route
- `endpoint`: API endpoint for API calls
- `method`: HTTP method
- `status`: HTTP status code
- `duration`: Request/action duration in milliseconds
- `contactId`: Contact identifier for contact-related actions
- `source`: Data source (hubspot, csv, manual, etc.)
- `category`: Contact category or classification

## Best Practices

1. **Don't Log Sensitive Data**: Never log passwords, tokens, or PII
2. **Use Structured Logging**: Always include relevant context
3. **Log User Actions**: Track important user interactions
4. **Monitor Performance**: Log slow operations and API calls
5. **Error Context**: Include enough context to debug issues

## Troubleshooting

### Logs Not Appearing
1. Check environment variables are set correctly
2. Verify client token has correct permissions
3. Check browser console for initialization errors
4. Ensure Datadog site URL is correct for your region

### RUM Not Working
1. Verify Application ID is correct
2. Check that RUM is enabled in your Datadog organization
3. Ensure the application is properly configured in Datadog

### Performance Impact
- Datadog logging is asynchronous and shouldn't impact performance
- Logs are batched and sent periodically
- Consider reducing sample rates in high-traffic environments

## Example Queries for Log Explorer

```
# All frontend logs
service:prospere-crm-frontend

# Login attempts
service:prospere-crm-frontend @action:login_attempt

# API errors
service:prospere-crm-frontend @action:api_call @success:false

# Slow API calls (over 2 seconds)
service:prospere-crm-frontend @action:api_call @duration:>2000

# User actions by specific user
service:prospere-crm-frontend @user.id:user123

# Errors on specific page
service:prospere-crm-frontend @level:error @page:/dashboard
```

## Integration with Alerts

You can set up Datadog alerts based on these logs:
1. High error rates
2. Slow API responses
3. Failed login attempts
4. Application crashes

This setup provides comprehensive visibility into your frontend application's behavior and user interactions.