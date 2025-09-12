import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, InputGroup, Form, Alert } from 'react-bootstrap';
import ContactCard from '../components/ContactCard';
import ContactTable from '../components/ContactTable';
import ContactModal from '../components/ContactModal';
import { getContacts, getContact } from '../services/api';

const HubSpotContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState('grid');
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await getContacts({ 
        source: 'hubspot', 
        limit: 100, 
        page: 1 
      });
      
      if (response.data.success) {
        setContacts(response.data.data);
      }
    } catch (error) {
      console.error('Error loading HubSpot contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelect = (contactId, isSelected) => {
    const newSelected = new Set(selectedContacts);
    if (isSelected) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = (contactIds, isSelected) => {
    if (isSelected) {
      setSelectedContacts(new Set([...selectedContacts, ...contactIds]));
    } else {
      const newSelected = new Set(selectedContacts);
      contactIds.forEach(id => newSelected.delete(id));
      setSelectedContacts(newSelected);
    }
  };

  const handleViewDetails = async (contactId) => {
    try {
      const response = await getContact(contactId);
      if (response.data.success) {
        setSelectedContact(response.data.data);
        setShowContactModal(true);
      }
    } catch (error) {
      console.error('Error loading contact details:', error);
    }
  };

  const clearSelection = () => {
    setSelectedContacts(new Set());
  };

  const createSegmentFromSelected = () => {
    if (selectedContacts.size === 0) {
      alert('Please select contacts first');
      return;
    }
    
    const segmentName = prompt(`Create segment from ${selectedContacts.size} selected contacts.\n\nEnter segment name:`);
    if (!segmentName) return;
    
    console.log('Creating segment with contacts:', Array.from(selectedContacts));
  };

  const filteredContacts = contacts.filter(contact =>
    searchQuery === '' || 
    contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <i className="fas fa-hubspot"></i> HubSpot Contacts
          </h2>
          <p className="text-muted">
            Real-time synced contacts from HubSpot with complete business intelligence
          </p>
        </Col>
      </Row>

      {/* Search and Controls */}
      <Row className="mb-4">
        <Col md={6}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="primary">
              <i className="fas fa-search"></i>
            </Button>
          </InputGroup>
        </Col>
        <Col md={6}>
          <div className="d-flex gap-2 justify-content-end">
            <div className="btn-group">
              <Button 
                variant={viewType === 'grid' ? 'primary' : 'outline-secondary'}
                onClick={() => setViewType('grid')}
              >
                <i className="fas fa-th"></i> Grid
              </Button>
              <Button 
                variant={viewType === 'list' ? 'primary' : 'outline-secondary'}
                onClick={() => setViewType('list')}
              >
                <i className="fas fa-list"></i> List
              </Button>
            </div>
            <Button variant="outline-primary" onClick={loadContacts}>
              <i className="fas fa-sync-alt"></i>
            </Button>
          </div>
        </Col>
      </Row>

      {/* Bulk Actions */}
      {selectedContacts.size > 0 && (
        <Row className="mb-3">
          <Col>
            <Alert variant="info" className="d-flex justify-content-between align-items-center">
              <div>
                <span>{selectedContacts.size} contacts selected</span>
              </div>
              <div>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="me-2"
                  onClick={createSegmentFromSelected}
                >
                  <i className="fas fa-layer-group"></i> Create Segment
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={clearSelection}
                >
                  <i className="fas fa-times"></i> Clear Selection
                </Button>
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Contacts Display */}
      <Row>
        <Col>
          {filteredContacts.length === 0 ? (
            <p className="text-muted">No HubSpot contacts found.</p>
          ) : viewType === 'grid' ? (
            <Row>
              {filteredContacts.map(contact => (
                <ContactCard
                  key={contact._id}
                  contact={contact}
                  isSelected={selectedContacts.has(contact._id)}
                  onSelect={handleContactSelect}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </Row>
          ) : (
            <ContactTable
              contacts={filteredContacts}
              selectedContacts={selectedContacts}
              onSelect={handleContactSelect}
              onSelectAll={handleSelectAll}
              onViewDetails={handleViewDetails}
            />
          )}
        </Col>
      </Row>

      <ContactModal
        show={showContactModal}
        contact={selectedContact}
        onHide={() => setShowContactModal(false)}
      />
    </div>
  );
};

export default HubSpotContacts;