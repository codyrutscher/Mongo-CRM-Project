import React, { useState } from "react";
import { Card, Row, Col, Form, Button, Badge, Collapse } from "react-bootstrap";

const AdvancedFilters = ({
  onFilterChange,
  onClearFilters,
  isVisible,
  onToggleVisibility,
}) => {
  const [filters, setFilters] = useState({
    // Basic Info (NAICS Standard)
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",

    // Company Address Fields (NAICS Standard)
    companyStreetAddress: "",
    companyCity: "",
    companyState: "",
    companyZipCode: "",

    // Status Fields
    lifecycleStage: "",
    dncStatus: "",

    // NAICS Business Fields
    campaignCategory: "", // Contact Type in NAICS
    industry: "", // Business Category in NAICS
    leadSource: "", // Direct field in NAICS
    naicsCode: "",
    numberOfEmployees: "",
  });

  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);

    // Count active filters
    const activeCount = Object.values(newFilters).filter(
      (val) => val && val.length > 0
    ).length;
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
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
      companyStreetAddress: "",
      companyCity: "",
      companyState: "",
      companyZipCode: "",
      lifecycleStage: "",
      dncStatus: "",
      campaignCategory: "",
      industry: "",
      leadSource: "",
      naicsCode: "",
      numberOfEmployees: "",
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
              <Button
                variant="outline-secondary"
                size="sm"
                className="me-2"
                onClick={handleClearFilters}
              >
                <i className="fas fa-times"></i> Clear All
              </Button>
            )}
            <Button
              variant={isVisible ? "primary" : "outline-secondary"}
              size="sm"
              onClick={onToggleVisibility}
            >
              <i className="fas fa-filter"></i> {isVisible ? "Hide" : "Show"}{" "}
              Filters
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
                  onChange={(e) =>
                    handleFilterChange("firstName", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleFilterChange("lastName", e.target.value)
                  }
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
                  onChange={(e) => handleFilterChange("email", e.target.value)}
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
                  onChange={(e) => handleFilterChange("phone", e.target.value)}
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
                  onChange={(e) =>
                    handleFilterChange("company", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleFilterChange("jobTitle", e.target.value)
                  }
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">Company Address Information</h6>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Company Street Address</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.companyStreetAddress}
                  onChange={(e) =>
                    handleFilterChange("companyStreetAddress", e.target.value)
                  }
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Company City</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.companyCity}
                  onChange={(e) =>
                    handleFilterChange("companyCity", e.target.value)
                  }
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Company State</Form.Label>
                <Form.Select
                  value={filters.companyState}
                  onChange={(e) =>
                    handleFilterChange("companyState", e.target.value)
                  }
                >
                  <option value="">All States</option>
                  <option value="TX">Texas</option>
                  <option value="CO">Colorado</option>
                  <option value="NV">Nevada</option>
                  <option value="CA">California</option>
                  <option value="FL">Florida</option>
                  <option value="NY">New York</option>
                  <option value="AZ">Arizona</option>
                  <option value="UT">Utah</option>
                  <option value="WA">Washington</option>
                  <option value="OR">Oregon</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Company Zip Code</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.companyZipCode}
                  onChange={(e) =>
                    handleFilterChange("companyZipCode", e.target.value)
                  }
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3 mt-3">
                Contact Status & Lifecycle
              </h6>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Lifecycle Stage</Form.Label>
                <Form.Select
                  value={filters.lifecycleStage}
                  onChange={(e) =>
                    handleFilterChange("lifecycleStage", e.target.value)
                  }
                >
                  <option value="">All Stages</option>
                  <option value="lead">📈 Lead</option>
                  <option value="prospect">👁️ Prospect</option>
                  <option value="customer">👑 Customer</option>
                  <option value="evangelist">⭐ Evangelist</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>DNC Status</Form.Label>
                <Form.Select
                  value={filters.dncStatus}
                  onChange={(e) =>
                    handleFilterChange("dncStatus", e.target.value)
                  }
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
              <h6 className="text-muted mb-3 mt-3">Business Information (NAICS Standard)</h6>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Campaign Category (Contact Type)</Form.Label>
                <Form.Select
                  value={filters.campaignCategory}
                  onChange={(e) =>
                    handleFilterChange("campaignCategory", e.target.value)
                  }
                >
                  <option value="">All Types</option>
                  <option value="Seller">💼 Seller</option>
                  <option value="Buyer">🛒 Buyer</option>
                  <option value="Buyer & Seller">🔄 Buyer & Seller</option>
                  <option value="Referral Partner">🤝 Referral Partner</option>
                  <option value="EXF Client">👑 EXF Client</option>
                  <option value="Corporate Partner">🏢 Corporate Partner</option>
                  <option value="Tenant">🏠 Tenant</option>
                  <option value="Other">📋 Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Industry</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.industry}
                  onChange={(e) =>
                    handleFilterChange("industry", e.target.value)
                  }
                  placeholder="e.g., Construction, Automotive"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Lead Source</Form.Label>
                <Form.Select
                  value={filters.leadSource}
                  onChange={(e) =>
                    handleFilterChange("leadSource", e.target.value)
                  }
                >
                  <option value="">All Sources</option>
                  <option value="Referral">🤝 Referral</option>
                  <option value="Tworld.com">🌐 Tworld.com</option>
                  <option value="Phone">📞 Phone</option>
                  <option value="Google PPC">🎯 Google PPC</option>
                  <option value="Cold Call">❄️ Cold Call</option>
                  <option value="BizBuySell">💼 BizBuySell</option>
                  <option value="Axial">⚡ Axial</option>
                  <option value="Email">📧 Email</option>
                  <option value="Other">📋 Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>NAICS Code</Form.Label>
                <Form.Control
                  type="text"
                  value={filters.naicsCode}
                  onChange={(e) =>
                    handleFilterChange("naicsCode", e.target.value)
                  }
                  placeholder="e.g., 236220"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Number of Employees</Form.Label>
                <Form.Select
                  value={filters.numberOfEmployees}
                  onChange={(e) =>
                    handleFilterChange("numberOfEmployees", e.target.value)
                  }
                >
                  <option value="">All Sizes</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Collapse>
    </Card>
  );
};

export default AdvancedFilters;
