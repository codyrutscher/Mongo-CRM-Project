import React from 'react';
import { Modal, Spinner } from 'react-bootstrap';

const LoadingModal = ({ show, message = "Processing your request..." }) => {
  return (
    <Modal 
      show={show} 
      centered 
      backdrop="static" 
      keyboard={false}
    >
      <Modal.Body className="text-center">
        <Spinner animation="border" variant="primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">{message}</p>
      </Modal.Body>
    </Modal>
  );
};

export default LoadingModal;