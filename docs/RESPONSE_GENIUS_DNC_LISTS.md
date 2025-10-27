# Response Genius DNC Lists Integration

## Overview

This integration syncs 4 DNC (Do Not Contact) lists from Prospere CRM to Response Genius. Each list combines contacts with specific DNC properties AND their corresponding Cold Lead properties.

## List Configuration

### 1. DNC - Seller Outreach
- **List ID**: `dnc___seller_outreach`
- **Includes contacts with**:
  - `dnc___seller_outreach = true` OR
  - `seller_cold_lead = true`

### 2. DNC - Buyer Outreach
- **List ID**: `dnc___buyer_outreach`
- **Includes contacts with**:
  - `dnc___buyer_outreach = true` OR
  - `buyer_cold_lead = true`

### 3. DNC - CRE Outreach
- **List ID**: `dnc___cre_outreach`
- **Includes contacts with**:
  - `dnc___cre_outreach = true` OR
  - `cre_cold_lead = true`

### 4. DNC - EXF Outreach
- **List ID**: `dnc___exf_outreach`
- **Includes contacts with**:
  - `dnc___exf_outreach = true` OR
  - `exf_cold_lead = true`

## Environment Variables

Add these to your `.env` file:

```env
# Response Genius DNC List IDs
RESPONSE_GENIUS_SELLER_LIST_ID=dnc___seller_outreach
RESPONSE_GENIUS_BUYER_LIST_ID=dnc___buyer_outreach
RESPONSE_GENIUS_CRE_LIST_ID=dnc___cre_outreach
RESPONSE_GENIUS_EXF_LIST_ID=dnc___exf_outreach
```

## Initial Sync

To perform an initial sync of all DNC lists from Prospere CRM to Response Genius:

```bash
node scripts/sync-dnc-lists-to-response-genius.js
```

This will:
1. Connect to Prospere CRM (Railway MongoDB)
2. Query contacts for each list type
3. Batch upload contacts to Response Genius (100 at a time)
4. Display sync results

## Real-Time Sync

The webhook service automatically syncs changes in real-time when:

### DNC Property Changes
When any of these properties change in HubSpot:
- `dnc___seller_outreach`
- `dnc___buyer_outreach`
- `dnc___cre_outreach`
- `dnc___exf_outreach`

The webhook will:
1. Update the contact in Prospere CRM
2. Add/remove the contact from the corresponding Response Genius list

### Cold Lead Property Changes
When any of these properties change in HubSpot:
- `seller_cold_lead`
- `buyer_cold_lead`
- `cre_cold_lead`
- `exf_cold_lead`

The webhook will:
1. Update the contact in Prospere CRM
2. Add/remove the contact from the corresponding Response Genius list

## Architecture

```
HubSpot (Source of Truth)
    ↓ (webhook)
Prospere CRM (Railway MongoDB)
    ↓ (sync)
Response Genius DNC Lists
```

### Data Flow

1. **Property Change in HubSpot**: User updates a DNC or Cold Lead property
2. **Webhook Trigger**: HubSpot sends webhook to Prospere CRM
3. **Database Update**: Prospere CRM updates contact record
4. **Response Genius Sync**: Contact is added/removed from appropriate lists
5. **Logging**: All actions are logged for audit trail

## Service Files

### `src/services/responseGeniusDncService.js`
Main service handling:
- List configuration and mapping
- Contact queries from Prospere CRM
- Batch uploads to Response Genius
- Real-time webhook updates

### `scripts/sync-dnc-lists-to-response-genius.js`
Initial sync script for bulk operations

### `src/services/webhookService.js`
Updated to handle DNC property changes and trigger real-time syncs

## API Endpoints Used

### Response Genius API
- `POST /import_optin` - Add contacts to a list
- `POST /import_optout` - Remove contacts from a list

## Monitoring

Check logs for sync status:
- `✅` Success indicators
- `❌` Error indicators
- `🚫` DNC-related actions
- `❄️` Cold Lead-related actions

## Troubleshooting

### Contacts not syncing
1. Check environment variables are set correctly
2. Verify Response Genius API credentials
3. Check contact has valid email address
4. Review logs for specific errors

### Duplicate contacts
Response Genius handles duplicates by email - same email will update existing record

### Batch failures
Script automatically continues with next batch if one fails

## Best Practices

1. **Initial Sync**: Run full sync before enabling webhooks
2. **Testing**: Test with a small batch first
3. **Monitoring**: Monitor logs during initial deployment
4. **Validation**: Verify counts in Response Genius match Prospere CRM

## Future Enhancements

- [ ] Add removal sync (contacts no longer matching criteria)
- [ ] Add scheduled full sync for data integrity
- [ ] Add Response Genius list creation automation
- [ ] Add detailed sync reports
- [ ] Add retry logic for failed syncs
