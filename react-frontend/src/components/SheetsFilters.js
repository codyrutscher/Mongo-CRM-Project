import React, { useState } from 'react';
import { Card, Row, Col, Form, Button, Badge, Collapse } from 'react-bootstrap';

const SheetsFilters = ({ onFilterChange, onClearFilters, isVisible, onToggleVisibility }) => {
  const [filters, setFilters] = useState({
    // Basic Info (NAICS Standard)
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    
    // Company Address Fields (NAICS Standard)
    companyStreetAddress: '',
    companyCity: '',
    companyState: '',
    companyZipCode: '',
    
    // NAICS Business Fields
    campaignCategory: '', // Contact Type in NAICS
    leadSource: '', // Direct field in NAICS
    industry: '', // Business Category in NAICS
    naicsCode: '',
    numberOfEmployees: '',
    companyWebsiteURL: '',
    yearCompanyEstablished: '',
    
    // Google Sheets specific fields
    sheetName: '',
    status: ''
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
      company: '',
      jobTitle: '',
      companyStreetAddress: '',
      companyCity: '',
      companyState: '',
      companyZipCode: '',
      campaignCategory: '',
      leadSource: '',
      industry: '',
      naicsCode: '',
      numberOfEmployees: '',
      companyWebsiteURL: '',
      yearCompanyEstablished: '',
      sheetName: '',
      status: ''
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
                  value={filters.company}
                  onChange={(e) => handleFilterChange('company', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Company Website URL</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.companyWebsiteURL}
                  onChange={(e) => handleFilterChange('companyWebsiteURL', e.target.value)}
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
                <Form.Label>Company City</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.companyCity}
                  onChange={(e) => handleFilterChange('companyCity', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Company State</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.companyState}
                  onChange={(e) => handleFilterChange('companyState', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Company Zip Code</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.companyZipCode}
                  onChange={(e) => handleFilterChange('companyZipCode', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">Business Information (NAICS Standard)</h6>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Industry</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.industry}
                  onChange={(e) => handleFilterChange('industry', e.target.value)}
                  placeholder="e.g., software, consulting"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>NAICS Code</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.naicsCode}
                  onChange={(e) => handleFilterChange('naicsCode', e.target.value)}
                  placeholder="e.g., 236220"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Number of Employees</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.numberOfEmployees}
                  onChange={(e) => handleFilterChange('numberOfEmployees', e.target.value)}
                  placeholder="e.g., 1-10, 50+"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Year Company Established</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.yearCompanyEstablished}
                  onChange={(e) => handleFilterChange('yearCompanyEstablished', e.target.value)}
                  placeholder="e.g., 2020"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">Lead & Campaign Information</h6>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Lead Source</Form.Label>
                <Form.Select
                  value={filters.leadSource}
                  onChange={(e) => handleFilterChange('leadSource', e.target.value)}
                >
                  <option value="">All Sources</option>
                  <option value="Google Sheets">📊 Google Sheets</option>
                  <option value="Website">🌐 Website</option>
                  <option value="Referral">🤝 Referral</option>
                  <option value="Cold Call">❄️ Cold Call</option>
                  <option value="LinkedIn">💼 LinkedIn</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Campaign Category</Form.Label>
                <Form.Select
                  value={filters.campaignCategory}
                  onChange={(e) => handleFilterChange('campaignCategory', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Seller">💼 Seller</option>
                  <option value="Buyer">🛒 Buyer</option>
                  <option value="Lead">📈 Lead</option>
                  <option value="Prospect">👁️ Prospect</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Sheet Name</Form.Label>
                <Form.Select
                  value={filters.sheetName}
                  onChange={(e) => handleFilterChange('sheetName', e.target.value)}
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
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
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