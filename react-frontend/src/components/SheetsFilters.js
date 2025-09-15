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
    
    // Google Sheets specific fields
    'customFields.sheetName': '',
    'customFields.Final_Specialty_Business': ''
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
      'customFields.sheetName': '',
      'customFields.Final_Specialty_Business': ''
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
            <Col md={6}>
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
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">Sheet Information</h6>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Sheet Name</Form.Label>
                <Form.Select
                  value={filters['customFields.sheetName']}
                  onChange={(e) => handleFilterChange('customFields.sheetName', e.target.value)}
                >
                  <option value="">All Sheets</option>
                  <option value="Technology Valid">💻 Technology Valid</option>
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
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Business Specialty</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.Final_Specialty_Business']}
                  onChange={(e) => handleFilterChange('customFields.Final_Specialty_Business', e.target.value)}
                  placeholder="e.g., technology, healthcare"
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Collapse>
    </Card>
  );
};

export default SheetsFilters;