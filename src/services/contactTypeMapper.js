/**
 * Maps HubSpot contact_type values to Prospere CRM campaign types
 * A contact can belong to multiple campaign types
 */

const CONTACT_TYPE_MAPPING = {
  // Buyer types
  'Buyer': ['Buyer'],
  'Buyer & Seller': ['Buyer', 'Seller'], // Both!
  
  // Seller types
  'Seller': ['Seller'],
  'Secondary Seller': ['Seller'],
  
  // CRE types (all start with CRE)
  'CRE Buyer': ['CRE'],
  'CRE Corporate Services': ['CRE'],
  'CRE Franchise Services': ['CRE'],
  'CRE Investor': ['CRE'],
  'CRE Landlord': ['CRE'],
  'CRE Power Partner': ['CRE'],
  'CRE Referral': ['CRE'],
  'CRE Seller': ['CRE'],
  'CRE Tenant': ['CRE'],
  
  // Exit Factor types (all start with EXF)
  'EXF Client': ['Exit Factor'],
  'EXF Franchisees': ['Exit Factor'],
  
  // Not mapped (will return empty array)
  'Corporate Partner': [],
  'Other': [],
  'Referral Partner': []
};

/**
 * Parse HubSpot contact_type and return array of campaign types
 * @param {string} contactType - The contact_type value from HubSpot
 * @returns {Array<string>} Array of campaign types (Buyer, Seller, CRE, Exit Factor)
 */
function parseContactType(contactType) {
  if (!contactType) return [];
  
  // Direct lookup
  if (CONTACT_TYPE_MAPPING[contactType]) {
    return CONTACT_TYPE_MAPPING[contactType];
  }
  
  // Fallback: check if it contains keywords (case insensitive)
  const types = [];
  const lower = contactType.toLowerCase();
  
  if (lower.includes('buyer') && !lower.includes('cre')) {
    types.push('Buyer');
  }
  if (lower.includes('seller') && !lower.includes('cre')) {
    types.push('Seller');
  }
  if (lower.includes('cre')) {
    types.push('CRE');
  }
  if (lower.includes('exf') || lower.includes('exit factor')) {
    types.push('Exit Factor');
  }
  
  return types;
}

/**
 * Get primary campaign type (first one in the list)
 * @param {string} contactType - The contact_type value from HubSpot
 * @returns {string} Primary campaign type or empty string
 */
function getPrimaryCampaignType(contactType) {
  const types = parseContactType(contactType);
  return types[0] || '';
}

/**
 * Check if contact type maps to a specific campaign type
 * @param {string} contactType - The contact_type value from HubSpot
 * @param {string} campaignType - The campaign type to check (Buyer, Seller, CRE, Exit Factor)
 * @returns {boolean}
 */
function isCampaignType(contactType, campaignType) {
  const types = parseContactType(contactType);
  return types.includes(campaignType);
}

module.exports = {
  parseContactType,
  getPrimaryCampaignType,
  isCampaignType,
  CONTACT_TYPE_MAPPING
};
