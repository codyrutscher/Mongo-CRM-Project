import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import ContactCard from '../components/ContactCard';
import { getContacts } from '../services/api';

const SheetsContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await getContacts({ 
        source: 'google_sheets', 
        limit: 100, 
        page: 1 
      });
      
      if (response.data.success) {
        setContacts(response.data.data);
      }
    } catch (error) {
      console.error('Error loading Google Sheets contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Row>
        <Col>
          <h2 className="mb-4">
            <i className="fas fa-table"></i> Google Sheets Contacts
          </h2>
          <p className="text-muted">
            Contacts imported from Google Sheets
          </p>
        </Col>
      </Row>

      <Row>
        <Col>
          {contacts.length === 0 ? (
            <p className="text-muted">No Google Sheets contacts found.</p>
          ) : (
            <Row>
              {contacts.map(contact => (
                <ContactCard key={contact._id} contact={contact} />
              ))}
            </Row>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default SheetsContacts;