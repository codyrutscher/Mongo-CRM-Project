import React, { useState } from 'react';
import { Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { uploadContacts } from '../services/api';

const CSVUpload = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [sourceName, setSourceName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError('');
    setUploadResult(null);
    
    // Auto-generate source name from filename if not set
    if (selectedFile && !sourceName) {
      const name = selectedFile.name.replace(/\.[^/.]+$/, "");
      setSourceName(name);
    }
  };

  const handleSourceNameChange = (e) => {
    setSourceName(e.target.value);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!sourceName.trim()) {
      setError('Please enter a source name');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceName', sourceName.trim());

      const response = await uploadContacts(formData);

      if (response.data.success) {
        setUploadResult(response.data);
        setFile(null);
        setSourceName('');
        
        // Reset file input
        const fileInput = document.getElementById('csvFileInput');
        if (fileInput) fileInput.value = '';

        if (onUploadComplete) {
          onUploadComplete(response.data);
        }
      } else {
        setError(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFile(null);
    setSourceName('');
    setError('');
    setUploadResult(null);
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput) fileInput.value = '';
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">
          <i className="fas fa-upload"></i> Upload CSV Contacts
        </h5>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {uploadResult && (
          <Alert variant="success" dismissible onClose={() => setUploadResult(null)}>
            <strong>Upload Successful!</strong>
            <ul className="mb-0 mt-2">
              <li>Total Processed: {uploadResult.stats.totalProcessed}</li>
              <li>Successfully Saved: {uploadResult.stats.successful}</li>
              {uploadResult.stats.errors > 0 && (
                <li>Errors: {uploadResult.stats.errors}</li>
              )}
            </ul>
          </Alert>
        )}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Source Name *</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., Deal Maverick, Lead Source Name"
              value={sourceName}
              onChange={handleSourceNameChange}
              disabled={uploading}
            />
            <Form.Text className="text-muted">
              This will be used to identify this upload in the dashboard and reports.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>CSV File *</Form.Label>
            <Form.Control
              id="csvFileInput"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <Form.Text className="text-muted">
              Supported formats: CSV, Excel (.xlsx, .xls)
            </Form.Text>
          </Form.Group>

          {uploading && (
            <div className="mb-3">
              <div className="d-flex justify-content-between mb-1">
                <small>Uploading...</small>
                <small>{uploadProgress}%</small>
              </div>
              <ProgressBar now={uploadProgress} />
            </div>
          )}

          <div className="d-flex gap-2">
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={!file || !sourceName.trim() || uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <i className="fas fa-upload"></i> Upload Contacts
                </>
              )}
            </Button>
            
            <Button
              variant="outline-secondary"
              onClick={resetForm}
              disabled={uploading}
            >
              <i className="fas fa-times"></i> Clear
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default CSVUpload;