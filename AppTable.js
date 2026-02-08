// AppTable.js - Application Tables Management
// Handles loading, displaying, and managing application tables for all statuses

console.log('AppTable.js loaded');

// ----------- CACHED ELEMENTS & STATE -----------
const appTableStates = {};
let appTableRefreshInterval;
let lastAppTableCount = 0;

// Per-section state to avoid flicker and handle concurrent requests
const appTableSectionStates = {}; // { [sectionId]: { requestId: number, loading: boolean } }

// ----------- INITIALIZATION -----------
function initAppTable() {
  console.log('Initializing AppTable module...');

  // Cache date display
  const dateDisplay = document.getElementById('current-date');
  if (dateDisplay) {
    dateDisplay.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // Initialize notifications
  initializeBrowserNotifications();
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Setup event listeners
  const addAppBtn = document.querySelector('.add-app-btn');
  if (addAppBtn) {
    addAppBtn.removeAttribute('onclick');
    addAppBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      const ok = await loadModalContent('new');
      if (!ok) {
        if (typeof window.showToast === 'function') {
          window.showToast('Failed to load application form. Please refresh the page.', 'error');
        } else {
          alert('Failed to load application form. Please refresh the page.');
        }
        return;
      }
      if (typeof showNewApplicationModal === 'function') {
        showNewApplicationModal();
      }
    });
  }

  console.log('AppTable module initialized');
}

// ----------- HELPER FUNCTIONS -----------

/**
 * Debounce function to prevent rapid repeated calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(s) {
  if (!s) return '';
  return s.toString().replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

/**
 * Get user name from role (lookup in users sheet or use role directly)
 */
async function getUserNameByRole(role) {
  if (!role) return 'N/A';
  
  // Try to fetch from server if available
  try {
    const allUsersResp = await window.apiService.getAllUsers();
    if (allUsersResp && allUsersResp.success && allUsersResp.data) {
      const user = allUsersResp.data.find(u => u.role === role);
      if (user) return user.name;
    }
  } catch (e) {
    console.warn('Could not fetch users:', e);
  }
  
  // Fallback: return role as-is
  return role;
}

/**
 * Get next action role based on current stage
 */
function getNextActionRole(currentStage) {
  const stageRoleMap = {
    'New': 'Credit Officer',
    'Assessment': 'AMLRO',
    'Compliance': 'Head of Credit',
    'Ist Review': 'Branch Manager/Approver',
    '2nd Review': 'Approver',
    'Approval': 'APPROVED'
  };
  
  return stageRoleMap[currentStage] || 'N/A';
}

// ----------- TABLE STATE MANAGEMENT -----------

/**
 * Ensure section state exists
 */
function ensureSectionState(sectionId) {
  if (!appTableSectionStates[sectionId]) {
    appTableSectionStates[sectionId] = { requestId: 0, loading: false };
  }
  return appTableSectionStates[sectionId];
}

/**
 * Set section header loading indicator
 */
function setSectionHeaderLoading(sectionId, isLoading) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const actions = section.querySelector('.section-actions');
  if (!actions) return;
  let spinner = actions.querySelector('.section-spinner');
  if (isLoading) {
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.className = 'section-spinner';
      spinner.innerHTML = `<div class="spinner-inline" aria-hidden="true"></div><span class="section-spinner-text">Updating...</span>`;
      actions.appendChild(spinner);
    } else {
      spinner.style.display = 'inline-flex';
    }
  } else {
    if (spinner) spinner.style.display = 'none';
  }
}

// ----------- TABLE ROW CREATION -----------

/**
 * Create a table row for an application with next action by column
 */
