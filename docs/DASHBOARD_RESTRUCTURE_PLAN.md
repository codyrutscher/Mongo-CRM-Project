# Dashboard Restructure Plan

## Changes Needed

### 1. Remove Google Sheets
- Remove all references to `google_sheets` source
- Remove "Sheets" from stat cards
- Remove Google Sheets card from SourceIndex

### 2. Change "Contact Sources" to "Campaign Types"
- Replace pie chart showing HubSpot/CSV/Sheets
- New pie chart showing Buyer/Seller/CRE/Exit Factor
- Based on `campaignType` field

### 3. Update Stat Cards
**Old Format:**
```
HubSpot: X | Sheets: Y | CSV: Z
```

**New Format:**
```
Buyer: X | Seller: Y | CRE: Z | Exit Factor: W
```

### 4. Update Navigation
- Remove `/sheets-contacts` route
- Keep `/hubspot-contacts` and `/csv-contacts`
- Add `/campaign-type/:type` routes for Buyer/Seller/CRE/Exit Factor

### 5. Files to Update
- `react-frontend/src/pages/Dashboard.js` - Main dashboard
- `react-frontend/src/pages/SourceIndex.js` - Remove Google Sheets card
- `react-frontend/src/App.js` - Remove Sheets routes
- Backend API - Add campaign type stats endpoint

## New Dashboard Structure

### Top Cards (Campaign Type Breakdown):
1. **Total Contacts** - Show by Campaign Type
2. **Buyer Contacts** - Click to filter
3. **Seller Contacts** - Click to filter  
4. **CRE Contacts** - Click to filter
5. **Exit Factor Contacts** - Click to filter

### Charts:
1. **Campaign Type Distribution** (pie chart)
2. **Recent Sync Jobs** (unchanged)

### Data Quality Cards (keep but update):
- Clean Contacts - Show by Campaign Type
- Email Only - Show by Campaign Type
- Phone Only - Show by Campaign Type
- Missing Company - Show by Campaign Type
