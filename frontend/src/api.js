// ====== ArgoFarm — API Client ======

import { getState, clearUser } from './state.js';
import { showToast } from './utils.js';

const API_BASE = '/api/v1';

// In-memory cache for API responses
const apiCache = new Map();
const CACHE_TTL = 300000; // 5 minutes TTL

export function clearApiCache() {
  console.log('[Cache] Clearing all cached GET responses.');
  apiCache.clear();
}

function getHeaders(isJson = true) {
  const headers = {};
  const { authToken } = getState();
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (isJson) headers['Content-Type'] = 'application/json';
  return headers;
}

export async function apiFetch(endpoint, options = {}) {
  const { authToken } = getState();
  const isFormData = options.body instanceof FormData;

  // Validate token exists for protected routes
  if (!endpoint.includes('/auth/') && !endpoint.includes('/register') && !endpoint.includes('/login')) {
    if (!authToken) {
      clearUser();
      if (window.location.hash !== '#landing') {
        window.location.hash = '#landing';
      }
      return null;
    }
  }

  const method = (options.method || 'GET').toUpperCase();
  const cacheableEndpoints = [
    '/community/ai-calendar',
    '/planner/generate',
    '/wholesale/analyze',
    '/wholesale/suggest-price'
  ];
  const isCacheable = method === 'GET' || cacheableEndpoints.some(e => endpoint.startsWith(e));

  // Invalidate cache on any state-changing operations
  if (!isCacheable) {
    console.log(`[Cache Invalidation] Clearing cache due to write operation: ${method} ${endpoint}`);
    apiCache.clear();
  }

  // Check cache for GET or cacheable POST requests
  const cacheKey = `${authToken || ''}:${endpoint}?${options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : ''}`;
  if (isCacheable) {
    const cached = apiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log(`[Cache Hit] Returning cached response for: ${endpoint}`);
      return cached.data;
    }
  }

  const config = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);

    // Handle 401 - Invalid/Expired token
    if (response.status === 401) {
      // Only clear and redirect if it's not a login/register request
      if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        clearUser();
        showToast('Session expired. Please login again.');
        window.location.hash = '#landing';
      }
      const data = await response.json();
      return data;
    }

    const data = await response.json();

    if (!response.ok) {
      if (data.message) showToast(data.message);
      return data;
    }

    // Cache the successful response
    if (isCacheable && data) {
      apiCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }

    return data;
  } catch (err) {
    console.error('API Error:', err);
    showToast('Connection error. Please check your network.');
    return null;
  }
}

// ====== AUTH ENDPOINTS ======
export async function apiLogin(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(name, email, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, region: 'Punjab', crop_types: [] }),
  });
}

export async function apiForgotPassword(email) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function apiGetProfile() {
  return apiFetch('/auth/profile');
}

