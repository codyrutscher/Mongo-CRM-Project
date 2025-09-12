import React from 'react';
import { Card, Badge, Form } from 'react-bootstrap';
import { formatSourceName, getLifecycleColor } from '../utils/formatters';

const ContactCard = ({ contact, isSelected, onSelect, onViewDetails }) => {
  const handleCardClick = (e) => {
    // Don't trigger details view if clicking on checkbox
    if (e.target.type === 'checkbox') return;
    if (onViewDetails) {
      onViewDetails(contact._id);
    }
  };

  return (
    <div className="col-md-6 col-lg-4 mb-3">
      <Card 
        className={`contact-card ${isSelected ? 'border-primary' : ''}`}
        style={{ cursor: 'pointer' }}
        data-contact-id={contact._id}
        onClick={handleCardClick}
      >
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <Card.Title className="h6 mb-0">
              {contact.firstName} {contact.lastName}
            </Card.Title>
            <Form.Check 
              type="checkbox" 
              className="contact-checkbox"
              data-contact-id={contact._id}
              checked={isSelected}
              onChange={(e) => onSelect && onSelect(contact._id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <Card.Text>
            <small className="text-muted">
              <i className="fas fa-envelope"></i> {contact.email || 'No email'}<br/>
              <i className="fas fa-phone"></i> {contact.phone || 'No phone'}<br/>
              <i className="fas fa-building"></i> {contact.company || 'No company'}
            </small>
          </Card.Text>
          
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">{formatSourceName(contact.source)}</small>
            <Badge bg={getLifecycleColor(contact.lifecycleStage)}>
              {contact.lifecycleStage}
            </Badge>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ContactCard;