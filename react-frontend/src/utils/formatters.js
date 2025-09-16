export const formatSourceName = (source) => {
  const names = {
    'hubspot': 'HubSpot',
    'google_sheets': 'C17 Leads',
    'csv_upload': 'CSV Upload',
    'excel_upload': 'Excel Upload',
    'manual': 'Manual Entry'
  };
  
  // Handle individual CSV upload sources
  if (source && source.startsWith('csv_')) {
    return source.replace('csv_', '').replace(/_/g, ' ');
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