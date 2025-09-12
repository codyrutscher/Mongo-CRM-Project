import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import HubSpotContacts from './pages/HubSpotContacts';
import CSVContacts from './pages/CSVContacts';
import SheetsContacts from './pages/SheetsContacts';
import Segments from './pages/Segments';
import SegmentDetails from './pages/SegmentDetails';
import LoadingModal from './components/LoadingModal';
import ContactModal from './components/ContactModal';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  return (
    <Router>
      <div className="App">
        <Navigation />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/hubspot-contacts" element={<HubSpotContacts />} />
            <Route path="/csv-contacts" element={<CSVContacts />} />
            <Route path="/sheets-contacts" element={<SheetsContacts />} />
            <Route path="/segments" element={<Segments />} />
            <Route path="/segment-details/:id" element={<SegmentDetails />} />
          </Routes>
        </div>
        
        <LoadingModal show={isLoading} />
        <ContactModal 
          show={showContactModal} 
          contact={selectedContact}
          onHide={() => setShowContactModal(false)}
        />
      </div>
    </Router>
  );
}

export default App;