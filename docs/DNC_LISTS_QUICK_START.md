# Response Genius DNC Lists - Quick Start

## What This Does

Automatically syncs 4 DNC lists from Prospere CRM to Response Genius. Each list combines:
- Contacts with specific DNC properties
- Contacts marked as Cold Leads

## The 4 Lists

| List Name | DNC Property | Cold Lead Property |
|-----------|--------------|-------------------|
| DNC - Seller outreach | `dnc___seller_outreach` | `seller_cold_lead` |
| DNC - Buyer outreach | `dnc___buyer_outreach` | `buyer_cold_lead` |
| DNC - CRE outreach | `dnc___cre_outreach` | `cre_cold_lead` |
| DNC - EXF outreach | `dnc___exf_outreach` | `exf_cold_lead` |

## Setup Steps

### 1. Verify Environment Variables

Your `.env` already has these configured:
```env
RESPONSE_GENIUS_API_ID=jo8UjwZzSMgtAgtAGtLU0_-gRZuHUQ.
RESPONSE_GENIUS_API_KEY=qOsulmtH5uDCIcya4UirPrJ9Tbl2DnBySftFvjcejVA.
RESPONSE_GENIUS_API_URL=https://control.responsegenius.com
RESPONSE_GENIUS_SELLER_LIST_ID=dnc___seller_outreach
RESPONSE_GENIUS_BUYER_LIST_ID=dnc___buyer_outreach
RESPONSE_GENIUS_CRE_LIST_ID=dnc___cre_outreach
RESPONSE_GENIUS_EXF_LIST_ID=dnc___exf_outreach
```

### 2. Test Configuration

```bash
node scripts/test-dnc-list-sync.js
```

This will show:
- ✓ Environment variables are set
- ✓ Database connection works
- Contact counts for each list
- Sample contacts

### 3. Initial Sync

```bash
node scripts/sync-dnc-lists-to-response-genius.js
```

This will:
- Query Prospere CRM for all matching contacts
- Upload them to Response Genius in batches of 100
- Show progress and results

### 4. Enable Real-Time Sync

Real-time sync is already enabled in the webhook service! When properties change in HubSpot:

**DNC Properties** → Automatically synced to Response Genius
- `dnc___seller_outreach`
- `dnc___buyer_outreach`
- `dnc___cre_outreach`
- `dnc___exf_outreach`

**Cold Lead Properties** → Automatically synced to Response Genius
- `seller_cold_lead`
- `buyer_cold_lead`
- `cre_cold_lead`
- `exf_cold_lead`

## How It Works

```
┌─────────────┐
│   HubSpot   │ (Property changes)
└──────┬──────┘
       │ webhook
       ↓
┌─────────────┐
│ Prospere CRM│ (Updates contact)
└──────┬──────┘
       │ sync
       ↓
┌─────────────┐
│  Response   │ (DNC Lists updated)
│   Genius    │
└─────────────┘
```

## Files Created

1. **Service**: `src/services/responseGeniusDncService.js`
   - Handles all DNC list operations
   - Queries Prospere CRM
   - Syncs to Response Genius

2. **Sync Script**: `scripts/sync-dnc-lists-to-response-genius.js`
   - Initial bulk sync
   - Can be run anytime to refresh lists

3. **Test Script**: `scripts/test-dnc-list-sync.js`
   - Verify configuration
   - Check contact counts
   - No actual syncing

4. **Webhook Integration**: `src/services/webhookService.js`
   - Real-time property change handling
   - Automatic list updates

## Monitoring

Watch the logs for:
- `🚫 DNC property changed` - DNC property updated
- `✅ Synced DNC property to Response Genius` - Successfully synced
- `❄️ Contact marked as Cold Lead` - Cold Lead property updated

## Next Steps

1. Run test script to verify setup
2. Run initial sync to populate lists
3. Monitor webhook logs for real-time updates
4. Verify contacts appear in Response Genius

## Support

See full documentation: `docs/RESPONSE_GENIUS_DNC_LISTS.md`