function createRowForApplication(app) {
  const tr = document.createElement('tr');

  // Application Number (clickable)
  const tdApp = document.createElement('td');
  tdApp.className = 'app-number';
  const a = document.createElement('a');
  a.href = 'javascript:void(0)';
  a.className = 'app-number-link';
  a.textContent = app.appNumber || '';
  a.addEventListener('click', (e) => {
    handleAppNumberClick(app.appNumber, e.currentTarget);
  });
  tdApp.appendChild(a);
  tr.appendChild(tdApp);

  // Applicant Name
  const tdName = document.createElement('td');
  tdName.className = 'applicant-name';
  tdName.textContent = app.applicantName || 'N/A';
  tr.appendChild(tdName);

  // Amount
  const tdAmount = document.createElement('td');
  tdAmount.className = 'amount';
  tdAmount.textContent = app.amount == null ? '0.00' : Number(app.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  tr.appendChild(tdAmount);

  // Date
  const tdDate = document.createElement('td');
  tdDate.className = 'date';
  tdDate.textContent = app.date ? new Date(app.date).toLocaleDateString() : 'N/A';
  tr.appendChild(tdDate);

  // Action By (current stage role)
  const tdActionBy = document.createElement('td');
  tdActionBy.className = 'action-by';
  tdActionBy.textContent = app.actionBy || 'N/A';
  tr.appendChild(tdActionBy);

  // ===== NEW: Next Action By (next stage role) =====
  const tdNextActionBy = document.createElement('td');
  tdNextActionBy.className = 'next-action-by';
  const nextRole = getNextActionRole(app.stage || 'New');
  tdNextActionBy.textContent = nextRole;
  tdNextActionBy.setAttribute('data-role', nextRole);
  tr.appendChild(tdNextActionBy);

  return tr;
}

// ----------- TABLE DIFF UPDATE -----------

/**
 * Smart update that only changes rows that differ (reduces flicker)
 */
function diffUpdateTable(tableId, applications) {
  const tbody = document.querySelector(`#${tableId}`);
  if (!tbody) return;

  const existingRows = new Map();
  Array.from(tbody.children).forEach(row => {
    const anchor = row.querySelector('.app-number-link');
    const key = anchor ? anchor.textContent : null;
    if (key) existingRows.set(key, row);
  });

  const frag = document.createDocumentFragment();

  applications.forEach(app => {
    const key = app.appNumber || '';
    const existing = existingRows.get(key);
    if (existing) {
      const nameCell = existing.querySelector('.applicant-name');
      const amountCell = existing.querySelector('.amount');
      const dateCell = existing.querySelector('.date');
      const actionByCell = existing.querySelector('.action-by');
      const nextActionByCell = existing.querySelector('.next-action-by');

      let changed = false;

      // Check Name
      if ((nameCell && nameCell.textContent) !== (app.applicantName || 'N/A')) {
        if (nameCell) nameCell.textContent = app.applicantName || 'N/A';
        changed = true;
      }

      // Check Amount
      const formattedAmount = app.amount == null ? '0.00' : Number(app.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if ((amountCell && amountCell.textContent) !== formattedAmount) {
        if (amountCell) amountCell.textContent = formattedAmount;
        changed = true;
      }

      // Check Date
      const formattedDate = app.date ? new Date(app.date).toLocaleDateString() : 'N/A';
      if ((dateCell && dateCell.textContent) !== formattedDate) {
        if (dateCell) dateCell.textContent = formattedDate;
        changed = true;
      }

      // Check Action By
      if ((actionByCell && actionByCell.textContent) !== (app.actionBy || 'N/A')) {
        if (actionByCell) actionByCell.textContent = app.actionBy || 'N/A';
        changed = true;
      }

      // Check Next Action By
      const nextRole = getNextActionRole(app.stage || 'New');
      if ((nextActionByCell && nextActionByCell.textContent) !== nextRole) {
        if (nextActionByCell) {
          nextActionByCell.textContent = nextRole;
          nextActionByCell.setAttribute('data-role', nextRole);
        }
        changed = true;
      }

      frag.appendChild(existing);

      if (changed) {
        existing.classList.remove('row-updated');
        void existing.offsetWidth;
        existing.classList.add('row-updated');
        setTimeout(() => existing.classList.remove('row-updated'), 1400);
      }
    } else {
      const newRow = createRowForApplication(app);
      newRow.classList.add('row-updated');
      frag.appendChild(newRow);
      setTimeout(() => newRow.classList.remove('row-updated'), 1400);
    }
  });

  tbody.replaceChildren(frag);
}

// ----------- APPLICATION LOADING -----------

/**
 * Load applications for a specific status/section
 */
async function loadApplications(sectionId, options = {}) {
  const map = {
    'new': 'NEW',
    'pending': 'PENDING',
    'pending-approvals': 'PENDING_APPROVAL',
    'approved': 'APPROVED'
  };
  const status = map[sectionId];
  if (!status) return;

  ensureSectionState(sectionId);
  const state = appTableSectionStates[sectionId];
  state.requestId++;
  const requestId = state.requestId;

  const tbody = document.getElementById(`${sectionId}-list`);
  if (!tbody) return;

  const isAuto = options.isAutoRefresh || false;
  if (options.showLoading !== false && !isAuto) {
    setSectionHeaderLoading(sectionId, true);
    tbody.innerHTML = `<tr><td colspan="6" class="loading">Loading applications...</td></tr>`;
  } else {
    if (isAuto) {
      tbody.setAttribute('aria-busy', 'true');
    } else {
      tbody.setAttribute('aria-busy', 'true');
      tbody.style.opacity = '0.7';
    }
  }

  try {
    const response = await window.apiService.getApplications(status, { showLoading: false });
    if (state.requestId !== requestId) return;

    tbody.removeAttribute('aria-busy');
    tbody.style.opacity = '1';
    setSectionHeaderLoading(sectionId, false);

    if (response.success) {
      diffUpdateTable(`${sectionId}-list`, response.data || []);
    } else {
      if (!isAuto) {
        tbody.innerHTML = `<tr><td colspan="6" class="error">Error: ${escapeHtml(response.message)}</td></tr>`;
      } else {
        console.warn('Auto-refresh error for', sectionId, response.message);
      }
    }
  } catch (err) {
    if (state.requestId !== requestId) return;

    if (!isAuto) {
      tbody.removeAttribute('aria-busy');
      tbody.style.opacity = '1';
      tbody.innerHTML = `<tr><td colspan="6" class="error">Error: ${escapeHtml(err.message)}</td></tr>`;
      setSectionHeaderLoading(sectionId, false);
    } else {
      console.error('Auto-refresh network error for', sectionId, err);
    }
  }
}

/**
 * Backwards compatible wrapper
 */
function populateTable(tableId, applications) {
  diffUpdateTable(tableId, applications || []);
}

// ----------- APPLICATION CLICK HANDLER -----------

/**
 * Handle application number click - load details and show modal
 */
async function handleAppNumberClick(appNumber, anchorEl = null) {
  if (!appNumber) {
    if (typeof window.showToast === 'function') {
      window.showToast('Invalid application number', 'error');
    } else {
      alert('Invalid application number');
    }
    return;
  }
  const userName = localStorage.getItem('loggedInName') || '';

  // Add inline spinner next to clicked anchor
  let spinner = null;
  try {
    if (!anchorEl) {
      const anchors = Array.from(document.querySelectorAll('.app-number-link'));
      anchorEl = anchors.find(a => a.textContent === appNumber) || null;
    }
    if (anchorEl) {
      spinner = document.createElement('span');
      spinner.className = 'inline-loading';
      spinner.innerHTML = `<span class="spinner-inline" aria-hidden="true" style="margin-left:8px;"></span>`;
      anchorEl.parentNode && anchorEl.parentNode.appendChild(spinner);
    }
  } catch (e) {
    console.warn('Could not show inline spinner', e);
  }

  try {
    const response = await window.apiService.getApplicationDetails(appNumber, userName, { showLoading: false });

    if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);

    if (response && response.success && response.data) {
      const appData = response.data;

      // If NEW draft, open new application modal
      if (appData.status === 'NEW' && (appData.completionStatus === 'DRAFT' || appData.completionStatus === 'Draft' || appData.completionStatus === 'draft')) {
        const ok = await loadModalContent('new');
        if (!ok) {
          if (typeof window.showToast === 'function') {
            window.showToast('Failed to load form.', 'error');
          } else {
            alert('Failed to load form.');
          }
          return;
        }
        if (typeof showNewApplicationModal === 'function') {
          showNewApplicationModal(appNumber);
        } else {
          const nm = document.getElementById('newApplicationModal');
          if (nm) nm.style.display = 'block';
        }
        return;
      }

      // Otherwise open view modal
      const okView = await loadModalContent('view');
      if (!okView) {
        if (typeof window.showToast === 'function') {
          window.showToast('Failed to load view modal. Please refresh the page.', 'error');
        } else {
          alert('Failed to load view modal. Please refresh the page.');
        }
        return;
      }

      const modal = document.getElementById('viewApplicationModal');
      if (modal) {
        modal.style.display = 'block';
        modal.classList.add('active');
      }

      if (typeof initViewApplicationModal === 'function') {
        try { initViewApplicationModal(appData); } catch (e) { console.warn('initViewApplicationModal error', e); }
      } else {
        await openViewApplicationModal(appData);
      }
    } else {
      if (typeof window.showToast === 'function') {
        window.showToast('Failed to load application: ' + (response?.message || 'Not found'), 'error');
      } else {
        alert('Failed to load application: ' + (response?.message || 'Not found'));
      }
    }
  } catch (err) {
    if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
    console.error('Error loading application details', err);
    if (typeof window.showToast === 'function') {
      window.showToast('Error loading application details: ' + (err?.message || err), 'error');
    } else {
      alert('Error loading application details: ' + (err?.message || err));
    }
  }
}

// ----------- BADGE & NOTIFICATION MANAGEMENT -----------

/**
 * Update application count badges
 */
async function updateBadgeCounts() {
  try {
    const resp = await window.apiService.getApplicationCounts();
    if (resp.success && resp.data) {
      updateCount('new', resp.data.new || 0);
      updateCount('pending', resp.data.pending || 0);
      updateCount('pending-approvals', resp.data.pendingApprovals || 0);
      updateCount('approved', resp.data.approved || 0);
    }
  } catch (e) {
    console.error('updateBadgeCounts error', e);
  }
}

/**
 * Update individual count badge
 */
function updateCount(id, n) {
  const el = document.getElementById(id + '-count');
  if (!el) return;
  el.textContent = n;
  el.style.display = n > 0 ? 'inline-block' : 'none';
}

/**
 * Update user notification badge
 */
async function updateUserNotificationBadge() {
  const userName = localStorage.getItem('loggedInName');
  if (!userName) return;
  try {
    const res = await window.apiService.getApplicationCountsForUser(userName);
    const count = res.count || 0;
    const badge = document.getElementById('user-notification-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) {
    console.error('updateUserNotificationBadge error', e);
  }
}

// ----------- REFRESH MANAGEMENT -----------

/**
 * Debounced refresh function
 */
const debouncedRefreshApplications = debounce(async (isAuto = false) => {
  const activeSection = document.querySelector('.content-section.active')?.id;
  if (activeSection) {
    await loadApplications(activeSection, { showLoading: !isAuto, isAutoRefresh: isAuto });
    await updateBadgeCounts();
    await updateUserNotificationBadge();
  }
}, 300);

/**
 * Manual refresh
 */
function refreshApplications() {
  debouncedRefreshApplications(false);
}

window.refreshApplications = refreshApplications;

/**
 * Initialize and start auto-refresh
 */
async function initializeAndRefreshTables() {
  await loadApplications('new', { showLoading: true });
  await updateBadgeCounts();
  await updateUserNotificationBadge();

  if (appTableRefreshInterval) clearInterval(appTableRefreshInterval);
  appTableRefreshInterval = setInterval(async () => {
    const active = document.querySelector('.content-section.active')?.id;
    if (active) {
      await loadApplications(active, { showLoading: false, isAutoRefresh: true });
      await updateBadgeCounts();
      await updateUserNotificationBadge();
    }
  }, 60000);
}

// ----------- BROWSER NOTIFICATIONS -----------

/**
 * Initialize browser notifications for new applications
 */
function initializeBrowserNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    setupNotificationListener();
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') setupNotificationListener();
    });
  }
}

