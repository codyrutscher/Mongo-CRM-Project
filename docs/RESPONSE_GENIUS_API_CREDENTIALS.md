# How to Get Your Response Genius API Credentials

## Step-by-Step Guide

### 1. Log in to Response Genius
Go to: https://control.responsegenius.com

### 2. Navigate to API Identifier Page
Go to: https://control.responsegenius.com/help/api_identifier

### 3. Find Your Credentials
On that page, you'll see:
- **API ID** (also called "Secure API ID")
- **API Key** (also called "Secure API key")

### 4. Copy Your Credentials
Copy both values - you'll need them for the `.env` file.

### 5. Add to .env File
Open your `.env` file and update these lines:

```bash
RESPONSE_GENIUS_API_ID=your_actual_api_id_here
RESPONSE_GENIUS_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_id_here` and `your_actual_api_key_here` with the values you copied.

### 6. Verify Configuration
Run the test script to verify:

```bash
node scripts/test-response-genius-integration.js
```

You should see:
```
✅ API ID: Set
✅ API Key: Set
```

## Example .env Configuration

```bash
# Response Genius Configuration
RESPONSE_GENIUS_API_ID=abc123def456
RESPONSE_GENIUS_API_KEY=xyz789uvw012
RESPONSE_GENIUS_API_URL=https://control.responsegenius.com
RESPONSE_GENIUS_SELLER_LIST_ID=dnc___seller_outreach
RESPONSE_GENIUS_BUYER_LIST_ID=dnc___buyer_outreach
RESPONSE_GENIUS_CRE_LIST_ID=dnc___cre_outreach
RESPONSE_GENIUS_EXF_LIST_ID=dnc___exf_outreach
```

## Troubleshooting

### Can't find the API Identifier page?
- Make sure you're logged in to Response Genius
- Try this direct link: https://control.responsegenius.com/help/api_identifier
- Contact Response Genius support if you don't have API access

### API credentials not working?
- Double-check you copied the entire API ID and API Key
- Make sure there are no extra spaces
- Verify your Response Genius account has API access enabled
- Check that your account is active (not disabled)

### Still having issues?
Run the verification script:
```bash
node scripts/verify-response-genius-setup.js
```

This will check all configuration and show you what's missing.

## Security Notes

- ⚠️ **Never commit your `.env` file to git**
- ⚠️ **Keep your API credentials secure**
- ⚠️ **Don't share your API ID and Key publicly**
- ✅ The `.env` file is already in `.gitignore`

## Next Steps

Once you've added your credentials:

1. **Test the integration:**
   ```bash
   node scripts/test-response-genius-integration.js
   ```

2. **Sync all existing Cold Leads:**
   ```bash
   node scripts/initial-response-genius-sync.js
   ```

3. **Restart your server** to enable real-time syncing

That's it! Your Cold Leads will now automatically sync to Response Genius DNC lists. 🚀
