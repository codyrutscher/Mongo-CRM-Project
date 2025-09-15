import React, { useState } from 'react';
import { Card, Row, Col, Form, Button, Badge, Collapse } from 'react-bootstrap';

const SheetsFilters = ({ onFilterChange, onClearFilters, isVisible, onToggleVisibility }) => {
  const [filters, setFilters] = useState({
    // Basic Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    
    // Address Fields (from custom fields)
    'customFields.Final_City': '',
    'customFields.Final_State': '',
    'customFields.Location': '',
    
    // Business Information (from custom fields)
    'customFields.Company Name': '',
    'customFields.Website': '',
    'customFields.Final_Specialty_Business': '',
    'customFields.Final_Business_Type': '',
    'customFields.Final_Year_Founded': '',
    
    // Google Sheets specific fields
    'customFields.sheetName': '',
    'customFields.Status': ''
  });

  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    
    // Count active filters
    const activeCount = Object.values(newFilters).filter(val => val && val.length > 0).length;
    setActiveFilterCount(activeCount);
    
    // Only send non-empty filters to parent
    const activeFilters = {};
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val && val.length > 0) {
        activeFilters[key] = val;
      }
    });
    
    onFilterChange(activeFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      jobTitle: '',
      'customFields.Final_City': '',
      'customFields.Final_State': '',
      'customFields.Location': '',
      'customFields.Company Name': '',
      'customFields.Website': '',
      'customFields.Final_Specialty_Business': '',
      'customFields.Final_Business_Type': '',
      'customFields.Final_Year_Founded': '',
      'customFields.sheetName': '',
      'customFields.Status': ''
    });
    setActiveFilterCount(0);
    onClearFilters();
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            Google Sheets Filters
            {activeFilterCount > 0 && (
              <Badge bg="primary" className="ms-2">
                {activeFilterCount}
              </Badge>
            )}
          </h6>
          <div>
            {activeFilterCount > 0 && (
              <Button variant="outline-secondary" size="sm" className="me-2" onClick={handleClearFilters}>
                <i className="fas fa-times"></i> Clear All
              </Button>
            )}
            <Button
              variant={isVisible ? "primary" : "outline-secondary"}
              size="sm"
              onClick={onToggleVisibility}
            >
              <i className="fas fa-filter"></i> {isVisible ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>
      </Card.Header>
      
      <Collapse in={isVisible}>
        <Card.Body>
          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3">Basic Information</h6>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>First Name</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.firstName}
                  onChange={(e) => handleFilterChange('firstName', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.lastName}
                  onChange={(e) => handleFilterChange('lastName', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.email}
                  onChange={(e) => handleFilterChange('email', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.phone}
                  onChange={(e) => handleFilterChange('phone', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Job Title</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.jobTitle}
                  onChange={(e) => handleFilterChange('jobTitle', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Company Name</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.Company Name']}
                  onChange={(e) => handleFilterChange('customFields.Company Name', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Website</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.Website']}
                  onChange={(e) => handleFilterChange('customFields.Website', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">Location</h6>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>City</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.Final_City']}
                  onChange={(e) => handleFilterChange('customFields.Final_City', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>State</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.Final_State']}
                  onChange={(e) => handleFilterChange('customFields.Final_State', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Country</Form.Label>
                <Form.Select
                  value={filters['customFields.Location']}
                  onChange={(e) => handleFilterChange('customFields.Location', e.target.value)}
                >
                  <option value="">All Countries</option>
                  <option value="United States">🇺🇸 United States</option>
                  <option value="Canada">🇨🇦 Canada</option>
                  <option value="United Kingdom">🇬🇧 United Kingdom</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">Business Information</h6>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Business Specialty</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.Final_Specialty_Business']}
                  onChange={(e) => handleFilterChange('customFields.Final_Specialty_Business', e.target.value)}
                  placeholder="e.g., software, consulting"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Business Type</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.Final_Business_Type']}
                  onChange={(e) => handleFilterChange('customFields.Final_Business_Type', e.target.value)}
                  placeholder="e.g., SaaS, consulting"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Year Founded</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.Final_Year_Founded']}
                  onChange={(e) => handleFilterChange('customFields.Final_Year_Founded', e.target.value)}
                  placeholder="e.g., 2020"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">Sheet Information</h6>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Sheet Name</Form.Label>
                <Form.Select
                  value={filters['customFields.sheetName']}
                  onChange={(e) => handleFilterChange('customFields.sheetName', e.target.value)}
                >
                  <option value="">All Sheets</option>
                  <option value="Technology Cleaning">💻 Technology Cleaning</option>
                  <option value="Real Estate Valid">🏠 Real Estate Valid</option>
                  <option value="Construction Valid 1">🏗️ Construction Valid 1</option>
                  <option value="Home Service Valid">🔧 Home Service Valid</option>
                  <option value="E-commerce Valid">🛒 E-commerce Valid</option>
                  <option value="Healthcare Valid">🏥 Healthcare Valid</option>
                  <option value="Manufacturing  1 Valid">🏭 Manufacturing Valid</option>
                  <option value="Financial Services/ Consulting 2 Valid">💼 Financial Services Valid</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters['customFields.Status']}
                  onChange={(e) => handleFilterChange('customFields.Status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Scheduled">📅 Scheduled</option>
                  <option value="Contacted">📞 Contacted</option>
                  <option value="Qualified">✅ Qualified</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Collapse>
    </Card>
  );
};

export default SheetsFilters;