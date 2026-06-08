// ====== ArgoFarm — Admin Management Page ======

import { getState } from '../state.js';
import { navigate } from '../router.js';
import { showToast } from '../utils.js';
import { renderMobileHeader } from '../components/sidebar.js';
import { apiAdminGetUsers, apiAdminUpdateUser, apiAdminDeleteUser } from '../api.js';

export function mountAdmin(container) {
  const state = getState();
  
  // Guard clause: redirect non-admin users to dashboard
  if (!state.user || state.user.is_admin !== 1) {
    showToast('Access denied: Administrators only.');
    setTimeout(() => navigate('dashboard'), 100);
    return () => {};
  }

  container.innerHTML = '';
  container.classList.add('admin-page');

  // Page Header
  const isUr = state.currentLang === 'ur';
  renderMobileHeader(container, isUr ? 'ایڈمن پینل' : 'Admin Console');

  // Admin Wrapper DOMElements
  const adminWrapper = document.createElement('div');
  adminWrapper.className = 'admin-container';
  adminWrapper.style.padding = '24px';
  adminWrapper.style.height = 'calc(100vh - 60px)';
  adminWrapper.style.overflowY = 'auto';

  adminWrapper.innerHTML = `
    <div class="admin-header-card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:20px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <h2 style="font-size:20px; font-weight:700; margin-bottom:6px; color:var(--fg); display:flex; align-items:center; gap:8px;">
          <i class="fas fa-user-shield" style="color:var(--danger);"></i>
          ${isUr ? 'صارفین کا انتظام' : 'System Administration'}
        </h2>
        <p style="font-size:12px; color:var(--fg-muted);">
          ${isUr ? 'سسٹم کے صارفین کی فہرست، ان کے کردار، اور اے آئی استعمال کی حدود کو کنٹرول کریں۔' : 'Manage system users, modify AI usage limits, toggle admin privileges, or delete accounts.'}
        </p>
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <div style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.2); border-radius:8px; padding:10px 18px; text-align:center;">
          <span style="font-size:10px; color:var(--danger); font-weight:600; text-transform:uppercase; letter-spacing:0.5px; display:block;">Total Users</span>
          <span id="adminTotalUsers" style="font-size:22px; font-weight:800; color:var(--danger);">...</span>
        </div>
      </div>
    </div>

    <!-- AI Limit Guide Card -->
    <div style="background:rgba(59, 130, 246, 0.08); border:1px solid rgba(59, 130, 246, 0.15); border-radius:var(--radius-md); padding:16px; margin-bottom:24px; font-size:12px; line-height:1.5; color:var(--fg);">
      <div style="font-weight:700; margin-bottom:6px; color:var(--info); display:flex; align-items:center; gap:6px;">
        <i class="fas fa-info-circle"></i>
        ${isUr ? 'اے آئی کے استعمال کی حد کے رہنما خطوط' : 'AI Daily Limit Configuration Guide'}
      </div>
      <ul style="padding-left:20px; margin:0;">
        <li><strong>Limit > 0:</strong> ${isUr ? 'صارف روزانہ اتنی اے آئی درخواستیں (اسکین اور چیٹ) کر سکتا ہے۔' : 'Specifies the maximum daily AI queries (scans & chat sessions) allowed for this user.'}</li>
        <li><strong>Limit = 0:</strong> ${isUr ? 'صارف کے لیے تمام اے آئی خصوصیات مکمل طور پر بلاک ہو جائیں گی۔' : 'Disables all AI diagnostics and planner features completely for this account.'}</li>
        <li><strong>Default Value:</strong> ${isUr ? 'نئے صارفین کے لیے پہلے سے طے شدہ حد 50 روزانہ ہے۔' : 'The default system allocation for newly registered users is 50 requests per day.'}</li>
      </ul>
    </div>

    <!-- User Search & Filter -->
    <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:16px;">
      <div style="position:relative; flex:1; max-width:360px;">
        <input type="text" id="adminSearchInput" class="form-input" placeholder="${isUr ? 'نام، ای میل یا علاقہ تلاش کریں...' : 'Search by name, email, or region...'}" style="padding-left:36px; height:40px; font-size:13px; width:100%;">
        <i class="fas fa-search" style="position:absolute; left:12px; top:13px; color:var(--fg-muted); font-size:14px;"></i>
      </div>
      <button id="adminRefreshBtn" class="btn btn-secondary" style="height:40px; display:inline-flex; align-items:center; gap:8px;">
        <i class="fas fa-sync-alt"></i> ${isUr ? 'ریفریش' : 'Refresh List'}
      </button>
    </div>

    <!-- Users Table Container -->
    <div class="table-scroll-container" style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); overflow-x:auto; min-height:300px; position:relative;">
      <table id="adminUsersTable" style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid var(--border); background:rgba(255, 255, 255, 0.02);">
            <th style="padding:14px 16px; font-weight:600; color:var(--fg-muted);">${isUr ? 'آئی ڈی' : 'ID'}</th>
            <th style="padding:14px 16px; font-weight:600; color:var(--fg-muted);">${isUr ? 'نام / ای میل' : 'User Details'}</th>
            <th style="padding:14px 16px; font-weight:600; color:var(--fg-muted);">${isUr ? 'فون / علاقہ' : 'Phone / Region'}</th>
            <th style="padding:14px 16px; font-weight:600; color:var(--fg-muted); text-align:center;">${isUr ? 'اے آئی یومیہ حد' : 'AI Daily Limit'}</th>
            <th style="padding:14px 16px; font-weight:600; color:var(--fg-muted); text-align:center;">${isUr ? 'ایڈمن؟' : 'Is Admin?'}</th>
            <th style="padding:14px 16px; font-weight:600; color:var(--fg-muted); text-align:right;">${isUr ? 'اقدامات' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody id="adminUsersList">
          <tr>
            <td colspan="6" style="padding:40px; text-align:center; color:var(--fg-muted);">
              <i class="fas fa-spinner fa-spin" style="font-size:24px; margin-bottom:12px; display:block;"></i>
              Loading users list...
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  container.appendChild(adminWrapper);

  let allUsers = [];

  // Load User List Function
  async function fetchAndRenderUsers() {
    const tbody = adminWrapper.querySelector('#adminUsersList');
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding:40px; text-align:center; color:var(--fg-muted);">
          <i class="fas fa-spinner fa-spin" style="font-size:24px; margin-bottom:12px; display:block;"></i>
          Fetching database records...
        </td>
      </tr>
    `;

    const result = await apiAdminGetUsers();
    if (result && result.status === 'success') {
      allUsers = result.data.users || [];
      renderUserRows(allUsers);
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding:40px; text-align:center; color:var(--danger);">
            <i class="fas fa-exclamation-triangle" style="font-size:24px; margin-bottom:12px; display:block;"></i>
            Failed to load users. ${result?.message || 'Connection failed.'}
          </td>
        </tr>
      `;
    }
  }

  // Render Rows based on list
  function renderUserRows(usersList) {
    const tbody = adminWrapper.querySelector('#adminUsersList');
    const totalCountSpan = adminWrapper.querySelector('#adminTotalUsers');
    
    totalCountSpan.textContent = allUsers.length;

    if (usersList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding:40px; text-align:center; color:var(--fg-muted);">
            No users matched search criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    usersList.forEach(user => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border)';
      tr.style.transition = 'background 0.2s ease';
      
      // Check if current row is the logged in user
      const isSelf = parseInt(user.id) === parseInt(state.user.id);
      
      tr.innerHTML = `
        <td style="padding:14px 16px; color:var(--fg-muted); font-family:monospace;">${user.id}</td>
        <td style="padding:14px 16px;">
          <div style="font-weight:600; color:var(--fg);">${user.name} ${isSelf ? '<span style="font-size:9px; background:rgba(46,204,64,0.15); color:var(--accent); border:1px solid rgba(46,204,64,0.25); border-radius:4px; padding:1px 4px; margin-left:4px;">You</span>' : ''}</div>
          <div style="font-size:11px; color:var(--fg-muted);">${user.email}</div>
          <div style="font-size:10px; color:var(--fg-muted); margin-top:2px;">Registered: ${new Date(user.created_at).toLocaleDateString()}</div>
        </td>
        <td style="padding:14px 16px;">
          <div style="color:var(--fg);">${user.phone || '—'}</div>
          <div style="font-size:11px; color:var(--fg-muted);">${user.region || '—'}</div>
        </td>
        <td style="padding:14px 16px; text-align:center;">
          <input type="number" class="form-input admin-ai-limit-input" value="${user.ai_limit ?? 50}" min="0" max="10000" style="width:72px; text-align:center; height:32px; display:inline-block; font-size:12px; padding:0 4px;" data-user-id="${user.id}">
        </td>
        <td style="padding:14px 16px; text-align:center;">
          <input type="checkbox" class="admin-role-checkbox" ${user.is_admin === 1 ? 'checked' : ''} ${isSelf ? 'disabled' : ''} data-user-id="${user.id}" style="width:16px; height:16px; cursor:${isSelf ? 'not-allowed' : 'pointer'};">
        </td>
        <td style="padding:14px 16px; text-align:right;">
          <div style="display:inline-flex; gap:8px;">
            <button class="btn btn-secondary btn-admin-save" style="padding:4px 10px; font-size:11px; height:28px;" data-user-id="${user.id}">
              <i class="fas fa-save"></i> Save
            </button>
            <button class="btn btn-danger btn-admin-delete" style="padding:4px 10px; font-size:11px; height:28px; background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.2); color:var(--danger);" ${isSelf ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} data-user-id="${user.id}">
              <i class="fas fa-trash-alt"></i> Delete
            </button>
          </div>
        </td>
      `;

      // Hover style
      tr.addEventListener('mouseenter', () => { tr.style.background = 'rgba(255, 255, 255, 0.015)'; });
      tr.addEventListener('mouseleave', () => { tr.style.background = 'transparent'; });

      tbody.appendChild(tr);
    });

    // Save Button Actions
    tbody.querySelectorAll('.btn-admin-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId;
        const row = btn.closest('tr');
        const aiLimitInput = row.querySelector('.admin-ai-limit-input');
        const roleCheckbox = row.querySelector('.admin-role-checkbox');
        
        const ai_limit = parseInt(aiLimitInput.value);
        const is_admin = roleCheckbox.checked ? 1 : 0;

        if (isNaN(ai_limit) || ai_limit < 0) {
          showToast('Please enter a valid AI Limit >= 0');
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving';

        const updateResult = await apiAdminUpdateUser(userId, { is_admin, ai_limit });
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save';

        if (updateResult && updateResult.status === 'success') {
          showToast(`Successfully updated privileges for user ID ${userId}.`);
          
          // If the admin updated their own AI Limit, sync locally if needed
          if (parseInt(userId) === parseInt(state.user.id)) {
             // Admin saved self
          }
          fetchAndRenderUsers();
        } else {
          showToast(updateResult?.message || 'Failed to update user.');
        }
      });
    });

    // Delete Button Actions
    tbody.querySelectorAll('.btn-admin-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId;
        const row = btn.closest('tr');
        const name = row.querySelector('td:nth-child(2) div').textContent;
        const email = row.querySelector('td:nth-child(2) div:nth-child(2)').textContent;

        const confirmText = `Are you absolutely sure you want to permanently delete user "${name.trim()}" (${email.trim()})?\n\nThis will remove their diagnostics, scan history, forum postings, and all related database records. This action CANNOT be undone.`;
        
        if (confirm(confirmText)) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting';

          const deleteResult = await apiAdminDeleteUser(userId);
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';

          if (deleteResult && deleteResult.status === 'success') {
            showToast(`Permanently deleted user: ${name}`);
            fetchAndRenderUsers();
          } else {
            showToast(deleteResult?.message || 'Failed to delete user.');
          }
        }
      });
    });
  }

  // Refresh btn click
  adminWrapper.querySelector('#adminRefreshBtn').addEventListener('click', () => {
    fetchAndRenderUsers();
  });

  // Search input change
  adminWrapper.querySelector('#adminSearchInput').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderUserRows(allUsers);
      return;
    }
    
    const filtered = allUsers.filter(u => 
      (u.name && u.name.toLowerCase().includes(q)) || 
      (u.email && u.email.toLowerCase().includes(q)) || 
      (u.phone && u.phone.toLowerCase().includes(q)) || 
      (u.region && u.region.toLowerCase().includes(q))
    );
    renderUserRows(filtered);
  });

  // Initial load
  fetchAndRenderUsers();

  return () => { container.classList.remove('admin-page'); };
}
