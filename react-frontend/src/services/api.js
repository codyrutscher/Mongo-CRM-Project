import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Dashboard
export const getDashboardStats = () => api.get('/contacts/stats');
export const getSyncJobs = (limit = 5) => api.get(`/sync/jobs?limit=${limit}`);

// Contacts
export const getContacts = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return api.get(`/contacts?${queryString}`);
};

export const getContactsWithFilters = (filters = {}, page = 1, limit = 20, sort = 'createdAt', order = 'desc') => {
  return api.post('/contacts/search', {
    filters,
    page,
    limit,
    sort,
    order
  });
};

export const getAllFilteredContactIds = (filters = {}) => {
  return api.post('/contacts/search', {
    filters,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER, // No limit - get all results
    select: '_id'
  });
};

export const searchContacts = (params, page, limit) => {
  console.log('🔵 searchContacts called with params:', params);
  
  // Support both old signature (query, page, limit) and new signature (object with filters)
  if (typeof params === 'object' && params.filters !== undefined) {
    // New signature: { filters, page, limit, sort, order }
    console.log('🔵 Using new signature with filters:', params.filters);
    return api.post('/contacts/search', params);
  } else if (typeof params === 'string') {
    // Old signature: (query, page, limit) where query is a string
    const query = params;
    const actualPage = page || 1;
    const actualLimit = limit || 100;
    console.log('🔵 Using old signature with query string:', query);
    return api.post('/contacts/search', { query, page: actualPage, limit: actualLimit });
  } else {
    // Fallback: treat as direct body
    console.log('🔵 Using direct body:', params);
    return api.post('/contacts/search', params);
  }
};

export const getContact = (id) => api.get(`/contacts/${id}`);

export const getContactSegments = () => api.get('/contacts/segments');

export const getSegmentContacts = (segment) => api.get(`/contacts/segments/${segment}`);

export const getContactsByCategory = (category, page = 1, limit = 20, source = null) => {
  let url = `/contacts/category/${category}?page=${page}&limit=${limit}`;
  if (source) {
    url += `&source=${source}`;
  }
  return api.get(url);
};

export const getCSVUploads = () => api.get('/contacts/csv-uploads');

// Sync
export const testHubSpotConnection = () => api.post('/sync/test/hubspot');
export const startHubSpotSync = (type) => api.post('/sync/hubspot', { type });
export const testGoogleSheetsConnection = (spreadsheetId) => 
  api.post('/sync/test/google-sheets', { spreadsheetId });
export const startGoogleSheetsSync = (spreadsheetId, sheetName) => 
  api.post('/sync/google-sheets', { spreadsheetId, sheetName });
export const getSyncJob = (jobId) => api.get(`/sync/jobs/${jobId}`);

// Upload
export const previewCSV = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/csv/preview', formData);
};

export const uploadContacts = (formData) => {
  return api.post('/contacts/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getFieldOptions = () => api.get('/csv/field-options');

// Segments
export const getSegments = () => api.get('/segments');
export const getSegment = (id) => api.get(`/segments/${id}`);
export const createSegment = (segment) => api.post('/segments', segment);
export const updateSegment = (id, segment) => api.put(`/segments/${id}`, segment);
export const deleteSegment = (id) => api.delete(`/segments/${id}`);
export const exportSegment = (id, format = 'csv') => api.get(`/segments/${id}/export?format=${format}`);
export const getSegmentContactsById = (id, page = 1, limit = 100) => 
  api.get(`/segments/${id}/contacts?page=${page}&limit=${limit}`);

export default api;