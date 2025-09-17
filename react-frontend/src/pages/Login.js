import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', formData.email);
      const response = await login(formData.email, formData.password);
      console.log('Login response:', response);
      
      if (response.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        console.log('Login successful, redirecting to dashboard');
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        console.error('Login failed:', response.error);
        setError(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(`Login failed: ${error.message || 'Please try again'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email, password) => {
    setFormData({ email, password });
    
    // Auto-submit after setting credentials
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} });
    }, 100);
  };

  return (
    <div className="login-page bg-light min-vh-100 d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="text-primary fs-2 fw-bold mb-2">
                    <i className="fas fa-users me-2"></i>
                    ProspereCRM
                  </div>
                  <h4 className="fw-bold">Welcome Back</h4>
                  <p className="text-muted">Sign in to your account</p>
                </div>

                {error && (
                  <Alert variant="danger" className="mb-4">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                      size="lg"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      required
                      size="lg"
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-100 mb-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <Button
                        type="button"
                        variant="outline-primary"
                        size="sm"
                        className="w-100"
                        onClick={() => handleQuickLogin('admin@prosperecrm.com', 'Admin123!')}
                        disabled={loading}
                      >
                        Admin
                      </Button>
                    </div>
                    <div className="col-6">
                      <Button
                        type="button"
                        variant="outline-success"
                        size="sm"
                        className="w-100"
                        onClick={() => handleQuickLogin('john@prosperecrm.com', 'John123!')}
                        disabled={loading}
                      >
                        John
                      </Button>
                    </div>
                    <div className="col-6">
                      <Button
                        type="button"
                        variant="outline-info"
                        size="sm"
                        className="w-100"
                        onClick={() => handleQuickLogin('sarah@prosperecrm.com', 'Sarah123!')}
                        disabled={loading}
                      >
                        Sarah
                      </Button>
                    </div>
                    <div className="col-6">
                      <Button
                        type="button"
                        variant="outline-warning"
                        size="sm"
                        className="w-100"
                        onClick={() => handleQuickLogin('mike@prosperecrm.com', 'Mike123!')}
                        disabled={loading}
                      >
                        Mike
                      </Button>
                    </div>
                    <div className="col-12">
                      <Button
                        type="button"
                        variant="outline-secondary"
                        size="sm"
                        className="w-100"
                        onClick={() => handleQuickLogin('lisa@prosperecrm.com', 'Lisa123!')}
                        disabled={loading}
                      >
                        Lisa
                      </Button>
                    </div>
                  </div>
                </Form>

                <hr className="my-4" />

                <div className="text-center">
                  <small className="text-muted">
                    <strong>Available Users:</strong><br />
                    <div className="mt-2">
                      <div>admin@prosperecrm.com / Admin123!</div>
                      <div>john@prosperecrm.com / John123!</div>
                      <div>sarah@prosperecrm.com / Sarah123!</div>
                      <div>mike@prosperecrm.com / Mike123!</div>
                      <div>lisa@prosperecrm.com / Lisa123!</div>
                    </div>
                  </small>
                </div>
              </Card.Body>
            </Card>


          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;