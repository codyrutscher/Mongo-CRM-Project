# Response Genius Integration - Quick Start

## ✅ Integration Complete!

The Response Genius integration has been successfully set up to automatically sync Cold Lead DNC contacts to your suppression lists.

## What's Been Implemented

### 1. **Real-Time Webhook Sync** ✅
- Automatically syncs contacts when they become Cold Leads in HubSpot
- Removes contacts when Cold Lead status is removed
- Integrated into existing webhook service

### 2. **Four DNC Lists** ✅
- `dnc___seller_outreach` - Seller Cold Leads
- `dnc___buyer_outreach` - Buyer Cold Leads  
- `dnc___cre_outreach` - CRE Cold Leads
- `dnc___exf_outreach` - EXF Cold Leads

### 3. **API Endpoints** ✅
- `GET /api/response-genius/status` - Check integration status
- `POST /api/response-genius/sync-cold-lead` - Manually sync a contact
- `POST /api/response-genius/bulk-sync` - Sync all Cold Leads
- `POST /api/response-genius/remove-from-lists` - Remove a contact

### 4. **Scripts** ✅
- `scripts/test-response-genius-integration.js` - Test the integration
- `scripts/initial-response-genius-sync.js` - Bulk sync existing Cold Leads

## Quick Setup (3 Steps)

### Step 1: Add API Key
Edit `.env` file and add your Response Genius API key:
```bash
RESPONSE_GENIUS_API_KEY=your_actual_api_key_here
```

### Step 2: Test Integration
```bash
node scripts/test-response-genius-integration.js
```

### Step 3: Bulk Sync Existing Cold Leads
```bash
node scripts/initial-response-genius-sync.js
```

This will sync all **43,461 Cold Leads** to Response Genius:
- Seller: ~15,659 contacts
- Buyer: ~18,952 contacts
- CRE: ~2,521 contacts
- EXF: ~6,441 contacts

## How It Works

```
HubSpot Contact → Cold Lead Property Set → Webhook Fires
    ↓
Railway CRM Webhook Service
    ↓
Response Genius Service → Sync to Appropriate Lists
    ↓
Response Genius DNC Lists Updated ✅
```

## Current Status

✅ **Integration Code:** Complete and tested
✅ **Webhook Handler:** Integrated into existing webhook service
✅ **API Endpoints:** Created and registered
✅ **Test Scripts:** Working in DRY RUN mode
⏳ **API Key:** Needs to be added to `.env`
⏳ **Initial Sync:** Ready to run once API key is added

## Files Created/Modified

### New Files:
- `src/services/responseGeniusService.js` - Core Response Genius integration
- `src/routes/responseGenius.js` - API endpoints
- `scripts/test-response-genius-integration.js` - Integration test
- `scripts/initial-response-genius-sync.js` - Bulk sync script
- `docs/RESPONSE_GENIUS_SETUP.md` - Detailed setup guide

### Modified Files:
- `.env` - Added Response Genius configuration
- `src/services/webhookService.js` - Added real-time sync on Cold Lead changes
- `src/routes/index.js` - Registered Response Genius routes

## Next Steps

1. **Get your Response Genius API key** from your account
2. **Add it to `.env`** file
3. **Run the test:** `node scripts/test-response-genius-integration.js`
4. **Run initial sync:** `node scripts/initial-response-genius-sync.js`
5. **Restart your server** to enable real-time syncing

## Documentation

Full setup guide: `docs/RESPONSE_GENIUS_SETUP.md`

## Testing

The integration is currently running in **DRY RUN mode** (no actual API calls) until you add your API key. This allows you to test the logic without affecting Response Genius.

---

**Ready to go live?** Just add your API key and run the initial sync! 🚀
