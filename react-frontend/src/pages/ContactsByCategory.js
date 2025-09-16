import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Button } from "react-bootstrap";
import ContactCard from "../components/ContactCard";
import ContactTable from "../components/ContactTable";
import ContactModal from "../components/ContactModal";
import PaginationComponent from "../components/PaginationComponent";
import { getContactsByCategory, getContact } from "../services/api";

const ContactsByCategory = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState("grid");
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const categoryInfo = {
    clean: {
      title: "Clean Contacts",
      description: "Contacts with complete information: First Name, Last Name, Email, Phone, and Company from all sources (CSV, Google Sheets, HubSpot)",
      icon: "fas fa-check-circle",
      color: "success"
    },
    "email-only": {
      title: "Total Contacts with Email Only",
      description: "Contacts that have an email address but no phone number",
      icon: "fas fa-envelope",
      color: "info"
    },
    "phone-only": {
      title: "Total Contacts with Phone Only",
      description: "Contacts that have a phone number but no email address",
      icon: "fas fa-phone",
      color: "warning"
    }
  };

  const currentCategory = categoryInfo[category] || {
    title: "Unknown Category",
    description: "Category not found",
    icon: "fas fa-question",
    color: "secondary"
  };

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('ContactsByCategory: Fetching contacts for category:', category);
      const response = await getContactsByCategory(category, currentPage, pageSize);
      console.log('ContactsByCategory: API response:', response.data);

      if (response.data.success) {
        setContacts(response.data.data.contacts || []);
        if (response.data.data.pagination) {
          setTotalPages(response.data.data.pagination.totalPages);
          setTotalRecords(response.data.data.pagination.totalRecords);
        }
        console.log('ContactsByCategory: Loaded', response.data.data.contacts?.length, 'contacts');
      }
    } catch (error) {
      console.error("Error loading contacts by category:", error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [category, currentPage, pageSize]);

  useEffect(() => {
    console.log('ContactsByCategory: Loading category:', category);
    loadContacts();
  }, [category, loadContacts]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
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
      contactIds.forEach((id) => newSelected.delete(id));
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
      console.error("Error loading contact details:", error);
    }
  };

  return (
    <div>
      <Row>
        <Col>
          <div className="d-flex align-items-center mb-4">
            <Button
              variant="outline-secondary"
              onClick={() => navigate('/dashboard')}
              className="me-3"
            >
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </Button>
            <div>
              <h2 className="mb-1">
                <i className={currentCategory.icon}></i> {currentCategory.title}
              </h2>
              <p className="text-muted mb-0">{currentCategory.description}</p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Controls */}
      <Row className="mb-4">
        <Col md={3}>
          <select
            className="form-select"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </Col>
        <Col md={6}></Col>
        <Col md={3}>
          <div className="d-flex gap-2">
            <div className="btn-group">
              <Button
                variant={viewType === "grid" ? "primary" : "outline-secondary"}
                onClick={() => setViewType("grid")}
              >
                <i className="fas fa-th"></i> Grid
              </Button>
              <Button
                variant={viewType === "list" ? "primary" : "outline-secondary"}
                onClick={() => setViewType("list")}
              >
                <i className="fas fa-list"></i> List
              </Button>
            </div>
            <Button
              variant="outline-primary"
              onClick={loadContacts}
              disabled={loading}
            >
              <i className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`}></i>
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
              <p className="mt-2">Loading contacts...</p>
            </div>
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
                  Showing {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalRecords)} of{" "}
                  {totalRecords} contacts
                </>
              ) : (
                "No contacts found in this category"
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
              <i className={`${currentCategory.icon} fa-3x text-muted mb-3`}></i>
              <h5 className="text-muted">No contacts found</h5>
              <p className="text-muted">
                No contacts match the criteria for this category.
              </p>
            </div>
          ) : viewType === "grid" ? (
            <Row>
              {contacts.map((contact) => (
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

export default ContactsByCategory;