import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getSegments, deleteSegment, exportSegment } from '../services/api';

const Segments = () => {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      setLoading(true);
      const response = await getSegments();
      if (response.data.success) {
        setSegments(response.data.data);
      }
    } catch (error) {
      console.error('Error loading segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSegment = (segmentId) => {
    navigate(`/segment-details/${segmentId}`);
  };

  const handleExportSegment = async (segmentId) => {
    try {
      const response = await exportSegment(segmentId);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `segment_${segmentId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting segment:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleDeleteSegment = async (segmentId) => {
    const segment = segments.find(s => s._id === segmentId);
    if (!segment) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete "${segment.name}"?\n\nThis will permanently delete the segment but not the contacts.`);
    if (!confirmDelete) return;

    try {
      await deleteSegment(segmentId);
      alert('Segment deleted successfully!');
      loadSegments();
    } catch (error) {
      console.error('Error deleting segment:', error);
      alert('Failed to delete segment');
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
            <i className="fas fa-layer-group"></i> Audience Segments
          </h2>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Your Segments</h5>
              <small className="text-muted">
                Create segments by selecting contacts and using "Create Segment" button
              </small>
            </Card.Header>
            <Card.Body>
              {segments.length === 0 ? (
                <p className="text-muted">No segments found.</p>
              ) : (
                segments.map(segment => (
                  <div key={segment._id} className="segment-item">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">
                          <i className={segment.icon} style={{ color: segment.color }}></i>
                          {' '}{segment.name}
                        </h6>
                        <p className="mb-1 text-muted">{segment.description}</p>
                        <small className="text-muted">{segment.contactCount} contacts</small>
                      </div>
                      <div className="segment-actions">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="me-1"
                          onClick={() => handleViewSegment(segment._id)}
                        >
                          <i className="fas fa-eye"></i> View
                        </Button>
                        <Button 
                          variant="outline-success" 
                          size="sm" 
                          className="me-1"
                          onClick={() => handleExportSegment(segment._id)}
                        >
                          <i className="fas fa-download"></i> Export
                        </Button>
                        {!segment.isSystem && (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleDeleteSegment(segment._id)}
                          >
                            <i className="fas fa-trash"></i> Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Segments;