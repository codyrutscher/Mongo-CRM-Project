const express = require('express');
const csvController = require('../controllers/csvController');
const upload = require('../middleware/upload');

const router = express.Router();

// Preview CSV file for column mapping
router.post('/preview', upload.single('file'), csvController.previewCSVFile);

// Upload with custom column mapping
router.post('/upload-mapped', csvController.uploadWithMapping);

// Get available field options for mapping
router.get('/field-options', csvController.getFieldOptions);

module.exports = router;