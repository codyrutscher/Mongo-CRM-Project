import React, { useState } from 'react';
import { Card, Row, Col, Form, Button, Badge, Collapse } from 'react-bootstrap';

const AdvancedFilters = ({ onFilterChange, onClearFilters, isVisible, onToggleVisibility }) => {
  const [filters, setFilters] = useState({
    // Basic Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    
    // Address Fields
    'address.street': '',
    'address.city': '',
    'address.state': '',
    'address.zipCode': '',
    'address.country': '',
    
    // CRM Fields
    source: '',
    lifecycleStage: '',
    status: '',
    dncStatus: '',
    
    // Custom Fields
    'customFields.contactType': '',
    'customFields.businessCategory': '',
    'customFields.numberOfEmployees': '',
    'customFields.annualRevenue': '',
    'customFields.sicCode': '',
    'customFields.naicsCode': '',
    'customFields.websiteUrl': '',
    'customFields.linkedinProfile': '',
    'customFields.leadSource': '',
    'customFields.priority': '',
    'customFields.yearEstablished': '',
    
    // Date Filters
    createdAt: '',
    lastSyncedAt: '',
    
    // Tags
    tags: ''
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
      'address.street': '',
      'address.city': '',
      'address.state': '',
      'address.zipCode': '',
      'address.country': '',
      source: '',
      lifecycleStage: '',
      status: '',
      dncStatus: '',
      'customFields.contactType': '',
      'customFields.businessCategory': '',
      'customFields.numberOfEmployees': '',
      'customFields.annualRevenue': '',
      'customFields.sicCode': '',
      'customFields.naicsCode': '',
      'customFields.websiteUrl': '',
      'customFields.linkedinProfile': '',
      'customFields.leadSource': '',
      'customFields.priority': '',
      'customFields.yearEstablished': '',
      createdAt: '',
      lastSyncedAt: '',
      tags: ''
    });
    setActiveFilterCount(0);
    onClearFilters();
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            Advanced Filters
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
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Company</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.company}
                  onChange={(e) => handleFilterChange('company', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
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
              <h6 className="text-muted mb-3 mt-3">Address Information</h6>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Street Address</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['address.street']}
                  onChange={(e) => handleFilterChange('address.street', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>City</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['address.city']}
                  onChange={(e) => handleFilterChange('address.city', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>State/Province</Form.Label>
                <Form.Select
                  value={filters['address.state']}
                  onChange={(e) => handleFilterChange('address.state', e.target.value)}
                >
                  <option value="">All States</option>
                  <option value="Texas">Texas</option>
                  <option value="Colorado">Colorado</option>
                  <option value="Nevada">Nevada</option>
                  <option value="California">California</option>
                  <option value="Florida">Florida</option>
                  <option value="New York">New York</option>
                  <option value="Arizona">Arizona</option>
                  <option value="Utah">Utah</option>
                  <option value="Washington">Washington</option>
                  <option value="Oregon">Oregon</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Zip Code</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['address.zipCode']}
                  onChange={(e) => handleFilterChange('address.zipCode', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">CRM Information</h6>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Data Source</Form.Label>
                <Form.Select
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                >
                  <option value="">All Sources</option>
                  <option value="hubspot">🔶 HubSpot</option>
                  <option value="csv_upload">📁 CSV Upload</option>
                  <option value="google_sheets">📊 Google Sheets</option>
                  <option value="manual">✍️ Manual Entry</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Lifecycle Stage</Form.Label>
                <Form.Select
                  value={filters.lifecycleStage}
                  onChange={(e) => handleFilterChange('lifecycleStage', e.target.value)}
                >
                  <option value="">All Stages</option>
                  <option value="lead">📈 Lead</option>
                  <option value="prospect">👁️ Prospect</option>
                  <option value="customer">👑 Customer</option>
                  <option value="evangelist">⭐ Evangelist</option>
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
                  <option value="active">✅ Active</option>
                  <option value="inactive">⏸️ Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>DNC Status</Form.Label>
                <Form.Select
                  value={filters.dncStatus}
                  onChange={(e) => handleFilterChange('dncStatus', e.target.value)}
                >
                  <option value="">All Contacts</option>
                  <option value="callable">✅ Callable (Campaign Safe)</option>
                  <option value="dnc_internal">🚫 Do Not Call</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">Business Information</h6>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Contact Type</Form.Label>
                <Form.Select
                  value={filters['customFields.contactType']}
                  onChange={(e) => handleFilterChange('customFields.contactType', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Buyer">🛒 Buyer</option>
                  <option value="Seller">💼 Seller</option>
                  <option value="Buyer & Seller">🔄 Buyer & Seller</option>
                  <option value="CRE">🏢 Commercial Real Estate</option>
                  <option value="Lead/Prospect">📈 Lead/Prospect</option>
                  <option value="Client">🤝 Client</option>
                  <option value="Broker">🏗️ Broker</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Industry/Business Category</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.businessCategory']}
                  onChange={(e) => handleFilterChange('customFields.businessCategory', e.target.value)}
                  placeholder="e.g., Construction, Software"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Lead Source</Form.Label>
                <Form.Select
                  value={filters['customFields.leadSource']}
                  onChange={(e) => handleFilterChange('customFields.leadSource', e.target.value)}
                >
                  <option value="">All Sources</option>
                  <option value="ZoomInfo">ZoomInfo</option>
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Email">Cold Email</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Trade Show">Trade Show</option>
                  <option value="Advertisement">Advertisement</option>
                  <option value="SEO">SEO/Organic Search</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Annual Revenue</Form.Label>
                <Form.Select
                  value={filters['customFields.annualRevenue']}
                  onChange={(e) => handleFilterChange('customFields.annualRevenue', e.target.value)}
                >
                  <option value="">All Revenue</option>
                  <option value="under_1m">Under $1M</option>
                  <option value="1m_5m">$1M - $5M</option>
                  <option value="5m_10m">$5M - $10M</option>
                  <option value="10m_50m">$10M - $50M</option>
                  <option value="over_50m">Over $50M</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Number of Employees</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.numberOfEmployees']}
                  onChange={(e) => handleFilterChange('customFields.numberOfEmployees', e.target.value)}
                  placeholder="e.g., 1-10, 50-100"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>SIC Code</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.sicCode']}
                  onChange={(e) => handleFilterChange('customFields.sicCode', e.target.value)}
                  placeholder="e.g., 7372"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Website URL</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.websiteUrl']}
                  onChange={(e) => handleFilterChange('customFields.websiteUrl', e.target.value)}
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Year Established</Form.Label>
                <Form.Control
                  type="text"
                  value={filters['customFields.yearEstablished']}
                  onChange={(e) => handleFilterChange('customFields.yearEstablished', e.target.value)}
                  placeholder="e.g., 2020"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">Tags & Notes</h6>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tags</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.tags}
                  onChange={(e) => handleFilterChange('tags', e.target.value)}
                  placeholder="Contains tag..."
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Collapse>
    </Card>
  );
};

export default AdvancedFilters;