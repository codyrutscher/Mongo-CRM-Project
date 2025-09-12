import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import ContactCard from '../components/ContactCard';
import ContactTable from '../components/ContactTable';
import { getContacts } from '../services/api';

const CSVContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await getContacts({ 
        source: 'csv_upload', 
        limit: 100, 
        page: 1 
      });
      
      if (response.data.success) {
        setContacts(response.data.data);
      }
    } catch (error) {
      console.error('Error loading CSV contacts:', error);
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
            <i className="fas fa-file-csv"></i> CSV Upload Contacts
          </h2>
          <p className="text-muted">
            Contacts uploaded via CSV files - kept separate for campaign tracking
          </p>
        </Col>
      </Row>

      <Row>
        <Col>
          {contacts.length === 0 ? (
            <p className="text-muted">No CSV contacts found.</p>
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

export default CSVContacts;