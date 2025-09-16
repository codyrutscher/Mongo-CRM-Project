import React, { useState } from 'react';
import { Button, Card, Alert } from 'react-bootstrap';
import { getDashboardStats, getContactsByCategory } from '../services/api';

const DebugAPI = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await getDashboardStats();
      setResults(prev => ({
        ...prev,
        dashboardStats: {
          success: true,
          data: response.data
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        dashboardStats: {
          success: false,
          error: error.message
        }
      }));
    }
    setLoading(false);
  };

  const testCategoryAPI = async (category) => {
    setLoading(true);
    try {
      const response = await getContactsByCategory(category, 1, 5);
      setResults(prev => ({
        ...prev,
        [category]: {
          success: true,
          data: response.data
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [category]: {
          success: false,
          error: error.message
        }
      }));
    }
    setLoading(false);
  };

  return (
    <div className="container mt-4">
      <h2>API Debug Page</h2>
      
      <div className="mb-4">
        <h4>Test Dashboard Stats API</h4>
        <Button onClick={testDashboardStats} disabled={loading}>
          Test Dashboard Stats
        </Button>
        {results.dashboardStats && (
          <Card className="mt-2">
            <Card.Body>
              <pre>{JSON.stringify(results.dashboardStats, null, 2)}</pre>
            </Card.Body>
          </Card>
        )}
      </div>

      <div className="mb-4">
        <h4>Test Category APIs</h4>
        <div className="d-flex gap-2 mb-2">
          <Button onClick={() => testCategoryAPI('clean')} disabled={loading}>
            Test Clean Contacts
          </Button>
          <Button onClick={() => testCategoryAPI('email-only')} disabled={loading}>
            Test Email Only
          </Button>
          <Button onClick={() => testCategoryAPI('phone-only')} disabled={loading}>
            Test Phone Only
          </Button>
        </div>
        
        {['clean', 'email-only', 'phone-only'].map(category => (
          results[category] && (
            <Card key={category} className="mt-2">
              <Card.Header>{category}</Card.Header>
              <Card.Body>
                <pre>{JSON.stringify(results[category], null, 2)}</pre>
              </Card.Body>
            </Card>
          )
        ))}
      </div>

      {loading && (
        <Alert variant="info">
          Testing API...
        </Alert>
      )}
    </div>
  );
};

export default DebugAPI;