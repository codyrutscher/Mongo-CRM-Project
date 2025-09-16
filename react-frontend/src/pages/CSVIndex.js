import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import CSVUpload from '../components/CSVUpload';
import { getCSVUploads } from '../services/api';

const CSVIndex = () => {
  const navigate = useNavigate();
  const [csvUploads, setCsvUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCSVUploads();
  }, []);

  const loadCSVUploads = async () => {
    try {
      setLoading(true);
      const response = await getCSVUploads();
      if (response.data.success) {
        setCsvUploads(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading CSV uploads:', error);
      setCsvUploads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (result) => {
    // Refresh the CSV uploads list after successful upload
    loadCSVUploads();
  };

  const handleCSVClick = (csvSource) => {
    // Navigate to the specific CSV contacts page
    navigate(`/csv-contacts/${encodeURIComponent(csvSource.source)}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSourceDisplayName = (source) => {
    return source.replace('csv_', '').replace(/_/g, ' ');
  };

  return (
    <div>
      <Row>
        <Col>
          <h2 className="mb-4">
            <i className="fas fa-file-csv"></i> CSV Upload Management
          </h2>
          <p className="text-muted">
            Upload new CSV files and manage existing uploads. Each upload is tracked separately for campaign analysis.
          </p>
        </Col>
      </Row>

      {/* CSV Upload Component */}
      <CSVUpload onUploadComplete={handleUploadComplete} />

      {/* CSV Uploads Grid */}
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4>Your CSV Uploads</h4>
            <Button
              variant="outline-primary"
              onClick={loadCSVUploads}
              disabled={loading}
            >
              <i className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`}></i> Refresh
            </Button>
          </div>
        </Col>
      </Row>

      {loading && (
        <Row>
          <Col>
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading CSV uploads...</p>
            </div>
          </Col>
        </Row>
      )}

      {!loading && csvUploads.length === 0 && (
        <Row>
          <Col>
            <div className="text-center py-5">
              <i className="fas fa-file-csv fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No CSV uploads yet</h5>
              <p className="text-muted">
                Upload your first CSV file using the form above to get started.
              </p>
            </div>
          </Col>
        </Row>
      )}

      {!loading && csvUploads.length > 0 && (
        <Row>
          {csvUploads.map((csvSource, index) => (
            <Col md={4} key={csvSource.source} className="mb-4">
              <Card 
                className="h-100" 
                style={{ cursor: 'pointer' }}
                onClick={() => handleCSVClick(csvSource)}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">
                      {getSourceDisplayName(csvSource.source)}
                    </h5>
                    <Badge bg="primary">{csvSource.contactCount}</Badge>
                  </div>
                  
                  <p className="text-muted small mb-2">
                    <i className="fas fa-calendar"></i> Uploaded: {formatDate(csvSource.uploadDate)}
                  </p>
                  
                  {csvSource.fileName && (
                    <p className="text-muted small mb-2">
                      <i className="fas fa-file"></i> File: {csvSource.fileName}
                    </p>
                  )}
                  
                  <p className="card-text">
                    {csvSource.description || `CSV upload containing ${csvSource.contactCount} contacts`}
                  </p>
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {csvSource.contactCount} contacts
                    </small>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCSVClick(csvSource);
                      }}
                    >
                      View Contacts <i className="fas fa-arrow-right"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default CSVIndex;