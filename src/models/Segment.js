const mongoose = require('mongoose');

const segmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {}
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#6c757d'
  },
  icon: {
    type: String,
    default: 'fas fa-users'
  },
  contactCount: {
    type: Number,
    default: 0
  },
  lastCountUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for performance
segmentSchema.index({ createdAt: -1 });
segmentSchema.index({ isSystem: 1, name: 1 });

module.exports = mongoose.model('Segment', segmentSchema);