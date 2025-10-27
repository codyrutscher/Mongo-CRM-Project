const express = require('express');
const exportController = require('../controllers/exportController');

const router = express.Router();

// Export contacts with filters
router.post('/contacts', exportController.exportContacts);

// Export specific segment
router.get('/segment/:segment', exportController.exportSegment);

// Export search results
router.post('/search', exportController.exportSearchResults);

// Download exported file
router.get('/download/:filename', exportController.downloadExport);

// Cleanup old exports (admin endpoint)
router.post('/cleanup', exportController.cleanupOldExports);

module.exports = router;