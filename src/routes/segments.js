const express = require('express');
const segmentController = require('../controllers/segmentController');

const router = express.Router();

// Get all segments
router.get('/', segmentController.getAllSegments);

// Create new segment
router.post('/', segmentController.createSegment);

// Get filter templates for creating segments
router.get('/templates', segmentController.getFilterTemplates);

// Get HubSpot lists for syncing
router.get('/hubspot-lists', segmentController.getHubSpotLists);

// Sync specific HubSpot list
router.post('/sync-hubspot-list', segmentController.syncHubSpotList);

// Get specific segment
router.get('/:id', segmentController.getSegmentById);

// Update segment
router.put('/:id', segmentController.updateSegment);

// Delete segment
router.delete('/:id', segmentController.deleteSegment);

// Get contacts in segment
router.get('/:id/contacts', segmentController.getSegmentContacts);

// Export segment
router.get('/:id/export', segmentController.exportSegment);

// Duplicate segment
router.post('/:id/duplicate', segmentController.duplicateSegment);

module.exports = router;