export async function apiUpdateProfile(data) {
  return apiFetch('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiLogout() {
  return apiFetch('/auth/logout', {
    method: 'POST',
  });
}

// ====== DASHBOARD ENDPOINTS ======
export async function apiGetAnalytics() {
  return apiFetch('/dashboard/analytics');
}

export async function apiGetOutbreaks() {
  return apiFetch('/dashboard/outbreaks');
}

// ====== HISTORY ENDPOINTS ======
export async function apiGetHistory(params = {}) {
  const q = new URLSearchParams({ page: 1, per_page: 50, ...params });
  return apiFetch(`/history/scans?${q}`);
}

export async function apiGetScan(id) {
  return apiFetch(`/history/scans/${id}`);
}

export async function apiGetCropTypes() {
  return apiFetch('/history/crop-types');
}

// ====== CHAT ENDPOINTS ======
export async function apiGetChatSessions() {
  return apiFetch('/chat/sessions');
}

export async function apiGetChatHistory(sessionId) {
  return apiFetch(`/chat/history/${sessionId}`);
}

export async function apiSendChat(message, chatSessionId, language) {
  return apiFetch('/chat/send', {
    method: 'POST',
    body: JSON.stringify({ message, chat_session_id: chatSessionId, language }),
  });
}

export async function apiTranscribeAudio(audioBlob) {
  const mime = audioBlob.type || 'audio/webm';
  const mainType = mime.split(';')[0];
  let ext = 'webm';
  if (mainType.includes('ogg')) ext = 'ogg';
  else if (mainType.includes('mp4') || mainType.includes('m4a')) ext = 'm4a';
  else if (mainType.includes('wav')) ext = 'wav';
  else if (mainType.includes('mpeg') || mainType.includes('mp3')) ext = 'mp3';

  const formData = new FormData();
  formData.append('audio', audioBlob, `audio.${ext}`);
  return apiFetch('/chat/transcribe', {
    method: 'POST',
    body: formData,
  });
}


export async function apiRecommendCrop(data) {
  return apiFetch('/chat/recommend_crop', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ====== SCAN ENDPOINTS ======
export async function apiScanImage(formData) {
  const { authToken } = getState();
  const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  // Clear cache on new scans
  clearApiCache();

  try {
    const response = await fetch(`${API_BASE}/scan/predict`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      clearUser();
      showToast('Session expired.');
      window.location.hash = '#landing';
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Scan error:', err);
    showToast('Connection error during scan.');
    return null;
  }
}

// ====== COMMUNITY & MARKETPLACE ENDPOINTS ======
export async function apiGetCommunityPosts() {
  return apiFetch('/community/posts');
}

export async function apiCreateCommunityPost(title, content, category = 'General') {
  return apiFetch('/community/posts', {
    method: 'POST',
    body: JSON.stringify({ title, content, category }),
  });
}

export async function apiGetComments(postId) {
  return apiFetch(`/community/posts/${postId}/comments`);
}

export async function apiCreateComment(postId, content) {
  return apiFetch(`/community/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function apiLikePost(postId) {
  return apiFetch(`/community/posts/${postId}/like`, {
    method: 'POST',
  });
}

export async function apiGetMarketplace(category = 'All') {
  const q = new URLSearchParams({ category });
  return apiFetch(`/community/marketplace?${q}`);
}

export async function apiCreateMarketplaceItem(data) {
  return apiFetch('/community/marketplace', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteMarketplaceItem(itemId) {
  return apiFetch(`/community/marketplace/${itemId}`, {
    method: 'DELETE',
  });
}

// ====== AI FARMER CLIENT WRAPPERS ======
export async function apiGetAICalendar(crop, month, language = 'en') {
  return apiFetch('/community/ai-calendar', {
    method: 'POST',
    body: JSON.stringify({ crop, month, language }),
  });
}

export async function apiPostAIDiagnose(postId) {
  return apiFetch(`/community/posts/${postId}/ai-diagnose`, {
    method: 'POST',
  });
}

// ====== AI CROP PLANNER WRAPPER ======
export async function apiGenerateCropPlan(payload) {
  return apiFetch('/planner/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ====== B2B WHOLESALE DEAL ANALYZER ======
export async function apiAnalyzeWholesaleDeal(itemId, language = 'en') {
  return apiFetch('/wholesale/analyze', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId, language }),
  });
}

// ====== AI WEATHER ADVISORY (Gemini 2.5 Flash + Open-Meteo) ======
export async function apiGetWeatherAdvisory(lang = 'en') {
  return apiFetch(`/weather/advisory?lang=${lang}`);
}

// ====== AI PRICE PREDICTION (Gemini 2.5 Flash) ======
export async function apiSuggestPrice(data) {
  return apiFetch('/wholesale/suggest-price', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ====== AI OUTBREAK FORECASTING (Gemini 2.5 Flash + GIS Heatmap) ======
export async function apiGetOutbreakForecast() {
  return apiFetch('/dashboard/forecast');
}

