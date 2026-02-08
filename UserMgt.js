// UserMgt.js - User Management
console.log('UserMgt.js loaded');

function escapeHtml(s) {
  if (!s) return '';
  return s.toString().replace(/[&<>"']/g, function(m){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}

function initUserMgt() {
  console.log('Initializing UserMgt module...');
  
  const addUserForm = document.getElementById('add-user-form');
  if (addUserForm) {
    addUserForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('new-user-name')?.value || '';
      const level = document.getElementById('new-user-level')?.value || '';
      const role = document.getElementById('new-user-role')?.value || '';

      if (!name || !level || !role) {
        if (typeof window.showToast === 'function') window.showToast('Please fill in all fields', 'error');
        else alert('Please fill in all fields');
        return;
      }

      try {
        if (typeof showLoading === 'function') showLoading('Adding user...');
        const response = await window.apiService.addUser({ name, level: parseInt(level), role });
        if (typeof hideLoading === 'function') hideLoading();

        if (response.success) {
          if (typeof window.showSuccessModal === 'function') await window.showSuccessModal(response.message || 'User added successfully');
          else alert(response.message || 'User added successfully');
          addUserForm.reset();
          refreshUsersList();
          showSection('users-list');
        } else {
          if (typeof window.showToast === 'function') window.showToast(response.message || 'Failed to add user', 'error');
          else alert(response.message || 'Failed to add user');
        }
      } catch (err) {
        if (typeof hideLoading === 'function') hideLoading();
        if (typeof window.showToast === 'function') window.showToast('Error adding user: ' + (err?.message || err), 'error');
        else alert('Error adding user: ' + (err?.message || err));
      }
    });
  }

  // Attach role change handler for auto-setting level
  const roleSelect = document.getElementById('new-user-role');
  if (roleSelect) {
    roleSelect.addEventListener('change', function(e) {
      const role = e.target.value;
      if (typeof setLevelForRole === 'function') {
        setLevelForRole(role);
      }
    });
  }

  console.log('UserMgt module initialized');
}

// Role-to-Level mapping
const ROLE_LEVEL_MAP = {
  "Admin": 5,
  "Head of Credit": 2,
  "Credit Officer": 1,
  "AMLRO": 2,
  "Branch Manager/Approver": 3,
  "Approver": 4
};

function setLevelForRole(role) {
  const levelInput = document.getElementById('new-user-level');
  if (!levelInput) return;
  const lvl = ROLE_LEVEL_MAP[role] || '';
  levelInput.value = lvl;
  if (lvl !== '') {
    levelInput.setAttribute('readonly', 'readonly');
    levelInput.style.background = '#f3f4f6';
    levelInput.style.cursor = 'not-allowed';
  } else {
    levelInput.removeAttribute('readonly');
    levelInput.style.background = '';
    levelInput.style.cursor = '';
  }
}

async function getAllUsersHandler() {
  try {
    const r = await window.apiService.getAllUsers();
    const users = r.data || [];
    const tbody = document.getElementById('users-list-body');
    if (!tbody) return;
    
    if (!users.length) { 
      tbody.innerHTML = `<tr><td colspan="4" class="no-data">No users found</td></tr>`; 
      return; 
    }
    
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.level)}</td>
        <td>${escapeHtml(u.role)}</td>
        <td class="actions">
          <button class="btn-icon btn-delete" onclick="deleteUser('${escapeHtml(u.name)}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) { 
    console.error('getAllUsersHandler', e); 
    const tbody = document.getElementById('users-list-body'); 
    if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="error">Error loading users</td></tr>`; 
  }
}

function refreshUsersList() { 
  getAllUsersHandler(); 
}

async function deleteUser(userName) {
  try {
    const ok = (typeof window.showConfirmModal === 'function')
      ? await window.showConfirmModal(`Delete user: ${userName}?`, { title: 'Confirm Delete', confirmText: 'Delete', cancelText: 'Cancel', danger: true })
      : confirm('Delete user: ' + userName + '?');
    
    if (!ok) return;
    
    const res = await window.apiService.deleteUser(userName);
    if (res.success) {
      if (typeof window.showSuccessModal === 'function') await window.showSuccessModal(res.message || 'User deleted');
      else alert(res.message || 'User deleted');
      refreshUsersList();
    } else {
      if (typeof window.showToast === 'function') window.showToast(res.message || 'Delete failed', 'error');
      else alert(res.message || 'Delete failed');
    }
  } catch(e){
    if (typeof window.showToast === 'function') window.showToast('Error deleting user: ' + (e && e.message), 'error');
    else alert('Error deleting user: '+(e && e.message));
  }
}

// ----------- EXPORTS -----------
window.getAllUsersHandler = getAllUsersHandler;
window.refreshUsersList = refreshUsersList;
window.deleteUser = deleteUser;
window.initUserMgt = initUserMgt;
window.setLevelForRole = setLevelForRole;
