# Response Genius - 8 Lists Complete Setup

## ✅ Setup Complete!

All 8 properties have been synced from HubSpot to Prospere CRM and CSV files have been exported.

## 📊 The 8 Lists

### DNC Lists (4 lists - 355,317 total contacts)

| List Name | Property | Contacts | CSV File |
|-----------|----------|----------|----------|
| DNC - Seller outreach | `dnc___seller_outreach` | 97,737 | `dnc___seller_outreach.csv` |
| DNC - Buyer outreach | `dnc___buyer_outreach` | 70,004 | `dnc___buyer_outreach.csv` |
| DNC - CRE outreach | `dnc___cre_outreach` | 95,219 | `dnc___cre_outreach.csv` |
| DNC - EXF outreach | `dnc___exf_outreach` | 92,357 | `dnc___exf_outreach.csv` |

### Cold Lead Lists (4 lists - 43,541 total contacts)

| List Name | Property | Contacts | CSV File |
|-----------|----------|----------|----------|
| Seller Cold Lead | `seller_cold_lead` | 7,910 | `seller_cold_lead.csv` |
| Buyer Cold Lead | `buyer_cold_lead` | 27,734 | `buyer_cold_lead.csv` |
| CRE Cold Lead | `cre_cold_lead` | 2,517 | `cre_cold_lead.csv` |
| EXF Cold Lead | `exf_cold_lead` | 5,380 | `exf_cold_lead.csv` |

**Grand Total: 398,858 contacts across 8 lists**

## 🎯 Next Steps - Upload to Response Genius

### Option 1: Manual CSV Upload (Recommended)

1. **Log in to Response Genius**: https://control.responsegenius.com

2. **Create the 8 lists** (if not already created):
   - Navigate to Lists section
   - Create each list with the exact API identifier from the table above

3. **Upload CSV files**:
   - For each list, use the CSV import feature
   - Upload the corresponding CSV file
   - Map columns: email, firstname, lastname, phone

### Option 2: API Upload

Once lists are created in Response Genius, run:
```bash
node scripts/sync-8-lists-to-response-genius.js
```

This will upload all contacts via API (may take 30-60 minutes for 398K contacts).

## 🔄 Ongoing Sync

### Real-Time Webhook Sync (Already Active!)

The webhook service automatically syncs these 8 properties when they change in HubSpot:

**DNC Properties:**
- `dnc___seller_outreach`
- `dnc___buyer_outreach`
- `dnc___cre_outreach`
- `dnc___exf_outreach`

**Cold Lead Properties:**
- `seller_cold_lead`
- `buyer_cold_lead`
- `cre_cold_lead`
- `exf_cold_lead`

### Manual Re-sync

To re-sync all properties from HubSpot:
```bash
node scripts/sync-8-properties-from-hubspot.js
```

To re-export CSVs:
```bash
node scripts/export-8-lists-to-csv.js
```

To check current counts:
```bash
node scripts/check-8-list-counts.js
```

## 📝 What Was Done

1. ✅ Added 8 new properties to Prospere CRM Contact model
2. ✅ Updated HubSpot service to fetch these 8 properties
3. ✅ Synced all 137,667 contacts from HubSpot (109,273 had properties set)
4. ✅ Exported 8 CSV files with 398,858 total contacts
5. ✅ Webhook service ready for real-time updates

## 🔒 DNC & Cold Lead Preservation

Contacts with DNC or Cold Lead properties are **automatically preserved** in Prospere CRM even when deleted from HubSpot:
- Marked with `customFields.deletedFromHubSpot: true`
- Tagged with "Deleted from HubSpot"
- Status remains `active` for compliance tracking

## 📂 Files Created

### Services:
- `src/services/responseGenius8ListsService.js` - Manages 8 lists
- Updated: `src/models/Contact.js` - Added 8 properties
- Updated: `src/services/hubspotService.js` - Syncs 8 properties
- Updated: `src/services/webhookService.js` - Real-time sync

### Scripts:
- `scripts/sync-8-properties-from-hubspot.js` - Initial sync
- `scripts/check-8-list-counts.js` - Check counts
- `scripts/export-8-lists-to-csv.js` - Export CSVs
- `scripts/sync-8-lists-to-response-genius.js` - API upload

### CSV Files (in project root):
- `dnc___seller_outreach.csv` (3.4 MB)
- `dnc___buyer_outreach.csv` (2.4 MB)
- `dnc___cre_outreach.csv` (3.3 MB)
- `dnc___exf_outreach.csv` (3.2 MB)
- `seller_cold_lead.csv` (257 KB)
- `buyer_cold_lead.csv` (969 KB)
- `cre_cold_lead.csv` (81 KB)
- `exf_cold_lead.csv` (228 KB)

## 🎉 You're All Set!

The 8 lists are ready to upload to Response Genius. All future changes in HubSpot will automatically sync to Prospere CRM and can be pushed to Response Genius.
