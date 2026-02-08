// AppTable.js - Application Table Management
console.log('AppTable.js loaded');

// ----------- CACHED STATE -----------
const sectionStates = {}; // { [sectionId]: { requestId: number, loading: boolean } }
let refreshInterval;

// ----------- CORE HELPERS -----------
function clearAppTableIntervals() {
  if (refreshInterval) clearInterval(refreshInterval);
}

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

function escapeHtml(s) {
  if (!s) return '';
  return s.toString().replace(/[&<>"']/g, function(m){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}

function ensureSectionState(sectionId) {
  if (!sectionStates[sectionId]) sectionStates[sectionId] = { requestId: 0, loading: false };
  return sectionStates[sectionId];
}

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

function createRowForApplication(app) {
  const tr = document.createElement('tr');

  const tdApp = document.createElement('td'); 
  tdApp.className='app-number';
  const a = document.createElement('a'); 
  a.href='javascript:void(0)'; 
  a.className='app-number-link';
  a.textContent = app.appNumber || '';
  a.addEventListener('click', (e) => {
    handleAppNumberClick(app.appNumber, e.currentTarget);
  });
  tdApp.appendChild(a); 
  tr.appendChild(tdApp);

  const tdName = document.createElement('td'); 
  tdName.className='applicant-name'; 
  tdName.textContent = app.applicantName || 'N/A'; 
  tr.appendChild(tdName);

  const tdAmount = document.createElement('td'); 
  tdAmount.className='amount'; 
  tdAmount.textContent = (app.amount==null?'0.00':Number(app.amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})); 
  tr.appendChild(tdAmount);

  const tdDate = document.createElement('td'); 
  tdDate.className='date'; 
  tdDate.textContent = app.date ? new Date(app.date).toLocaleDateString() : 'N/A'; 
  tr.appendChild(tdDate);

  const tdActionBy = document.createElement('td'); 
  tdActionBy.className='action-by'; 
  tdActionBy.textContent = app.actionBy || 'N/A'; 
  tr.appendChild(tdActionBy);

  return tr;
}

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

      let changed = false;
      if ((nameCell && nameCell.textContent) !== (app.applicantName || 'N/A')) { 
        if (nameCell) nameCell.textContent = app.applicantName || 'N/A'; 
        changed = true; 
      }
      const formattedAmount = (app.amount==null?'0.00':Number(app.amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}));
      if ((amountCell && amountCell.textContent) !== formattedAmount) { 
        if (amountCell) amountCell.textContent = formattedAmount; 
        changed = true; 
      }
      const formattedDate = app.date ? new Date(app.date).toLocaleDateString() : 'N/A';
      if ((dateCell && dateCell.textContent) !== formattedDate) { 
        if (dateCell) dateCell.textContent = formattedDate; 
        changed = true; 
      }
      if ((actionByCell && actionByCell.textContent) !== (app.actionBy || 'N/A')) { 
        if (actionByCell) actionByCell.textContent = app.actionBy || 'N/A'; 
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

// ----------- APPLICATION CLICK HANDLER ----------
async function handleAppNumberClick(appNumber, anchorEl = null) {
  if (!appNumber) { 
    if (typeof window.showToast === 'function') window.showToast('Invalid application number', 'error'); 
    else alert('Invalid application number'); 
    return; 
  }
  
  const userName = localStorage.getItem('loggedInName') || '';

  // Add inline spinner next to the clicked anchor
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

    // remove inline spinner
    if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);

    if (response && response.success && response.data) {
      const appData = response.data;

      // If this application is a NEW draft, open the New Application modal only
      if (appData.status === 'NEW' && (appData.completionStatus === 'DRAFT' || appData.completionStatus === 'Draft' || appData.completionStatus === 'draft')) {
        const ok = await loadModalContent('new');
        if (!ok) { 
          if (typeof window.showToast === 'function') window.showToast('Failed to load form.', 'error'); 
          else alert('Failed to load form.'); 
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
        if (typeof window.showToast === 'function') window.showToast('Failed to load view modal. Please refresh the page.', 'error');
        else alert('Failed to load view modal. Please refresh the page.');
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
      if (typeof window.showToast === 'function') window.showToast('Failed to load application: ' + (response?.message || 'Not found'), 'error');
      else alert('Failed to load application: ' + (response?.message || 'Not found'));
    }
  } catch (err) {
    if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
    console.error('Error loading application details', err);
    if (typeof window.showToast === 'function') window.showToast('Error loading application details: ' + (err && err.message ? err.message : err), 'error');
    else alert('Error loading application details: ' + (err && err.message ? err.message : err));
  }
}

// ----------- BADGE UPDATES ----------
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

function updateCount(id, n) {
  const el = document.getElementById(id + '-count');
  if (!el) return;
  el.textContent = n; 
  el.style.display = n > 0 ? 'inline-block' : 'none';
}

// ----------- TABLE LOADING ----------
async function loadApplications(sectionId, options = {}) {
  const map = { 'new': 'NEW','pending':'PENDING','pending-approvals':'PENDING_APPROVAL','approved':'APPROVED' };
  const status = map[sectionId];
  if (!status) return;

  ensureSectionState(sectionId);
  const state = sectionStates[sectionId];
  state.requestId++;
  const requestId = state.requestId;

  const tbody = document.getElementById(`${sectionId}-list`);
  if (!tbody) return;

  const isAuto = options.isAutoRefresh || false;
  if (options.showLoading !== false && !isAuto) {
    setSectionHeaderLoading(sectionId, true);
    tbody.innerHTML = `<tr><td colspan="5" class="loading">Loading applications...</td></tr>`;
  } else {
    if (isAuto) {
      tbody.setAttribute('aria-busy','true');
    } else {
      tbody.setAttribute('aria-busy','true'); 
      tbody.style.opacity='0.7';
    }
  }

  try {
    const response = await window.apiService.getApplications(status, { showLoading: false });
    if (state.requestId !== requestId) return;

    tbody.removeAttribute('aria-busy'); 
    tbody.style.opacity='1';
    setSectionHeaderLoading(sectionId, false);

    if (response.success) {
      diffUpdateTable(`${sectionId}-list`, response.data || []);
    } else {
      if (!isAuto) tbody.innerHTML = `<tr><td colspan="5" class="error">Error: ${response.message}</td></tr>`;
      else console.warn('Auto-refresh error for', sectionId, response.message);
    }
  } catch (err) {
    if (state.requestId !== requestId) return;

    if (!isAuto) { 
      tbody.removeAttribute('aria-busy'); 
      tbody.style.opacity='1'; 
      tbody.innerHTML = `<tr><td colspan="5" class="error">Error: ${err.message}</td></tr>`; 
      setSectionHeaderLoading(sectionId, false); 
    }
    else console.error('Auto-refresh network error for', sectionId, err);
  }
}

const debouncedRefreshApplications = debounce(async (isAuto=false) => {
  const activeSection = document.querySelector('.content-section.active')?.id;
  if (activeSection) {
    await loadApplications(activeSection, { showLoading: !isAuto, isAutoRefresh: isAuto });
    await updateBadgeCounts();
    if (typeof updateUserNotificationBadge === 'function') await updateUserNotificationBadge();
  }
}, 300);

function refreshApplications() { 
  debouncedRefreshApplications(false); 
}

async function initializeAndRefreshTables() {
  await loadApplications('pending', { showLoading: true });
  await updateBadgeCounts();
  if (typeof updateUserNotificationBadge === 'function') await updateUserNotificationBadge();
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(async () => {
    const active = document.querySelector('.content-section.active')?.id;
    if (active) {
      await loadApplications(active, { showLoading: false, isAutoRefresh: true });
      await updateBadgeCounts();
      if (typeof updateUserNotificationBadge === 'function') await updateUserNotificationBadge();
    }
  }, 60000);
}

// ----------- INITIALIZATION ----------
function initAppTable() {
  console.log('Initializing AppTable module...');
  
  const addAppBtn = document.querySelector('.add-app-btn');
  if (addAppBtn) {
    addAppBtn.removeAttribute('onclick');
    addAppBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      const ok = await loadModalContent('new');
      if (!ok) {
        if (typeof window.showToast === 'function') window.showToast('Failed to load application form. Please refresh the page.', 'error');
        else alert('Failed to load application form. Please refresh the page.');
        return;
      }
      if (typeof showNewApplicationModal === 'function') {
        showNewApplicationModal();
      }
    });
  }

  console.log('AppTable module initialized');
}

// ----------- EXPORTS -----------
window.loadApplications = loadApplications;
window.refreshApplications = refreshApplications;
window.initializeAndRefreshTables = initializeAndRefreshTables;
window.initAppTable = initAppTable;
window.updateBadgeCounts = updateBadgeCounts;
window.clearAppTableIntervals = clearAppTableIntervals;
window.ensureSectionState = ensureSectionState;
window.setSectionHeaderLoading = setSectionHeaderLoading;
window.createRowForApplication = createRowForApplication;
window.diffUpdateTable = diffUpdateTable;
window.handleAppNumberClick = handleAppNumberClick;
window.debouncedRefreshApplications = debouncedRefreshApplications;
window.sectionStates = sectionStates;
