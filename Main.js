// Main.js — Shared Core Utilities (after modular separation)
// This file contains only: common helpers, loading/hiding spinners, modal utilities

console.log('Main.js loaded');

// ----------- LOADING OVERLAY HELPERS -----------
function showLoading(message = 'Processing...') {
  try {
    const viewModal = document.getElementById('viewApplicationModal');
    const isViewOpen = viewModal && (viewModal.classList.contains('active') || window.getComputedStyle(viewModal).display !== 'none');
    
    if (isViewOpen) {
      let local = document.getElementById('modal-local-loading');
      if (!local) {
        local = document.createElement('div');
        local.id = 'modal-local-loading';
        local.className = 'modal-local-loading';
        local.innerHTML = `
          <div class="modal-local-card" role="status" aria-live="polite" aria-label="Loading">
            <div class="spinner large" aria-hidden="true"></div>
            <div class="modal-local-message"></div>
          </div>
        `;
        const container = viewModal.querySelector('.modal-content') || viewModal;
        const computedPosition = window.getComputedStyle(container).position;
        if (!computedPosition || computedPosition === 'static') {
          container.style.position = 'relative';
        }
        container.appendChild(local);
      }
      const msgEl = local.querySelector('.modal-local-message');
      if (msgEl) msgEl.textContent = message;
      local.style.display = 'flex';
      return;
    }

    if (typeof window.showGlobalLoader === 'function') {
      window.showGlobalLoader(message);
      return;
    }
    
    let globalModal = document.getElementById('global-loading-modal');
    if (!globalModal) {
      globalModal = document.createElement('div');
      globalModal.id = 'global-loading-modal';
      globalModal.className = 'global-loading-modal';
      globalModal.innerHTML = `
        <div class="global-loading-backdrop" role="status" aria-live="polite"></div>
        <div class="global-loading-card" role="dialog" aria-modal="true" aria-label="Loading">
          <div class="spinner large" aria-hidden="true"></div>
          <div class="global-loading-message"></div>
        </div>
      `;
      document.body.appendChild(globalModal);
    }
    const msgEl = globalModal.querySelector('.global-loading-message');
    if (msgEl) msgEl.textContent = message;
    globalModal.style.display = 'flex';
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  } catch (e) {
    console.warn('showLoading error', e);
  }
}

function hideLoading() {
  try {
    const local = document.getElementById('modal-local-loading');
    if (local && local.style.display !== 'none') {
      try {
        local.parentNode && local.parentNode.removeChild(local);
      } catch (e) {
        local.style.display = 'none';
      }
      return;
    }

    if (typeof window.hideGlobalLoader === 'function') {
      window.hideGlobalLoader();
      return;
    }

    const globalModal = document.getElementById('global-loading-modal');
    if (globalModal) globalModal.style.display = 'none';
    try { document.body.style.overflow = ''; } catch (e) {}
  } catch (e) {
    console.warn('hideLoading error', e);
  }
}

// expose these for other modules
window.showLoading = window.showLoading || showLoading;
window.hideLoading = window.hideLoading || hideLoading;

// ----------- MODAL CONTENT LOADER -----------
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
          const scripts = Array.from(innerContent.querySelectorAll('script'));
          scripts.forEach(s => s.parentNode && s.parentNode.removeChild(s));
          container.innerHTML = innerContent.innerHTML.trim();

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

    const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    const scripts = [];
    const htmlWithoutScripts = html.replace(scriptRe, function(_, scriptContent) {
      scripts.push(scriptContent);
      return '';
    });

    container.innerHTML = htmlWithoutScripts.trim();

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

    if (modalName === 'new') {
      if (typeof window.initNewApplicationScripts === 'function') {
        try { window.initNewApplicationScripts(); } catch (e) { console.warn('initNewApplicationScripts error', e); }
      }
    } else {
      if (typeof window.viewApplicationModalInit === 'function') {
        try { window.viewApplicationModalInit(); } catch (e) { console.warn('viewApplicationModalInit error', e); }
      }
      if (typeof window.initViewApplicationModal === 'function') {
        try { window.initViewApplicationModal(); } catch (e) { /* ignore */ }
      }
    }

    return true;
  } catch (err) {
    console.error('loadModalContent failed', err);
    return false;
  }
}

// ----------- MODAL UTILITIES -----------
function closeModal() {
  const modal = document.getElementById('newApplicationModal');
  if (modal) modal.style.display = 'none';
}

function closeViewApplicationModal() {
  const modal = document.getElementById('viewApplicationModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
  try { document.body.style.overflow = ''; } catch (e) {}
  sessionStorage.removeItem('currentViewingApp');
}

async function openViewApplicationModal(appData) {
  const ok = await loadModalContent('view');
  if (!ok) {
    if (typeof window.showToast === 'function') window.showToast('Failed to load view modal. Please refresh the page.', 'error');
    else alert('Failed to load view modal. Please refresh the page.');
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

  if (typeof window.initViewApplicationModal === 'function') {
    try {
      window.initViewApplicationModal(appData);
      return;
    } catch (e) {
      console.warn('initViewApplicationModal threw:', e);
    }
  }

  if (typeof window.viewApplication === 'function' && appData && appData.appNumber) {
    try {
      window.viewApplication(appData.appNumber);
    } catch (e) {
      console.error('viewApplication fallback failed', e);
    }
  }
}

async function showSuccessModal(message, options = {}) {
  if (typeof window.showSuccessModal === 'function') {
    return window.showSuccessModal(message, options);
  }
  alert(message);
}

function closeSuccessModal() { 
  if (typeof window.hideSuccessModal === 'function') return window.hideSuccessModal(); 
}

function restrictIfNotLoggedIn() {
  const loggedInName = localStorage.getItem('loggedInName');
  if (!loggedInName) { 
    if (typeof showLoginPage === 'function') showLoginPage();
    return true; 
  }
  return false;
}

// ----------- EXPORTS FOR GLOBAL USE -----------
window.loadModalContent = loadModalContent;
window.closeModal = closeModal;
window.closeViewApplicationModal = closeViewApplicationModal;
window.openViewApplicationModal = openViewApplicationModal;
window.showSuccessModal = showSuccessModal;
window.closeSuccessModal = closeSuccessModal;
window.restrictIfNotLoggedIn = restrictIfNotLoggedIn;
