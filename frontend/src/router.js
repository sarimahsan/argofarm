// ====== ArgoFarm — SPA Hash Router ======

import { getState, setState } from './state.js';

const routes = {};
let currentCleanup = null;

export function registerRoute(name, mountFn) {
  routes[name] = mountFn;
}

export function navigate(page) {
  window.location.hash = `#${page}`;
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

async function handleRoute() {
  const hash = window.location.hash.replace('#', '') || 'landing';
  const { authToken } = getState();

  // Auth guard: redirect to landing if not authenticated
  const protectedPages = ['dashboard', 'chat', 'history', 'settings', 'calendar', 'community', 'planner', 'wholesale'];
  if (protectedPages.includes(hash) && !authToken) {
    window.location.hash = '#landing';
    return;
  }

  // If logged in and trying to access landing, redirect to dashboard
  if (hash === 'landing' && authToken) {
    window.location.hash = '#dashboard';
    return;
  }

  // Cleanup previous page
  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  // Deactivate all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Mount new page
  const mountFn = routes[hash];
  if (mountFn) {
    setState({ currentPage: hash });

    // Get or create page container
    let pageEl = document.getElementById(`page-${hash}`);
    const content = document.querySelector('.app-content');

    if (!pageEl) {
      pageEl = document.createElement('div');
      pageEl.id = `page-${hash}`;
      pageEl.className = 'page';
      content.appendChild(pageEl);
    }

    pageEl.classList.add('active');

    // Update sidebar active state
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === hash);
    });

    currentCleanup = await mountFn(pageEl);
  }
}
