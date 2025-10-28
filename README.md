# ProspereCRM

A comprehensive Customer Relationship Management system that integrates with HubSpot, Google Sheets, and MongoDB to manage millions of contact records with powerful search, segmentation, and export capabilities.

## Features

### 🔗 **Multi-Platform Integration**
- **HubSpot API**: Full and incremental sync of contacts
- **Google Sheets API**: Import contacts from spreadsheets
- **CSV/Excel Upload**: Bulk upload via file uploads
- **Manual Entry**: Direct contact creation and editing

### 🔍 **Advanced Search & Segmentation**
- Full-text search across all contact fields
- Advanced filtering by source, lifecycle stage, company, tags, and more
- Pre-built segments (New Leads, Customers, Prospects, etc.)
- Custom field searching
- Duplicate detection and management

### 📊 **Data Management**
- MongoDB with optimized indexes for millions of records
- Real-time sync job monitoring
- Comprehensive error handling and logging
- Data validation and transformation

### 📈 **Export & Analytics**
- Export to CSV and Excel formats
- Segment-based exports
- Search result exports
- Contact statistics and dashboards
- Custom field inclusion in exports

### 🌐 **Web Interface**
- Responsive Bootstrap-based UI
- Real-time sync job monitoring
- Contact browsing and management
- File upload with drag-and-drop
- Export functionality

## Quick Start

### Prerequisites
- Node.js 14+
- MongoDB (local or cloud)
- HubSpot API access token (optional)
- Google Service Account credentials (optional)

### Installation

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd prospere-crm
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start MongoDB**
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env
```

4. **Run the Application**
```bash
# Development
npm run dev

# Production
npm start
```

5. **Access the Application**
- Web Interface: http://localhost:3000
- API Documentation: http://localhost:3000/api

## Configuration

### Environment Variables

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/prosperecrm

# HubSpot Configuration (Optional)
HUBSPOT_ACCESS_TOKEN=your_hubspot_access_token
HUBSPOT_APP_ID=your_hubspot_app_id

# Google Sheets Configuration (Optional)
GOOGLE_CLIENT_EMAIL=your_google_service_account_email
GOOGLE_PRIVATE_KEY=your_google_service_account_private_key
GOOGLE_PROJECT_ID=your_google_project_id

# Server Configuration
PORT=3000
NODE_ENV=development
```

### HubSpot Setup
1. Create a HubSpot private app
2. Grant necessary scopes (contacts read/write)
3. Copy the access token to `HUBSPOT_ACCESS_TOKEN`

### Google Sheets Setup
1. Create a Google Cloud project
2. Enable Google Sheets API
3. Create a service account
4. Download service account JSON
5. Share your spreadsheet with the service account email
6. Add credentials to environment variables

## API Documentation

### Contacts API

#### Get Contacts
```http
GET /api/contacts
GET /api/contacts?page=1&limit=50&search=john&sort=createdAt&order=desc
```

#### Search Contacts
```http
POST /api/contacts/search
Content-Type: application/json

{
  "query": "john doe",
  "filters": {
    "source": ["hubspot", "google_sheets"],
    "lifecycleStage": "lead",
    "company": "Acme Corp"
  },
  "page": 1,
  "limit": 50
}
```

#### Get Segments
```http
GET /api/contacts/segments
GET /api/contacts/segments/new_leads
```

#### Upload Contacts
```http
POST /api/contacts/upload
Content-Type: multipart/form-data

file: [CSV or Excel file]
```

#### Individual Contact Operations
```http
GET /api/contacts/{id}          # Get contact
POST /api/contacts              # Create contact
PUT /api/contacts/{id}          # Update contact
DELETE /api/contacts/{id}       # Delete contact
```

#### Bulk Operations
```http
PATCH /api/contacts/bulk        # Bulk update
DELETE /api/contacts/bulk       # Bulk delete
```

### Sync API

#### HubSpot Sync
```http
POST /api/sync/hubspot
Content-Type: application/json

{
  "type": "full_sync" | "incremental_sync"
}
```

#### Google Sheets Sync
```http
POST /api/sync/google-sheets
Content-Type: application/json

{
  "spreadsheetId": "1ABC123...",
  "sheetName": "Sheet1",
  "type": "full_sync"
}
```

