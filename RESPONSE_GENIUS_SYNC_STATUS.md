# Response Genius Sync Status

## Current Situation

### Database Contacts Ready to Sync
- **DNC Seller**: 100,949 contacts
- **DNC Buyer**: 72,967 contacts  
- **DNC CRE**: 98,007 contacts
- **DNC EXF**: 94,202 contacts
- **Cold Seller**: 8,835 contacts
- **Cold Buyer**: 27,932 contacts
- **Cold CRE**: 2,940 contacts
- **Cold EXF**: 6,746 contacts
- **TOTAL**: 412,578 contacts

### Response Genius Current Counts
- All lists show **0 contacts**
- **Missing**: 412,578 contacts need to be synced

## Issue Identified

**❌ CRITICAL: Response Genius API credentials are INVALID**

The API is returning HTML login pages instead of JSON responses. Testing confirms:
- Credentials in `.env` are being rejected by Response Genius API
- All API endpoints return login page HTML
- Credentials may have expired or been regenerated since 10/23

**Action Required**: Get fresh API credentials from Response Genius dashboard

## What's Working

✅ **Webhook Integration is Configured**
- The webhook service (`src/services/webhookService.js`) is set up to automatically sync contacts when DNC or Cold Lead properties change
- It monitors these 8 properties:
  - `dnc___seller_outreach`
  - `dnc___buyer_outreach`
  - `dnc___cre_outreach`
  - `dnc___exf_outreach`
  - `seller_cold_lead`
  - `buyer_cold_lead`
  - `cre_cold_lead`
  - `exf_cold_lead`

✅ **Sync Service is Ready**
- `src/services/responseGenius8ListsService.js` handles all 8 lists
- Automatic add/remove based on property changes
- Batch processing for bulk syncs

## What Needs to be Done

### 1. Verify Response Genius API Credentials

Visit: https://control.responsegenius.com/help/api_identifier

Get fresh credentials:
- **API ID** (Secure API ID)
- **API Key** (Secure API key)

Update in `.env`:
```bash
RESPONSE_GENIUS_API_ID=your_new_api_id
RESPONSE_GENIUS_API_KEY=your_new_api_key
```

### 2. Test Credentials

Run:
```bash
node scripts/verify-rg-credentials.js
```

Should see JSON response, not HTML.

### 3. Bulk Sync All Contacts

Once credentials are verified, run:
```bash
node scripts/bulk-sync-to-response-genius.js
```

This will:
- Sync all 412,578 contacts to Response Genius
- Process in batches of 100
- Take approximately 2-3 hours
- Show progress for each list

### 4. Verify Sync

After bulk sync completes, verify counts:
```bash
node scripts/check-response-genius-counts.js
```

Should show matching counts between database and Response Genius.

## Future Syncing

Once the initial bulk sync is complete, all future updates will sync automatically via webhooks:

- **When a contact is marked with DNC or Cold Lead property in HubSpot**:
  1. HubSpot sends webhook to Prospere CRM
  2. Contact is updated in database
  3. Contact is automatically added to Response Genius list

- **When a contact's DNC or Cold Lead property is removed**:
  1. HubSpot sends webhook
  2. Contact is updated in database
  3. Contact is automatically removed from Response Genius list

This ensures 1-to-1 parity between your CRM and Response Genius going forward.

## Scripts Created

- `scripts/check-response-genius-counts.js` - Compare database vs Response Genius counts
- `scripts/verify-rg-credentials.js` - Test API credentials
- `scripts/test-response-genius-sync.js` - Test syncing one contact
- `scripts/bulk-sync-to-response-genius.js` - Bulk sync all contacts

## Next Steps

1. Get fresh API credentials from Response Genius
2. Update `.env` file
3. Run verification script
4. Run bulk sync script
5. Verify counts match
6. Monitor webhook logs to ensure future syncs work automatically
