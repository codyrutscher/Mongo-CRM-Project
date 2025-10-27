const mongoose = require('mongoose');

const syncJobSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['hubspot', 'google_sheets'],
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['full_sync', 'incremental_sync', 'manual_sync'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  startedAt: Date,
  completedAt: Date,
  
  // Progress tracking
  totalRecords: {
    type: Number,
    default: 0
  },
  processedRecords: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  errorCount: {
    type: Number,
    default: 0
  },
  
  // Configuration
  config: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Error tracking
  syncErrors: [{
    record: mongoose.Schema.Types.Mixed,
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Results summary
  summary: {
    created: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    deleted: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for performance
syncJobSchema.index({ createdAt: -1 });
syncJobSchema.index({ source: 1, status: 1 });

module.exports = mongoose.model('SyncJob', syncJobSchema);