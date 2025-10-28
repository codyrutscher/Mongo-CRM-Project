import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import HubSpotContacts from "./pages/HubSpotContacts";
import CSVIndex from "./pages/CSVIndex";
import CSVSourceContacts from "./pages/CSVSourceContacts";
import SheetsContacts from "./pages/SheetsContacts";
import ContactsByCategory from "./pages/ContactsByCategory";
import CategorySourceIndex from "./pages/CategorySourceIndex";
import SourceIndex from "./pages/SourceIndex";
import CampaignContacts from "./pages/CampaignContacts";
import DebugAPI from "./pages/DebugAPI";
import DebugPanel from "./components/DebugPanel";
import Segments from "./pages/Segments";
import SegmentDetails from "./pages/SegmentDetails";
import ContactModal from "./components/ContactModal";
import Login from "./pages/Login";
import DatadogTest from "./pages/DatadogTest";
import ProtectedRoute from "./components/ProtectedRoute";
import { initializeDatadog, logger } from "./utils/datadog";
import "./App.css";

function App() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContact] = useState(null);

  // Initialize Datadog on app start
  useEffect(() => {
    console.log("=== DATADOG DEBUG INFO ===");
    console.log(
      "Client Token:",
      process.env.REACT_APP_DATADOG_CLIENT_TOKEN ? "SET" : "NOT SET"
    );
    console.log("Site:", process.env.REACT_APP_DATADOG_SITE);
    console.log("Environment:", process.env.REACT_APP_ENVIRONMENT);
    console.log("Version:", process.env.REACT_APP_VERSION);
    console.log(
      "Application ID:",
      process.env.REACT_APP_DATADOG_APPLICATION_ID ? "SET" : "NOT SET"
    );

    try {
      if (!process.env.REACT_APP_DATADOG_CLIENT_TOKEN) {
        console.error("DATADOG ERROR: Client token is missing!");
        return;
      }

      console.log("Initializing Datadog...");
      initializeDatadog();
      console.log("Datadog initialized successfully");

      // Test log immediately
      logger.info("Prospere CRM Frontend Started", {
        version: process.env.REACT_APP_VERSION || "1.0.0",
        environment: process.env.REACT_APP_ENVIRONMENT || "development",
        timestamp: new Date().toISOString(),
      });
      console.log("Test log sent to Datadog");
    } catch (error) {
      console.error("Failed to initialize Datadog:", error);
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <Dashboard />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hubspot-contacts"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <HubSpotContacts />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/csv-contacts"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <CSVIndex />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/csv-contacts/:source"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <CSVSourceContacts />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sheets-contacts"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <SheetsContacts />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts/sources"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <SourceIndex />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts/category/:category"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <CategorySourceIndex />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts/category/:category/source/:source"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <ContactsByCategory />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts/campaign/:campaignType"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <CampaignContacts />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/debug"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <DebugAPI />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/debug-panel"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <DebugPanel />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/segments"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <Segments />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/segment-details/:id"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <SegmentDetails />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/datadog-test"
            element={
              <ProtectedRoute>
                <Navigation />
                <div className="container mt-4">
                  <DatadogTest />
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>

        {/* LoadingModal can be used by individual components */}
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
