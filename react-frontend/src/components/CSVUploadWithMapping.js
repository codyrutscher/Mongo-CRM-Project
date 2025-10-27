import React, { useState } from 'react';
import { Card, Form, Button, Alert, ProgressBar, Table, Modal } from 'react-bootstrap';
import { uploadContacts } from '../services/api';

const CSVUploadWithMapping = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [sourceName, setSourceName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');
  
  // Field mapping state
  const [showMapping, setShowMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [previewData, setPreviewData] = useState([]);

  // Available CRM fields
  const crmFields = [
    { value: '', label: '-- Skip This Column --' },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'jobTitle', label: 'Job Title' },
    { value: 'contactLinkedInProfile', label: 'LinkedIn Profile' },
    { value: 'company', label: 'Company Name' },
    { value: 'companyWebsiteURL', label: 'Company Website' },
    { value: 'industry', label: 'Industry' },
    { value: 'naicsCode', label: 'NAICS Code' },
    { value: 'numberOfEmployees', label: 'Number of Employees' },
    { value: 'yearCompanyEstablished', label: 'Year Established' },
    { value: 'companyPhoneNumber', label: 'Company Phone' },
    { value: 'companyStreetAddress', label: 'Company Street Address' },
    { value: 'companyCity', label: 'Company City' },
    { value: 'companyState', label: 'Company State' },
    { value: 'companyZipCode', label: 'Company Zip Code' },
    { value: 'leadSource', label: 'Lead Source' },
    { value: 'campaignCategory', label: 'Campaign Category' },
    { value: 'campaignType', label: 'Campaign Type (Buyer/Seller/CRE/Exit Factor)' },
    { value: 'campaignStatus', label: 'Campaign Status (Delivered/Unsubscribed/etc)' },
  ];

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError('');
    setUploadResult(null);
    
    if (selectedFile) {
      // Auto-generate source name
      const name = selectedFile.name.replace(/\.[^/.]+$/, "");
      setSourceName(name);
      
      // Parse CSV headers
      await parseCSVHeaders(selectedFile);
    }
  };

  const parseCSVHeaders = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          setCsvHeaders(headers);
          
          // Auto-map common fields
          const autoMapping = {};
          headers.forEach(header => {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('first') && lowerHeader.includes('name')) autoMapping[header] = 'firstName';
            else if (lowerHeader.includes('last') && lowerHeader.includes('name')) autoMapping[header] = 'lastName';
            else if (lowerHeader.includes('email')) autoMapping[header] = 'email';
            else if (lowerHeader.includes('phone') && !lowerHeader.includes('company')) autoMapping[header] = 'phone';
            else if (lowerHeader.includes('job') && lowerHeader.includes('title')) autoMapping[header] = 'jobTitle';
            else if (lowerHeader.includes('linkedin')) autoMapping[header] = 'contactLinkedInProfile';
            else if (lowerHeader.includes('company') && lowerHeader.includes('name')) autoMapping[header] = 'company';
            else if (lowerHeader.includes('website')) autoMapping[header] = 'companyWebsiteURL';
            else if (lowerHeader.includes('industry')) autoMapping[header] = 'industry';
            else if (lowerHeader.includes('naics')) autoMapping[header] = 'naicsCode';
            else if (lowerHeader.includes('employee')) autoMapping[header] = 'numberOfEmployees';
            else if (lowerHeader.includes('year') && lowerHeader.includes('establish')) autoMapping[header] = 'yearCompanyEstablished';
            else if (lowerHeader.includes('company') && lowerHeader.includes('phone')) autoMapping[header] = 'companyPhoneNumber';
            else if (lowerHeader.includes('street') || lowerHeader.includes('address')) autoMapping[header] = 'companyStreetAddress';
            else if (lowerHeader.includes('city')) autoMapping[header] = 'companyCity';
            else if (lowerHeader.includes('state')) autoMapping[header] = 'companyState';
            else if (lowerHeader.includes('zip')) autoMapping[header] = 'companyZipCode';
            else if (lowerHeader.includes('lead') && lowerHeader.includes('source')) autoMapping[header] = 'leadSource';
            else if (lowerHeader.includes('campaign') && lowerHeader.includes('category')) autoMapping[header] = 'campaignCategory';
            else if (lowerHeader.includes('campaign') && lowerHeader.includes('type')) autoMapping[header] = 'campaignType';
            else if (lowerHeader.includes('campaign') && lowerHeader.includes('status')) autoMapping[header] = 'campaignStatus';
          });
          setFieldMapping(autoMapping);
          
          // Get preview data (first 3 rows)
          const preview = lines.slice(1, 4).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((header, i) => {
              row[header] = values[i] || '';
            });
            return row;
          });
          setPreviewData(preview);
          
          setShowMapping(true);
        }
        resolve();
      };
      reader.readAsText(file);
    });
  };

  const handleMappingChange = (csvHeader, crmField) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvHeader]: crmField
    }));
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
      setShowMapping(false);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceName', sourceName.trim());
      formData.append('fieldMapping', JSON.stringify(fieldMapping));

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await uploadContacts(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.data.success) {
        setUploadResult(response.data);
        setFile(null);
        setSourceName('');
        setCsvHeaders([]);
        setFieldMapping({});
        setPreviewData([]);
        
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
      setError(error.response?.data?.error || 'Upload failed. Please check your file format and try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const resetForm = () => {
    setFile(null);
    setSourceName('');
    setError('');
    setUploadResult(null);
    setCsvHeaders([]);
    setFieldMapping({});
    setPreviewData([]);
    setShowMapping(false);
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput) fileInput.value = '';
  };

  return (
    <>
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-upload"></i> Upload CSV Contacts with Field Mapping
          </h5>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {uploadResult && uploadResult.data && uploadResult.data.stats && (
            <Alert variant="success" dismissible onClose={() => setUploadResult(null)}>
              <strong>Upload Successful!</strong>
              <ul className="mb-0 mt-2">
                <li>Total Processed: {uploadResult.data.stats.totalProcessed}</li>
                <li>Successfully Saved: {uploadResult.data.stats.successful}</li>
                {uploadResult.data.stats.errors > 0 && (
                  <li>Errors: {uploadResult.data.stats.errors}</li>
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
                onChange={(e) => setSourceName(e.target.value)}
                disabled={uploading}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>CSV File *</Form.Label>
              <Form.Control
                id="csvFileInput"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </Form.Group>

            {csvHeaders.length > 0 && (
              <Button
                variant="info"
                onClick={() => setShowMapping(true)}
                className="mb-3"
              >
                <i className="fas fa-map"></i> Review Field Mapping ({Object.keys(fieldMapping).filter(k => fieldMapping[k]).length} fields mapped)
              </Button>
            )}

            {uploading && (
              <div className="mb-3">
                <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} />
              </div>
            )}

            <div className="d-flex gap-2">
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={!file || !sourceName.trim() || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Contacts'}
              </Button>
              
              <Button variant="outline-secondary" onClick={resetForm} disabled={uploading}>
                Clear
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Field Mapping Modal */}
      <Modal show={showMapping} onHide={() => setShowMapping(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Map CSV Fields to CRM Fields</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Alert variant="info">
            <strong>Auto-mapping applied!</strong> Review and adjust the field mappings below. Fields marked as "Skip" will not be imported.
          </Alert>
          
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>CSV Column</th>
                <th>Maps To CRM Field</th>
                <th>Sample Data</th>
              </tr>
            </thead>
            <tbody>
              {csvHeaders.map((header, index) => (
                <tr key={index}>
                  <td><strong>{header}</strong></td>
                  <td>
                    <Form.Select
                      size="sm"
                      value={fieldMapping[header] || ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                    >
                      {crmFields.map(field => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </Form.Select>
                  </td>
                  <td>
                    <small className="text-muted">
                      {previewData[0]?.[header] || '(empty)'}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMapping(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => setShowMapping(false)}>
            <i className="fas fa-check"></i> Confirm Mapping
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CSVUploadWithMapping;
