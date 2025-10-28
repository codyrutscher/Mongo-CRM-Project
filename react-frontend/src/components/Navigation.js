import React from 'react';
import { Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const Navigation = () => {
  return (
    <Navbar bg="light" expand="lg" className="shadow-sm">
      <div className="container">
        <LinkContainer to="/">
          <Navbar.Brand>
            <i className="fas fa-chart-line"></i> ProspereCRM
          </Navbar.Brand>
        </LinkContainer>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <LinkContainer to="/dashboard">
              <Nav.Link>Dashboard</Nav.Link>
            </LinkContainer>
            
            <NavDropdown title="Contacts" id="contacts-dropdown">
              <LinkContainer to="/hubspot-contacts">
                <NavDropdown.Item>🔶 HubSpot Contacts</NavDropdown.Item>
              </LinkContainer>
              <LinkContainer to="/csv-contacts">
                <NavDropdown.Item>📁 CSV Contacts</NavDropdown.Item>
              </LinkContainer>
              <LinkContainer to="/sheets-contacts">
                <NavDropdown.Item>📊 C17 Contacts</NavDropdown.Item>
              </LinkContainer>
              <NavDropdown.Divider />
              <NavDropdown.Header>By Campaign Type</NavDropdown.Header>
              <LinkContainer to="/contacts/campaign/buyer">
                <NavDropdown.Item>🛒 Buyer Contacts</NavDropdown.Item>
              </LinkContainer>
              <LinkContainer to="/contacts/campaign/seller">
                <NavDropdown.Item>💼 Seller Contacts</NavDropdown.Item>
              </LinkContainer>
              <LinkContainer to="/contacts/campaign/cre">
                <NavDropdown.Item>🏢 CRE Contacts</NavDropdown.Item>
              </LinkContainer>
              <LinkContainer to="/contacts/campaign/exit-factor">
                <NavDropdown.Item>🚀 Exit Factor Contacts</NavDropdown.Item>
              </LinkContainer>
            </NavDropdown>
            
            <LinkContainer to="/segments">
              <Nav.Link>Segments</Nav.Link>
            </LinkContainer>
          </Nav>
        </Navbar.Collapse>
      </div>
    </Navbar>
  );
};

export default Navigation;