#### Sync Job Management
```http
GET /api/sync/jobs              # List sync jobs
GET /api/sync/jobs/{jobId}      # Get job status
DELETE /api/sync/jobs/{jobId}   # Cancel job
GET /api/sync/last/{source}     # Get last sync info
```

#### Connection Tests
```http
POST /api/sync/test/hubspot
POST /api/sync/test/google-sheets
```

### Export API

#### Export Contacts
```http
POST /api/export/contacts
Content-Type: application/json

{
  "format": "csv" | "excel",
  "filters": {
    "source": "hubspot",
    "lifecycleStage": "customer"
  }
}
```

#### Export Segments
```http
GET /api/export/segment/{segment}?format=csv
```

#### Export Search Results
```http
POST /api/export/search
Content-Type: application/json

{
  "query": "search term",
  "filters": {},
  "format": "excel"
}
```

#### Download Export
```http
GET /api/export/download/{filename}
```

## Data Models

### Contact Model
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  phone: String,
  company: String,
  jobTitle: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  source: String (enum),
  sourceId: String,
  customFields: Map,
  tags: [String],
  status: String (enum),
  lifecycleStage: String (enum),
  lastSyncedAt: Date,
  syncErrors: [Object]
}
```

### Sync Job Model
```javascript
{
  source: String,
  type: String,
  status: String,
  totalRecords: Number,
  processedRecords: Number,
  successCount: Number,
  errorCount: Number,
  summary: {
    created: Number,
    updated: Number,
    skipped: Number,
    deleted: Number
  },
  errors: [Object]
}
```

## File Upload Format

### CSV Format
```csv
First Name,Last Name,Email,Phone,Company,Job Title,City,State,Country
John,Doe,john@example.com,555-0123,Acme Corp,Manager,New York,NY,USA
```

### Excel Format
- Supports multiple sheets
- First row should contain headers
- Automatic field mapping based on column names

### Supported Field Names
- **Name**: First Name, firstname, fname, Last Name, lastname, lname
- **Contact**: Email, email address, Phone, phone number, mobile
- **Company**: Company, organization, Job Title, jobtitle, title, position
- **Address**: Address, street, City, State, province, Zip, zipcode, postal code, Country
- **Other**: Tags, categories, Status, Lifecycle Stage, stage

## Performance & Scalability

### Database Optimization
- Compound indexes on frequently queried fields
- Text indexes for full-text search
- Optimized aggregation pipelines
- Connection pooling

### Rate Limiting
- API rate limiting (1000 requests per 15 minutes)
- HubSpot API rate limiting compliance
- Google Sheets API quota management

### File Upload Limits
- Maximum file size: 50MB
- Supported formats: CSV, XLS, XLSX
- Batch processing for large imports

## Development

### Project Structure
```
src/
├── config/         # Database configuration
├── controllers/    # API controllers
├── middleware/     # Express middleware
├── models/         # MongoDB models
├── routes/         # API routes
├── services/       # Business logic services
└── utils/          # Utility functions

public/             # Static web files
uploads/            # Temporary upload directory
exports/            # Export file directory
logs/               # Application logs
```

### Running Tests
```bash
npm test
```

### Code Style
- ESLint configuration included
- Prettier formatting
- Consistent error handling
- Comprehensive logging

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MongoDB is running
   - Verify connection string in .env

2. **HubSpot Sync Fails**
   - Verify access token is valid
   - Check token permissions (contacts scope)
   - Review rate limiting

3. **Google Sheets Access Denied**
   - Ensure service account has access to spreadsheet
   - Check service account credentials
   - Verify Google Sheets API is enabled

4. **Large File Upload Fails**
   - Check file size (max 50MB)
   - Verify file format (CSV/Excel only)
   - Review server memory limits

### Logs
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Console output in development mode

## Production Deployment

### Environment Setup
```bash
NODE_ENV=production
# Set production MongoDB URI
# Configure proper JWT secret
# Set appropriate rate limits
```

### Security Considerations
- Use HTTPS in production
- Secure MongoDB with authentication
- Implement proper access controls
- Regular security updates

### Monitoring
- Monitor MongoDB performance
- Track API response times
- Set up error alerting
- Monitor disk space for exports

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section
- Review API documentation
- Submit issues via GitHub

---

**ProspereCRM** - Scale your customer relationships with confidence.# Campaign Types Synced - Ready for Production
