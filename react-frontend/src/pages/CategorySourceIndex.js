import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Button } from "react-bootstrap";
import { getDashboardStats, getCSVUploads } from "../services/api";

const CategorySourceIndex = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [csvUploads, setCsvUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  const categoryInfo = {
    clean: {
      title: "Clean Contacts by Source",
      description: "Contacts with complete information: First Name, Last Name, Email, Phone, and Company",
      icon: "fas fa-check-circle",
      color: "success"
    },
    "email-only": {
      title: "Email Only Contacts by Source",
      description: "Contacts that have an email address but no phone number",
      icon: "fas fa-envelope",
      color: "info"
    },
    "phone-only": {
      title: "Phone Only Contacts by Source",
      description: "Contacts that have a phone number but no email address",
      icon: "fas fa-phone",
      color: "warning"
    }
  };

  const currentCategory = categoryInfo[category] || {
    title: "Unknown Category",
    description: "Category not found",
    icon: "fas fa-question",
    color: "secondary"
  };

  useEffect(() => {
    loadData();
  }, [category]);

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
        setCsvUploads(csvResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryStats = () => {
    switch (category) {
      case 'clean':
        return stats.cleanContacts || {};
      case 'email-only':
        return stats.emailOnlyContacts || {};
      case 'phone-only':
        return stats.phoneOnlyContacts || {};
      default:
        return {};
    }
  };

  const handleSourceClick = (source, sourceType) => {
    if (sourceType === 'csv') {
      navigate(`/csv-contacts/${encodeURIComponent(source)}`);
    } else {
      // Navigate to filtered contacts for this category and source
      navigate(`/contacts/category/${category}?source=${source}`);
    }
  };

  const categoryStats = getCategoryStats();

  return (
    <div>
      <Row>
        <Col>
          <div className="d-flex align-items-center mb-4">
            <Button
              variant="outline-secondary"
              onClick={() => navigate('/dashboard')}
              className="me-3"
            >
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </Button>
            <div>
              <h2 className="mb-1">
                <i className={currentCategory.icon}></i> {currentCategory.title}
              </h2>
              <p className="text-muted mb-0">{currentCategory.description}</p>
            </div>
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
              <p className="mt-2">Loading source breakdown...</p>
            </div>
          </Col>
        </Row>
      )}

      {!loading && (
        <Row>
          {/* HubSpot */}
          <Col md={4} className="mb-4">
            <Card 
              className="h-100" 
              style={{ cursor: 'pointer' }}
              onClick={() => handleSourceClick('hubspot', 'hubspot')}
            >
              <Card.Body className="text-center">
                <i className="fas fa-hubspot fa-3x text-primary mb-3"></i>
                <h4>HubSpot</h4>
                <h2 className="text-primary">{categoryStats.hubspot || 0}</h2>
                <p className="text-muted">
                  {category === 'clean' ? 'Clean contacts' : 
                   category === 'email-only' ? 'Email only contacts' : 
                   'Phone only contacts'} from HubSpot
                </p>
                <Button variant="outline-primary" size="sm">
                  View Contacts <i className="fas fa-arrow-right"></i>
                </Button>
              </Card.Body>
            </Card>
          </Col>

          {/* Google Sheets */}
          <Col md={4} className="mb-4">
            <Card 
              className="h-100" 
              style={{ cursor: 'pointer' }}
              onClick={() => handleSourceClick('google_sheets', 'sheets')}
            >
              <Card.Body className="text-center">
                <i className="fas fa-table fa-3x text-success mb-3"></i>
                <h4>C17 Leads (Google Sheets)</h4>
                <h2 className="text-success">{categoryStats.google_sheets || 0}</h2>
                <p className="text-muted">
                  {category === 'clean' ? 'Clean contacts' : 
                   category === 'email-only' ? 'Email only contacts' : 
                   'Phone only contacts'} from Google Sheets
                </p>
                <Button variant="outline-success" size="sm">
                  View Contacts <i className="fas fa-arrow-right"></i>
                </Button>
              </Card.Body>
            </Card>
          </Col>

          {/* CSV Uploads */}
          <Col md={4} className="mb-4">
            <Card className="h-100">
              <Card.Body>
                <div className="text-center mb-3">
                  <i className="fas fa-file-csv fa-3x text-warning mb-3"></i>
                  <h4>CSV Uploads</h4>
                  <h2 className="text-warning">{categoryStats.csv || 0}</h2>
                  <p className="text-muted">
                    {category === 'clean' ? 'Clean contacts' : 
                     category === 'email-only' ? 'Email only contacts' : 
                     'Phone only contacts'} from CSV uploads
                  </p>
                </div>

                {csvUploads.length > 0 && (
                  <div>
                    <h6 className="mb-2">Individual CSV Files:</h6>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {csvUploads.map((csv, index) => (
                        <div 
                          key={csv.source} 
                          className="d-flex justify-content-between align-items-center py-1 px-2 mb-1 bg-light rounded"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSourceClick(csv.source, 'csv')}
                        >
                          <small>{csv.source.replace('csv_', '').replace(/_/g, ' ')}</small>
                          <small className="text-muted">{csv.contactCount}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {csvUploads.length === 0 && (
                  <p className="text-muted small text-center">No CSV uploads found</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {!loading && categoryStats.total === 0 && (
        <Row>
          <Col>
            <div className="text-center py-5">
              <i className={`${currentCategory.icon} fa-3x text-muted mb-3`}></i>
              <h5 className="text-muted">No contacts found</h5>
              <p className="text-muted">
                No contacts match the criteria for this category across all sources.
              </p>
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default CategorySourceIndex;