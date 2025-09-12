export const formatSourceName = (source) => {
  const names = {
    'hubspot': 'HubSpot',
    'google_sheets': 'Google Sheets',
    'csv_upload': 'CSV Upload',
    'excel_upload': 'Excel Upload',
    'manual': 'Manual Entry'
  };
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