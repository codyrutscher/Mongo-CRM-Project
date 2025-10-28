import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Button, Badge } from 'react-bootstrap';
import ContactTable from '../components/ContactTable';
import PaginationComponent from '../components/PaginationComponent';
import { searchContacts } from '../services/api';

const CampaignContacts = () => {
  const { campaignType } = useParams();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
  });

  const campaignTypeMap = {
    'buyer': 'Buyer',
    'seller': 'Seller',
    'cre': 'CRE',
    'exit-factor': 'Exit Factor'
  };

  const campaignTypeDisplay = campaignTypeMap[campaignType] || campaignType;

  useEffect(() => {
    loadContacts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignType]);

  const loadContacts = async (page = 1) => {
    try {
      setLoading(true);
      
      const filters = {
        campaignType: campaignTypeDisplay
      };

      const response = await searchContacts({
        filters,
        page,
        limit: 50,
        sort: 'createdAt',
        order: 'desc'
      });

      if (response.data.success) {
        setContacts(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading campaign contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    loadContacts(page);
  };

  const handleContactClick = (contact) => {
    // You can implement a contact detail modal or page here
    console.log('Contact clicked:', contact);
  };

  const getIcon = () => {
    switch (campaignType) {
      case 'buyer': return '🛒';
      case 'seller': return '💼';
      case 'cre': return '🏢';
      case 'exit-factor': return '🚀';
      default: return '📋';
    }
  };

  const getColor = () => {
    switch (campaignType) {
      case 'buyer': return 'success';
      case 'seller': return 'info';
      case 'cre': return 'warning';
      case 'exit-factor': return 'danger';
      default: return 'primary';
    }
  };

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                {getIcon()} {campaignTypeDisplay} Contacts
              </h2>
              <p className="text-muted">
                All contacts with campaign type: {campaignTypeDisplay}
              </p>
            </div>
            <div>
              <Badge bg={getColor()} className="fs-5">
                {pagination.totalRecords} contacts
              </Badge>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <Button
            variant="outline-secondary"
            onClick={() => navigate('/dashboard')}
          >
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Button>
        </Col>
      </Row>

      {loading && (
        <Row>
          <Col>
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading {campaignTypeDisplay} contacts...</p>
            </div>
          </Col>
        </Row>
      )}

      {!loading && contacts.length === 0 && (
        <Row>
          <Col>
            <div className="text-center py-5">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No {campaignTypeDisplay} contacts found</h5>
              <p className="text-muted">
                Upload CSV files with Campaign Type field set to "{campaignTypeDisplay}" to see contacts here.
              </p>
              <Button
                variant="primary"
                onClick={() => navigate('/csv-contacts')}
              >
                <i className="fas fa-upload"></i> Upload CSV
              </Button>
            </div>
          </Col>
        </Row>
      )}

      {!loading && contacts.length > 0 && (
        <>
          <ContactTable
            contacts={contacts}
            onContactClick={handleContactClick}
          />
          
          <Row className="mt-4">
            <Col>
              <PaginationComponent
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default CampaignContacts;
