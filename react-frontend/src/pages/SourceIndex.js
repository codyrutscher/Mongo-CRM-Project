import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Button } from "react-bootstrap";
import { getDashboardStats, getCSVUploads } from "../services/api";

const SourceIndex = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [csvUploads, setCsvUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsResponse, csvResponse] = await Promise.all([
        getDashboardStats(),
        getCSVUploads()
      ]);

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      if (csvResponse.data.success) {
        setCsvUploads(csvResponse.data.data);
      }
    } catch (error) {
      console.error("Error loading source data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return num ? num.toLocaleString() : 0;
  };

  const getTotalCSVContacts = () => {
    return Object.entries(stats.bySource || {})
      .filter(([key]) => key.startsWith('csv_'))
      .reduce((sum, [, count]) => sum + count, 0);
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>
                <i className="fas fa-users"></i> All Contacts by Source
              </h2>
              <p className="text-muted">
                Browse all contacts organized by their data source
              </p>
            </div>
            <Button variant="outline-secondary" onClick={() => navigate("/")}>
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </Button>
          </div>
        </Col>
      </Row>

      {/* Source Cards */}
      <Row className="mb-4">
        {/* HubSpot */}
        <Col md={4}>
          <Card 
            className="h-100 border-0 shadow-sm"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/hubspot-contacts")}
          >
            <Card.Body className="text-center p-4">
              <div className="mb-3">
                <i className="fab fa-hubspot fa-3x text-danger"></i>
              </div>
              <h4 className="mb-2">{formatNumber(stats.bySource?.hubspot || 0)}</h4>
              <h6 className="text-muted mb-3">HubSpot Contacts</h6>
              <p className="small text-muted">
                Contacts synced from your HubSpot CRM system
              </p>
              <Button variant="outline-danger" size="sm">
                View HubSpot Contacts <i className="fas fa-arrow-right"></i>
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Google Sheets */}
        <Col md={4}>
          <Card 
            className="h-100 border-0 shadow-sm"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/sheets-contacts")}
          >
            <Card.Body className="text-center p-4">
              <div className="mb-3">
                <i className="fab fa-google fa-3x text-success"></i>
              </div>
              <h4 className="mb-2">{formatNumber(stats.bySource?.google_sheets || 0)}</h4>
              <h6 className="text-muted mb-3">Google Sheets Contacts</h6>
              <p className="small text-muted">
                Contacts imported from Google Sheets spreadsheets
              </p>
              <Button variant="outline-success" size="sm">
                View Sheets Contacts <i className="fas fa-arrow-right"></i>
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* CSV Uploads */}
        <Col md={4}>
          <Card 
            className="h-100 border-0 shadow-sm"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/csv-contacts")}
          >
            <Card.Body className="text-center p-4">
              <div className="mb-3">
                <i className="fas fa-file-csv fa-3x text-warning"></i>
              </div>
              <h4 className="mb-2">{formatNumber(getTotalCSVContacts())}</h4>
              <h6 className="text-muted mb-3">CSV Upload Contacts</h6>
              <p className="small text-muted">
                Contacts uploaded from CSV files ({csvUploads.length} uploads)
              </p>
              <Button variant="outline-warning" size="sm">
                View CSV Contacts <i className="fas fa-arrow-right"></i>
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* CSV Uploads Detail */}
      {csvUploads.length > 0 && (
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <h5><i className="fas fa-file-csv"></i> Recent CSV Uploads</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  {csvUploads.slice(0, 6).map((upload) => (
                    <Col md={6} lg={4} key={upload.source} className="mb-3">
                      <Card 
                        className="border-0 bg-light h-100"
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/csv-contacts/${encodeURIComponent(upload.source)}`)}
                      >
                        <Card.Body className="p-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="mb-0 text-truncate">
                              {upload.uploadName || upload.source.replace('csv_', '')}
                            </h6>
                            <small className="text-muted">
                              {formatNumber(upload.contactCount)}
                            </small>
                          </div>
                          <small className="text-muted d-block">
                            {upload.fileName && (
                              <div><i className="fas fa-file"></i> {upload.fileName}</div>
                            )}
                            <div><i className="fas fa-calendar"></i> {new Date(upload.uploadDate).toLocaleDateString()}</div>
                          </small>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
                {csvUploads.length > 6 && (
                  <div className="text-center mt-3">
                    <Button 
                      variant="outline-primary" 
                      onClick={() => navigate("/csv-contacts")}
                    >
                      View All CSV Uploads ({csvUploads.length})
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Summary Stats */}
      <Row className="mt-4">
        <Col>
          <Card className="bg-light">
            <Card.Body>
              <Row className="text-center">
                <Col md={3}>
                  <h4 className="text-primary">{formatNumber(stats.total || 0)}</h4>
                  <small className="text-muted">Total Contacts</small>
                </Col>
                <Col md={3}>
                  <h4 className="text-success">{formatNumber(stats.cleanContacts?.total || 0)}</h4>
                  <small className="text-muted">Clean Contacts</small>
                </Col>
                <Col md={3}>
                  <h4 className="text-info">{formatNumber(stats.emailOnlyContacts?.total || 0)}</h4>
                  <small className="text-muted">Email Only</small>
                </Col>
                <Col md={3}>
                  <h4 className="text-warning">{formatNumber(stats.phoneOnlyContacts?.total || 0)}</h4>
                  <small className="text-muted">Phone Only</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SourceIndex;