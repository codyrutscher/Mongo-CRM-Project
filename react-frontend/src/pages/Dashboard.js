import React, { useState, useEffect } from "react";
import { Row, Col, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getDashboardStats, getSyncJobs } from "../services/api";
import { formatSourceName, formatDate } from "../utils/formatters";

// Dynamically import Chart.js components
let Pie, ChartJS, ArcElement, Tooltip, Legend;
try {
  const chartImports = require("react-chartjs-2");
  const chartJSImports = require("chart.js");

  Pie = chartImports.Pie;
  ChartJS = chartJSImports.Chart;
  ArcElement = chartJSImports.ArcElement;
  Tooltip = chartJSImports.Tooltip;
  Legend = chartJSImports.Legend;

  // Register Chart.js components if available
  if (ChartJS && ArcElement && Tooltip && Legend) {
    ChartJS.register(ArcElement, Tooltip, Legend);
  }
} catch (error) {
  console.log("Chart.js not available, will use fallback visualization");
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    byLifecycleStage: {},
    bySource: {},
    cleanContacts: 0,
    emailOnlyContacts: 0,
    phoneOnlyContacts: 0,
  });
  const [syncJobs, setSyncJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🚀 DASHBOARD LOADED - NEW BUILD VERSION 1.0.2 WITH DEBUGGING");
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [statsResponse, syncResponse] = await Promise.all([
        getDashboardStats(),
        getSyncJobs(),
      ]);

      if (statsResponse.data.success) {
        console.log("Dashboard: Received stats:", statsResponse.data.data);
        setStats(statsResponse.data.data);
      }

      if (syncResponse.data.success) {
        setSyncJobs(syncResponse.data.data.jobs);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderCampaignTypePieChart = () => {
    const campaignTypes = stats.byCampaignType || {};
    const total = Object.values(campaignTypes).reduce((a, b) => a + b, 0);

    console.log("Dashboard: Rendering campaign type chart:", campaignTypes);
    console.log("Dashboard: Total contacts:", total);

    if (total === 0) {
      return (
        <p className="text-muted text-center">No campaign type data available</p>
      );
    }

    // Check if Chart.js is available
    if (Pie && ChartJS) {
      try {
        const labels = Object.keys(campaignTypes);
        const data = Object.values(campaignTypes);

        const colors = {
          'Buyer': '#36A2EB',
          'Seller': '#FF6384',
          'CRE': '#FFCE56',
          'Exit Factor': '#4BC0C0'
        };

        const chartData = {
          labels: labels,
          datasets: [
            {
              data: data,
              backgroundColor: labels.map(label => colors[label] || '#9966FF'),
              borderWidth: 2,
              borderColor: '#fff',
            },
          ],
        };

        const options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                },
              },
            },
          },
        };

        return (
          <div style={{ height: "300px", position: "relative" }}>
            <Pie data={chartData} options={options} />
          </div>
        );
      } catch (error) {
        console.error("Error rendering campaign type chart:", error);
      }
    }

    // Fallback to progress bars
    return Object.entries(campaignTypes).map(([type, count]) => {
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      return (
        <div key={type} className="mb-2">
          <div className="d-flex justify-content-between">
            <span>{type}</span>
            <span>
              {count.toLocaleString()} ({percentage}%)
            </span>
          </div>
          <div className="progress" style={{ height: "8px" }}>
            <div
              className="progress-bar"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      );
    });
  };


  const renderSyncJobs = () => {
    if (syncJobs.length === 0) {
      return <p className="text-muted">No recent sync jobs</p>;
    }

    return syncJobs.map((job) => {
      const statusClass =
        job.status === "completed"
          ? "success"
          : job.status === "failed"
          ? "danger"
          : "warning";
      return (
        <div
          key={job._id}
          className="d-flex justify-content-between align-items-center mb-2"
        >
          <div>
            <strong>{formatSourceName(job.source)}</strong>
            <small className="text-muted d-block">
              {formatDate(job.createdAt)}
            </small>
          </div>
          <span className={`badge bg-${statusClass}`}>{job.status}</span>
        </div>
      );
    });
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
            <i className="fas fa-tachometer-alt"></i> Dashboard
          </h2>
        </Col>
      </Row>

      {/* Stats Cards - Campaign Types */}
      <Row className="mb-4">
        <Col md={3}>
          <Card
            className="bg-primary text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/hubspot-contacts")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-users fa-2x mb-2"></i>
              <h3>{stats.total?.toLocaleString()}</h3>
              <p>Total Contacts</p>
              <small className="d-block">
                All Contacts
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="bg-success text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/contacts/campaign/buyer")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-shopping-cart fa-2x mb-2"></i>
              <h3>{stats.byCampaignType?.Buyer || 0}</h3>
              <p>Buyer Contacts</p>
              <small className="d-block">
                Campaign Type: Buyer
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="bg-info text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/contacts/campaign/seller")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-briefcase fa-2x mb-2"></i>
              <h3>{stats.byCampaignType?.Seller || 0}</h3>
              <p>Seller Contacts</p>
              <small className="d-block">
                Campaign Type: Seller
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="bg-warning text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/contacts/campaign/cre")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-building fa-2x mb-2"></i>
              <h3>{stats.byCampaignType?.CRE || 0}</h3>
              <p>CRE Contacts</p>
              <small className="d-block">
                Campaign Type: CRE
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Second Row - Exit Factor + Data Quality */}
      <Row className="mb-4">
        <Col md={3}>
          <Card
            className="bg-danger text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/contacts/campaign/exit-factor")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-rocket fa-2x mb-2"></i>
              <h3>{stats.byCampaignType?.["Exit Factor"] || 0}</h3>
              <p>Exit Factor</p>
              <small className="d-block">
                Campaign Type: Exit Factor
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="bg-secondary text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/hubspot-contacts?filter=clean")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-check-circle fa-2x mb-2"></i>
              <h3>{stats.cleanContacts?.total?.toLocaleString() || 0}</h3>
              <p>Clean Contacts</p>
              <small className="d-block">
                Complete Information
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="bg-secondary text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/hubspot-contacts?filter=email-only")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-envelope fa-2x mb-2"></i>
              <h3>{stats.emailOnlyContacts?.total?.toLocaleString() || 0}</h3>
              <p>Email Only</p>
              <small className="d-block">
                Missing Phone
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="bg-secondary text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/hubspot-contacts?filter=phone-only")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-phone fa-2x mb-2"></i>
              <h3>{stats.phoneOnlyContacts?.total?.toLocaleString() || 0}</h3>
              <p>Phone Only</p>
              <small className="d-block">
                Missing Email
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Campaign Types and Sync Jobs */}
      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>
                <i className="fas fa-chart-pie"></i> Campaign Type Distribution
              </h5>
            </Card.Header>
            <Card.Body>{renderCampaignTypePieChart()}</Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>
                <i className="fas fa-sync"></i> Recent Sync Jobs
              </h5>
            </Card.Header>
            <Card.Body>{renderSyncJobs()}</Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Webhook Activity */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>
              <h5>
                <i className="fas fa-bolt"></i> Real-time Webhook Activity
              </h5>
            </Card.Header>
            <Card.Body>
              <p className="text-success">
                <i className="fas fa-check-circle"></i> Webhooks are active and
                syncing data in real-time
              </p>
              <small className="text-muted">
                Contacts are automatically synced from HubSpot as they're
                created or updated
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
