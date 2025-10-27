# Response Genius DNC Lists - Ready to Sync!

## ✅ Configuration Complete

All environment variables are set and database connection is working.

## 📊 Contacts Ready to Sync

| List Type | Contact Count |
|-----------|--------------|
| Seller    | 5,770        |
| Buyer     | 12,494       |
| CRE       | 1,342        |
| EXF       | 77           |
| **TOTAL** | **19,683**   |

## 🎯 Next Steps

### Step 1: Create Lists in Response Genius (REQUIRED)

The Response Genius API requires lists to be created through the web interface first.

1. **Log in to Response Genius**:
   - URL: https://control.responsegenius.com

2. **Navigate to the Lists section**

3. **Create these 4 lists** with the EXACT API identifiers:

   | List Name | API Identifier |
   |-----------|----------------|
   | DNC - Seller outreach | `dnc___seller_outreach` |
   | DNC - Buyer outreach | `dnc___buyer_outreach` |
   | DNC - CRE outreach | `dnc___cre_outreach` |
   | DNC - EXF outreach | `dnc___exf_outreach` |

   **IMPORTANT**: The API Identifier must match exactly (including the triple underscores `___`)

### Step 2: Sync Contacts

Once the lists are created in Response Genius, run:

```bash
node scripts/sync-dnc-lists-to-response-genius.js
```

This will:
- Upload contacts in batches of 100
- Show progress for each list
- Display final sync results
- Take approximately 3-5 minutes for all 19,683 contacts

### Step 3: Verify

After syncing:
1. Check Response Genius dashboard to verify contact counts
2. Webhook will automatically keep lists in sync going forward

## 🔄 Real-Time Sync (Already Enabled)

The webhook service is already configured to automatically sync changes when:

- **DNC properties change** in HubSpot:
  - `dnc___seller_outreach`
  - `dnc___buyer_outreach`
  - `dnc___cre_outreach`
  - `dnc___exf_outreach`

- **Cold Lead properties change** in HubSpot:
  - `seller_cold_lead`
  - `buyer_cold_lead`
  - `cre_cold_lead`
  - `exf_cold_lead`

## 📝 How It Works

```
HubSpot Properties
       ↓
Prospere CRM (customFields)
       ↓
Response Genius Lists
```

Each list combines:
- Contacts with DNC property = true
- Contacts with Cold Lead property = true

## 🛠️ Troubleshooting

If sync fails:
1. Verify lists exist in Response Genius with correct API identifiers
2. Check API credentials in `.env`
3. Review error messages in console output
4. Contact Response Genius support if API issues persist

## 📚 Documentation

- Full docs: `docs/RESPONSE_GENIUS_DNC_LISTS.md`
- Quick start: `docs/DNC_LISTS_QUICK_START.md`
