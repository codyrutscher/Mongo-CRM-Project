const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  // Core contact information
  firstName: {
    type: String,
    required: false,
    trim: true,
    index: true,
    default: ''
  },
  lastName: {
    type: String,
    required: false,
    trim: true,
    index: true,
    default: ''
  },
  email: {
    type: String,
    required: false,
    unique: false,
    sparse: true,
    lowercase: true,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true,
    index: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  
  // Address information
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  
  // Source information
  source: {
    type: String,
    enum: ['hubspot', 'google_sheets', 'csv_upload', 'excel_upload', 'manual'],
    required: true,
    index: true
  },
  sourceId: {
    type: String,
    index: true
  },
  
  // Custom fields for flexibility
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Segmentation tags
  tags: [{
    type: String,
    trim: true
  }],
  
  // Status and lifecycle
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted'],
    default: 'active',
    index: true
  },
  lifecycleStage: {
    type: String,
    enum: ['lead', 'prospect', 'customer', 'evangelist'],
    default: 'lead'
  },
  
  // Compliance and DNC
  dncStatus: {
    type: String,
    enum: ['callable', 'dnc_internal', 'dnc_federal', 'dnc_state', 'dnc_wireless'],
    default: 'callable',
    index: true
  },
  dncDate: {
    type: Date
  },
  dncReason: {
    type: String
  },
  complianceNotes: {
    type: String
  },
  
  // Sync information
  lastSyncedAt: {
    type: Date,
    default: Date.now
  },
  syncErrors: [{
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
contactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for performance with millions of records
contactSchema.index({ createdAt: -1 });
contactSchema.index({ lastSyncedAt: -1 });
contactSchema.index({ source: 1, sourceId: 1 }, { unique: true });
contactSchema.index({ company: 1, createdAt: -1 });
contactSchema.index({ tags: 1 });
contactSchema.index({ status: 1, lifecycleStage: 1 });
contactSchema.index({ email: 1, source: 1 }, { sparse: true, unique: true });

// Text index for search functionality
contactSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  company: 'text',
  jobTitle: 'text'
});

module.exports = mongoose.model('Contact', contactSchema);