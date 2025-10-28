# CSV Upload Guide - Campaign Type Integration

## Overview
Your Prospere CRM now supports uploading CSV files with automatic field mapping, including the new **Campaign Type** field. This guide shows you how to upload your "Enriched - Deal Maverick-ZoomInfo.csv" file.

## What's New

### 1. Campaign Type Support
- **Field Name in CSV**: "Campaign Category"
- **Maps to CRM Field**: `campaignType`
- **Supported Values**: Buyer, Seller, CRE, Exit Factor
- **Dashboard Integration**: Automatic breakdown by campaign type

### 2. Automatic Field Mapping
The system automatically maps these CSV headers:
- **Fast Name** → firstName
- **Last Name** → lastName
- **Email Address** → email
- **Personal Phone Number** → phone
- **Company Name** → company
- **Campaign Category** → campaignType ✨
- **Lead Source** → leadSource
- **NAICS Code** → naicsCode
- **Industry** → industry
- And many more...

## How to Upload Your CSV

### Step 1: Access the Upload Page
1. Log into your Prospere CRM
2. Click **"Contacts"** in the navigation menu
3. Select **"📁 CSV Contacts"**

### Step 2: Upload Your File
1. You'll see the **CSV Upload with Field Mapping** component
2. Click **"Choose File"** or drag and drop your CSV
3. Select: `Enriched - Deal Maverick-ZoomInfo.csv`
4. Enter a source name: `Deal Maverick - ZoomInfo Enriched`

### Step 3: Review Field Mapping (Automatic)
The system will automatically:
- Parse your CSV headers
- Map "Campaign Category" to "Campaign Type"
- Show you a preview of the mapping
- Display sample data from your CSV

### Step 4: Confirm and Upload
1. Review the field mappings in the modal
2. Adjust any mappings if needed (usually not necessary)
3. Click **"Upload Contacts"**
4. Wait for processing (26,242 rows may take 2-3 minutes)

### Step 5: View Results
After upload completes:
1. Go to **Dashboard** to see campaign type breakdown
2. Click on campaign type cards to filter contacts
3. Use the **Contacts** dropdown to access:
   - 🛒 Buyer Contacts
   - 💼 Seller Contacts
   - 🏢 CRE Contacts
   - 🚀 Exit Factor Contacts

## Expected Results

### Dashboard Cards Will Show:
```
┌─────────────────────┐  ┌─────────────────────┐
│  🛒 Buyer Contacts  │  │ 💼 Seller Contacts  │
│      X,XXX          │  │      X,XXX          │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│  🏢 CRE Contacts    │  │ 🚀 Exit Factor      │
│      X,XXX          │  │      X,XXX          │
└─────────────────────┘  └─────────────────────┘
```

### Campaign Type Pie Chart
A visual breakdown showing the distribution of contacts across all campaign types.

## Troubleshooting

### If Campaign Types Show 0:
1. Check that your CSV has "Campaign Category" column
2. Verify the values are: Buyer, Seller, CRE, or Exit Factor
3. Make sure the upload completed successfully
4. Refresh the dashboard page

### If Upload Fails:
1. Check file size (should be under 50MB)
2. Verify CSV format (UTF-8 encoding)
3. Check backend logs for errors
4. Try uploading a smaller sample first

### If Field Mapping Looks Wrong:
1. The modal shows you the mapping before upload
2. You can manually adjust mappings in the modal
3. Click on dropdown to change which CRM field each CSV column maps to

## CSV File Requirements

### Your File: "Enriched - Deal Maverick-ZoomInfo.csv"
- **Rows**: 26,242 contacts
- **Key Columns**:
  - Fast Name (will map to firstName)
  - Last Name
  - Email Address
  - Personal Phone Number
  - Company Name
  - **Campaign Category** ← This is the important one!
  - Lead Source
  - NAICS Code
  - Industry

### Supported Campaign Types:
- **Buyer** - Contacts interested in buying
- **Seller** - Contacts interested in selling
- **CRE** - Commercial Real Estate contacts
- **Exit Factor** - Exit strategy contacts

## After Upload

### Navigation Options:
1. **Dashboard** - See campaign type breakdown
2. **Contacts → Buyer Contacts** - Filter by Buyer
3. **Contacts → Seller Contacts** - Filter by Seller
4. **Contacts → CRE Contacts** - Filter by CRE
5. **Contacts → Exit Factor Contacts** - Filter by Exit Factor
6. **CSV Contacts** - See all CSV uploads

### Filtering:
- Use Advanced Filters on HubSpot Contacts page
- Filter by Campaign Type
- Export filtered results
- Combine with other filters (DNC, Cold Lead, etc.)

## Response Genius Integration

After upload, contacts will automatically:
1. Sync to Response Genius (if they have the 8 list properties)
2. Be added/removed from appropriate lists
3. Maintain DNC and Cold Lead status
4. Update in real-time when properties change

## Next Steps

1. **Upload your CSV** using the steps above
2. **Check Dashboard** to see campaign type breakdown
3. **Navigate to campaign pages** to view filtered contacts
4. **Export contacts** by campaign type if needed
5. **Monitor Response Genius** for automatic list updates

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Review backend logs
3. Verify CSV format matches expected headers
4. Contact support with error messages

---

**Ready to Upload?** Go to: Contacts → CSV Contacts → Upload File

Your "Enriched - Deal Maverick-ZoomInfo.csv" file is ready to be uploaded with full Campaign Type support! 🚀
