<!DOCTYPE html>
<html>
<head>
  <title>Loan Application Dashboard</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#2563eb">
  <link rel="manifest" href="manifest.json">
  
  <!-- CSS files -->
  <link rel="stylesheet" href="Main.css">
  <link rel="stylesheet" href="newApps.css">
  <link rel="stylesheet" href="viewApps.css">
  <link rel="stylesheet" href="ui-modals.css">
  <link rel="stylesheet" href="print.css">
</head>
<body>
  <!-- Login Container (dynamically loaded) -->
  <div id="login-container-placeholder"></div>

  <!-- Dashboard Content (hidden until logged in) -->
  <div class="dashboard-content">
    <div class="top-menu">
      <div class="menu-left">
        <button class="add-app-btn" onclick="void(0)">
          <i class="fas fa-plus"></i> Add New Application
        </button>
      </div>
      <div class="app-title">
        <i class="fas fa-layer-group"></i> LOAN APPLICATION TRACKER
      </div>
      <div class="user-info">
        <span class="date-display" id="current-date"></span>
        <div class="user-notification-container">
          <span id="logged-in-user"></span>
          <span id="user-notification-badge" class="notification-badge"></span>
        </div>
        <button class="logout-btn" onclick="logout()" title="Logout">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </div>
    
    <div class="container">
      <div class="side-menu">
        <div class="menu-section">
          <div class="menu-title"><i class="fas fa-tasks"></i> Applications</div>
          <button class="menu-btn" onclick="showSection('new')">
            <i class="fas fa-file-alt"></i> New <span class="badge" id="new-count">0</span>
          </button>
          <button class="menu-btn active" onclick="showSection('pending')">
            <i class="fas fa-clock"></i> Pending <span class="badge" id="pending-count">0</span>
          </button>
          <button class="menu-btn" onclick="showSection('pending-approvals')">
            <i class="fas fa-hourglass-half"></i> Pending Approvals <span class="badge" id="pending-approvals-count">0</span>
          </button>
          <button class="menu-btn" onclick="showSection('approved')">
            <i class="fas fa-check-circle"></i> Approved <span class="badge" id="approved-count">0</span>
          </button>
        </div>
        <div class="menu-section">
          <div class="menu-title"><i class="fas fa-users"></i> User Management</div>
          <button class="menu-btn" onclick="showSection('add-user')">
            <i class="fas fa-user-plus"></i> Add User
          </button>
          <button class="menu-btn" onclick="showSection('users-list')">
            <i class="fas fa-list"></i> Users List
          </button>
        </div>
      </div>
      
      <div class="main-content">
        <!-- Applications Tables Container (dynamically loaded) -->
        <div id="apps-tables-placeholder"></div>

        <!-- User Management Container (dynamically loaded) -->
        <div id="user-mgt-placeholder"></div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div id="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Processing...</p>
    </div>

    <!-- New Application Modal -->
    <div id="newApplicationModal" class="modal">
      <div class="modal-content compact-modal" id="newApplicationModalContent">
      </div>
    </div>

    <!-- View Application Modal -->
    <div id="viewApplicationModal" class="modal">
      <div class="modal-content large-modal">
      </div>
    </div>
  </div>

  <!-- Global Loader & Section Switch Function -->
  <script>
    // Universal section loader
    async function loadSectionHtml(id, file, callback) {
      try {
        const container = document.getElementById(id);
        if (!container) {
          console.warn(`Container #${id} not found`);
          return false;
        }
        const resp = await fetch(file);
        if (!resp.ok) throw new Error(`Failed to fetch ${file}: ${resp.status}`);
        container.innerHTML = await resp.text();
        if (typeof callback === 'function') callback();
        return true;
      } catch (err) {
        console.error(`Error loading ${file}:`, err);
        return false;
      }
    }

    // Load all modular sections on page load
    async function loadAllSections() {
      console.log('Loading all modular sections...');
      const results = await Promise.all([
        loadSectionHtml('login-container-placeholder', 'Login.html', window.initLogin),
        loadSectionHtml('apps-tables-placeholder', 'AppsTable.html', window.initAppTable),
        loadSectionHtml('user-mgt-placeholder', 'UserMgt.html', window.initUserMgt)
      ]);
      
      if (results.some(r => !r)) {
        console.warn('Some sections failed to load');
      }
      console.log('All modular sections loaded');
    }

    // Show/hide section
    function showSection(sectionId) {
      if (typeof restrictIfNotLoggedIn === 'function' && restrictIfNotLoggedIn()) return;
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      const el = document.getElementById(sectionId);
      if (el) {
        el.classList.add('active');
        if (sectionId === 'users-list' && typeof refreshUsersList === 'function') {
          refreshUsersList();
        }
      }
    }

    window.showSection = showSection;
    window.loadAllSections = loadAllSections;

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', async function() {
      // Load all sections first
      await loadAllSections();

      // Then initialize common stuff
      const cd = document.getElementById('current-date');
      if (cd) {
        cd.textContent = new Date().toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      }

      if (typeof initializeBrowserNotifications === 'function') initializeBrowserNotifications();
      document.addEventListener('visibilitychange', function() {
        if (typeof handleVisibilityChange === 'function') handleVisibilityChange();
      });
    });
  </script>

  <!-- Scripts in order -->
  <script src="api.js"></script>
  <script src="ui-modals.js"></script>
  <script src="Main.js"></script>
  <script src="Login.js"></script>
  <script src="AppTable.js"></script>
  <script src="UserMgt.js"></script>
  <script src="newApps.js"></script>
  <script src="viewApps.js"></script>
  <script src="print.js"></script>
  <script src="user-client.js"></script>
</body>
</html>
