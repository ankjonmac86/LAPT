// Login.js - Authentication & Session Management
console.log('Login.js loaded');

function initLogin() {
  console.log('Initializing Login module...');
  
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = (document.getElementById('login-name') || {}).value?.trim();
      if (!name) { 
        if (typeof window.showToast === 'function') window.showToast('Name is required!', 'error'); 
        else alert('Name is required!'); 
        return; 
      }
      await handleLoginFunction(name);
    });
  }

  // Check if already logged in
  const loggedInName = localStorage.getItem('loggedInName');
  if (loggedInName) {
    setLoggedInUser(loggedInName, localStorage.getItem('userRole') || '');
    showDashboard();
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const newSection = document.getElementById('new');
    if (newSection) newSection.classList.add('active');
    if (typeof initializeAppCount === 'function') initializeAppCount();
    if (typeof initializeAndRefreshTables === 'function') initializeAndRefreshTables();
  } else {
    showLoginPage();
  }

  console.log('Login module initialized');
}

function showLoginPage() {
  document.body.classList.remove('logged-in');
  localStorage.removeItem('loggedInName');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userLevel');
  if (typeof clearIntervals === 'function') clearIntervals();
}

function showDashboard() {
  document.body.classList.add('logged-in');
  const loggedInName = localStorage.getItem('loggedInName');
  const userRole = localStorage.getItem('userRole');
  if (loggedInName) setLoggedInUser(loggedInName, userRole);
}

function setLoggedInUser(name, role = '') {
  const el = document.getElementById('logged-in-user');
  if (el) el.textContent = role ? `${name} (${role})` : name;
  if (name && typeof updateUserNotificationBadge === 'function') updateUserNotificationBadge();
}

async function logout() {
  try {
    const ok = (typeof window.showConfirmModal === 'function')
      ? await window.showConfirmModal('Are you sure you want to logout?', { title: 'Confirm Logout', confirmText: 'Logout', cancelText: 'Cancel' })
      : confirm('Are you sure you want to logout?');

    if (!ok) return;

    localStorage.removeItem('loggedInName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userLevel');
    if (typeof clearIntervals === 'function') clearIntervals();
    showLoginPage();

    if (typeof window.showToast === 'function') window.showToast('Logged out', 'info');
  } catch (e) {
    console.error('logout error', e);
  }
}

async function handleLoginFunction(name) {
  try {
    if (typeof showLoading === 'function') showLoading('Signing in...');
    const response = await window.apiService.login(name);
    if (typeof hideLoading === 'function') hideLoading();
    
    if (response.success) {
      localStorage.setItem('loggedInName', name);
      localStorage.setItem('userRole', response.user?.role || '');
      localStorage.setItem('userLevel', response.user?.level || '');
      setLoggedInUser(name, response.user?.role || '');
      showDashboard();
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      const newSection = document.getElementById('new');
      if (newSection) newSection.classList.add('active');
      if (typeof initializeAppCount === 'function') initializeAppCount();
      if (typeof initializeAndRefreshTables === 'function') initializeAndRefreshTables();
    } else {
      if (typeof window.showToast === 'function') window.showToast(response.message || 'Authentication failed', 'error');
      else alert(response.message || 'Authentication failed');
    }
  } catch (err) {
    if (typeof hideLoading === 'function') hideLoading();
    console.error('Login error', err);
    if (typeof window.showToast === 'function') window.showToast('Login error: ' + (err && err.message ? err.message : err), 'error');
    else alert('Login error: ' + (err && err.message ? err.message : err));
  }
}

window.showLoginPage = showLoginPage;
window.showDashboard = showDashboard;
window.setLoggedInUser = setLoggedInUser;
window.logout = logout;
window.handleLoginFunction = handleLoginFunction;
window.initLogin = initLogin;
