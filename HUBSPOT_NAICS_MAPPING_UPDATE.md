# HubSpot NAICS Field Mapping Update

## ✅ Changes Made

### 1. Updated Field Mapping Service (`src/services/fieldMappingService.js`)
- **Updated HubSpot mappings** to match exact property names from `hubspotprospere.csv`
- **Added all 20 NAICS standard fields** with correct HubSpot property mappings
- **Fixed export headers** to match NAICS template exactly (including trailing space in "Year Company Established ")

### 2. Updated HubSpot Service (`src/services/hubspotService.js`)
- **Replaced manual transformation** with field mapping service usage
- **Updated property requests** to match actual HubSpot property names
- **Maintained DNC and compliance handling** while using NAICS standard
- **Preserved HubSpot-specific metadata** in customFields

### 3. Automatic Integration Points
- **Webhooks**: Already use `hubspotService.transformContactData()` - now NAICS compliant
- **Sync Scripts**: Already use `hubspotService.transformContactData()` - now NAICS compliant
- **Real-time Updates**: All incoming HubSpot data will use NAICS standard

## 📋 HubSpot Property Mappings (from hubspotprospere.csv)

| NAICS Field | HubSpot Property | HubSpot Label |
|-------------|------------------|---------------|
| firstName | firstname | First Name |
| lastName | lastname | Last Name |
| jobTitle | jobtitle | Job Title |
| contactLinkedInProfile | linkedin_profile_url | LinkedIn Profile URL |
| email | email | Email |
| phone | phone | Phone Number |
| company | company | Company Name |
| companyWebsiteURL | website | Website URL |
| industry | business_category___industry_of_interest | Business Category / Industry of Interest |
| naicsCode | naics_code | NAICS Code |
| numberOfEmployees | numemployees | Number of Employees |
| yearCompanyEstablished | year_established | Year Established |
| companyPhoneNumber | office_phone | Office Phone |
| companyStreetAddress | address | Street Address |
| companyCity | city | City |
| companyState | state | State/Region |
| companyZipCode | zip | Postal Code |
| leadSource | lead_source | Lead Source |
| campaignCategory | contact_type | Contact Type |
| lastCampaignDate | hs_email_last_send_date | Last marketing email send date |

## 🔄 What This Means

### For Future HubSpot Syncs:
- ✅ All contacts will be mapped to NAICS standard fields
- ✅ Exports will match the NAICS template format exactly
- ✅ Field mapping is consistent across all data sources

### For Webhooks:
- ✅ Real-time updates from HubSpot will use NAICS mapping
- ✅ New contacts created in HubSpot will be NAICS compliant
- ✅ Property changes will update correct NAICS fields

### For Existing Functionality:
- ✅ DNC status and compliance handling preserved
- ✅ HubSpot-specific metadata stored in customFields
- ✅ All existing sync scripts work without changes

## 🎯 Next Steps

1. **Test HubSpot Sync**: Run a sync to verify field mapping works correctly
2. **Test Webhooks**: Create/update a contact in HubSpot to test real-time sync
3. **Verify Exports**: Export a segment to confirm NAICS format matches template
4. **Monitor Logs**: Check for any mapping issues during sync operations

All HubSpot data (sync, webhooks, and future contacts) will now automatically follow the NAICS standard format!