import React from 'react';
import { Table, Badge, Button, Form } from 'react-bootstrap';
import { formatSourceName, getLifecycleColor } from '../utils/formatters';

const ContactTable = ({ contacts, selectedContacts, onSelect, onViewDetails, onSelectAll }) => {
  const handleSelectAll = (checked) => {
    const contactIds = contacts.map(contact => contact._id);
    onSelectAll(contactIds, checked);
  };

  return (
    <div className="table-responsive">
      <Table hover>
        <thead>
          <tr>
            <th width="50">
              <Form.Check 
                type="checkbox"
                checked={contacts.length > 0 && contacts.every(contact => selectedContacts.has(contact._id))}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Company</th>
            <th>Source</th>
            <th>Stage</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(contact => (
            <tr key={contact._id} data-contact-id={contact._id} className="contact-row">
              <td>
                <Form.Check 
                  type="checkbox"
                  className="contact-checkbox"
                  data-contact-id={contact._id}
                  checked={selectedContacts.has(contact._id)}
                  onChange={(e) => onSelect(contact._id, e.target.checked)}
                />
              </td>
              <td><strong>{contact.firstName} {contact.lastName}</strong></td>
              <td>{contact.email || <span className="text-muted">No email</span>}</td>
              <td>{contact.phone || <span className="text-muted">No phone</span>}</td>
              <td>{contact.company || <span className="text-muted">No company</span>}</td>
              <td>
                <Badge bg="info">{formatSourceName(contact.source)}</Badge>
              </td>
              <td>
                <Badge bg={getLifecycleColor(contact.lifecycleStage)}>
                  {contact.lifecycleStage}
                </Badge>
              </td>
              <td>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => onViewDetails(contact._id)}
                >
                  <i className="fas fa-eye"></i>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ContactTable;