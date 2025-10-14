const express = require('express');
const syncController = require('../controllers/syncController');

const router = express.Router();

// Sync operations
router.post('/hubspot', syncController.startHubSpotSync);
router.post('/google-sheets', syncController.startGoogleSheetsSync);

// Job management
router.get('/jobs', syncController.getAllSyncJobs);
router.get('/jobs/:jobId', syncController.getSyncJobStatus);
router.delete('/jobs/:jobId', syncController.cancelSyncJob);

// Last sync information
router.get('/last/:source', syncController.getLastSyncInfo);

// Connection tests
router.post('/test/hubspot', syncController.testHubSpotConnection);
router.post('/test/google-sheets', syncController.testGoogleSheetsConnection);

// Cold Lead sync
router.post('/cold-leads', syncController.syncColdLeads);
router.get('/cold-leads/status', syncController.getColdLeadStatus);

// Google Sheets utilities
router.get('/google-sheets/:spreadsheetId/info', syncController.getGoogleSheetInfo);
router.post('/google-sheets/preview', syncController.previewGoogleSheetData);

module.exports = router;