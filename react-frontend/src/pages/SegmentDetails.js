import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Table, Badge, Pagination } from 'react-bootstrap';
import { getSegment, getSegmentContactsById, deleteSegment, exportSegment } from '../services/api';
import { formatSourceName } from '../utils/formatters';

const SegmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [segment, setSegment] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, total: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadSegmentDetails();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSegmentDetails = async () => {
    try {
      setLoading(true);
      const response = await getSegment(id);
      if (response.data.success) {
        setSegment(response.data.data);
        loadSegmentContacts(1);
      }
    } catch (error) {
      console.error('Error loading segment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSegmentContacts = async (page = 1) => {
    try {
      const response = await getSegmentContactsById(id, page, 20);
      if (response.data.success) {
        setContacts(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading segment contacts:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await exportSegment(id);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `segment_${id}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting segment:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!segment) return;

    if (segment.isSystem) {
      alert('Cannot delete system segments');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete "${segment.name}"?\n\nThis will permanently delete the segment but not the contacts.`);
    if (!confirmDelete) return;

    try {
      await deleteSegment(id);
      alert('Segment deleted successfully!');
      navigate('/segments');
    } catch (error) {
      console.error('Error deleting segment:', error);
      alert('Failed to delete segment');
    }
  };

  const renderPagination = () => {
    if (pagination.total <= 1) return null;

    const items = [];
    const startPage = Math.max(1, pagination.current - 2);
    const endPage = Math.min(pagination.total, pagination.current + 2);

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === pagination.current}
          onClick={() => loadSegmentContacts(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-center">
        <Pagination.Prev
          disabled={pagination.current === 1}
          onClick={() => loadSegmentContacts(pagination.current - 1)}
        />
        {items}
        <Pagination.Next
          disabled={pagination.current === pagination.total}
          onClick={() => loadSegmentContacts(pagination.current + 1)}
        />
      </Pagination>
    );
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

  if (!segment) {
    return <div>Segment not found</div>;
  }

  return (
    <div>
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>{segment.name}</h2>
              <p className="text-muted">{segment.description}</p>
            </div>
            <div>
              <Button variant="outline-success" className="me-2" onClick={handleExport}>
                <i className="fas fa-download"></i> Export
              </Button>
              {!segment.isSystem && (
                <Button variant="outline-danger" className="me-2" onClick={handleDelete}>
                  <i className="fas fa-trash"></i> Delete
                </Button>
              )}
              <Button variant="primary" onClick={() => navigate('/segments')}>
                <i className="fas fa-arrow-left"></i> Back to Segments
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card>
            <Card.Body className="text-center">
              <h3>{segment.contactCount}</h3>
              <p>Total Contacts</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body className="text-center">
              <h3>{segment.stats?.leads || 0}</h3>
              <p>Leads</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body className="text-center">
              <h3>{segment.stats?.prospects || 0}</h3>
              <p>Prospects</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body className="text-center">
              <h3>{segment.stats?.customers || 0}</h3>
              <p>Customers</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Contacts */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Contacts in Segment</h5>
            </Card.Header>
            <Card.Body>
              {contacts.length === 0 ? (
                <p className="text-muted">No contacts in this segment.</p>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table hover>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Company</th>
                          <th>Source</th>
                          <th>DNC Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.map(contact => (
                          <tr key={contact._id}>
                            <td><strong>{contact.firstName} {contact.lastName}</strong></td>
                            <td>{contact.email || <span className="text-muted">No email</span>}</td>
                            <td>{contact.phone || <span className="text-muted">No phone</span>}</td>
                            <td>{contact.company || <span className="text-muted">No company</span>}</td>
                            <td>
                              <Badge bg="info">{formatSourceName(contact.source)}</Badge>
                            </td>
                            <td>
                              {contact.dncStatus === 'dnc_internal' ? 
                                <Badge bg="danger">DNC</Badge> : 
                                <Badge bg="success">Callable</Badge>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  {renderPagination()}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SegmentDetails;