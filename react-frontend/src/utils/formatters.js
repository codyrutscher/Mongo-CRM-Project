export const formatSourceName = (source) => {
  const names = {
    'hubspot': 'HubSpot',
    'google_sheets': 'C17 Leads',
    'csv_upload': 'CSV Upload',
    'excel_upload': 'Excel Upload',
    'manual': 'Manual Entry'
  };
  
  // Handle individual CSV upload sources dynamically
  if (source && source.startsWith('csv_')) {
    // Extract the clean name and convert underscores back to spaces
    const cleanName = source.replace('csv_', '').replace(/_/g, ' ');
    // Capitalize first letter of each word for better display
    return cleanName.replace(/\b\w/g, l => l.toUpperCase());
  }
  
  return names[source] || source;
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
};

export const getLifecycleColor = (stage) => {
  const colors = {
    'lead': 'primary',
    'prospect': 'warning', 
    'customer': 'success',
    'evangelist': 'info'
  };
  return colors[stage] || 'secondary';
};