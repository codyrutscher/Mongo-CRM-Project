import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: 'fas fa-sync-alt',
      title: 'Real-time Sync',
      description: 'Seamlessly sync contacts from HubSpot, Google Sheets, and CSV uploads in real-time.',
      size: 'large'
    },
    {
      icon: 'fas fa-chart-line',
      title: 'Advanced Analytics',
      description: 'Get insights into your contact data with comprehensive dashboards and reports.',
      size: 'medium'
    },
    {
      icon: 'fas fa-shield-alt',
      title: 'Enterprise Security',
      description: 'Bank-level security with role-based access control.',
      size: 'small'
    },
    {
      icon: 'fas fa-filter',
      title: 'Smart Filtering',
      description: 'Advanced filtering and segmentation tools to organize your contacts.',
      size: 'medium'
    },
    {
      icon: 'fas fa-download',
      title: 'Bulk Export',
      description: 'Export millions of contacts with intelligent chunking.',
      size: 'small'
    },
    {
      icon: 'fas fa-phone-slash',
      title: 'DNC Compliance',
      description: 'Built-in Do Not Call list management and compliance tracking.',
      size: 'large'
    }
  ];

  const stats = [
    { number: '265K+', label: 'Contacts Managed' },
    { number: '99.9%', label: 'Uptime' },
    { number: '3', label: 'Data Sources' },
    { number: '24/7', label: 'Support' }
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
        <Container>
          <div className="navbar-brand fw-bold fs-3 text-primary">
            <i className="fas fa-users me-2"></i>
            ProspereCRM
          </div>
          <div className="navbar-nav ms-auto">
            <Button 
              variant="outline-primary" 
              className="me-2"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
            <Button 
              variant="primary"
              onClick={() => navigate('/register')}
            >
              Get Started
            </Button>
          </div>
        </Container>
      </nav>

      {/* Hero Section */}
      <section className="hero-section bg-gradient-primary text-white py-5" style={{ marginTop: '76px', minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
        <Container>
          <Row className="align-items-center">
            <Col lg={6}>
              <h1 className="display-4 fw-bold mb-4">
                Unify Your Contact Data
                <span className="text-warning d-block">Across All Platforms</span>
              </h1>
              <p className="lead mb-4">
                ProspereCRM seamlessly integrates HubSpot, Google Sheets, and CSV data into one powerful platform. 
                Manage 265,000+ contacts with advanced filtering, real-time sync, and enterprise-grade security.
              </p>
              <div className="d-flex gap-3 mb-4">
                <Button 
                  variant="warning" 
                  size="lg"
                  onClick={() => navigate('/register')}
                >
                  Start Free Trial
                </Button>
                <Button 
                  variant="outline-light" 
                  size="lg"
                  onClick={() => navigate('/demo')}
                >
                  <i className="fas fa-play me-2"></i>
                  Watch Demo
                </Button>
              </div>
              
              {/* Stats */}
              <Row className="mt-5">
                {stats.map((stat, index) => (
                  <Col key={index} xs={6} md={3} className="text-center mb-3">
                    <div className="h3 fw-bold text-warning">{stat.number}</div>
                    <div className="small text-light">{stat.label}</div>
                  </Col>
                ))}
              </Row>
            </Col>
            <Col lg={6}>
              <div className="hero-image text-center">
                <div className="dashboard-preview bg-white rounded-3 shadow-lg p-4 text-dark">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Contact Dashboard</h5>
                    <span className="badge bg-success">Live</span>
                  </div>
                  <Row>
                    <Col xs={6}>
                      <div className="stat-card bg-primary text-white p-3 rounded mb-2">
                        <div className="h4 mb-0">265,128</div>
                        <small>Total Contacts</small>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="stat-card bg-success text-white p-3 rounded mb-2">
                        <div className="h4 mb-0">89,432</div>
                        <small>Clean Contacts</small>
                      </div>
                    </Col>
                  </Row>
                  <div className="progress mb-2" style={{ height: '8px' }}>
                    <div className="progress-bar bg-primary" style={{ width: '45%' }}></div>
                    <div className="progress-bar bg-success" style={{ width: '30%' }}></div>
                    <div className="progress-bar bg-warning" style={{ width: '25%' }}></div>
                  </div>
                  <small className="text-muted">HubSpot • Google Sheets • CSV Uploads</small>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Bento Grid */}
      <section className="features-section py-5 bg-light">
        <Container>
          <Row className="mb-5">
            <Col lg={8} className="mx-auto text-center">
              <h2 className="display-5 fw-bold mb-3">Everything You Need to Manage Contacts</h2>
              <p className="lead text-muted">
                Powerful features designed for modern businesses that need to manage large contact databases efficiently.
              </p>
            </Col>
          </Row>

          {/* Bento Grid */}
          <div className="bento-grid">
            <Row className="g-4">
              {features.map((feature, index) => (
                <Col 
                  key={index}
                  xs={12} 
                  md={feature.size === 'large' ? 8 : feature.size === 'medium' ? 6 : 4}
                  className={feature.size === 'large' ? 'order-1' : ''}
                >
                  <Card className={`h-100 border-0 shadow-sm hover-lift ${feature.size === 'large' ? 'bg-primary text-white' : ''}`}>
                    <Card.Body className="p-4">
                      <div className={`feature-icon mb-3 ${feature.size === 'large' ? 'text-warning' : 'text-primary'}`}>
                        <i className={`${feature.icon} fa-2x`}></i>
                      </div>
                      <h5 className="fw-bold mb-3">{feature.title}</h5>
                      <p className={feature.size === 'large' ? 'text-light' : 'text-muted'}>
                        {feature.description}
                      </p>
                      {feature.size === 'large' && (
                        <Button variant="warning" className="mt-3">
                          Learn More <i className="fas fa-arrow-right ms-2"></i>
                        </Button>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="cta-section py-5 bg-primary text-white">
        <Container>
          <Row className="text-center">
            <Col lg={8} className="mx-auto">
              <h2 className="display-5 fw-bold mb-3">Ready to Get Started?</h2>
              <p className="lead mb-4">
                Join thousands of businesses already using ProspereCRM to manage their contact data efficiently.
              </p>
              <div className="d-flex justify-content-center gap-3">
                <Button 
                  variant="warning" 
                  size="lg"
                  onClick={() => navigate('/register')}
                >
                  Start Your Free Trial
                </Button>
                <Button 
                  variant="outline-light" 
                  size="lg"
                  onClick={() => navigate('/contact')}
                >
                  Contact Sales
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-light py-4">
        <Container>
          <Row>
            <Col md={6}>
              <div className="fw-bold fs-5 mb-2">
                <i className="fas fa-users me-2"></i>
                ProspereCRM
              </div>
              <p className="text-muted small">
                Professional contact management for modern businesses.
              </p>
            </Col>
            <Col md={6} className="text-md-end">
              <div className="social-links">
                <Button variant="outline-light" size="sm" className="me-2">
                  <i className="fab fa-twitter"></i>
                </Button>
                <Button variant="outline-light" size="sm" className="me-2">
                  <i className="fab fa-linkedin"></i>
                </Button>
                <Button variant="outline-light" size="sm">
                  <i className="fab fa-github"></i>
                </Button>
              </div>
              <div className="mt-2">
                <small className="text-muted">
                  © 2024 ProspereCRM. All rights reserved.
                </small>
              </div>
            </Col>
          </Row>
        </Container>
      </footer>

      <style jsx>{`
        .bg-gradient-primary {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        }
        
        .hover-lift {
          transition: transform 0.2s ease-in-out;
        }
        
        .hover-lift:hover {
          transform: translateY(-5px);
        }
        
        .bento-grid .card {
          min-height: 200px;
        }
        
        .dashboard-preview {
          max-width: 400px;
          margin: 0 auto;
        }
        
        .stat-card {
          transition: transform 0.2s ease-in-out;
        }
        
        .stat-card:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

export default LandingPage;