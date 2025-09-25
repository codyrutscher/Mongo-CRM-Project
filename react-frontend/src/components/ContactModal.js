import React from 'react';
import { Modal, Button, Table, Badge } from 'react-bootstrap';
import { formatSourceName, formatDate, getLifecycleColor } from '../utils/formatters';

const ContactModal = ({ show, contact, onHide }) => {
  if (!contact) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{contact.firstName} {contact.lastName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row">
          <div className="col-md-6">
            <h6><i className="fas fa-user"></i> Personal Information</h6>
            <Table size="sm">
              <tbody>
                <tr><td><strong>First Name:</strong></td><td>{contact.firstName || 'N/A'}</td></tr>
                <tr><td><strong>Last Name:</strong></td><td>{contact.lastName || 'N/A'}</td></tr>
                <tr><td><strong>Email:</strong></td><td>{contact.email || 'N/A'}</td></tr>
                <tr><td><strong>Phone:</strong></td><td>{contact.phone || 'N/A'}</td></tr>
                <tr><td><strong>Company:</strong></td><td>{contact.company || 'N/A'}</td></tr>
                <tr><td><strong>Job Title:</strong></td><td>{contact.jobTitle || 'N/A'}</td></tr>
              </tbody>
            </Table>
          </div>
          <div className="col-md-6">
            <h6><i className="fas fa-map-marker-alt"></i> Company Address</h6>
            <Table size="sm">
              <tbody>
                <tr><td><strong>Street Address:</strong></td><td>{contact.companyStreetAddress || 'N/A'}</td></tr>
                <tr><td><strong>City:</strong></td><td>{contact.companyCity || 'N/A'}</td></tr>
                <tr><td><strong>State:</strong></td><td>{contact.companyState || 'N/A'}</td></tr>
                <tr><td><strong>Zip Code:</strong></td><td>{contact.companyZipCode || 'N/A'}</td></tr>
                <tr><td><strong>Website URL:</strong></td><td>{contact.companyWebsiteURL || 'N/A'}</td></tr>
              </tbody>
            </Table>
          </div>
        </div>
        
        <div className="row mt-3">
          <div className="col-md-6">
            <h6><i className="fas fa-info-circle"></i> CRM Information</h6>
            <Table size="sm">
              <tbody>
                <tr>
                  <td><strong>Source:</strong></td>
                  <td><Badge bg="info">{formatSourceName(contact.source)}</Badge></td>
                </tr>
                <tr>
                  <td><strong>Lifecycle Stage:</strong></td>
                  <td><Badge bg={getLifecycleColor(contact.lifecycleStage)}>{contact.lifecycleStage}</Badge></td>
                </tr>
                <tr>
                  <td><strong>Status:</strong></td>
                  <td><Badge bg={contact.status === 'active' ? 'success' : 'secondary'}>{contact.status}</Badge></td>
                </tr>
                <tr><td><strong>Created:</strong></td><td>{formatDate(contact.createdAt)}</td></tr>
                <tr><td><strong>Last Synced:</strong></td><td>{formatDate(contact.lastSyncedAt)}</td></tr>
              </tbody>
            </Table>
          </div>
          <div className="col-md-6">
            <h6><i className="fas fa-building"></i> Business Information</h6>
            <Table size="sm">
              <tbody>
                <tr><td><strong>Industry:</strong></td><td>{contact.industry || 'N/A'}</td></tr>
                <tr><td><strong>NAICS Code:</strong></td><td>{contact.naicsCode || 'N/A'}</td></tr>
                <tr><td><strong>Employees:</strong></td><td>{contact.numberOfEmployees || 'N/A'}</td></tr>
                <tr><td><strong>Year Established:</strong></td><td>{contact.yearCompanyEstablished || 'N/A'}</td></tr>
                <tr><td><strong>Lead Source:</strong></td><td>{contact.leadSource || 'N/A'}</td></tr>
                <tr><td><strong>Campaign Category:</strong></td><td>{contact.campaignCategory || 'N/A'}</td></tr>
              </tbody>
            </Table>
          </div>
        </div>
        
        {contact.syncErrors && contact.syncErrors.length > 0 && (
          <div className="row mt-3">
            <div className="col-12">
              <h6><i className="fas fa-exclamation-triangle text-warning"></i> Sync Errors</h6>
              <div className="alert alert-warning">
                {contact.syncErrors.slice(0, 3).map((error, index) => (
                  <div key={index}><small>{error.error} - {formatDate(error.timestamp)}</small></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
        <Button variant="primary">Edit Contact</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ContactModal;