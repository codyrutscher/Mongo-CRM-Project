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