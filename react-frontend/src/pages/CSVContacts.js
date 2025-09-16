import React, { useState, useEffect } from 'react';
import { Row, Col, Button, InputGroup, Form, Alert } from 'react-bootstrap';
import ContactCard from '../components/ContactCard';
import ContactTable from '../components/ContactTable';
import ContactModal from '../components/ContactModal';
import PaginationComponent from '../components/PaginationComponent';
import CSVFilters from '../components/CSVFilters';
import CSVUpload from '../components/CSVUpload';
import { getContacts, getContactsWithFilters, getContact, getAllFilteredContactIds, createSegment } from '../services/api';

const CSVContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState('grid');
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  
  // Filter state
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadContacts();
  }, [currentPage, pageSize, filters, sortField, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadContacts = async () => {
    try {
      setLoading(true);
      
      let response;
      if (Object.keys(filters).length > 0 || searchQuery) {
        // Use advanced search with filters - include all CSV sources
        const searchFilters = { ...filters };
        if (!searchFilters.source) {
          searchFilters.source = { $regex: '^csv_' };
        }
        if (searchQuery) {
          searchFilters.searchQuery = searchQuery;
        }
        response = await getContactsWithFilters(searchFilters, currentPage, pageSize, sortField, sortOrder);
      } else {
        // Use simple source-based filtering - include all CSV sources
        response = await getContacts({ 
          source: { $regex: '^csv_' }, 
          page: currentPage,
          limit: pageSize,
          sort: sortField,
          order: sortOrder
        });
      }
      
      if (response.data.success) {
        setContacts(response.data.data || []);
        if (response.data.pagination) {
          const totalRecs = response.data.pagination.totalRecords || 0;
          const calculatedPages = Math.ceil(totalRecs / pageSize);
          setTotalPages(response.data.pagination.totalPages || calculatedPages);
          setTotalRecords(totalRecs);
        }
      }
    } catch (error) {
      console.error('Error loading CSV contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadContacts();
  };

  const handleSortChange = (field, order) => {
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
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

  const selectAllFilteredResults = async () => {
    if (Object.keys(filters).length === 0 && !searchQuery) {
      alert('Please apply filters first to select all filtered results');
      return;
    }
    
    try {
      setLoading(true);
      const searchFilters = { ...filters, source: 'csv_upload' };
      if (searchQuery) {
        searchFilters.searchQuery = searchQuery;
      }
      
      const response = await getAllFilteredContactIds(searchFilters);
      
      if (response.data.success) {
        const allContactIds = response.data.data.map(contact => contact._id);
        setSelectedContacts(new Set(allContactIds));
        
        const checkboxes = document.querySelectorAll('.contact-checkbox');
        checkboxes.forEach(checkbox => {
          const contactId = checkbox.getAttribute('data-contact-id');
          if (allContactIds.includes(contactId)) {
            checkbox.checked = true;
          }
        });
        
        alert(`Selected ALL ${allContactIds.length} filtered contacts across all pages!`);
      }
    } catch (error) {
      console.error('Error selecting all filtered contacts:', error);
      alert('Failed to select all filtered contacts');
    } finally {
      setLoading(false);
    }
  };

  const createSegmentFromSelected = async () => {
    if (selectedContacts.size === 0) {
      alert('Please select contacts first');
      return;
    }
    
    const segmentName = prompt(`Create segment from ${selectedContacts.size} selected contacts.\n\nEnter segment name:`);
    if (!segmentName) return;
    
    try {
      setLoading(true);
      const contactIds = Array.from(selectedContacts);
      
      const response = await createSegment({
        name: segmentName,
        description: `CSV segment with ${contactIds.length} selected contacts`,
        contactIds: contactIds,
        color: '#28a745',
        icon: 'fas fa-file-csv'
      });
      
      if (response.data.success) {
        alert(`Segment "${segmentName}" created successfully with ${contactIds.length} contacts!`);
        clearSelection();
      } else {
        alert(`Failed to create segment: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Error creating segment:', error);
      alert('Failed to create segment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (result) => {
    // Refresh the contacts list after successful upload
    loadContacts();
  };

  return (
    <div>
      <Row>
        <Col>
          <h2 className="mb-4">
            <i className="fas fa-file-csv"></i> CSV Upload Contacts
          </h2>
          <p className="text-muted">
            Contacts uploaded via CSV files - each upload is tracked separately for campaign analysis
          </p>
        </Col>
      </Row>

      {/* CSV Upload Component */}
      <CSVUpload onUploadComplete={handleUploadComplete} />

      {/* CSV Filters */}
      <CSVFilters
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        isVisible={showFilters}
        onToggleVisibility={() => setShowFilters(!showFilters)}
      />

      {/* Search and Controls */}
      <Row className="mb-4">
        <Col md={4}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="primary" onClick={handleSearch} disabled={loading}>
              <i className="fas fa-search"></i>
            </Button>
          </InputGroup>
        </Col>
        <Col md={2}>
          <Form.Select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              handleSortChange(field, order);
            }}
          >
            <option value="createdAt-desc">📅 Newest First</option>
            <option value="createdAt-asc">📅 Oldest First</option>
            <option value="firstName-asc">🔤 Name A-Z</option>
            <option value="firstName-desc">🔤 Name Z-A</option>
            <option value="company-asc">🏢 Company A-Z</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <div className="d-flex gap-2">
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
            <Button variant="outline-primary" onClick={loadContacts} disabled={loading}>
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </Button>
          </div>
        </Col>
      </Row>

      {/* Loading State */}
      {loading && (
        <Row>
          <Col>
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading CSV contacts...</p>
            </div>
          </Col>
        </Row>
      )}

      {/* Select All Filtered Results Button */}
      {(Object.keys(filters).length > 0 || searchQuery) && !loading && (
        <Row className="mb-3">
          <Col>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={selectAllFilteredResults}
                disabled={loading}
              >
                <i className="fas fa-check-square"></i> Select All {totalRecords} Filtered Results
              </Button>
              {selectedContacts.size > 0 && (
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={clearSelection}
                >
                  <i className="fas fa-times"></i> Clear Selection
                </Button>
              )}
            </div>
          </Col>
        </Row>
      )}

      {/* Bulk Actions */}
      {selectedContacts.size > 0 && (
        <Row className="mb-3">
          <Col>
            <Alert variant="info" className="d-flex justify-content-between align-items-center">
              <div>
                <span>{selectedContacts.size} contacts selected</span>
                {selectedContacts.size > contacts.length && (
                  <small className="text-muted d-block">
                    (includes contacts from other pages)
                  </small>
                )}
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

      {/* Results Info */}
      {!loading && (
        <Row className="mb-3">
          <Col>
            <div className="text-muted">
              {totalRecords > 0 ? (
                <>
                  Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} CSV contacts
                  {Object.keys(filters).length > 0 && <span className="text-primary"> (filtered)</span>}
                </>
              ) : (
                'No CSV contacts found'
              )}
            </div>
          </Col>
        </Row>
      )}

      {/* Contacts Display */}
      <Row>
        <Col>
          {!loading && contacts.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No CSV contacts found</h5>
              <p className="text-muted">
                {Object.keys(filters).length > 0 || searchQuery 
                  ? 'Try adjusting your search criteria or filters.'
                  : 'No contacts have been uploaded via CSV files yet.'
                }
              </p>
            </div>
          ) : viewType === 'grid' ? (
            <Row>
              {contacts.map(contact => (
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
              contacts={contacts}
              selectedContacts={selectedContacts}
              onSelect={handleContactSelect}
              onSelectAll={handleSelectAll}
              onViewDetails={handleViewDetails}
            />
          )}
        </Col>
      </Row>

      {/* Pagination */}
      {!loading && contacts.length > 0 && (
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalRecords={totalRecords}
        />
      )}

      {/* Contact Modal */}
      <ContactModal
        show={showContactModal}
        contact={selectedContact}
        onHide={() => setShowContactModal(false)}
      />
    </div>
  );
};

export default CSVContacts;