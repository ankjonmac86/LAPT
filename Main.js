// Main.js — Shared Core Utilities (after modular separation)
// This file contains only: modal loading, modal utilities, and shared helpers
// All loading/spinner handling is delegated to ui-modals.js
// All authentication is in Login.js
// All table management is in AppTable.js
// All user management is in UserMgt.js

console.log('Main.js loaded');

// ----------- MODAL CONTENT LOADER -----------
/**
 * Dynamically load modal content (newApps.html or viewApps.html)
 * Handles script extraction and execution
 */
async function loadModalContent(modalName = 'new') {
  const cfg = modalName === 'view' ? {
    url: 'viewApps.html',
    containerSelector: '#viewApplicationModal .modal-content',
    loadedAttr: 'data-view-loaded'
  } : {
    url: 'newApps.html',
    containerSelector: '#newApplicationModalContent',
    loadedAttr: 'data-new-loaded'
  };

  const container = document.querySelector(cfg.containerSelector);
  if (!container) {
    console.error('Modal container not found for', modalName, cfg.containerSelector);
    return false;
  }

  // Check if already loaded
  if (container.getAttribute(cfg.loadedAttr) === '1') {
    return true;
  }

  try {
    const resp = await fetch(cfg.url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`Failed to fetch ${cfg.url}: ${resp.status}`);
    const html = await resp.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (modalName === 'view') {
      const fetchedModal = doc.getElementById('viewApplicationModal');
      if (fetchedModal) {
        const innerContent = fetchedModal.querySelector('.modal-content');
        if (innerContent) {
          // Remove scripts from content before inserting
          const scripts = Array.from(innerContent.querySelectorAll('script'));
          scripts.forEach(s => s.parentNode && s.parentNode.removeChild(s));
          container.innerHTML = innerContent.innerHTML.trim();

          // Extract and execute inline scripts
          const inlineScripts = Array.from(doc.querySelectorAll('script'));
          inlineScripts.forEach(scriptEl => {
            try {
              const s = document.createElement('script');
              if (scriptEl.src) {
                s.src = scriptEl.src;
                s.async = false;
                document.body.appendChild(s);
              } else {
                s.type = 'text/javascript';
                s.text = scriptEl.textContent;
                document.body.appendChild(s);
              }
            } catch (e) {
              console.warn('Error executing fetched script', e);
            }
          });

          container.setAttribute(cfg.loadedAttr, '1');
          if (typeof window.viewApplicationModalInit === 'function') {
            try { window.viewApplicationModalInit(); } catch (e) { console.warn('viewApplicationModalInit error', e); }
          }
          return true;
        }
      }
    }

    // Extract scripts before inserting HTML
    const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    const scripts = [];
    const htmlWithoutScripts = html.replace(scriptRe, function(_, scriptContent) {
      scripts.push(scriptContent);
      return '';
    });

    container.innerHTML = htmlWithoutScripts.trim();

    // Execute extracted scripts
    scripts.forEach(scriptContent => {
      try {
        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.text = scriptContent;
        document.body.appendChild(s);
      } catch (e) {
        console.error('Error executing modal inline script', e);
      }
    });

    container.setAttribute(cfg.loadedAttr, '1');

    // Call initialization functions
    if (modalName === 'new') {
      if (typeof window.initNewApplicationScripts === 'function') {
        try { window.initNewApplicationScripts(); } catch (e) { console.warn('initNewApplicationScripts error', e); }
      }
    } else {
      if (typeof window.viewApplicationModalInit === 'function') {
        try { window.viewApplicationModalInit(); } catch (e) { console.warn('viewApplicationModalInit error', e); }
      }
    }

    return true;
  } catch (err) {
    console.error('loadModalContent failed', err);
    return false;
  }
}

// Alias for backwards compatibility
async function loadModalContentIfNeeded(modalName = 'new') {
  return await loadModalContent(modalName);
}

// ----------- MODAL UTILITIES -----------

/**
 * Close new application modal
 */
