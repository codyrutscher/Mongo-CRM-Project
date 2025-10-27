const express = require('express');
const router = express.Router();
const responseGeniusService = require('../services/responseGeniusService');
const Contact = require('../models/Contact');

/**
 * Webhook endpoint for Response Genius sync
 * Triggered when a contact becomes a Cold Lead
 */
router.post('/sync-cold-lead', async (req, res) => {
  try {
    const { contactId, email } = req.body;

    if (!contactId && !email) {
      return res.status(400).json({
        success: false,
        error: 'contactId or email is required'
      });
    }

    // Find the contact
    const contact = contactId 
      ? await Contact.findById(contactId)
      : await Contact.findOne({ email });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Sync to Response Genius
    const result = await responseGeniusService.syncColdLead(contact);

    res.json({
      success: true,
      message: 'Contact synced to Response Genius',
      data: result
    });
  } catch (error) {
    console.error('Error syncing to Response Genius:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Bulk sync endpoint
 * Sync all Cold Leads to Response Genius
 */
router.post('/bulk-sync', async (req, res) => {
  try {
    // Find all Cold Leads
    const coldLeads = await Contact.find({
      tags: 'Cold Lead',
      status: 'active'
    });

    console.log(`Found ${coldLeads.length} Cold Leads to sync`);

    // Start async sync
    responseGeniusService.bulkSyncColdLeads(coldLeads)
      .then(results => {
        console.log('Bulk sync complete:', results);
      })
      .catch(error => {
        console.error('Bulk sync error:', error);
      });

    res.json({
      success: true,
      message: `Started bulk sync of ${coldLeads.length} Cold Leads`,
      count: coldLeads.length
    });
  } catch (error) {
    console.error('Error starting bulk sync:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Remove contact from Response Genius lists
 */
router.post('/remove-from-lists', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'email is required'
      });
    }

    const result = await responseGeniusService.removeFromAllLists(email);

    res.json({
      success: true,
      message: 'Contact removed from Response Genius lists',
      data: result
    });
  } catch (error) {
    console.error('Error removing from Response Genius:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get sync status
 */
router.get('/status', (req, res) => {
  const configured = process.env.RESPONSE_GENIUS_API_KEY && 
                     process.env.RESPONSE_GENIUS_API_KEY !== 'your_response_genius_api_key_here';

  res.json({
    success: true,
    configured,
    lists: responseGeniusService.lists,
    message: configured 
      ? 'Response Genius integration is configured'
      : 'Response Genius API key not configured'
  });
});

module.exports = router;
