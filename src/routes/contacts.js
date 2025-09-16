const express = require('express');
const contactController = require('../controllers/contactController');
const upload = require('../middleware/upload');

const router = express.Router();

// Get all contacts with optional search and filtering
router.get('/', contactController.getContacts);

// Search contacts (POST for complex queries)
router.post('/search', contactController.searchContacts);

// Get contact statistics
router.get('/stats', contactController.getContactStats);

// Get contacts by category (for dashboard drill-down)
router.get('/category/:category', contactController.getContactsByCategory);

// Get available segments
router.get('/segments', contactController.getSegments);

// Get contacts by segment
router.get('/segments/:segment', contactController.getContactsBySegment);

// Find duplicates
router.get('/duplicates', contactController.findDuplicates);

// Upload contacts from file
router.post('/upload', upload.single('file'), contactController.uploadContacts);

// Bulk operations
router.patch('/bulk', contactController.bulkUpdate);
router.delete('/bulk', contactController.bulkDelete);

// Individual contact operations
router.get('/:id', contactController.getContactById);
router.post('/', contactController.createContact);
router.put('/:id', contactController.updateContact);
router.patch('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;