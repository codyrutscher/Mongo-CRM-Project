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
    console.log('🚀 DASHBOARD LOADED - NEW BUILD VERSION 1.0.2 WITH DEBUGGING');
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

  const renderSourcePieChart = () => {
    const sources = stats.bySource || {};
    const total = Object.values(sources).reduce((a, b) => a + b, 0);

    console.log("Dashboard: Rendering pie chart with sources:", sources);
    console.log("Dashboard: Total contacts:", total);

    if (total === 0) {
      return (
        <p className="text-muted text-center">No contact data available</p>
      );
    }

    // Check if Chart.js is available, otherwise use progress bars
    if (Pie && ChartJS) {
      try {
        // Prepare data for pie chart
        const labels = Object.keys(sources).map((source) =>
          formatSourceName(source)
        );
        const data = Object.values(sources);

        // Define colors for different sources
        const colors = [
          "#FF6384", // HubSpot - Pink/Red
          "#36A2EB", // Google Sheets - Blue
          "#FFCE56", // CSV - Yellow
          "#4BC0C0", // Additional sources - Teal
          "#9966FF", // Additional sources - Purple
          "#FF9F40", // Additional sources - Orange
        ];

        const chartData = {
          labels: labels,
          datasets: [
            {
              data: data,
              backgroundColor: colors.slice(0, labels.length),
              borderColor: colors
                .slice(0, labels.length)
                .map((color) => color + "80"), // Add transparency
              borderWidth: 2,
              hoverBorderWidth: 3,
              hoverBorderColor: "#fff",
            },
          ],
        };

        const options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 20,
                usePointStyle: true,
                font: {
                  size: 12,
                },
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || "";
                  const value = context.parsed;
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                },
              },
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "#fff",
              borderWidth: 1,
            },
          },
          interaction: {
            intersect: false,
            mode: "index",
          },
        };

        return (
          <div style={{ height: "300px", position: "relative" }}>
            <Pie data={chartData} options={options} />
          </div>
        );
      } catch (error) {
        console.error(
          "Error rendering pie chart, falling back to progress bars:",
          error
        );
      }
    }

    // Fallback to enhanced progress bars if Chart.js not available
    console.log("Using progress bar fallback for contact sources");
    return Object.entries(sources).map(([source, count]) => {
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      return (
        <div key={source} className="mb-2">
          <div className="d-flex justify-content-between">
            <span>{formatSourceName(source)}</span>
            <span>
              {count.toLocaleString()} ({percentage}%)
            </span>
          </div>
          <div className="progress" style={{ height: "8px" }}>
            <div
              className="progress-bar"
              style={{ width: `${percentage}%` }}
              title={`${formatSourceName(
                source
              )}: ${count.toLocaleString()} (${percentage}%)`}
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

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card
            className="bg-primary text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/contacts/sources")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-users fa-2x mb-2"></i>
              <h3>{stats.total}</h3>
              <p>Total Contacts</p>
              <small className="d-block">
                HubSpot: {stats.bySource?.hubspot || 0} | Sheets:{" "}
                {stats.bySource?.google_sheets || 0} | CSV:{" "}
                {Object.entries(stats.bySource || {})
                  .filter(([key]) => key.startsWith("csv_"))
                  .reduce((sum, [, count]) => sum + count, 0)}
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="bg-success text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/contacts/category/clean")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-check-circle fa-2x mb-2"></i>
              <h3>{stats.cleanContacts?.total || 0}</h3>
              <p>Clean Contacts</p>
              <small className="d-block">
                HubSpot: {stats.cleanContacts?.hubspot || 0} | Sheets:{" "}
                {stats.cleanContacts?.google_sheets || 0} | CSV:{" "}
                {stats.cleanContacts?.csv || 0}
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="bg-info text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/contacts/category/email-only")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-envelope fa-2x mb-2"></i>
              <h3>{stats.emailOnlyContacts?.total || 0}</h3>
              <p>Email Only</p>
              <small className="d-block">
                HubSpot: {stats.emailOnlyContacts?.hubspot || 0} | Sheets:{" "}
                {stats.emailOnlyContacts?.google_sheets || 0} | CSV:{" "}
                {stats.emailOnlyContacts?.csv || 0}
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className="bg-warning text-white"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/contacts/category/phone-only")}
          >
            <Card.Body className="text-center">
              <i className="fas fa-phone fa-2x mb-2"></i>
              <h3>{stats.phoneOnlyContacts?.total || 0}</h3>
              <p>Phone Only</p>
              <small className="d-block">
                HubSpot: {stats.phoneOnlyContacts?.hubspot || 0} | Sheets:{" "}
                {stats.phoneOnlyContacts?.google_sheets || 0} | CSV:{" "}
                {stats.phoneOnlyContacts?.csv || 0}
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Contact Sources and Sync Jobs */}
      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>
                <i className="fas fa-chart-pie"></i> Contact Sources
              </h5>
            </Card.Header>
            <Card.Body>{renderSourcePieChart()}</Card.Body>
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
