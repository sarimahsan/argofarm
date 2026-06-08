// ====== ArgoFarm — Shared Sidebar Component ======

import { getState, toggleSidebar, clearUser } from '../state.js';
import { showToast } from '../utils.js';
import { navigate } from '../router.js';

export function renderSidebar(container) {
  const state = getState();

  const nav = document.createElement('nav');
  nav.className = 'sidebar';
  nav.setAttribute('aria-label', 'Main navigation');

  const isUr = state.currentLang === 'ur';

  nav.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon"><i class="fas fa-leaf"></i></div>
      <span class="sidebar-logo-text">ArgoFarm</span>
    </div>
    <button class="sidebar-toggle" title="Toggle Sidebar" type="button">
      <i class="fas fa-chevron-${state.sidebarExpanded ? 'left' : 'right'}"></i>
    </button>
    <div class="sidebar-nav">
      <button class="sidebar-btn" data-page="dashboard" type="button" title="${isUr ? 'ڈیش بورڈ' : 'Dashboard'}" aria-label="${isUr ? 'ڈیش بورڈ' : 'Dashboard'}">
        <i class="fas fa-th-large"></i>
        <span class="sidebar-btn-text">${isUr ? 'ڈیش بورڈ' : 'Dashboard'}</span>
      </button>
      <button class="sidebar-btn" data-page="calendar" type="button" title="${isUr ? 'کیلنڈر' : 'Crop Calendar'}" aria-label="${isUr ? 'کیلنڈر' : 'Crop Calendar'}">
        <i class="fas fa-calendar-days"></i>
        <span class="sidebar-btn-text">${isUr ? 'کیلنڈر' : 'Calendar'}</span>
      </button>
      <button class="sidebar-btn" data-page="planner" type="button" title="${isUr ? 'اے آئی پلانر' : 'AI Crop Planner'}" aria-label="${isUr ? 'اے آئی پلانر' : 'AI Crop Planner'}">
        <i class="fas fa-compass-drafting"></i>
        <span class="sidebar-btn-text">${isUr ? 'اے آئی پلانر' : 'AI Planner'}</span>
      </button>
      <button class="sidebar-btn" data-page="wholesale" type="button" title="${isUr ? 'تھوک بازار' : 'Wholesale Bazaar'}" aria-label="${isUr ? 'تھوک بازار' : 'Wholesale Bazaar'}">
        <i class="fas fa-truck-ramp-box"></i>
        <span class="sidebar-btn-text">${isUr ? 'تھوک بازار' : 'Wholesale'}</span>
      </button>
      <button class="sidebar-btn" data-page="community" type="button" title="${isUr ? 'برادری' : 'Community & Marketplace'}" aria-label="${isUr ? 'برادری' : 'Community & Marketplace'}">
        <i class="fas fa-people-roof"></i>
        <span class="sidebar-btn-text">${isUr ? 'برادری' : 'Community'}</span>
      </button>
      <button class="sidebar-btn" data-page="history" type="button" title="${isUr ? 'ہسٹری' : 'Scan History'}" aria-label="${isUr ? 'ہسٹری' : 'Scan History'}">
        <i class="fas fa-clock-rotate-left"></i>
        <span class="sidebar-btn-text">${isUr ? 'ہسٹری' : 'History'}</span>
      </button>
      <button class="sidebar-btn" data-page="settings" type="button" title="${isUr ? 'ترتیبات' : 'Settings'}" aria-label="${isUr ? 'ترتیبات' : 'Settings'}">
        <i class="fas fa-gear"></i>
        <span class="sidebar-btn-text">${isUr ? 'ترتیبات' : 'Settings'}</span>
      </button>
      ${state.user && state.user.is_admin === 1 ? `
      <button class="sidebar-btn admin-only-btn" data-page="admin" type="button" title="${isUr ? 'ایڈمن پینل' : 'Admin Panel'}" aria-label="${isUr ? 'ایڈمن پینل' : 'Admin Panel'}" style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid var(--danger);">
        <i class="fas fa-user-shield" style="color: var(--danger);"></i>
        <span class="sidebar-btn-text" style="color: var(--danger); font-weight: 600;">${isUr ? 'ایڈمن پینل' : 'Admin Panel'}</span>
      </button>
      ` : ''}
    </div>
    <div class="sidebar-spacer"></div>
    <button class="sidebar-btn" data-action="logout" type="button" title="${isUr ? 'لاگ آؤٹ' : 'Logout'}" aria-label="${isUr ? 'لاگ آؤٹ' : 'Logout'}">
      <i class="fas fa-right-from-bracket"></i>
      <span class="sidebar-btn-text">${isUr ? 'لاگ آؤٹ' : 'Logout'}</span>
    </button>
  `;

  // Event listeners
  nav.querySelector('.sidebar-toggle').addEventListener('click', () => {
    toggleSidebar();
    const icon = nav.querySelector('.sidebar-toggle i');
    icon.className = `fas fa-chevron-${getState().sidebarExpanded ? 'left' : 'right'}`;
  });

  nav.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.page === 'chat') {
        window.__toggleCopilot && window.__toggleCopilot();
      } else {
        navigate(btn.dataset.page);
      }
      closeMobileMenu();
    });
  });

  nav.querySelector('[data-action="logout"]').addEventListener('click', async () => {
    const btn = nav.querySelector('[data-action="logout"]');
    btn.disabled = true;
    
    // Call backend logout
    import('../api.js').then(async (api) => {
      await api.apiLogout();
    });
    
    // Clear local state
    clearUser();
    showToast('Logged out successfully');
    closeMobileMenu();
    setTimeout(() => navigate('landing'), 300);
  });

  // Highlight active
  const currentPage = getState().currentPage;
  nav.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === currentPage);
  });

  container.appendChild(nav);
  return nav;
}

// Mobile sidebar overlay
let mobileOverlay = null;

export function openMobileMenu() {
  if (mobileOverlay) closeMobileMenu();

  mobileOverlay = document.createElement('div');
  mobileOverlay.className = 'mobile-sidebar-overlay active';

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.addEventListener('click', closeMobileMenu);
  mobileOverlay.appendChild(backdrop);

  renderSidebar(mobileOverlay);

  document.body.appendChild(mobileOverlay);
}

export function closeMobileMenu() {
  if (mobileOverlay) {
    mobileOverlay.remove();
    mobileOverlay = null;
  }
}

export function renderMobileHeader(container, title) {
  const header = document.createElement('div');
  header.className = 'mobile-header';
  header.innerHTML = `
    <button class="mobile-hamburger" type="button" title="Open Menu"><i class="fas fa-bars"></i></button>
    <span class="mobile-header-title">${title}</span>
    <div style="width:38px;"></div>
  `;
  header.querySelector('.mobile-hamburger').addEventListener('click', openMobileMenu);
  container.appendChild(header);
  return header;
}

