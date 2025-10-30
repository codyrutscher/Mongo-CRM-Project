# Response Genius CSV Upload Guide

## ✅ Your Existing Lists (Already Created)

You already have these 8 lists in Response Genius with the correct API identifiers:

| List Name in Response Genius | API Identifier (Slug) | CSV File to Upload |
|------------------------------|----------------------|-------------------|
| **DNC - Seller outreach** | `dnc___seller_outreach` | `rg-dnc-seller.csv` |
| **DNC - Buyer outreach** | `dnc___buyer_outreach` | `rg-dnc-buyer.csv` |
| **DNC - CRE outreach** | `dnc___cre_outreach` | `rg-dnc-cre.csv` |
| **DNC - EXF outreach** | `dnc___exf_outreach` | `rg-dnc-exf.csv` |
| **Seller Cold Lead** | `seller_cold_lead` | `rg-cold-seller.csv` |
| **Buyer Cold Lead** | `buyer_cold_lead` | `rg-cold-buyer.csv` |
| **CRE Cold Lead** | `cre_cold_lead` | `rg-cold-cre.csv` |
| **EXF Cold Lead** | `exf_cold_lead` | `rg-cold-exf.csv` |

## 📋 Upload Instructions

### Step 1: Export the CSVs
Run this command to create the CSV files:
```bash
node scripts/export-contacts-for-rg.js
```

This creates 8 CSV files in your project root directory.

### Step 2: Upload to Response Genius

For each list, go to Response Genius dashboard:

1. **Navigate to Lists** → Find the list by name
2. **Click "Import"** or "Upload Contacts"
3. **Upload the corresponding CSV file** (see table above)
4. **Map the columns**:
   - `email` → Email
   - `first_name` → First Name
   - `last_name` → Last Name
   - `phone` → Phone
5. **Select "Update existing contacts"** (this prevents duplicates)
6. **Click Import**

### Step 3: Verify Upload

After each upload, check:
- The contact count increased
- No duplicate errors
- Sample contacts appear correctly

## 🔄 What Happens After Upload

### Automatic Syncing (Webhook)

Once all CSVs are uploaded, your webhook integration will automatically:

✅ **When a contact's DNC/Cold Lead property changes in HubSpot:**
1. HubSpot sends webhook to your Railway app
2. Contact is updated in your MongoDB database
3. Webhook triggers Response Genius sync
4. Contact's list preference is updated in Response Genius

✅ **Supported Properties:**
- `dnc___seller_outreach`
- `dnc___buyer_outreach`
- `dnc___cre_outreach`
- `dnc___exf_outreach`
- `seller_cold_lead`
- `buyer_cold_lead`
- `cre_cold_lead`
- `exf_cold_lead`

### Example Flow

1. You set `dnc___buyer_outreach = true` on a contact in HubSpot
2. Within seconds, the contact is added to the "DNC - Buyer outreach" list in Response Genius
3. If you later set it to `false`, the contact is removed from the list

## 📊 Current Counts

**Your Database (as of now):**
- DNC Seller: 100,964 contacts
- DNC Buyer: 72,967 contacts
- DNC CRE: 98,023 contacts
- DNC EXF: 94,217 contacts
- Cold Seller: 8,835 contacts
- Cold Buyer: 27,948 contacts
- Cold CRE: 2,940 contacts
- Cold EXF: 6,746 contacts

**Total: 412,640 contacts**

**Response Genius (from 10/23 upload):**
- ~384,000 contacts (older data)

**Gap: ~28,000 contacts** need to be added

## ⚠️ Important Notes

1. **Duplicates**: Response Genius handles duplicates by email automatically. If an email exists, it updates the record.

2. **New Contacts**: After this upload, any NEW contact created in HubSpot with a DNC/Cold Lead property will need to be added to Response Genius first (via CSV) before the webhook can update it.

3. **Webhook is Already Active**: The webhook code is deployed and running on Railway. It's just waiting for contacts to exist in Response Genius.

## 🧪 Testing the Webhook

After uploading the CSVs, test with an existing contact:

1. Find a contact that's in Response Genius (from your upload)
2. Change one of the 8 properties in HubSpot
3. Wait 10-30 seconds
4. Check Response Genius - the contact should be added/removed from the list

Example test contact: `drutscher@gmail.com`
- After CSV upload, this contact will exist in Response Genius
- Change `dnc___buyer_outreach` in HubSpot
- Webhook will automatically sync it

## ✅ Success Criteria

After completing these uploads, you'll have:
- ✅ 100% parity between your database and Response Genius
- ✅ Automatic real-time syncing via webhooks
- ✅ No manual intervention needed for future updates

## 🆘 Troubleshooting

If webhook doesn't work after upload:
1. Check Railway logs for webhook activity
2. Verify the contact exists in Response Genius
3. Run test script: `node scripts/manual-sync-contact-to-rg.js <email>`
