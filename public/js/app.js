// ProspereCRM Frontend JavaScript

const API_BASE = '/api';
let currentPage = 1;
let currentSegment = '';
let currentView = 'grid'; // 'grid' or 'list'
let selectedContacts = new Set(); // Track selected contact IDs
let currentSegmentDetails = null; // Current segment being viewed

// Navigation
document.addEventListener('DOMContentLoaded', function() {
    // Set up navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            showSection(target);
        });
    });

    // Set up button event listeners
    setupEventListeners();

    // Initialize dashboard
    showSection('dashboard');
    loadDashboardData();
    loadSegments();
});

function setupEventListeners() {
    // Search functionality
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const segmentFilter = document.getElementById('segmentFilter');
    
    if (searchButton) {
        searchButton.addEventListener('click', searchContacts);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchContacts();
            }
        });
    }
    
    if (segmentFilter) {
        segmentFilter.addEventListener('change', loadContactsBySegment);
    }
    
    // Sort and refresh functionality
    const sortSelect = document.getElementById('sortSelect');
    const refreshContactsBtn = document.getElementById('refreshContactsBtn');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            loadContacts(1); // Reload with new sort
        });
    }
    
    if (refreshContactsBtn) {
        refreshContactsBtn.addEventListener('click', function() {
            console.log('Refreshing contacts...');
            loadContacts(currentPage);
        });
    }

    // View toggle buttons
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    if (gridViewBtn) {
        gridViewBtn.addEventListener('click', function() {
            switchToGridView();
        });
    }
    
    if (listViewBtn) {
        listViewBtn.addEventListener('click', function() {
            switchToListView();
        });
    }

    // HubSpot buttons
    const testHubSpotBtn = document.getElementById('testHubSpotBtn');
    const fullSyncHubSpotBtn = document.getElementById('fullSyncHubSpotBtn');
    const incrementalSyncHubSpotBtn = document.getElementById('incrementalSyncHubSpotBtn');
    
    if (testHubSpotBtn) {
        testHubSpotBtn.addEventListener('click', testHubSpotConnection);
    }
    if (fullSyncHubSpotBtn) {
        fullSyncHubSpotBtn.addEventListener('click', () => startHubSpotSync('full_sync'));
    }
    if (incrementalSyncHubSpotBtn) {
        incrementalSyncHubSpotBtn.addEventListener('click', () => startHubSpotSync('incremental_sync'));
    }

    // Google Sheets buttons
    const testGoogleSheetsBtn = document.getElementById('testGoogleSheetsBtn');
    const startGoogleSheetsBtn = document.getElementById('startGoogleSheetsBtn');
    
    if (testGoogleSheetsBtn) {
        testGoogleSheetsBtn.addEventListener('click', testGoogleSheetsConnection);
    }
    if (startGoogleSheetsBtn) {
        startGoogleSheetsBtn.addEventListener('click', startGoogleSheetsSync);
    }

    // File upload
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', uploadFile);
    }

    // Contact modal close functionality
    const contactModal = document.getElementById('contactModal');
    if (contactModal) {
        contactModal.addEventListener('click', function(e) {
            if (e.target === this || e.target.classList.contains('btn-close') || e.target.getAttribute('data-bs-dismiss') === 'modal') {
                this.style.display = 'none';
                this.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
        });
    }

    // CSV mapping buttons
    const backToUploadBtn = document.getElementById('backToUploadBtn');
    const processWithMappingBtn = document.getElementById('processWithMappingBtn');
    
    if (backToUploadBtn) {
        backToUploadBtn.addEventListener('click', function() {
            document.getElementById('mappingStep').style.display = 'none';
            document.getElementById('uploadStep').style.display = 'block';
            document.getElementById('fileInput').value = ''; // Clear file input
        });
    }
    
    if (processWithMappingBtn) {
        processWithMappingBtn.addEventListener('click', processWithMapping);
    }

    // Segments buttons
    const createSegmentBtn = document.getElementById('createSegmentBtn');
    const loadHubSpotListsBtn = document.getElementById('loadHubSpotListsBtn');
    
    if (createSegmentBtn) {
        createSegmentBtn.addEventListener('click', function() {
            showCreateSegmentModal();
        });
    }
    
    if (loadHubSpotListsBtn) {
        loadHubSpotListsBtn.addEventListener('click', function() {
            loadHubSpotLists();
        });
    }

    // Bulk actions
    const createSegmentFromSelectedBtn = document.getElementById('createSegmentFromSelectedBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    
    if (createSegmentFromSelectedBtn) {
        createSegmentFromSelectedBtn.addEventListener('click', createSegmentFromSelected);
    }
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllContacts);
    }
    
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', clearSelection);
    }
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'contacts':
            loadContacts();
            break;
        case 'segments':
            loadSegments();
            break;
        case 'sync':
            loadSyncJobs();
            break;
    }
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        // Load contact stats
        const statsResponse = await fetch(`${API_BASE}/contacts/stats`);
        const statsData = await statsResponse.json();
        
        if (statsData.success) {
            updateStatsCards(statsData.data);
            updateContactSources(statsData.data.bySource);
        }

        // Load recent sync jobs
        const syncResponse = await fetch(`${API_BASE}/sync/jobs?limit=5`);
        const syncData = await syncResponse.json();
        
        if (syncData.success) {
            updateRecentSyncJobs(syncData.data.jobs);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateStatsCards(stats) {
    document.getElementById('totalContacts').textContent = stats.total || 0;
    document.getElementById('newLeads').textContent = stats.byLifecycleStage.lead || 0;
    document.getElementById('customers').textContent = stats.byLifecycleStage.customer || 0;
    document.getElementById('prospects').textContent = stats.byLifecycleStage.prospect || 0;
}

function updateContactSources(sources) {
    const sourcesDiv = document.getElementById('contactSources');
    let html = '';
    
    Object.entries(sources).forEach(([source, count]) => {
        const percentage = ((count / Object.values(sources).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
        html += `
            <div class="mb-2">
                <div class="d-flex justify-content-between">
                    <span>${formatSourceName(source)}</span>
                    <span>${count} (${percentage}%)</span>
                </div>
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    });
    
    sourcesDiv.innerHTML = html || '<p class="text-muted">No data available</p>';
}

function updateRecentSyncJobs(jobs) {
    const jobsDiv = document.getElementById('recentSyncJobs');
    
    if (!jobs || jobs.length === 0) {
        jobsDiv.innerHTML = '<p class="text-muted">No recent sync jobs</p>';
        return;
    }
    
    let html = '';
    jobs.forEach(job => {
        const statusClass = job.status === 'completed' ? 'success' : 
                           job.status === 'failed' ? 'danger' : 'warning';
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${formatSourceName(job.source)}</strong>
                    <small class="text-muted d-block">${formatDate(job.createdAt)}</small>
                </div>
                <span class="badge bg-${statusClass}">${job.status}</span>
            </div>
        `;
    });
    
    jobsDiv.innerHTML = html;
}

// Contacts Functions
async function loadSegments() {
    try {
        const response = await fetch(`${API_BASE}/contacts/segments`);
        const data = await response.json();
        
        if (data.success) {
            const segmentSelect = document.getElementById('segmentFilter');
            segmentSelect.innerHTML = '<option value="">All Contacts</option>';
            
            Object.entries(data.data).forEach(([key, segment]) => {
                if (segment.count > 0) {
                    segmentSelect.innerHTML += `<option value="${key}">${segment.label} (${segment.count})</option>`;
                }
            });
        }
    } catch (error) {
        console.error('Error loading segments:', error);
    }
}

async function loadContacts(page = 1) {
    try {
        console.log('loadContacts called, showing loading...');
        showLoading(true);
        currentPage = page;
        
        // Get sort selection
        const sortSelect = document.getElementById('sortSelect');
        const sortValue = sortSelect ? sortSelect.value : 'createdAt-desc';
        const [sortField, sortOrder] = sortValue.split('-');
        
        let url = `${API_BASE}/contacts?page=${page}&limit=100&sort=${sortField}&order=${sortOrder}`;
        console.log('Fetching from URL:', url);
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            console.log('Displaying contacts...');
            displayContacts(data.data);
            updatePagination(data.pagination);
        } else {
            console.error('API returned error:', data.error);
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
        showError('Failed to load contacts');
    } finally {
        console.log('Hiding loading...');
        showLoading(false);
    }
}

async function loadContactsBySegment() {
    const segment = document.getElementById('segmentFilter').value;
    currentSegment = segment;
    
    if (!segment) {
        loadContacts();
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE}/contacts/segments/${segment}`);
        const data = await response.json();
        
        if (data.success) {
            displayContacts(data.data);
            updatePagination(data.pagination);
        }
    } catch (error) {
        console.error('Error loading segment contacts:', error);
        showError('Failed to load contacts');
    } finally {
        showLoading(false);
    }
}

async function searchContacts() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        loadContacts();
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE}/contacts/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, page: 1, limit: 100 })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayContacts(data.data);
            updatePagination(data.pagination);
        }
    } catch (error) {
        console.error('Error searching contacts:', error);
        showError('Search failed');
    } finally {
        showLoading(false);
    }
}

function switchToGridView() {
    currentView = 'grid';
    document.getElementById('gridViewBtn').classList.add('active');
    document.getElementById('listViewBtn').classList.remove('active');
    
    const contactsList = document.getElementById('contactsList');
    contactsList.className = 'row';
    
    // Reload contacts in grid view
    const contacts = window.currentContacts || [];
    displayContacts(contacts);
}

function switchToListView() {
    currentView = 'list';
    document.getElementById('listViewBtn').classList.add('active');
    document.getElementById('gridViewBtn').classList.remove('active');
    
    const contactsList = document.getElementById('contactsList');
    contactsList.className = 'col-12';
    
    // Reload contacts in list view
    const contacts = window.currentContacts || [];
    displayContacts(contacts);
}

function displayContacts(contacts) {
    console.log('displayContacts called with', contacts.length, 'contacts');
    const contactsList = document.getElementById('contactsList');
    console.log('contactsList element:', contactsList);
    
    if (!contactsList) {
        console.error('contactsList element not found!');
        return;
    }
    
    if (!contacts || contacts.length === 0) {
        contactsList.innerHTML = '<div class="col-12"><p class="text-muted">No contacts found.</p></div>';
        return;
    }
    
    // Store contacts for view switching
    window.currentContacts = contacts;
    
    let html = '';
    
    if (currentView === 'list') {
        // List view - table format
        html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th width="50">
                                <input type="checkbox" id="selectAllCheckbox" class="form-check-input">
                            </th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Company</th>
                            <th>Source</th>
                            <th>Stage</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        contacts.forEach(contact => {
            const isSelected = selectedContacts.has(contact._id);
            html += `
                <tr data-contact-id="${contact._id}" class="contact-row">
                    <td>
                        <input type="checkbox" class="form-check-input contact-checkbox" 
                               data-contact-id="${contact._id}" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td><strong>${contact.firstName} ${contact.lastName}</strong></td>
                    <td>${contact.email || '<span class="text-muted">No email</span>'}</td>
                    <td>${contact.phone || '<span class="text-muted">No phone</span>'}</td>
                    <td>${contact.company || '<span class="text-muted">No company</span>'}</td>
                    <td><span class="badge bg-info">${formatSourceName(contact.source)}</span></td>
                    <td><span class="badge bg-${getLifecycleColor(contact.lifecycleStage)}">${contact.lifecycleStage}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" data-action="view-details" data-contact-id="${contact._id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    } else {
        // Grid view - card format with checkboxes
        contacts.forEach(contact => {
            const isSelected = selectedContacts.has(contact._id);
            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card contact-card ${isSelected ? 'border-primary' : ''}" data-contact-id="${contact._id}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title mb-0">${contact.firstName} ${contact.lastName}</h6>
                                <input type="checkbox" class="form-check-input contact-checkbox" 
                                       data-contact-id="${contact._id}" ${isSelected ? 'checked' : ''}>
                            </div>
                            <p class="card-text">
                                <small class="text-muted">
                                    <i class="fas fa-envelope"></i> ${contact.email || 'No email'}<br>
                                    <i class="fas fa-phone"></i> ${contact.phone || 'No phone'}<br>
                                    <i class="fas fa-building"></i> ${contact.company || 'No company'}
                                </small>
                            </p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">${formatSourceName(contact.source)}</small>
                                <span class="badge bg-${getLifecycleColor(contact.lifecycleStage)}">${contact.lifecycleStage}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    console.log('Setting contactsList HTML with', html.length, 'characters');
    contactsList.innerHTML = html;
    console.log('contactsList updated, current content length:', contactsList.innerHTML.length);
    
    // Add event listeners for checkboxes and contact actions
    setupContactEventListeners();
}

function updatePagination(pagination) {
    const paginationNav = document.getElementById('contactsPagination');
    const paginationList = paginationNav.querySelector('.pagination');
    
    if (pagination.total <= 1) {
        paginationNav.style.display = 'none';
        return;
    }
    
    paginationNav.style.display = 'block';
    let html = '';
    
    // Previous button
    html += `<li class="page-item ${pagination.current === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${pagination.current - 1}">Previous</a>
    </li>`;
    
    // Page numbers
    for (let i = Math.max(1, pagination.current - 2); i <= Math.min(pagination.total, pagination.current + 2); i++) {
        html += `<li class="page-item ${i === pagination.current ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>`;
    }
    
    // Next button
    html += `<li class="page-item ${pagination.current === pagination.total ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${pagination.current + 1}">Next</a>
    </li>`;
    
    paginationList.innerHTML = html;
    
    // Add event listeners to pagination links
    paginationList.querySelectorAll('a.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (!this.parentElement.classList.contains('disabled')) {
                const page = parseInt(this.getAttribute('data-page'));
                console.log('Pagination clicked, loading page:', page);
                loadContactsPage(page);
            }
        });
    });
}

function loadContactsPage(page) {
    if (currentSegment) {
        // TODO: Load segment page
        loadContactsBySegment();
    } else {
        loadContacts(page);
    }
}

// Sync Functions
async function testHubSpotConnection() {
    try {
        console.log('testHubSpotConnection called');
        showStatus('hubspotStatus', 'Testing connection...', 'info');
        
        const response = await fetch(`${API_BASE}/sync/test/hubspot`, {
            method: 'POST'
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success && data.data.connected) {
            showStatus('hubspotStatus', 'Connection successful!', 'success');
        } else {
            showStatus('hubspotStatus', 'Connection failed. Check your access token.', 'danger');
        }
    } catch (error) {
        console.error('Error testing HubSpot connection:', error);
        showStatus('hubspotStatus', 'Connection test failed', 'danger');
    }
}

async function startHubSpotSync(type) {
    try {
        showStatus('hubspotStatus', `Starting ${type}...`, 'info');
        
        const response = await fetch(`${API_BASE}/sync/hubspot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus('hubspotStatus', `Sync started. Job ID: ${data.data.jobId}`, 'success');
            monitorSyncJob(data.data.jobId, 'hubspotStatus');
        } else {
            showStatus('hubspotStatus', `Sync failed: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error starting HubSpot sync:', error);
        showStatus('hubspotStatus', 'Failed to start sync', 'danger');
    }
}

async function testGoogleSheetsConnection() {
    const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
    
    console.log('testGoogleSheetsConnection called with spreadsheetId:', spreadsheetId);
    
    if (!spreadsheetId) {
        showStatus('googlesheetsStatus', 'Please enter a spreadsheet ID or URL', 'warning');
        return;
    }
    
    try {
        showStatus('googlesheetsStatus', 'Testing connection...', 'info');
        
        const response = await fetch(`${API_BASE}/sync/test/google-sheets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ spreadsheetId })
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success && data.data.connected) {
            showStatus('googlesheetsStatus', 'Connection successful!', 'success');
        } else {
            showStatus('googlesheetsStatus', 'Connection failed. Check your spreadsheet ID and permissions.', 'danger');
        }
    } catch (error) {
        console.error('Error testing Google Sheets connection:', error);
        showStatus('googlesheetsStatus', 'Connection test failed', 'danger');
    }
}

async function startGoogleSheetsSync() {
    const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
    const sheetName = document.getElementById('sheetName').value.trim();
    
    console.log('startGoogleSheetsSync called');
    console.log('spreadsheetId:', spreadsheetId);
    console.log('sheetName:', sheetName);
    
    if (!spreadsheetId) {
        showStatus('googlesheetsStatus', 'Please enter a spreadsheet ID or URL', 'warning');
        return;
    }
    
    try {
        showStatus('googlesheetsStatus', 'Starting sync...', 'info');
        
        const payload = { spreadsheetId, sheetName };
        console.log('Sending payload:', payload);
        console.log('spreadsheetId value:', JSON.stringify(spreadsheetId));
        console.log('sheetName value:', JSON.stringify(sheetName));
        
        const response = await fetch(`${API_BASE}/sync/google-sheets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            showStatus('googlesheetsStatus', `Sync started. Job ID: ${data.data.jobId}`, 'success');
            monitorSyncJob(data.data.jobId, 'googlesheetsStatus');
        } else {
            showStatus('googlesheetsStatus', `Sync failed: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error starting Google Sheets sync:', error);
        showStatus('googlesheetsStatus', 'Failed to start sync', 'danger');
    }
}

async function loadSyncJobs() {
    try {
        const response = await fetch(`${API_BASE}/sync/jobs`);
        const data = await response.json();
        
        if (data.success) {
            displaySyncJobs(data.data.jobs);
        }
    } catch (error) {
        console.error('Error loading sync jobs:', error);
    }
}

function displaySyncJobs(jobs) {
    const jobsList = document.getElementById('syncJobsList');
    
    if (!jobs || jobs.length === 0) {
        jobsList.innerHTML = '<p class="text-muted">No sync jobs found.</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table table-striped"><thead><tr><th>Source</th><th>Type</th><th>Status</th><th>Progress</th><th>Started</th><th>Records</th></tr></thead><tbody>';
    
    jobs.forEach(job => {
        const statusClass = job.status === 'completed' ? 'success' : 
                           job.status === 'failed' ? 'danger' : 
                           job.status === 'running' ? 'warning' : 'secondary';
        
        html += `
            <tr>
                <td>${formatSourceName(job.source)}</td>
                <td>${job.type.replace('_', ' ')}</td>
                <td><span class="badge bg-${statusClass}">${job.status}</span></td>
                <td>
                    ${job.status === 'running' ? 
                        `<div class="progress"><div class="progress-bar" style="width: ${job.progress || 0}%">${job.progress || 0}%</div></div>` :
                        '-'
                    }
                </td>
                <td>${formatDate(job.startedAt)}</td>
                <td>${job.processedRecords || 0}/${job.totalRecords || 0}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    jobsList.innerHTML = html;
}

// Upload Functions
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        showStatus('uploadStatus', 'Analyzing file structure...', 'info');
        
        // First, get a preview of the file to show column mapping
        const response = await fetch(`${API_BASE}/csv/preview`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showColumnMapping(data.data);
        } else {
            showStatus('uploadStatus', `File analysis failed: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error analyzing file:', error);
        showStatus('uploadStatus', 'File analysis failed', 'danger');
    }
}

function showColumnMapping(fileData) {
    // Hide upload step, show mapping step
    document.getElementById('uploadStep').style.display = 'none';
    document.getElementById('mappingStep').style.display = 'block';
    
    showStatus('uploadStatus', `File analyzed: ${fileData.totalRows} rows found. Please map your columns below.`, 'success');
    
    // Create mapping table
    createMappingTable(fileData);
}

async function createMappingTable(fileData) {
    try {
        // Get available field options
        const response = await fetch(`${API_BASE}/csv/field-options`);
        const fieldOptionsData = await response.json();
        
        const fieldOptions = fieldOptionsData.data;
        const mappingTable = document.getElementById('columnMappingTable');
        
        let html = `
            <div class="alert alert-info">
                <strong>File:</strong> ${fileData.filename}<br>
                <strong>Total Rows:</strong> ${fileData.totalRows}<br>
                <strong>Columns Found:</strong> ${fileData.headers.length}
            </div>
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Your Column</th>
                            <th>Sample Data</th>
                            <th>Map To Field</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        fileData.headers.forEach((header, index) => {
            const sampleData = fileData.sampleData.map(row => row[index] || '').filter(Boolean).slice(0, 3);
            
            html += `
                <tr>
                    <td><strong>${header}</strong></td>
                    <td><small class="text-muted">${sampleData.join(', ') || 'No sample data'}</small></td>
                    <td>
                        <select class="form-select" data-column="${header}">
                            ${fieldOptions.map(option => 
                                `<option value="${option.value}" ${autoMapColumn(header, option.value) ? 'selected' : ''}>${option.label}</option>`
                            ).join('')}
                        </select>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        mappingTable.innerHTML = html;
        
        // Store file data for later processing
        window.uploadFileData = fileData;
        
    } catch (error) {
        console.error('Error creating mapping table:', error);
        showStatus('uploadStatus', 'Error creating column mapping interface', 'danger');
    }
}

function autoMapColumn(columnHeader, fieldValue) {
    const header = columnHeader.toLowerCase().trim();
    
    const autoMappings = {
        // Basic contact info
        'first name': 'firstName',
        'firstname': 'firstName',
        'fname': 'firstName',
        'first_name': 'firstName',
        'last name': 'lastName', 
        'lastname': 'lastName',
        'lname': 'lastName',
        'last_name': 'lastName',
        'email': 'email',
        'email address': 'email',
        'email_address': 'email',
        'phone': 'phone',
        'phone number': 'phone',
        'phone_number': 'phone',
        'mobile': 'phone',
        'company': 'company',
        'organization': 'company',
        'job title': 'jobTitle',
        'jobtitle': 'jobTitle',
        'title': 'jobTitle',
        'position': 'jobTitle',
        
        // Address fields
        'street': 'address.street',
        'address': 'address.street',
        'street address': 'address.street',
        'city': 'address.city',
        'state': 'address.state',
        'state/region': 'address.state',
        'province': 'address.state',
        'zip': 'address.zipCode',
        'zipcode': 'address.zipCode',
        'postal code': 'address.zipCode',
        'country': 'address.country',
        
        // Business/Custom fields from your data
        'sic code': 'custom.sicCode',
        'naics code': 'custom.naicsCode',
        'website url': 'custom.websiteUrl',
        'website': 'custom.websiteUrl',
        'business category / industry of interest': 'custom.businessCategory',
        'industry': 'custom.businessCategory',
        'number of employees': 'custom.numberOfEmployees',
        'employees': 'custom.numberOfEmployees',
        'linkedin profile': 'custom.linkedinProfile',
        'linkedin': 'custom.linkedinProfile',
        'office phone': 'custom.officePhone',
        'phone 2': 'custom.phone2',
        'phone 3': 'custom.phone3',
        'lead source': 'custom.leadSource',
        'source': 'custom.leadSource',
        'contact type': 'custom.contactType',
        'type': 'custom.contactType',
        'priority': 'custom.priority',
        'notes': 'custom.notes',
        'create date': 'custom.createDate',
        'year established': 'custom.yearEstablished',
        'founded': 'custom.yearEstablished'
    };
    
    return autoMappings[header] === fieldValue;
}

async function processWithMapping() {
    try {
        // Collect mapping from the form
        const mapping = {};
        const selects = document.querySelectorAll('#columnMappingTable select');
        
        selects.forEach(select => {
            const column = select.getAttribute('data-column');
            const field = select.value;
            if (field) {
                mapping[column] = field;
            }
        });
        
        console.log('Column mapping:', mapping);
        
        if (Object.keys(mapping).length === 0) {
            showStatus('uploadStatus', 'Please map at least one column to a contact field.', 'warning');
            return;
        }
        
        showStatus('uploadStatus', 'Processing file with custom mapping...', 'info');
        
        // Re-upload the file for processing since we can't use the temp file
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            showStatus('uploadStatus', 'File not found. Please upload again.', 'danger');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        // Use the regular upload endpoint - it should work better now with auto-mapping
        const response = await fetch(`${API_BASE}/contacts/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Upload response:', data);
        
        if (data.success) {
            console.log('Upload successful, stats:', data.data.stats);
            showStatus('uploadStatus', `Upload completed! ${data.data.stats.successful} contacts processed from ${window.uploadFileData.totalRows} total rows.`, 'success');
            displayUploadResults(data.data);
            
            // Hide mapping step, show results
            document.getElementById('mappingStep').style.display = 'none';
            
            // Refresh dashboard to show new contact count
            if (window.location.hash === '#dashboard' || !window.location.hash) {
                loadDashboardData();
            }
        } else {
            console.error('Upload failed:', data.error);
            showStatus('uploadStatus', `Upload failed: ${data.error}`, 'danger');
        }
        
    } catch (error) {
        console.error('Error processing with mapping:', error);
        showStatus('uploadStatus', 'Failed to process with mapping', 'danger');
    }
}

function displayUploadResults(results) {
    const resultsDiv = document.getElementById('uploadResults');
    
    let html = `
        <div class="alert alert-info">
            <h6>Upload Summary</h6>
            <ul class="mb-0">
                <li>Total processed: ${results.stats.totalProcessed}</li>
                <li>Successful: ${results.stats.successful}</li>
                <li>Errors: ${results.stats.errors}</li>
            </ul>
        </div>
    `;
    
    if (results.parseErrors.length > 0) {
        html += `
            <div class="alert alert-warning">
                <h6>Parse Errors</h6>
                <ul class="mb-0">
                    ${results.parseErrors.slice(0, 5).map(error => `<li>Row ${error.row}: ${error.error}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    resultsDiv.innerHTML = html;
}

// Segments Functions
async function loadSegments() {
    try {
        const response = await fetch(`${API_BASE}/segments`);
        const data = await response.json();
        
        if (data.success) {
            displaySegments(data.data);
        }
    } catch (error) {
        console.error('Error loading segments:', error);
    }
}

function displaySegments(segments) {
    const segmentsList = document.getElementById('segmentsList');
    
    if (!segments || segments.length === 0) {
        segmentsList.innerHTML = '<p class="text-muted">No segments found.</p>';
        return;
    }
    
    let html = '';
    segments.forEach(segment => {
        html += `
            <div class="segment-item" data-segment-id="${segment._id}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">
                            <i class="${segment.icon}" style="color: ${segment.color}"></i>
                            ${segment.name}
                        </h6>
                        <p class="mb-1 text-muted">${segment.description}</p>
                        <small class="text-muted">${segment.contactCount} contacts</small>
                    </div>
                    <div class="segment-actions">
                        <button class="btn btn-sm btn-outline-primary me-1" data-action="view" data-segment-id="${segment._id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-outline-success me-1" data-action="export" data-segment-id="${segment._id}">
                            <i class="fas fa-download"></i> Export
                        </button>
                        ${!segment.isSystem ? `
                            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-segment-id="${segment._id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    segmentsList.innerHTML = html;
    
    // Add event listeners to segment action buttons
    segmentsList.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const segmentId = this.getAttribute('data-segment-id');
            
            switch(action) {
                case 'view':
                    viewSegmentContacts(segmentId);
                    break;
                case 'export':
                    exportSegment(segmentId);
                    break;
                case 'delete':
                    if (confirm('Are you sure you want to delete this segment?')) {
                        deleteSegment(segmentId);
                    }
                    break;
            }
        });
    });
}

function viewSegmentContacts(segmentId) {
    // Load segment details and show dedicated segment page
    loadSegmentDetails(segmentId);
}

function setupContactEventListeners() {
    const contactsList = document.getElementById('contactsList');
    
    // Checkbox change events
    contactsList.querySelectorAll('.contact-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function(e) {
            e.stopPropagation();
            const contactId = this.getAttribute('data-contact-id');
            
            if (this.checked) {
                selectedContacts.add(contactId);
            } else {
                selectedContacts.delete(contactId);
            }
            
            updateSelectionUI();
        });
    });
    
    // Contact detail view events
    contactsList.querySelectorAll('[data-action="view-details"]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const contactId = this.getAttribute('data-contact-id');
            showContactDetails(contactId);
        });
    });
    
    // Card click events (for grid view)
    contactsList.querySelectorAll('.contact-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking checkbox
            if (e.target.type === 'checkbox') return;
            
            const contactId = this.getAttribute('data-contact-id');
            showContactDetails(contactId);
        });
    });
    
    // Select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            if (this.checked) {
                selectAllContacts();
            } else {
                clearSelection();
            }
        });
    }
}

