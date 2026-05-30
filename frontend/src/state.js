// ====== ArgoFarm — Centralized Application State ======

const state = {
  currentPage: 'landing',
  currentLang: 'en',
  theme: localStorage.getItem('appTheme') || 'dark',
  user: null,
  authToken: null,
  sidebarExpanded: false,
  activeChatSessionId: '',
  chatStep: 0,
  audioPlaybackEnabled: true,
  _listeners: [],
};

export function getState() {
  return state;
}

export function setState(updates) {
  Object.assign(state, updates);
  state._listeners.forEach(fn => fn(state));
}

export function onStateChange(fn) {
  state._listeners.push(fn);
}

// Initialize from localStorage
export function initState() {
  const token = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('user');

  if (token) state.authToken = token;
  if (userStr) {
    try { state.user = JSON.parse(userStr); } catch (e) { /* ignore */ }
  }

  // Apply theme
  document.documentElement.setAttribute('data-theme', state.theme);
  document.body.classList.toggle('sidebar-expanded', state.sidebarExpanded);
}

export function setUser(user, token) {
  state.user = user;
  state.authToken = token;
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearUser() {
  state.user = null;
  state.authToken = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

export function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem('appTheme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function setLang(lang) {
  state.currentLang = lang;
  if (lang === 'ur') {
    document.body.classList.add('urdu');
  } else {
    document.body.classList.remove('urdu');
  }
}

export function toggleSidebar() {
  state.sidebarExpanded = !state.sidebarExpanded;
  localStorage.setItem('sidebarExpanded', state.sidebarExpanded.toString());
  document.body.classList.toggle('sidebar-expanded', state.sidebarExpanded);
}

export default state;
