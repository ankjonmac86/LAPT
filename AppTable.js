// AppTable.js - Application Table Management
console.log('AppTable.js loaded');

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

async function loadApplications(sectionId, options = {}) {
  const map = { 'new': 'NEW','pending':'PENDING','pending-approvals':'PENDING_APPROVAL','approved':'APPROVED' };
  const status = map[sectionId];
  if (!status) return;

  if (typeof ensureSectionState === 'function') ensureSectionState(sectionId);
  const state = sectionStates && sectionStates[sectionId];
  if (state) {
    state.requestId++;
    var requestId = state.requestId;
  }

  const tbody = document.getElementById(`${sectionId}-list`);
  if (!tbody) return;

  const isAuto = options.isAutoRefresh || false;
  if (options.showLoading !== false && !isAuto) {
    if (typeof setSectionHeaderLoading === 'function') setSectionHeaderLoading(sectionId, true);
    tbody.innerHTML = `<tr><td colspan="5" class="loading">Loading applications...</td></tr>`;
  } else {
    if (isAuto) {
      tbody.setAttribute('aria-busy','true');
    } else {
      tbody.setAttribute('aria-busy','true'); tbody.style.opacity='0.7';
    }
  }

  try {
    const response = await window.apiService.getApplications(status, { showLoading: false });
    if (requestId && state && state.requestId !== requestId) return;

    tbody.removeAttribute('aria-busy'); tbody.style.opacity='1';
    if (typeof setSectionHeaderLoading === 'function') setSectionHeaderLoading(sectionId, false);

    if (response.success) {
      if (typeof diffUpdateTable === 'function') diffUpdateTable(`${sectionId}-list`, response.data || []);
    } else {
      if (!isAuto) tbody.innerHTML = `<tr><td colspan="5" class="error">Error: ${response.message}</td></tr>`;
      else console.warn('Auto-refresh error for', sectionId, response.message);
    }
  } catch (err) {
    if (requestId && state && state.requestId !== requestId) return;

    if (!isAuto) { tbody.removeAttribute('aria-busy'); tbody.style.opacity='1'; tbody.innerHTML = `<tr><td colspan="5" class="error">Error: ${err.message}</td></tr>`; if (typeof setSectionHeaderLoading === 'function') setSectionHeaderLoading(sectionId, false); }
    else console.error('Auto-refresh network error for', sectionId, err);
  }
}

function refreshApplications() { 
  if (typeof debouncedRefreshApplications === 'function') debouncedRefreshApplications(false);
}

async function initializeAndRefreshTables() {
  await loadApplications('new', { showLoading: true });
  if (typeof updateBadgeCounts === 'function') await updateBadgeCounts();
  if (typeof updateUserNotificationBadge === 'function') await updateUserNotificationBadge();
  if (typeof refreshInterval !== 'undefined' && refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(async () => {
    const active = document.querySelector('.content-section.active')?.id;
    if (active) {
      await loadApplications(active, { showLoading: false, isAutoRefresh: true });
      if (typeof updateBadgeCounts === 'function') await updateBadgeCounts();
      if (typeof updateUserNotificationBadge === 'function') await updateUserNotificationBadge();
    }
  }, 60000);
}

window.loadApplications = loadApplications;
window.refreshApplications = refreshApplications;
window.initializeAndRefreshTables = initializeAndRefreshTables;
window.initAppTable = initAppTable;
