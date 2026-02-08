// Login.js - Authentication & Session Management
console.log('Login.js loaded');

// ----------- CACHED ELEMENTS -----------
const loginCachedElements = {
  'logged-in-user': document.getElementById('logged-in-user'),
  'user-notification-badge': document.getElementById('user-notification-badge'),
  'current-date': document.getElementById('current-date')
};

let notificationCheckInterval;
let lastAppCount = 0;

// ----------- CORE HELPERS -----------
function clearLoginIntervals() {
  if (notificationCheckInterval) clearInterval(notificationCheckInterval);
}

function initLogin() {
  console.log('Initializing Login module...');
  
  // Set current date
  const cd = loginCachedElements['current-date'];
  if (cd) {
    cd.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

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
    const pendingSection = document.getElementById('pending');
    if (pendingSection) pendingSection.classList.add('active');
    if (typeof initializeAppCount === 'function') initializeAppCount();
    if (typeof initializeAndRefreshTables === 'function') initializeAndRefreshTables();
  } else {
    showLoginPage();
  }

  // Initialize browser notifications
  initializeBrowserNotifications();
  document.addEventListener('visibilitychange', handleVisibilityChange);

  console.log('Login module initialized');
}

function showLoginPage() {
  document.body.classList.remove('logged-in');
  localStorage.removeItem('loggedInName');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userLevel');
  clearLoginIntervals();
}

function showDashboard() {
  document.body.classList.add('logged-in');
  const loggedInName = localStorage.getItem('loggedInName');
  const userRole = localStorage.getItem('userRole');
  if (loggedInName) setLoggedInUser(loggedInName, userRole);
}

function setLoggedInUser(name, role = '') {
  const el = loginCachedElements['logged-in-user'] || document.getElementById('logged-in-user');
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
    clearLoginIntervals();
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
      const pendingSection = document.getElementById('pending');
      if (pendingSection) pendingSection.classList.add('active');
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

// ----------- NOTIFICATIONS ----------
function initializeBrowserNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') setupNotificationListener();
  else if (Notification.permission === 'default') Notification.requestPermission().then(p => { if (p==='granted') setupNotificationListener(); });
}

function setupNotificationListener() {
  if (notificationCheckInterval) clearInterval(notificationCheckInterval);
  notificationCheckInterval = setInterval(() => { checkForNewApplications(); }, 30000);
}

async function checkForNewApplications() {
  const user = localStorage.getItem('loggedInName'); 
  if (!user || document.visibilityState === 'visible') return;
  try {
    const r = await window.apiService.getApplicationCountsForUser(user);
    const current = r.count || 0; 
    const previous = lastAppCount; 
    lastAppCount = current;
    if (current > previous && previous > 0) {
      const newCount = current - previous; 
      const role = localStorage.getItem('userRole') || '';
      if (Notification.permission === 'granted') {
        const n = new Notification('New Application Assignment', { 
          body: `${user} have ${newCount} application(s) for your action${role?` as ${role}`:''}`, 
          icon: 'https://img.icons8.com/color/192/000000/loan.png' 
        });
        n.onclick = () => { 
          window.focus(); 
          n.close(); 
          if (typeof refreshApplications === 'function') refreshApplications(); 
        };
        setTimeout(()=>n.close(), 10000);
      }
    }
  } catch (e) { 
    console.error('checkForNewApplications', e); 
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') { 
    if (typeof refreshApplications === 'function') refreshApplications(); 
    if (typeof updateUserNotificationBadge === 'function') updateUserNotificationBadge(); 
  } else { 
    const u = localStorage.getItem('loggedInName'); 
    if (u) window.apiService.getApplicationCountsForUser(u).then(r => lastAppCount = r.count || 0).catch(() => {}); 
  }
}

async function initializeAppCount() {
  const u = localStorage.getItem('loggedInName'); 
  if (!u) return;
  try { 
    const r = await window.apiService.getApplicationCountsForUser(u); 
    lastAppCount = r.count || 0; 
  } catch (e) { 
    console.error('initializeAppCount', e); 
  }
}

async function updateUserNotificationBadge() {
  const userName = localStorage.getItem('loggedInName'); 
  if (!userName) return;
  try {
    const res = await window.apiService.getApplicationCountsForUser(userName);
    const count = res.count || 0;
    const badge = loginCachedElements['user-notification-badge'] || document.getElementById('user-notification-badge');
    if (badge) { 
      if (count > 0) { 
        badge.textContent = count > 99 ? '99+' : count; 
        badge.style.display = 'flex'; 
      } else { 
        badge.style.display = 'none'; 
      }
    }
  } catch (e) { 
    console.error('updateUserNotificationBadge', e); 
  }
}

// ----------- EXPORTS -----------
window.showLoginPage = showLoginPage;
window.showDashboard = showDashboard;
window.setLoggedInUser = setLoggedInUser;
window.logout = logout;
window.handleLoginFunction = handleLoginFunction;
window.initLogin = initLogin;
window.clearLoginIntervals = clearLoginIntervals;
window.initializeBrowserNotifications = initializeBrowserNotifications;
window.checkForNewApplications = checkForNewApplications;
window.handleVisibilityChange = handleVisibilityChange;
window.initializeAppCount = initializeAppCount;
window.updateUserNotificationBadge = updateUserNotificationBadge;
