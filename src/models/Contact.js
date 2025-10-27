const mongoose = require("mongoose");

// NAICS Standardized Contact Schema
const contactSchema = new mongoose.Schema(
  {
    // NAICS Standard Fields - Personal Information
    firstName: {
      type: String,
      required: false,
      trim: true,
      index: true,
      default: "",
    },
    lastName: {
      type: String,
      required: false,
      trim: true,
      index: true,
      default: "",
    },
    jobTitle: {
      type: String,
      trim: true,
      default: "",
    },
    contactLinkedInProfile: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: false,
      unique: false,
      sparse: true,
      lowercase: true,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    
    // NAICS Standard Fields - Company Information
    company: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },
    companyWebsiteURL: {
      type: String,
      trim: true,
      default: "",
    },
    industry: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },
    naicsCode: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },
    numberOfEmployees: {
      type: String,
      trim: true,
      default: "",
    },
    yearCompanyEstablished: {
      type: String,
      trim: true,
      default: "",
    },
    companyPhoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    companyStreetAddress: {
      type: String,
      trim: true,
      default: "",
    },
    companyCity: {
      type: String,
      trim: true,
      default: "",
    },
    companyState: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },
    companyZipCode: {
      type: String,
      trim: true,
      default: "",
    },
    
    // NAICS Standard Fields - Lead Information
    leadSource: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },
    campaignCategory: {
      type: String,
      trim: true,
      default: "",
    },
    lastCampaignDate: {
      type: Date,
      default: null,
    },

    // Legacy/System Fields (for backward compatibility)
    source: {
      type: String,
      required: true,
      enum: ["hubspot", "google_sheets", "csv_upload", "excel_upload", "manual"],
      default: "manual",
      index: true,
    },
    sourceId: {
      type: String,
      required: true,
      index: true,
    },
    lifecycleStage: {
      type: String,
      enum: ["subscriber", "lead", "prospect", "customer", "evangelist"],
      default: "lead",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "deleted"],
      default: "active",
      index: true,
    },
    
    // DNC and Compliance
    dncStatus: {
      type: String,
      enum: ["callable", "dnc_internal", "dnc_federal"],
      default: "callable",
      index: true,
    },
    dncDate: {
      type: Date,
    },
    dncReason: {
      type: String,
      trim: true,
    },
    complianceNotes: {
      type: String,
      trim: true,
    },
    
    // Response Genius DNC Lists (synced from HubSpot)
    dnc___seller_outreach: {
      type: Boolean,
      default: false,
      index: true,
    },
    dnc___buyer_outreach: {
      type: Boolean,
      default: false,
      index: true,
    },
    dnc___cre_outreach: {
      type: Boolean,
      default: false,
      index: true,
    },
    dnc___exf_outreach: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Response Genius Cold Lead Lists (synced from HubSpot)
    seller_cold_lead: {
      type: Boolean,
      default: false,
      index: true,
    },
    buyer_cold_lead: {
      type: Boolean,
      default: false,
      index: true,
    },
    cre_cold_lead: {
      type: Boolean,
      default: false,
      index: true,
    },
    exf_cold_lead: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Campaign Status (for email campaign tracking)
    campaignStatus: {
      type: String,
      enum: ["", "Delivered", "Unsubscribed", "Hard Bounce", "Soft Bounce"],
      default: "",
      index: true,
    },
    
    // Campaign Type (for filtering)
    campaignType: {
      type: String,
      enum: ["", "Buyer", "Seller", "CRE", "Exit Factor"],
      default: "",
      index: true,
    },

    // Metadata
    tags: [String],
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sourceMetadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    syncErrors: [
      {
        error: String,
        timestamp: { type: Date, default: Date.now },
        resolved: { type: Boolean, default: false },
      },
    ],
    lastSyncedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "contacts",
  }
);

// Indexes for performance
contactSchema.index({ firstName: 1, lastName: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ phone: 1 });
contactSchema.index({ company: 1 });
contactSchema.index({ source: 1, sourceId: 1 });
contactSchema.index({ naicsCode: 1 });
contactSchema.index({ industry: 1 });
contactSchema.index({ leadSource: 1 });
contactSchema.index({ companyState: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ lastSyncedAt: -1 });

// Text search index
contactSchema.index({
  firstName: "text",
  lastName: "text",
  email: "text",
  company: "text",
  jobTitle: "text",
  industry: "text",
});

module.exports = mongoose.model("Contact", contactSchema);