function updateSelectionUI() {
    const selectedCount = selectedContacts.size;
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const selectedCountSpan = document.getElementById('selectedCount');
    
    if (selectedCount > 0) {
        bulkActionsBar.style.display = 'block';
        selectedCountSpan.textContent = selectedCount;
    } else {
        bulkActionsBar.style.display = 'none';
    }
}

function selectAllContacts() {
    const checkboxes = document.querySelectorAll('.contact-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedContacts.add(checkbox.getAttribute('data-contact-id'));
    });
    updateSelectionUI();
}

function clearSelection() {
    selectedContacts.clear();
    const checkboxes = document.querySelectorAll('.contact-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
    
    updateSelectionUI();
}

function createSegmentFromSelected() {
    if (selectedContacts.size === 0) {
        alert('Please select contacts first');
        return;
    }
    
    const segmentName = prompt(`Create segment from ${selectedContacts.size} selected contacts.\n\nEnter segment name:`);
    if (!segmentName) return;
    
    const selectedIds = Array.from(selectedContacts);
    
    // Create segment from selected contact IDs
    fetch(`${API_BASE}/segments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: segmentName,
            description: `Custom segment with ${selectedIds.length} selected contacts`,
            filters: {
                '_id': { '$in': selectedIds }
            },
            color: '#6c757d',
            icon: 'fas fa-users'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Segment "${segmentName}" created with ${selectedIds.length} contacts!`);
            clearSelection();
            loadSegments(); // Refresh segments list
        } else {
            alert(`Failed to create segment: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error creating segment:', error);
        alert('Failed to create segment');
    });
}

async function loadSegmentDetails(segmentId) {
    try {
        const response = await fetch(`${API_BASE}/segments/${segmentId}`);
        const data = await response.json();
        
        if (data.success) {
            currentSegmentDetails = data.data;
            showSegmentDetails(data.data);
        }
    } catch (error) {
        console.error('Error loading segment details:', error);
    }
}

function showSegmentDetails(segment) {
    // Update UI elements
    document.getElementById('segmentDetailsTitle').textContent = segment.name;
    document.getElementById('segmentDetailsDescription').textContent = segment.description;
    document.getElementById('segmentContactCount').textContent = segment.contactCount;
    
    // Show segment details section
    showSection('segment-details');
    
    // Load segment contacts
    loadSegmentContacts(segment._id);
}

async function loadSegmentContacts(segmentId, page = 1) {
    try {
        const response = await fetch(`${API_BASE}/segments/${segmentId}/contacts?page=${page}&limit=100`);
        const data = await response.json();
        
        if (data.success) {
            displaySegmentContacts(data.data);
            updateSegmentPagination(data.pagination, segmentId);
        }
    } catch (error) {
        console.error('Error loading segment contacts:', error);
    }
}

function displaySegmentContacts(contacts) {
    const segmentContactsList = document.getElementById('segmentContactsList');
    
    if (!contacts || contacts.length === 0) {
        segmentContactsList.innerHTML = '<p class="text-muted">No contacts in this segment.</p>';
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Company</th>
                        <th>Source</th>
                        <th>DNC Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    contacts.forEach(contact => {
        html += `
            <tr>
                <td><strong>${contact.firstName} ${contact.lastName}</strong></td>
                <td>${contact.email || '<span class="text-muted">No email</span>'}</td>
                <td>${contact.phone || '<span class="text-muted">No phone</span>'}</td>
                <td>${contact.company || '<span class="text-muted">No company</span>'}</td>
                <td><span class="badge bg-info">${formatSourceName(contact.source)}</span></td>
                <td>
                    ${contact.dncStatus === 'dnc_internal' ? 
                        '<span class="badge bg-danger">DNC</span>' : 
                        '<span class="badge bg-success">Callable</span>'
                    }
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" data-action="view-details" data-contact-id="${contact._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    segmentContactsList.innerHTML = html;
    
    // Add event listeners
    segmentContactsList.querySelectorAll('[data-action="view-details"]').forEach(button => {
        button.addEventListener('click', function() {
            const contactId = this.getAttribute('data-contact-id');
            showContactDetails(contactId);
        });
    });
}

function updateSegmentPagination(pagination, segmentId) {
    const paginationNav = document.getElementById('segmentPagination');
    const paginationList = paginationNav.querySelector('.pagination');
    
    if (pagination.total <= 1) {
        paginationNav.style.display = 'none';
        return;
    }
    
    paginationNav.style.display = 'block';
    let html = '';
    
    // Previous button
    html += `<li class="page-item ${pagination.current === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${pagination.current - 1}" data-segment-id="${segmentId}">Previous</a>
    </li>`;
    
    // Page numbers
    for (let i = Math.max(1, pagination.current - 2); i <= Math.min(pagination.total, pagination.current + 2); i++) {
        html += `<li class="page-item ${i === pagination.current ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}" data-segment-id="${segmentId}">${i}</a>
        </li>`;
    }
    
    // Next button
    html += `<li class="page-item ${pagination.current === pagination.total ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${pagination.current + 1}" data-segment-id="${segmentId}">Next</a>
    </li>`;
    
    paginationList.innerHTML = html;
    
    // Add event listeners to pagination links
    paginationList.querySelectorAll('a.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (!this.parentElement.classList.contains('disabled')) {
                const page = parseInt(this.getAttribute('data-page'));
                const segmentId = this.getAttribute('data-segment-id');
                loadSegmentContacts(segmentId, page);
            }
        });
    });
}