function closeModal() {
  const modal = document.getElementById('newApplicationModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Close view application modal
 */
function closeViewApplicationModal() {
  const modal = document.getElementById('viewApplicationModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
  try { document.body.style.overflow = ''; } catch (e) {}
  sessionStorage.removeItem('currentViewingApp');
}
window.closeViewApplicationModal = closeViewApplicationModal;

/**
 * Open view application modal with app data
 */
async function openViewApplicationModal(appData) {
  const ok = await loadModalContent('view');
  if (!ok) {
    if (typeof window.showToast === 'function') {
      window.showToast('Failed to load view modal. Please refresh the page.', 'error');
    } else {
      alert('Failed to load view modal. Please refresh the page.');
    }
    return;
  }

  const modal = document.getElementById('viewApplicationModal');
  if (!modal) {
    console.error('viewApplicationModal element not found');
    return;
  }

  modal.style.display = 'block';
  modal.classList.add('active');

  setTimeout(() => {
    try {
      modal.scrollIntoView({ behavior: 'auto', block: 'center' });
    } catch (e) {
      try { window.scrollTo(0, 0); } catch (e2) {}
    }
  }, 40);

  // Initialize view modal with data
  if (typeof window.initViewApplicationModal === 'function') {
    try {
      window.initViewApplicationModal(appData);
      return;
    } catch (e) {
      console.warn('initViewApplicationModal threw:', e);
    }
  }

  // Fallback
  if (typeof window.viewApplication === 'function' && appData && appData.appNumber) {
    try {
      window.viewApplication(appData.appNumber);
    } catch (e) {
      console.error('viewApplication fallback failed', e);
    }
  }
}

/**
 * Show success message using ui-modals or fallback to alert
 * NOTE: Do NOT define our own showSuccessModal to avoid recursion!
 * Use window.showSuccessModal from ui-modals.js directly
 */
async function showSuccessMessage(message, options = {}) {
  if (typeof window.showSuccessModal === 'function') {
    return await window.showSuccessModal(message, options);
  }
  // Fallback to toast or alert
  if (typeof window.showToast === 'function') {
    window.showToast(message, 'success');
  } else {
    alert(message);
  }
}

/**
 * Close success modal via ui-modals
 */
function closeSuccessModal() {
  if (typeof window.hideSuccessModal === 'function') {
    return window.hideSuccessModal();
  }
}

// ----------- LOADING & SPINNER UTILITIES -----------
/**
 * Show loading overlay
 * Delegates to ui-modals if available, otherwise uses fallback
 */
function showLoading(message = 'Processing...') {
  try {
    const viewModal = document.getElementById('viewApplicationModal');
    const isViewOpen = viewModal && (
      viewModal.classList.contains('active') || 
      window.getComputedStyle(viewModal).display !== 'none'
    );

    // If view modal is open, don't use overlay
    if (isViewOpen) {
      return;
    }

    // Use ui-modals global loader if available
    if (typeof window.showGlobalLoader === 'function') {
      window.showGlobalLoader(message);
      return;
    }

    // Fallback: you could create a basic loader here if needed
    console.warn('No global loader available');
  } catch (e) {
    console.warn('showLoading error', e);
  }
}

/**
 * Hide loading overlay
 * Delegates to ui-modals if available
 */
function hideLoading() {
  try {
    if (typeof window.hideGlobalLoader === 'function') {
      window.hideGlobalLoader();
      return;
    }
    console.warn('No global loader available to hide');
  } catch (e) {
    console.warn('hideLoading error', e);
  }
}

// Expose these for other modules
window.showLoading = window.showLoading || showLoading;
window.hideLoading = window.hideLoading || hideLoading;

// ----------- HELPER UTILITIES -----------

/**
 * Check if user is logged in, redirect to login if not
 */
function restrictIfNotLoggedIn() {
  const loggedInName = localStorage.getItem('loggedInName');
  if (!loggedInName) {
    if (typeof showLoginPage === 'function') showLoginPage();
    return true;
  }
  return false;
}

/**
 * Show a section and hide others
 */
window.showSection = async function(sectionId) {
  if (restrictIfNotLoggedIn()) return;
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(sectionId);
  if (el) el.classList.add('active');
  // Load applications for this section
  if (typeof loadApplications === 'function') {
    await loadApplications(sectionId, { showLoading: true });
  }
};

// ----------- INITIALIZATION -----------

/**
 * Initialize all modules on page load
 */
async function initializeApp() {
  console.log('Initializing application...');

  // Load sections
  await loadAllSections();

  console.log('Application initialized');
}

/**
 * Load all major sections
 */
async function loadAllSections() {
  try {
    // Load Login
    if (typeof window.initLogin === 'function') {
      window.initLogin();
    }
    // Load AppTable
    if (typeof window.initAppTable === 'function') {
      window.initAppTable();
    }
    // Load UserMgt
    if (typeof window.initUserMgt === 'function') {
      window.initUserMgt();
    }
  } catch (e) {
    console.error('Error initializing sections:', e);
  }
}

// ----------- EXPORTS FOR GLOBAL USE -----------
window.loadModalContent = loadModalContent;
window.loadModalContentIfNeeded = loadModalContentIfNeeded;
window.closeModal = closeModal;
window.closeViewApplicationModal = closeViewApplicationModal;
window.openViewApplicationModal = openViewApplicationModal;
window.showSuccessMessage = showSuccessMessage;
window.closeSuccessModal = closeSuccessModal;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.restrictIfNotLoggedIn = restrictIfNotLoggedIn;
window.initializeApp = initializeApp;
window.loadAllSections = loadAllSections;

// ----------- PAGE LIFECYCLE -----------

/**
 * On page load, initialize app
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing app...');
  if (typeof initializeApp === 'function') {
    initializeApp();
  }
});

/**
 * On window unload, cleanup
 */
window.addEventListener('beforeunload', function() {
  try {
    if (typeof clearLoginIntervals === 'function') clearLoginIntervals();
    if (typeof clearAppTableIntervals === 'function') clearAppTableIntervals();
  } catch (e) {
    console.warn('Cleanup error:', e);
  }
});

console.log('Main.js fully loaded and ready');
