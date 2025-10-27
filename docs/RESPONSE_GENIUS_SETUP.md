# Response Genius Integration Setup Guide

## Overview
This integration automatically syncs Cold Lead contacts from your CRM to Response Genius DNC (Do Not Call) suppression lists in real-time.

## Features
- ✅ Real-time sync when contacts become Cold Leads
- ✅ Automatic removal when Cold Lead status is removed
- ✅ Four separate lists for each Cold Lead type:
  - `dnc___seller_outreach` - Seller Cold Leads
  - `dnc___buyer_outreach` - Buyer Cold Leads
  - `dnc___cre_outreach` - CRE Cold Leads
  - `dnc___exf_outreach` - EXF Cold Leads
- ✅ Bulk sync for existing Cold Leads
- ✅ Webhook-based real-time updates

## Setup Instructions

### 1. Get Response Genius API Credentials
1. Log in to your Response Genius account at https://control.responsegenius.com
2. Navigate to: https://control.responsegenius.com/help/api_identifier
3. Copy your **API ID** (Secure API ID)
4. Copy your **API Key** (Secure API key)

**Detailed guide:** See `docs/RESPONSE_GENIUS_API_CREDENTIALS.md`

### 2. Configure Environment Variables
Add the following to your `.env` file:

```bash
# Response Genius Configuration
# Find these at: https://control.responsegenius.com/help/api_identifier
RESPONSE_GENIUS_API_ID=your_actual_api_id_here
RESPONSE_GENIUS_API_KEY=your_actual_api_key_here
RESPONSE_GENIUS_API_URL=https://control.responsegenius.com
RESPONSE_GENIUS_SELLER_LIST_ID=dnc___seller_outreach
RESPONSE_GENIUS_BUYER_LIST_ID=dnc___buyer_outreach
RESPONSE_GENIUS_CRE_LIST_ID=dnc___cre_outreach
RESPONSE_GENIUS_EXF_LIST_ID=dnc___exf_outreach
```

### 3. Test the Integration
Run the test script to verify configuration:

```bash
node scripts/test-response-genius-integration.js
```

You should see:
- ✅ Configuration check passes
- ✅ Test sync successful
- ✅ Test removal successful

### 4. Initial Bulk Sync
Sync all existing Cold Leads to Response Genius:

```bash
node scripts/initial-response-genius-sync.js
```

This will:
- Find all Cold Leads in your database (~43,461 contacts)
- Sync them to appropriate Response Genius lists
- Show progress and results

**Note:** This may take 1-2 hours due to rate limiting (100ms between requests)

### 5. Start the Server
The integration will now work in real-time via webhooks:

```bash
npm start
```

## How It Works

### Real-Time Sync Flow

1. **Contact becomes a Cold Lead in HubSpot**
   - HubSpot webhook fires → `/api/webhooks/hubspot`
   - Webhook service detects Cold Lead property change
   - Contact is automatically synced to Response Genius

2. **Contact is added to appropriate lists**
   - If `seller_cold_lead = true` → Added to `dnc___seller_outreach`
   - If `buyer_cold_lead = true` → Added to `dnc___buyer_outreach`
   - If `cre_cold_lead = true` → Added to `dnc___cre_outreach`
   - If `exf_cold_lead = true` → Added to `dnc___exf_outreach`

3. **Contact Cold Lead status removed**
   - Contact is automatically removed from all Response Genius lists

### API Endpoints

#### Check Integration Status
```bash
GET /api/response-genius/status
```

Response:
```json
{
  "success": true,
  "configured": true,
  "lists": {
    "seller": "dnc___seller_outreach",
    "buyer": "dnc___buyer_outreach",
    "cre": "dnc___cre_outreach",
    "exf": "dnc___exf_outreach"
  }
}
```

#### Manually Sync a Contact
```bash
POST /api/response-genius/sync-cold-lead
Content-Type: application/json

{
  "email": "contact@example.com"
}
```

#### Bulk Sync All Cold Leads
```bash
POST /api/response-genius/bulk-sync
```

#### Remove Contact from Lists
```bash
POST /api/response-genius/remove-from-lists
Content-Type: application/json

{
  "email": "contact@example.com"
}
```

## Monitoring

### Check Sync Logs
The integration logs all sync operations:

```bash
# View real-time logs
tail -f logs/app.log | grep "Response Genius"
```

Look for:
- `✅ Synced Cold Lead to Response Genius: email@example.com -> seller, cre`
- `✅ Removed from Response Genius lists: email@example.com`

### Verify Synced Contacts
Check Response Genius dashboard:
1. Log in to Response Genius
2. Navigate to Lists
3. View each DNC list to see synced contacts

## Troubleshooting

### Issue: "Response Genius API key not configured"
**Solution:** Add your API key to `.env` file and restart the server

### Issue: Contacts not syncing
**Checks:**
1. Verify API key is correct
2. Check server logs for errors
3. Verify HubSpot webhooks are configured
4. Test manually: `POST /api/response-genius/sync-cold-lead`

### Issue: Rate limiting errors
**Solution:** The integration includes automatic rate limiting (100ms between requests). If you still see errors, increase the delay in `responseGeniusService.js`

### Issue: Duplicate contacts in Response Genius
**Solution:** Response Genius should handle duplicates automatically. If not, you can remove and re-add:
```bash
curl -X POST http://localhost:3000/api/response-genius/remove-from-lists \
  -H "Content-Type: application/json" \
  -d '{"email":"contact@example.com"}'

curl -X POST http://localhost:3000/api/response-genius/sync-cold-lead \
  -H "Content-Type: application/json" \
  -d '{"email":"contact@example.com"}'
```

## Data Synced to Response Genius

For each Cold Lead, the following data is sent:
- Email (required)
- Phone
- First Name
- Last Name
- Custom Fields:
  - HubSpot ID
  - Cold Lead Type (Seller/Buyer/CRE/EXF)
  - Added timestamp

## Maintenance

### Weekly Verification
Run this script weekly to ensure sync accuracy:

```bash
node scripts/verify-response-genius-sync.js
```

### Re-sync All Contacts
If you need to re-sync all Cold Leads:

```bash
node scripts/initial-response-genius-sync.js
```

## Security Notes

- API key is stored in `.env` (never commit to git)
- All API calls use HTTPS
- Rate limiting prevents API abuse
- Failed syncs are logged but don't block contact updates

## Support

For Response Genius API issues:
- Documentation: https://docs.responsegenius.com
- Support: support@responsegenius.com

For integration issues:
- Check logs: `logs/app.log`
- Run test: `node scripts/test-response-genius-integration.js`
- Review webhook logs: `/api/webhooks/logs`