function exportSegment(segmentId) {
    window.open(`${API_BASE}/segments/${segmentId}/export?format=csv`, '_blank');
}

function showCreateSegmentModal() {
    const modal = document.getElementById('createSegmentModal');
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
}

async function loadHubSpotLists() {
    try {
        showStatus('hubspotListsList', 'Loading HubSpot lists...', 'info');
        
        const response = await fetch(`${API_BASE}/segments/hubspot-lists`);
        const data = await response.json();
        
        if (data.success) {
            displayHubSpotLists(data.data);
        } else {
            showStatus('hubspotListsList', `Failed to load lists: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error loading HubSpot lists:', error);
        showStatus('hubspotListsList', 'Failed to load HubSpot lists', 'danger');
    }
}

function displayHubSpotLists(lists) {
    const listsDiv = document.getElementById('hubspotListsList');
    
    if (!lists || lists.length === 0) {
        listsDiv.innerHTML = '<p class="text-muted">No lists found.</p>';
        return;
    }
    
    let html = '<div class="list-group">';
    lists.forEach(list => {
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${list.name}</strong>
                    <br><small class="text-muted">${list.processingType || 'Static'} list</small>
                </div>
                <button class="btn btn-sm btn-primary" data-action="sync" data-list-id="${list.listId}" data-list-name="${list.name}">
                    <i class="fas fa-sync"></i> Sync
                </button>
            </div>
        `;
    });
    html += '</div>';
    
    listsDiv.innerHTML = html;
    
    // Add event listeners to sync buttons
    listsDiv.querySelectorAll('[data-action="sync"]').forEach(button => {
        button.addEventListener('click', function() {
            const listId = this.getAttribute('data-list-id');
            const listName = this.getAttribute('data-list-name');
            syncHubSpotList(listId, listName);
        });
    });
}

async function syncHubSpotList(listId, listName) {
    try {
        console.log(`Syncing HubSpot list: ${listName} (${listId})`);
        
        const response = await fetch(`${API_BASE}/segments/sync-hubspot-list`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ listId, listName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus('hubspotListsList', `List "${listName}" synced successfully!`, 'success');
            loadSegments(); // Refresh segments list
        } else {
            showStatus('hubspotListsList', `Sync failed: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error syncing HubSpot list:', error);
        showStatus('hubspotListsList', 'Sync failed', 'danger');
    }
}

// Utility Functions
function showStatus(elementId, message, type) {
    console.log(`showStatus: ${elementId}, ${message}, ${type}`);
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id '${elementId}' not found`);
        return;
    }
    element.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function showLoading(show) {
    const modal = document.getElementById('loadingModal');
    if (show) {
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    } else {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    }
}

async function showContactDetails(contactId) {
    try {
        console.log('Loading contact details for ID:', contactId);
        
        // Show modal with loading state
        const modal = document.getElementById('contactModal');
        const modalTitle = document.getElementById('contactModalTitle');
        const modalBody = document.getElementById('contactModalBody');
        
        modalTitle.textContent = 'Loading...';
        modalBody.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading contact details...</span>
                </div>
            </div>
        `;
        
        // Show modal
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Fetch contact details
        const response = await fetch(`${API_BASE}/contacts/${contactId}`);
        const data = await response.json();
        
        if (data.success) {
            displayContactDetails(data.data);
        } else {
            modalBody.innerHTML = '<div class="alert alert-danger">Failed to load contact details.</div>';
        }
    } catch (error) {
        console.error('Error loading contact details:', error);
        const modalBody = document.getElementById('contactModalBody');
        modalBody.innerHTML = '<div class="alert alert-danger">Error loading contact details.</div>';
    }
}

function displayContactDetails(contact) {
    const modalTitle = document.getElementById('contactModalTitle');
    const modalBody = document.getElementById('contactModalBody');
    
    modalTitle.textContent = `${contact.firstName} ${contact.lastName}`;
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6><i class="fas fa-user"></i> Personal Information</h6>
                <table class="table table-sm">
                    <tr><td><strong>First Name:</strong></td><td>${contact.firstName || 'N/A'}</td></tr>
                    <tr><td><strong>Last Name:</strong></td><td>${contact.lastName || 'N/A'}</td></tr>
                    <tr><td><strong>Email:</strong></td><td>${contact.email || 'N/A'}</td></tr>
                    <tr><td><strong>Phone:</strong></td><td>${contact.phone || 'N/A'}</td></tr>
                    <tr><td><strong>Company:</strong></td><td>${contact.company || 'N/A'}</td></tr>
                    <tr><td><strong>Job Title:</strong></td><td>${contact.jobTitle || 'N/A'}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-map-marker-alt"></i> Address</h6>
                <table class="table table-sm">
                    <tr><td><strong>Street:</strong></td><td>${contact.address?.street || 'N/A'}</td></tr>
                    <tr><td><strong>City:</strong></td><td>${contact.address?.city || 'N/A'}</td></tr>
                    <tr><td><strong>State:</strong></td><td>${contact.address?.state || 'N/A'}</td></tr>
                    <tr><td><strong>Zip Code:</strong></td><td>${contact.address?.zipCode || 'N/A'}</td></tr>
                    <tr><td><strong>Country:</strong></td><td>${contact.address?.country || 'N/A'}</td></tr>
                </table>
            </div>
        </div>
        
        <div class="row mt-3">
            <div class="col-md-6">
                <h6><i class="fas fa-info-circle"></i> CRM Information</h6>
                <table class="table table-sm">
                    <tr><td><strong>Source:</strong></td><td><span class="badge bg-info">${formatSourceName(contact.source)}</span></td></tr>
                    <tr><td><strong>Lifecycle Stage:</strong></td><td><span class="badge bg-${getLifecycleColor(contact.lifecycleStage)}">${contact.lifecycleStage}</span></td></tr>
                    <tr><td><strong>Status:</strong></td><td><span class="badge bg-${contact.status === 'active' ? 'success' : 'secondary'}">${contact.status}</span></td></tr>
                    <tr><td><strong>Created:</strong></td><td>${formatDate(contact.createdAt)}</td></tr>
                    <tr><td><strong>Last Synced:</strong></td><td>${formatDate(contact.lastSyncedAt)}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-tags"></i> Tags & Custom Fields</h6>
                <div class="mb-2">
                    <strong>Tags:</strong>
                    <div class="mt-1">
                        ${contact.tags && contact.tags.length > 0 ? 
                            contact.tags.map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`).join('') : 
                            '<span class="text-muted">No tags</span>'
                        }
                    </div>
                </div>
                ${contact.customFields && Object.keys(contact.customFields).length > 0 ? `
                    <div class="mt-3">
                        <strong>Custom Fields:</strong>
                        <div class="mt-2">
                            ${Object.entries(contact.customFields).map(([key, value]) => 
                                `<div><small><strong>${key}:</strong> ${value}</small></div>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
        
        ${contact.syncErrors && contact.syncErrors.length > 0 ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6><i class="fas fa-exclamation-triangle text-warning"></i> Sync Errors</h6>
                    <div class="alert alert-warning">
                        ${contact.syncErrors.slice(0, 3).map(error => 
                            `<div><small>${error.error} - ${formatDate(error.timestamp)}</small></div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        ` : ''}
    `;
}

function showError(message) {
    // You could implement a toast notification here
    console.error(message);
}

async function monitorSyncJob(jobId, statusElementId) {
    console.log('monitorSyncJob started for jobId:', jobId);
    const checkStatus = async () => {
        try {
            const url = `${API_BASE}/sync/jobs/${jobId}`;
            console.log('Checking status at URL:', url);
            const response = await fetch(url);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                console.error('HTTP error:', response.status, response.statusText);
                return;
            }
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.success) {
                const job = data.data;
                const progress = job.progress || 0;
                
                if (job.status === 'running') {
                    showStatus(statusElementId, `Sync in progress: ${progress}% (${job.processedRecords}/${job.totalRecords})`, 'info');
                    setTimeout(checkStatus, 2000);
                } else if (job.status === 'completed') {
                    showStatus(statusElementId, `Sync completed! Processed ${job.processedRecords} records.`, 'success');
                    loadDashboardData(); // Refresh dashboard
                } else if (job.status === 'failed') {
                    showStatus(statusElementId, 'Sync failed. Check the sync jobs list for details.', 'danger');
                }
            }
        } catch (error) {
            console.error('Error checking sync status:', error);
        }
    };
    
    setTimeout(checkStatus, 2000);
}

function formatSourceName(source) {
    const names = {
        'hubspot': 'HubSpot',
        'google_sheets': 'Google Sheets',
        'csv_upload': 'CSV Upload',
        'excel_upload': 'Excel Upload',
        'manual': 'Manual Entry'
    };
    return names[source] || source;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
}

function getLifecycleColor(stage) {
    const colors = {
        'lead': 'primary',
        'prospect': 'warning',
        'customer': 'success',
        'evangelist': 'info'
    };
    return colors[stage] || 'secondary';
}