/**
 * Setup notification listener
 */
function setupNotificationListener() {
  // Check for new applications periodically
  setInterval(() => {
    checkForNewApplications();
  }, 30000);
}

/**
 * Check for new application assignments
 */
async function checkForNewApplications() {
  const user = localStorage.getItem('loggedInName');
  if (!user || document.visibilityState === 'visible') return;

  try {
    const r = await window.apiService.getApplicationCountsForUser(user);
    const current = r.count || 0;
    const previous = lastAppTableCount;
    lastAppTableCount = current;

    if (current > previous && previous > 0) {
      const newCount = current - previous;
      const role = localStorage.getItem('userRole') || '';
      if (Notification.permission === 'granted') {
        const n = new Notification('New Application Assignment', {
          body: `${user} have ${newCount} application(s) for your action${role ? ` as ${role}` : ''}`,
          icon: 'https://img.icons8.com/color/192/000000/loan.png'
        });
        n.onclick = () => {
          window.focus();
          n.close();
          refreshApplications();
        };
        setTimeout(() => n.close(), 10000);
      }
    }
  } catch (e) {
    console.error('checkForNewApplications error', e);
  }
}

/**
 * Handle visibility change
 */
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    refreshApplications();
    updateUserNotificationBadge();
  } else {
    const u = localStorage.getItem('loggedInName');
    if (u) {
      window.apiService.getApplicationCountsForUser(u).then(r => {
        lastAppTableCount = r.count || 0;
      }).catch(() => {});
    }
  }
}

// ----------- EXPORTS FOR GLOBAL USE -----------
window.loadApplications = loadApplications;
window.initializeAndRefreshTables = initializeAndRefreshTables;
window.populateTable = populateTable;
window.handleAppNumberClick = handleAppNumberClick;
window.refreshApplications = refreshApplications;
window.updateBadgeCounts = updateBadgeCounts;
window.updateUserNotificationBadge = updateUserNotificationBadge;

/**
 * Cleanup on unload
 */
function clearAppTableIntervals() {
  if (appTableRefreshInterval) clearInterval(appTableRefreshInterval);
}
window.clearAppTableIntervals = clearAppTableIntervals;

console.log('AppTable module fully loaded');
