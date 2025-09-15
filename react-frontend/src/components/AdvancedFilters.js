import React, { useState } from "react";
import { Card, Row, Col, Form, Button, Badge, Collapse } from "react-bootstrap";

const AdvancedFilters = ({
  onFilterChange,
  onClearFilters,
  isVisible,
  onToggleVisibility,
}) => {
  const [filters, setFilters] = useState({
    // Basic Info
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",

    // Address Fields
    "address.street": "",
    "address.city": "",
    "address.state": "",
    "address.zipCode": "",
    "address.country": "",

    // Status Fields
    lifecycleStage: "",
    dncStatus: "",

    // Custom Fields (only fields with data)
    "customFields.contactType": "",
    "customFields.businessCategory": "",
    "customFields.leadSource": "",
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
      "address.street": "",
      "address.city": "",
      "address.state": "",
      "address.zipCode": "",
      "address.country": "",
      lifecycleStage: "",
      dncStatus: "",
      "customFields.contactType": "",
      "customFields.businessCategory": "",
      "customFields.leadSource": "",
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
              <h6 className="text-muted mb-3 mt-3">Address Information</h6>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Street Address</Form.Label>
                <Form.Control
                  type="text"
                  value={filters["address.street"]}
                  onChange={(e) =>
                    handleFilterChange("address.street", e.target.value)
                  }
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>City</Form.Label>
                <Form.Control
                  type="text"
                  value={filters["address.city"]}
                  onChange={(e) =>
                    handleFilterChange("address.city", e.target.value)
                  }
                  placeholder="Contains..."
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>State/Province</Form.Label>
                <Form.Select
                  value={filters["address.state"]}
                  onChange={(e) =>
                    handleFilterChange("address.state", e.target.value)
                  }
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
                  value={filters["address.zipCode"]}
                  onChange={(e) =>
                    handleFilterChange("address.zipCode", e.target.value)
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
              <h6 className="text-muted mb-3 mt-3">Business Information</h6>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Contact Type</Form.Label>
                <Form.Select
                  value={filters["customFields.contactType"]}
                  onChange={(e) =>
                    handleFilterChange(
                      "customFields.contactType",
                      e.target.value
                    )
                  }
                >
                  <option value="">All Types</option>
                  <option value="Seller">💼 Seller</option>
                  <option value="Buyer">🛒 Buyer</option>
                  <option value="Buyer & Seller">🔄 Buyer & Seller</option>
                  <option value="Referral Partner">🤝 Referral Partner</option>
                  <option value="EXF Client">👑 EXF Client</option>
                  <option value="Corporate Partner">
                    🏢 Corporate Partner
                  </option>
                  <option value="Tenant">🏠 Tenant</option>
                  <option value="Other">📋 Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Industry/Business Category</Form.Label>
                <Form.Control
                  type="text"
                  value={filters["customFields.businessCategory"]}
                  onChange={(e) =>
                    handleFilterChange(
                      "customFields.businessCategory",
                      e.target.value
                    )
                  }
                  placeholder="e.g., Construction, Automotive"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Lead Source</Form.Label>
                <Form.Select
                  value={filters["customFields.leadSource"]}
                  onChange={(e) =>
                    handleFilterChange(
                      "customFields.leadSource",
                      e.target.value
                    )
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
        </Card.Body>
      </Collapse>
    </Card>
  );
};

export default AdvancedFilters;
