import React, { useState } from 'react';
import { Card, Button, Alert, Form } from 'react-bootstrap';

const DebugPanel = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceName, setSourceName] = useState('');
  const [segmentId, setSegmentId] = useState('');

  // CSV Upload Debug
  const debugCSVUpload = async () => {
    if (!selectedFile) {
      alert('Please select a CSV file first');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sourceName', sourceName || 'debug_test');

      console.log('=== FRONTEND CSV UPLOAD DEBUG ===');
      console.log('File:', selectedFile);
      console.log('Source name:', sourceName);
      console.log('FormData entries:', Array.from(formData.entries()));

      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('Upload response:', data);

      setResults(prev => ({
        ...prev,
        csvUpload: {
          success: response.ok,
          status: response.status,
          data: data,
          timestamp: new Date().toISOString()
        }
      }));

    } catch (error) {
      console.error('CSV Upload Error:', error);
      setResults(prev => ({
        ...prev,
        csvUpload: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    }
    setLoading(false);
  };

  // Segment Export Debug
  const debugSegmentExport = async () => {
    if (!segmentId) {
      alert('Please enter a segment ID');
      return;
    }

    setLoading(true);
    try {
      console.log('=== FRONTEND SEGMENT EXPORT DEBUG ===');
      console.log('Segment ID:', segmentId);

      const response = await fetch(`/api/segments/${segmentId}/export?format=csv`);
      const data = await response.json();
      
      console.log('Export response status:', response.status);
      console.log('Export response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Export response data:', data);

      setResults(prev => ({
        ...prev,
        segmentExport: {
          success: response.ok,
          status: response.status,
          data: data,
          timestamp: new Date().toISOString()
        }
      }));

    } catch (error) {
      console.error('Segment Export Error:', error);
      setResults(prev => ({
        ...prev,
        segmentExport: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    }
    setLoading(false);
  };

  // Debug Segment Details
  const debugSegmentDetails = async () => {
    if (!segmentId) {
      alert('Please enter a segment ID');
      return;
    }

    setLoading(true);
    try {
      console.log('=== SEGMENT DETAILS DEBUG ===');
      console.log('Segment ID:', segmentId);

      const response = await fetch(`/api/segments/${segmentId}/debug`);
      const data = await response.json();
      
      console.log('Debug response:', data);

      setResults(prev => ({
        ...prev,
        segmentDebug: {
          success: response.ok,
          status: response.status,
          data: data,
          timestamp: new Date().toISOString()
        }
      }));

    } catch (error) {
      console.error('Segment Debug Error:', error);
      setResults(prev => ({
        ...prev,
        segmentDebug: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    }
    setLoading(false);
  };

  // Debug Dashboard Stats
  const debugDashboardStats = async () => {
    setLoading(true);
    try {
      console.log('=== DASHBOARD STATS DEBUG ===');

      const response = await fetch('/api/contacts/debug-stats');
      const data = await response.json();
      
      console.log('Debug stats response:', data);

      setResults(prev => ({
        ...prev,
        dashboardStats: {
          success: response.ok,
          status: response.status,
          data: data,
          timestamp: new Date().toISOString()
        }
      }));

    } catch (error) {
      console.error('Dashboard Stats Debug Error:', error);
      setResults(prev => ({
        ...prev,
        dashboardStats: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    }
    setLoading(false);
  };

  // Comprehensive System Debug - Test multiple things at once
  const debugAllSystems = async () => {
    setLoading(true);
    const debugResults = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      console.log('=== COMPREHENSIVE SYSTEM DEBUG ===');

      // Test 1: Dashboard Stats
      try {
        console.log('Testing dashboard stats...');
        const statsResponse = await fetch('/api/contacts/debug-stats');
        const statsData = await statsResponse.json();
        debugResults.tests.push({
          name: 'Dashboard Stats',
          success: statsResponse.ok,
          status: statsResponse.status,
          data: statsData,
          error: statsResponse.ok ? null : statsData.error
        });
      } catch (error) {
        debugResults.tests.push({
          name: 'Dashboard Stats',
          success: false,
          error: error.message
        });
      }

      // Test 2: Segments List
      try {
        console.log('Testing segments list...');
        const segmentsResponse = await fetch('/api/segments');
        const segmentsData = await segmentsResponse.json();
        debugResults.tests.push({
          name: 'Segments List',
          success: segmentsResponse.ok,
          status: segmentsResponse.status,
          data: { segmentCount: segmentsData.data?.length || 0 },
          error: segmentsResponse.ok ? null : segmentsData.error
        });
      } catch (error) {
        debugResults.tests.push({
          name: 'Segments List',
          success: false,
          error: error.message
        });
      }

      // Test 3: CSV Uploads List
      try {
        console.log('Testing CSV uploads...');
        const csvResponse = await fetch('/api/contacts/csv-uploads');
        const csvData = await csvResponse.json();
        debugResults.tests.push({
          name: 'CSV Uploads',
          success: csvResponse.ok,
          status: csvResponse.status,
          data: { csvCount: csvData.data?.length || 0 },
          error: csvResponse.ok ? null : csvData.error
        });
      } catch (error) {
        debugResults.tests.push({
          name: 'CSV Uploads',
          success: false,
          error: error.message
        });
      }

      // Test 4: Contact Stats
      try {
        console.log('Testing contact stats...');
        const contactStatsResponse = await fetch('/api/contacts/stats');
        const contactStatsData = await contactStatsResponse.json();
        debugResults.tests.push({
          name: 'Contact Stats',
          success: contactStatsResponse.ok,
          status: contactStatsResponse.status,
          data: { totalContacts: contactStatsData.data?.total || 0 },
          error: contactStatsResponse.ok ? null : contactStatsData.error
        });
      } catch (error) {
        debugResults.tests.push({
          name: 'Contact Stats',
          success: false,
          error: error.message
        });
      }

      // Test 5: Segment Export (if segmentId provided)
      if (segmentId) {
        try {
          console.log('Testing segment export...');
          const exportResponse = await fetch(`/api/segments/${segmentId}/export?format=csv`);
          const exportData = await exportResponse.json();
          debugResults.tests.push({
            name: 'Segment Export',
            success: exportResponse.ok,
            status: exportResponse.status,
            data: exportData,
            error: exportResponse.ok ? null : exportData.error
          });
        } catch (error) {
          debugResults.tests.push({
            name: 'Segment Export',
            success: false,
            error: error.message
          });
        }

        // Test 6: Segment Debug
        try {
          console.log('Testing segment debug...');
          const debugResponse = await fetch(`/api/segments/${segmentId}/debug`);
          const debugData = await debugResponse.json();
          debugResults.tests.push({
            name: 'Segment Debug',
            success: debugResponse.ok,
            status: debugResponse.status,
            data: debugData,
            error: debugResponse.ok ? null : debugData.error
          });
        } catch (error) {
          debugResults.tests.push({
            name: 'Segment Debug',
            success: false,
            error: error.message
          });
        }
      }

      // Summary
      const successCount = debugResults.tests.filter(t => t.success).length;
      const totalTests = debugResults.tests.length;
      debugResults.summary = {
        total: totalTests,
        passed: successCount,
        failed: totalTests - successCount,
        passRate: Math.round((successCount / totalTests) * 100)
      };

      console.log('Comprehensive debug completed:', debugResults);

      setResults(prev => ({
        ...prev,
        comprehensiveDebug: {
          success: true,
          data: debugResults,
          timestamp: new Date().toISOString()
        }
      }));

    } catch (error) {
      console.error('Comprehensive Debug Error:', error);
      setResults(prev => ({
        ...prev,
        comprehensiveDebug: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    }
    setLoading(false);
  };

  // Test CSV Upload Endpoint
  const testCSVEndpoint = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contacts/csv-uploads');
      const data = await response.json();
      
      setResults(prev => ({
        ...prev,
        csvEndpoint: {
          success: response.ok,
          status: response.status,
          data: data,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        csvEndpoint: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    }
    setLoading(false);
  };

  // Get Segments List
  const getSegmentsList = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/segments');
      const data = await response.json();
      
      setResults(prev => ({
        ...prev,
        segmentsList: {
          success: response.ok,
          status: response.status,
          data: data,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        segmentsList: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    }
    setLoading(false);
  };

  const clearResults = () => {
    setResults({});
  };

  return (
    <div className="container mt-4">
      <h2>🔧 Debug Panel - CSV Upload & Segment Export</h2>
      
      {loading && (
        <Alert variant="info">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" />
            Processing debug request...
          </div>
        </Alert>
      )}

      {/* CSV Upload Debug Section */}
      <Card className="mb-4">
        <Card.Header>
          <h4>📁 CSV Upload Debug</h4>
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>Source Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., debug_test"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>CSV File</Form.Label>
            <Form.Control
              type="file"
              accept=".csv"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
          </Form.Group>

          <div className="d-flex gap-2 mb-3">
            <Button onClick={debugCSVUpload} disabled={loading || !selectedFile}>
              🐛 Debug CSV Upload
            </Button>
            <Button onClick={testCSVEndpoint} disabled={loading} variant="outline-primary">
              📋 Test CSV List API
            </Button>
          </div>

          {results.csvUpload && (
            <Alert variant={results.csvUpload.success ? "success" : "danger"}>
              <strong>CSV Upload Result:</strong>
              <pre className="mt-2">{JSON.stringify(results.csvUpload, null, 2)}</pre>
            </Alert>
          )}

          {results.csvEndpoint && (
            <Alert variant={results.csvEndpoint.success ? "success" : "danger"}>
              <strong>CSV List API Result:</strong>
              <pre className="mt-2">{JSON.stringify(results.csvEndpoint, null, 2)}</pre>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Dashboard Stats Debug Section */}
      <Card className="mb-4">
        <Card.Header>
          <h4>📊 Dashboard Stats Debug</h4>
        </Card.Header>
        <Card.Body>
          <p>Test the dashboard statistics calculation to debug clean contacts count issues.</p>
          
          <div className="d-flex gap-2 mb-3">
            <Button onClick={debugDashboardStats} disabled={loading} variant="warning">
              🔍 Debug Dashboard Stats
            </Button>
            <Button onClick={debugAllSystems} disabled={loading} variant="danger">
              🚨 Debug All Systems
            </Button>
          </div>

          {results.dashboardStats && (
            <Alert variant={results.dashboardStats.success ? "success" : "danger"}>
              <strong>Dashboard Stats Debug Result:</strong>
              <pre className="mt-2" style={{maxHeight: '400px', overflow: 'auto'}}>
                {JSON.stringify(results.dashboardStats, null, 2)}
              </pre>
            </Alert>
          )}

          {results.comprehensiveDebug && (
            <Alert variant={results.comprehensiveDebug.success ? "success" : "danger"}>
              <strong>Comprehensive System Debug Results:</strong>
              {results.comprehensiveDebug.data?.summary && (
                <div className="mt-2 mb-3">
                  <strong>Summary: </strong>
                  {results.comprehensiveDebug.data.summary.passed}/{results.comprehensiveDebug.data.summary.total} tests passed 
                  ({results.comprehensiveDebug.data.summary.passRate}%)
                </div>
              )}
              <div style={{maxHeight: '500px', overflow: 'auto'}}>
                {results.comprehensiveDebug.data?.tests?.map((test, index) => (
                  <div key={index} className={`p-2 mb-2 border rounded ${test.success ? 'border-success bg-light' : 'border-danger bg-danger bg-opacity-10'}`}>
                    <strong>{test.success ? '✅' : '❌'} {test.name}</strong>
                    {test.error && <div className="text-danger mt-1">Error: {test.error}</div>}
                    {test.data && (
                      <details className="mt-1">
                        <summary>View Details</summary>
                        <pre className="mt-1 small">{JSON.stringify(test.data, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </Alert>
          )}

          <div className="mt-3">
            <h6>📋 Instructions:</h6>
            <ul>
              <li>Click "Debug Dashboard Stats" to run comprehensive stats analysis</li>
              <li>Click "Debug All Systems" to test all endpoints and show all errors at once</li>
              <li>Check browser console for detailed step-by-step breakdown</li>
              <li>Look for clean contacts calculation and field existence analysis</li>
              <li>Verify source counts and totals match expectations</li>
            </ul>
          </div>
        </Card.Body>
      </Card>

      {/* Segment Export Debug Section */}
      <Card className="mb-4">
        <Card.Header>
          <h4>📦 Segment Export Debug</h4>
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>Segment ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., 507f1f77bcf86cd799439011"
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
            />
          </Form.Group>

          <div className="d-flex gap-2 mb-3">
            <Button onClick={debugSegmentExport} disabled={loading || !segmentId}>
              🐛 Debug Segment Export
            </Button>
            <Button onClick={debugSegmentDetails} disabled={loading || !segmentId} variant="info">
              🔍 Debug Segment Details
            </Button>
            <Button onClick={getSegmentsList} disabled={loading} variant="outline-primary">
              📋 Get Segments List
            </Button>
          </div>

          {results.segmentExport && (
            <Alert variant={results.segmentExport.success ? "success" : "danger"}>
              <strong>Segment Export Result:</strong>
              <pre className="mt-2">{JSON.stringify(results.segmentExport, null, 2)}</pre>
            </Alert>
          )}

          {results.segmentDebug && (
            <Alert variant={results.segmentDebug.success ? "success" : "danger"}>
              <strong>Segment Debug Details:</strong>
              <pre className="mt-2">{JSON.stringify(results.segmentDebug, null, 2)}</pre>
            </Alert>
          )}

          {results.segmentsList && (
            <Alert variant={results.segmentsList.success ? "success" : "danger"}>
              <strong>Segments List Result:</strong>
              <pre className="mt-2">{JSON.stringify(results.segmentsList, null, 2)}</pre>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Controls */}
      <div className="d-flex gap-2 mb-4">
        <Button onClick={clearResults} variant="outline-secondary">
          🗑️ Clear Results
        </Button>
        <Button 
          onClick={() => window.open('/debug', '_blank')} 
          variant="outline-info"
        >
          🔍 Open Full Debug Page
        </Button>
      </div>

      {/* Instructions */}
      <Card>
        <Card.Header>
          <h5>📖 Debug Instructions</h5>
        </Card.Header>
        <Card.Body>
          <h6>CSV Upload Issues:</h6>
          <ul>
            <li>Select a CSV file and enter a source name</li>
            <li>Click "Debug CSV Upload" to see detailed logs</li>
            <li>Check browser console for frontend logs</li>
            <li>Check server logs for backend processing details</li>
          </ul>

          <h6>Segment Export Issues:</h6>
          <ul>
            <li>Get a segment ID from "Get Segments List" first</li>
            <li>Enter the segment ID and click "Debug Segment Export"</li>
            <li>Check if the response shows chunking or direct download</li>
            <li>Look for error messages in the response</li>
          </ul>

          <h6>What to Look For:</h6>
          <ul>
            <li><strong>Status Codes:</strong> 200 = success, 400 = bad request, 500 = server error</li>
            <li><strong>Error Messages:</strong> Specific error details in the response</li>
            <li><strong>Data Counts:</strong> How many contacts were processed/found</li>
            <li><strong>Console Logs:</strong> Detailed step-by-step processing info</li>
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DebugPanel;