# Cold Lead Workflow Documentation

## Overview

This system automatically manages Cold Lead contacts between HubSpot and Prospere CRM. When a contact is marked as a Cold Lead in HubSpot, they are automatically imported into Prospere CRM and can be exported/deleted on a weekly basis.

## Cold Lead Properties

The system monitors these HubSpot properties:

- **seller_cold_lead** - Seller Cold Lead
- **buyer_cold_lead** - Buyer Cold Lead  
- **cre_cold_lead** - CRE Cold Lead
- **exf_cold_lead** - EXF Cold Lead

When ANY of these properties = `Yes/true`, the contact is considered a Cold Lead.

## Workflow

### 1. Real-Time Sync (Automatic via Webhook)

When a Cold Lead property changes in HubSpot:
- ✅ Webhook automatically detects the change
- ✅ Contact is imported/updated in Prospere CRM
- ✅ Tagged with "Cold Lead" and specific type tags
- ✅ Stored in `customFields.coldLead` with all Cold Lead properties
- ✅ Contact remains in HubSpot (not deleted immediately)

### 1.1. Cold Lead Deletion Protection (Automatic via Webhook)

When a Cold Lead contact is deleted from HubSpot:
- ✅ Webhook detects the deletion
- ✅ Contact is PRESERVED in Prospere CRM (not deleted)
- ✅ Marked as `deletedFromHubSpot: true` with deletion timestamp
- ✅ Tagged with "Deleted from HubSpot" for easy identification
- ✅ Status remains "active" in Prospere CRM for continued access

### 2. Manual Full Sync

Run a complete sync of all Cold Leads from HubSpot:

```bash
railway run node scripts/sync-cold-leads.js
```

This will:
- Fetch all contacts with Cold Lead properties from HubSpot
- Import new Cold Leads into Prospere CRM
- Update existing Cold Leads
- Export a CSV file with all Cold Leads
- Show breakdown by Cold Lead type

### 3. Weekly Cleanup Process

#### Export Only (Safe - No Deletion)

```bash
railway run node scripts/weekly-cold-lead-cleanup.js --export-only
```

This will:
- Export all Cold Leads to CSV with timestamp
- Keep contacts in both HubSpot and Prospere CRM
- Generate report with breakdown by type

#### Export and Delete from HubSpot

```bash
railway run node scripts/weekly-cold-lead-cleanup.js --export-and-delete --confirmed
```

This will:
- Export all Cold Leads to CSV
- Delete contacts from HubSpot (moved to "Recently Deleted")
- Keep contacts in Prospere CRM for records
- Mark contacts as deleted from HubSpot in database

**Important Notes:**
- Requires `--confirmed` flag for safety
- Deleted contacts go to HubSpot "Recently Deleted" (90-day recovery)
- Contacts remain in Prospere CRM permanently
- CSV export is created before deletion

## Data Storage in Prospere CRM

Cold Lead contacts are stored with:

```javascript
{
  status: 'active', // Always active in Prospere CRM, even if deleted from HubSpot
  tags: ['Cold Lead', 'Cold Lead - Seller', 'Cold Lead - Buyer', 'Deleted from HubSpot'],
  customFields: {
    coldLead: true,
    coldLeadTypes: ['Seller', 'Buyer', 'CRE', 'EXF'],
    sellerColdLead: true/false,
    buyerColdLead: true/false,
    creColdLead: true/false,
    exfColdLead: true/false,
    coldLeadSyncDate: '2025-09-29T...',
    deletedFromHubSpot: true/false,
    deletedFromHubSpotDate: '2025-09-29T...',
    hubspotDeletionReason: 'Contact deleted from HubSpot (Cold Lead preserved)'
  }
}
```

## Querying Cold Leads

### Find all Cold Leads in Prospere CRM

```javascript
const coldLeads = await Contact.find({
  source: 'hubspot',
  'customFields.coldLead': true
});
```

### Find specific Cold Lead types

```javascript
// Seller Cold Leads
const sellerColdLeads = await Contact.find({
  source: 'hubspot',
  'customFields.sellerColdLead': true
});

// Buyer Cold Leads
const buyerColdLeads = await Contact.find({
  source: 'hubspot',
  'customFields.buyerColdLead': true
});
```

### Find Cold Leads deleted from HubSpot

```javascript
const deletedFromHubSpot = await Contact.find({
  source: 'hubspot',
  'customFields.deletedFromHubSpot': true
});
```

### Find Cold Leads still active in HubSpot

```javascript
const activeInHubSpot = await Contact.find({
  source: 'hubspot',
  'customFields.coldLead': true,
  'customFields.deletedFromHubSpot': { $ne: true }
});
```

## Automation Setup

### Recommended Weekly Schedule

Set up a cron job or scheduled task to run weekly:

```bash
# Every Monday at 9 AM - Export only
0 9 * * 1 cd /path/to/project && railway run node scripts/weekly-cold-lead-cleanup.js --export-only

# Or with deletion (if approved)
0 9 * * 1 cd /path/to/project && railway run node scripts/weekly-cold-lead-cleanup.js --export-and-delete --confirmed
```

## Managing Deleted Cold Leads

Use the management tool to view and export Cold Leads that have been deleted from HubSpot:

```bash
# Show statistics
railway run node scripts/manage-deleted-cold-leads.js --stats

# List deleted Cold Leads
railway run node scripts/manage-deleted-cold-leads.js --list

# Export deleted Cold Leads to CSV
railway run node scripts/manage-deleted-cold-leads.js --export

# Show active Cold Leads still in HubSpot
railway run node scripts/manage-deleted-cold-leads.js --active

# Show all Cold Leads (active and deleted)
railway run node scripts/manage-deleted-cold-leads.js --all
```

## CSV Export Format

Exported CSV files include:

- HubSpot ID
- Email
- First Name
- Last Name
- Phone
- Company
- Cold Lead Types (comma-separated)
- Seller (true/false)
- Buyer (true/false)
- CRE (true/false)
- EXF (true/false)
- Created Date
- Last Synced Date

Files are named: `cold-leads-weekly-export-YYYY-MM-DD.csv`

## Webhook Configuration

The webhook automatically handles Cold Lead property changes. Ensure your HubSpot webhook is configured to send events for:

- `contact.propertyChange` for:
  - `seller_cold_lead`
  - `buyer_cold_lead`
  - `cre_cold_lead`
  - `exf_cold_lead`

## Troubleshooting

### Cold Leads not syncing automatically

1. Check webhook is active in HubSpot
2. Verify webhook URL is correct
3. Check logs for webhook errors
4. Run manual sync: `railway run node scripts/sync-cold-leads.js`

### CSV export not generating

1. Check file permissions in project directory
2. Verify contacts exist with `customFields.coldLead: true`
3. Check script output for errors

### Deletion from HubSpot failing

1. Verify API token has `crm.objects.contacts.write` scope
2. Check HubSpot API rate limits
3. Review error messages in script output
4. Contacts may already be deleted

## Safety Features

- ✅ Dry-run mode available for testing
- ✅ Confirmation required for deletion
- ✅ CSV export before deletion
- ✅ 90-day recovery period in HubSpot
- ✅ Permanent records in Prospere CRM
- ✅ Detailed logging and error reporting

## Support

For issues or questions about the Cold Lead workflow, check:
1. Script output logs
2. Webhook logs in `src/utils/logger.js`
3. HubSpot API status
4. Database connection status
