// ====== ArgoFarm — CropMind Chat Page ======

import { getState, setState } from '../state.js';
import { showToast, generateUUID, parseMarkdown, getTimeString, speakText } from '../utils.js';
import { apiGetChatSessions, apiGetChatHistory, apiSendChat, apiScanImage, apiRecommendCrop } from '../api.js';
import { renderMobileHeader, openMobileMenu } from '../components/sidebar.js';
import { setLang } from '../state.js';
import { navigate } from '../router.js';

let chatContainer = null;

export async function mountChat(container) {
  container.innerHTML = '';
  container.classList.add('chat-page');
  chatContainer = container;

  const state = getState();
  if (!state.activeChatSessionId) setState({ activeChatSessionId: generateUUID() });

  container.innerHTML = `
    <div class="chat-history-sidebar" id="chatHistorySidebar">
      <div class="chat-history-header">
        <button class="icon-btn" id="chatHistoryBack" type="button" title="Back"><i class="fas fa-arrow-left"></i></button>
        <span style="font-weight:600;font-size:14px;">Chats</span>
        <button class="icon-btn" id="newChatBtn" type="button" title="New Chat"><i class="fas fa-pen-to-square"></i></button>
      </div>
      <div class="chat-history-list" id="chatHistoryList"></div>
    </div>

    <div class="chat-main" id="chatMain">
      <header class="chat-header">
        <div class="chat-header-left">
          <button class="icon-btn mobile-hamburger" id="chatMobileMenu" type="button" style="display:none;"><i class="fas fa-bars"></i></button>
          <div class="chat-bot-avatar"><i class="fas fa-robot"></i></div>
          <div>
            <div style="font-weight:600;font-size:13px;">CropMind AI</div>
            <div style="font-size:10px;color:var(--accent);display:flex;align-items:center;gap:4px;">
              <span class="pulse-dot" style="width:5px;height:5px;"></span> Online
            </div>
          </div>
        </div>
        <div class="chat-header-right">
          <div class="lang-toggle">
            <button type="button" id="langEn" class="active">EN</button>
            <button type="button" id="langUr">اردو</button>
          </div>
          <button class="icon-btn" id="audioToggle" type="button" title="Audio On"><i class="fas fa-volume-high" style="color:var(--accent);"></i></button>
          <button class="icon-btn" id="toggleHistoryBtn" type="button" title="Chat History"><i class="fas fa-history"></i></button>
          <button class="icon-btn" id="copilotCloseBtn" type="button" title="Close Drawer"><i class="fas fa-xmark"></i></button>
        </div>
      </header>

      <div class="chat-welcome" id="chatWelcome">
        <div class="chat-welcome-inner">
          <h1 class="welcome-title">Ask CropMind, <span id="welcomeName">User</span></h1>
          <div class="welcome-pill">
            <button class="pill-btn" type="button" id="welcomeUploadBtn" title="Upload" style="margin-right:8px;"><i class="fas fa-plus"></i></button>
            <input type="text" class="pill-input" id="welcomeInput" placeholder="Ask CropMind...">
            <div class="welcome-model-pill" style="display:flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(255,255,255,0.06);border-radius:12px;font-size:11px;font-weight:500;color:var(--fg-muted);margin-right:10px;white-space:nowrap;flex-shrink:0;">
              <span>Llama 3.2 Vision</span> <i class="fas fa-chevron-down" style="font-size:8px;"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-messages-area" id="chatMessages"></div>

      <div class="chat-input-bar" id="chatInputBar">
        <div class="chat-input-inner" id="chatInputInner">
          <input type="file" id="imageUpload" accept="image/*" style="display:none;">
          <div class="upload-box" id="attachBtn" title="Upload image">
            <i class="fas fa-cloud-arrow-up"></i>
            <span class="upload-box-text">Upload</span>
          </div>
          <input type="text" class="pill-input" id="chatInput" placeholder="Describe your crop issue or ask a question...">
          <button class="pill-btn" id="sendBtn" type="button" title="Send" style="color:var(--accent);"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    </div>
  `;

  // Setup welcome name
  const user = getState().user;
  if (user) {
    container.querySelector('#welcomeName').textContent = user.name || 'User';
  }

  // Mobile menu
  const mobileMenuBtn = container.querySelector('#chatMobileMenu');
  if (window.innerWidth <= 768) mobileMenuBtn.style.display = 'flex';
  mobileMenuBtn.addEventListener('click', () => {
    openMobileMenu();
  });

  // Lang toggle
  container.querySelector('#langEn').addEventListener('click', () => switchLangChat('en'));
  container.querySelector('#langUr').addEventListener('click', () => switchLangChat('ur'));

  // Audio toggle
  container.querySelector('#audioToggle').addEventListener('click', toggleAudio);

  // History sidebar toggle
  container.querySelector('#toggleHistoryBtn').addEventListener('click', toggleHistory);
  container.querySelector('#chatHistoryBack').addEventListener('click', toggleHistory);
  container.querySelector('#newChatBtn').addEventListener('click', startNewChat);

  // Global Copilot Close button
  const copilotCloseBtn = container.querySelector('#copilotCloseBtn');
  if (copilotCloseBtn) {
    copilotCloseBtn.addEventListener('click', () => {
      window.__closeCopilot && window.__closeCopilot();
    });
  }

  // Send message
  container.querySelector('#sendBtn').addEventListener('click', sendMessage);
  container.querySelector('#chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Welcome input
  container.querySelector('#welcomeInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitWelcomeChat();
  });
  container.querySelector('#welcomeUploadBtn').addEventListener('click', () => {
    container.querySelector('#imageUpload').click();
  });

  // Image upload
  container.querySelector('#attachBtn').addEventListener('click', () => {
    container.querySelector('#imageUpload').click();
  });
  container.querySelector('#imageUpload').addEventListener('change', handleImageUpload);

  // Voice recording removed

  // Init chat
  initChatWelcome();
  populateChatHistory();

  return () => {
    container.classList.remove('chat-page');
    chatContainer = null;
  };
}

// ====== WELCOME & INIT ======
function initChatWelcome() {
  const main = chatContainer.querySelector('#chatMain');
  main.classList.remove('chat-active');

  const msgs = chatContainer.querySelector('#chatMessages');
  msgs.innerHTML = '';

  const state = getState();
  const userName = state.user ? state.user.name.split(' ')[0] : 'User';
  const isEn = state.currentLang === 'en';

  addBotMessage(isEn
    ? `Assalam o Alaikum, ${userName}. I'm CropMind, your AI crop diagnostic assistant. I can help you identify diseases, analyze soil conditions, and provide treatment advisories.`
    : `السلام علیکم، ${userName}۔ میں کراپ مائنڈ ہوں، آپ کا AI فصل تشخیصی معاون۔`
  );

  setTimeout(() => {
    addBotMessage(isEn ? 'What would you like to do?' : 'آپ کیا کرنا چاہیں گے؟');
    setTimeout(() => addOptionsMessage(), 400);
  }, 600);
}

function submitWelcomeChat() {
  const input = chatContainer.querySelector('#welcomeInput');
  const chatInput = chatContainer.querySelector('#chatInput');
  if (input.value.trim()) {
    chatInput.value = input.value.trim();
    input.value = '';
    activateChat();
    sendMessage();
  }
}

function activateChat() {
  const main = chatContainer.querySelector('#chatMain');
  main.classList.add('chat-active');
}

// ====== MESSAGES ======
function addBotMessage(text, streaming = true) {
  activateChat();
  const msgs = chatContainer.querySelector('#chatMessages');
  const time = getTimeString();

  const row = document.createElement('div');
  row.className = 'msg-row bot';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const timeDiv = document.createElement('div');
  timeDiv.className = 'msg-time';
  timeDiv.textContent = time;

  const wrap = document.createElement('div');
  wrap.appendChild(bubble);
  wrap.appendChild(timeDiv);
  row.appendChild(wrap);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;

  if (streaming) {
    const words = text.split(' ');
    let idx = 0, acc = '';
    const timer = setInterval(() => {
      if (idx < words.length) {
        acc += (idx === 0 ? '' : ' ') + words[idx];
        bubble.innerHTML = parseMarkdown(acc);
        idx++;
        msgs.scrollTop = msgs.scrollHeight;
      } else { clearInterval(timer); }
    }, 30);
  } else {
    bubble.innerHTML = parseMarkdown(text);
  }
}

function addBotHTML(html) {
  activateChat();
  const msgs = chatContainer.querySelector('#chatMessages');
  const time = getTimeString();
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  row.innerHTML = `<div><div class="msg-bubble">${html}</div><div class="msg-time">${time}</div></div>`;
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

function addUserMessage(text, type = 'text') {
  activateChat();
  const msgs = chatContainer.querySelector('#chatMessages');
  const time = getTimeString();
  const row = document.createElement('div');
  row.className = 'msg-row user';

  let content;
  if (type === 'image') {
    content = `<div class="msg-bubble" style="padding:4px;background:none;border:none;box-shadow:none;"><img src="${text}" alt="upload" style="max-width:200px;border-radius:10px;display:block;border:1px solid var(--border);"/></div>`;
  } else {
    content = `<div class="msg-bubble">${text}</div>`;
  }

  row.innerHTML = `<div>${content}<div class="msg-time">${time}</div></div>`;
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

function addTyping() {
  const msgs = chatContainer.querySelector('#chatMessages');
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  row.id = 'typingIndicator';
  row.innerHTML = '<div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const el = chatContainer?.querySelector('#typingIndicator');
  if (el) el.remove();
}

function addOptionsMessage() {
  const isEn = getState().currentLang === 'en';
  const html = `
    ${isEn ? 'Choose an option or describe your issue:' : 'ایک آپشن منتخب کریں یا اپنا مسئلہ بیان کریں:'}
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
      <button class="btn btn-sm btn-accent chat-opt" data-opt="image" type="button">
        <i class="fas fa-camera"></i> ${isEn ? 'Scan Crop Image' : 'تصویر سکین'}
      </button>
      <button class="btn btn-sm btn-outline chat-opt" data-opt="soil" type="button">
        <i class="fas fa-seedling"></i> ${isEn ? 'Soil Analysis' : 'مٹی کا تجزیہ'}
      </button>
      <button class="btn btn-sm btn-outline chat-opt" data-opt="ask" type="button">
        <i class="fas fa-question-circle"></i> ${isEn ? 'Ask a Question' : 'سوال پوچھیں'}
      </button>
    </div>
  `;
  addBotHTML(html);

  // Attach listeners to the just-added buttons
  setTimeout(() => {
    chatContainer.querySelectorAll('.chat-opt').forEach(btn => {
      btn.addEventListener('click', () => chatOptionClicked(btn.dataset.opt));
    });
  }, 50);
}

function chatOptionClicked(opt) {
  const isEn = getState().currentLang === 'en';
  if (opt === 'image') {
    addUserMessage(isEn ? 'I want to scan a crop image' : 'میں فصل کی تصویر سکین کرنا چاہتا ہوں');
    setTimeout(() => {
      addTyping();
      setTimeout(() => {
        removeTyping();
        addBotHTML((isEn
          ? 'Upload a clear photo of the affected crop — leaves, stem, or whole plant.'
          : 'متاثرہ فصل کی واضح تصویر اپ لوڈ کریں۔') + `
          <div class="upload-zone" onclick="document.getElementById('imageUpload').click()">
            <i class="fas fa-cloud-arrow-up" style="font-size:24px;color:var(--fg-muted);margin-bottom:6px;display:block;"></i>
            <div style="font-size:12px;color:var(--fg-muted);">Click to upload or drag image</div>
            <div style="font-size:10px;color:var(--fg-muted);margin-top:4px;">JPG, PNG up to 10MB</div>
          </div>
        `);
      }, 800);
    }, 200);
  } else if (opt === 'soil') {
    addUserMessage(isEn ? 'I want a soil analysis' : 'میں مٹی کا تجزیہ چاہتا ہوں');
    setTimeout(() => {
      addTyping();
      setTimeout(() => {
        removeTyping();
        renderCropRecommendForm();
      }, 700);
    }, 200);
  } else if (opt === 'ask') {
    addUserMessage(isEn ? 'I have a question about my crops' : 'میرے فصلوں کا سوال ہے');
    setTimeout(() => {
      addTyping();
      setTimeout(() => {
        removeTyping();
        addBotMessage(isEn
          ? 'Go ahead and type your question. I can help with disease identification, treatment recommendations, and crop management.'
          : 'اپنا سوال لکھیں۔ میں بیماری کی شناخت، علاج اور فصل کے انتظام میں مدد کر سکتا ہوں۔');
      }, 600);
    }, 200);
  }
}

function renderSoilForm() {
  const isEn = getState().currentLang === 'en';
  addBotHTML(`
    ${isEn ? 'Provide soil details for recommendations:' : 'مشورے کے لیے مٹی کی تفصیلات دیں:'}
    <div class="inline-form" id="soilFormInline">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div class="form-group" style="margin-bottom:0;">
          <label>${isEn ? 'Crop Type' : 'فصل'}</label>
          <select class="form-input" id="soilCrop"><option value="">Select...</option><option value="Wheat">Wheat</option><option value="Rice">Rice</option><option value="Cotton">Cotton</option><option value="Sugarcane">Sugarcane</option><option value="Maize">Maize</option></select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>${isEn ? 'Soil Type' : 'مٹی'}</label>
          <select class="form-input" id="soilType"><option value="">Select...</option><option value="Clay">Clay</option><option value="Loam">Loam</option><option value="Sandy">Sandy</option><option value="Silty">Silty</option></select>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:8px;">
        <label>pH Level</label>
        <input type="text" class="form-input" id="soilPh" placeholder="e.g. 7.2" style="font-size:13px;">
      </div>
      <button class="btn btn-sm btn-accent" id="submitSoilBtn" type="button" style="width:100%;">
        <i class="fas fa-flask"></i> ${isEn ? 'Analyze' : 'تجزیہ کریں'}
      </button>
    </div>
  `);

  setTimeout(() => {
    const btn = chatContainer.querySelector('#submitSoilBtn');
    if (btn) btn.addEventListener('click', submitSoilForm);
  }, 50);
}

function submitSoilForm() {
  const crop = chatContainer.querySelector('#soilCrop')?.value;
  const soil = chatContainer.querySelector('#soilType')?.value;
  const ph = chatContainer.querySelector('#soilPh')?.value;
  const isEn = getState().currentLang === 'en';

  if (!crop || !soil) { showToast(isEn ? 'Select crop and soil type' : 'فصل اور مٹی منتخب کریں'); return; }

  addUserMessage(`${isEn ? 'Crop' : 'فصل'}: ${crop}, ${isEn ? 'Soil' : 'مٹی'}: ${soil}${ph ? ', pH: ' + ph : ''}`);

  setTimeout(() => {
    addTyping();
    setTimeout(() => {
      removeTyping();
      const phVal = parseFloat(ph) || 7.0;
      const phStatus = phVal < 6.5 ? 'Acidic' : phVal > 8.0 ? 'Alkaline' : 'Neutral';
      const phColor = phVal < 6.5 ? 'var(--danger)' : phVal > 8.0 ? 'var(--warning)' : 'var(--accent)';

      addBotHTML(`
        <div style="font-weight:600;margin-bottom:10px;">${isEn ? 'Soil Analysis Report' : 'مٹی کے تجزیے کی رپورٹ'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
          <div style="background:var(--bg);padding:10px;border-radius:8px;">
            <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;">Soil</div>
            <div style="font-weight:600;margin-top:2px;">${soil}</div>
          </div>
          <div style="background:var(--bg);padding:10px;border-radius:8px;">
            <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;">pH</div>
            <div style="font-weight:600;margin-top:2px;color:${phColor};">${phVal} (${phStatus})</div>
          </div>
        </div>
        <div class="advisory-section">
          <div style="font-weight:600;color:var(--accent);margin-bottom:4px;">${isEn ? 'Recommendation' : 'تجویز'}</div>
          ${isEn
            ? `For ${crop} on ${soil.toLowerCase()} soil at pH ${phVal}: Apply DAP at 100kg/acre as basal dose. Top-dress with Urea at 50kg/acre at tillering.`
            : `${soil} مٹی پر pH ${phVal} پر ${crop}: ڈی اے پی 100kg/ایکڑ بیسل ڈوز لگائیں۔`}
        </div>
      `);
    }, 1200);
  }, 300);
}

// ====== SEND MESSAGE ======
async function sendMessage() {
  const input = chatContainer.querySelector('#chatInput');
  const text = input.value.trim();
  if (!text) return;

  addUserMessage(text);
  input.value = '';

  const state = getState();
  if (!state.authToken) {
    handleMockMessage(text);
    return;
  }

  if (!state.activeChatSessionId) setState({ activeChatSessionId: generateUUID() });

  addTyping();
  const result = await apiSendChat(text, state.activeChatSessionId, state.currentLang);
  removeTyping();

  if (result && result.status === 'success') {
    addBotMessage(result.data.message);
    if (state.audioPlaybackEnabled) speakText(result.data.message, state.currentLang);
    populateChatHistory();

    if (result.data.action_trigger === 'trigger_image_upload') {
      setTimeout(() => chatContainer.querySelector('#imageUpload').click(), 1000);
    } else if (result.data.action_trigger === 'trigger_soil_inputs') {
      setTimeout(() => renderCropRecommendForm(), 1000);
    }
  }
}

function handleMockMessage(text) {
  const isEn = getState().currentLang === 'en';
  setTimeout(() => {
    addTyping();
    setTimeout(() => {
      removeTyping();
      addBotMessage(isEn
        ? 'Thank you for your question. Please upload a crop image for accurate diagnosis, or connect to the backend for AI-powered responses.'
        : 'آپ کے سوال کا شکریہ۔ درست تشخیص کے لیے فصل کی تصویر اپ لوڈ کریں۔');
    }, 800);
  }, 200);
}

// ====== IMAGE UPLOAD ======
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  activateChat();
  const preview = URL.createObjectURL(file);
  addUserMessage(preview, 'image');

  const state = getState();
  if (!state.activeChatSessionId) setState({ activeChatSessionId: generateUUID() });

  const form = new FormData();
  form.append('image', file);
  form.append('lang', state.currentLang);
  form.append('chat_session_id', state.activeChatSessionId);
  form.append('region', state.user?.region || 'Punjab');

  addTyping();
  const result = await apiScanImage(form);
  removeTyping();

  if (result && result.status === 'success' && result.data) {
    const isEn = state.currentLang === 'en';
    if (result.data.assistant_message) {
      addBotMessage(result.data.assistant_message);
    } else {
      addBotMessage(isEn ? 'Analysis complete — here are the results.' : 'تجزیہ مکمل — نتائج:');
    }
    showResultCard(result.data);
    populateChatHistory();
  }
  e.target.value = '';
}

function showResultCard(data) {
  const isEn = getState().currentLang === 'en';
  const advisory = typeof data.advisory === 'object' ? (isEn ? data.advisory.en : data.advisory.ur) : (data.advisory || '');

  addBotHTML(`
    <div class="result-card">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
        <div>
          <div style="font-size:10px;text-transform:uppercase;color:var(--fg-muted);letter-spacing:0.5px;margin-bottom:2px;">${isEn ? 'Disease Detected' : 'بیماری'}</div>
          <div style="font-size:16px;font-weight:700;color:var(--danger);">${data.disease}</div>
          <div style="font-size:12px;color:var(--fg-muted);margin-top:2px;">${data.crop_type || ''} — ${data.region || ''}</div>
        </div>
        <span class="badge ${data.status === 'Healthy' ? 'badge-green' : 'badge-red'}">${data.status}</span>
      </div>
      ${advisory ? `<div class="advisory-section" style="margin-top:12px;">
        <div style="font-size:11px;text-transform:uppercase;color:var(--accent);letter-spacing:0.5px;margin-bottom:6px;font-weight:600;">
          <i class="fas fa-prescription-bottle-medical" style="margin-right:4px;"></i> ${isEn ? 'AI Treatment & Saving Advisory' : 'اے آئی تشخیصی و بچاؤ ایڈوائزری'}
        </div>
        <div style="font-size:13px;line-height:1.7;color:var(--fg);">${parseMarkdown(advisory)}</div>
      </div>` : ''}
    </div>
  `);
}


function showCropRecommendCard(data) {
  const isEn = getState().currentLang === 'en';
  
  const n = data.n || 90;
  const p = data.p || 42;
  const k = data.k || 43;
  const ph = data.ph || 6.5;
  const temp = data.temperature || 28;
  const humid = data.humidity || 60;
  const rain = data.rainfall || 120;
  const crop = data.crop_display || (data.recommended_crop ? data.recommended_crop.charAt(0).toUpperCase() + data.recommended_crop.slice(1) : 'Wheat');
  const advisory = data.advisory || '';
  
  const phPercent = Math.min(Math.max((ph - 3.5) / (10.0 - 3.5) * 100, 0), 100);
  const phStatus = ph < 5.5 ? (isEn ? 'Acidic' : 'تیزابی') : ph > 7.5 ? (isEn ? 'Alkaline' : 'کلراٹھی / اساسی') : (isEn ? 'Neutral' : 'معتدل');
  const phColor = ph < 5.5 ? 'var(--danger)' : ph > 7.5 ? 'var(--warning)' : 'var(--accent)';
  
  const pinId = 'pin_' + Math.random().toString(36).substr(2, 6);
  const nId = 'n_' + Math.random().toString(36).substr(2, 6);
  const pId = 'p_' + Math.random().toString(36).substr(2, 6);
  const kId = 'k_' + Math.random().toString(36).substr(2, 6);
  const exportId = 'exp_' + Math.random().toString(36).substr(2, 6);

  const cropUrduNameMap = {
    'wheat': 'گندم (Wheat)',
    'rice': 'چاول (Rice)',
    'cotton': 'کپاس (Cotton)',
    'sugarcane': 'گنا (Sugarcane)',
    'maize': 'مکئی (Maize)',
    'jute': 'پٹسن (Jute)',
    'coconut': 'ناریل (Coconut)',
    'coffee': 'کافی (Coffee)',
    'tea': 'چائے (Tea)',
    'apple': 'سیب (Apple)',
    'banana': 'کیلا (Banana)',
    'grapes': 'انگور (Grapes)',
    'mango': 'آم (Mango)',
    'orange': 'مالٹا (Orange)',
    'papaya': 'پپیتا (Papaya)',
    'pomegranate': 'انار (Pomegranate)',
    'watermelon': 'تربوز (Watermelon)',
    'muskmelon': 'خربوزہ (Muskmelon)'
  };

  const cropDisplayUrdu = cropUrduNameMap[crop.toLowerCase()] || crop;
  const cropTitle = isEn ? crop : cropDisplayUrdu;

  addBotHTML(`
    <div class="recommend-card">
      <div class="rec-header">
        <div>
          <div style="font-size:10px;text-transform:uppercase;color:var(--fg-muted);letter-spacing:0.5px;margin-bottom:2px;">
            <i class="fas fa-seedling"></i> ${isEn ? 'Optimal Crop Predicted' : 'تجویز کردہ بہترین فصل'}
          </div>
          <div class="rec-crop-badge">${cropTitle}</div>
        </div>
        <span class="badge badge-green">${isEn ? 'Highly Compatible' : 'انتہائی موزوں'}</span>
      </div>

      <div style="font-size:11px;font-weight:600;color:var(--fg-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">
        ${isEn ? 'Soil Nutrient Profile' : 'مٹی کے غذائی اجزاء'}
      </div>
      <div class="rec-gauges-grid">
        <div class="rec-gauge-row">
          <div class="rec-gauge-meta">
            <span>${isEn ? 'Nitrogen (N)' : 'نائٹروجن (N)'}</span>
            <span style="font-weight:700;color:#60a5fa;">${n} ppm</span>
          </div>
          <div class="rec-gauge-bar">
            <div class="rec-gauge-fill n-fill" id="${nId}" style="width:0%;"></div>
          </div>
        </div>
        <div class="rec-gauge-row">
          <div class="rec-gauge-meta">
            <span>${isEn ? 'Phosphorus (P)' : 'فاسفورس (P)'}</span>
            <span style="font-weight:700;color:#f472b6;">${p} ppm</span>
          </div>
          <div class="rec-gauge-bar">
            <div class="rec-gauge-fill p-fill" id="${pId}" style="width:0%;"></div>
          </div>
        </div>
        <div class="rec-gauge-row">
          <div class="rec-gauge-meta">
            <span>${isEn ? 'Potassium (K)' : 'پوٹاشیم (K)'}</span>
            <span style="font-weight:700;color:#fde047;">${k} ppm</span>
          </div>
          <div class="rec-gauge-bar">
            <div class="rec-gauge-fill k-fill" id="${kId}" style="width:0%;"></div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:var(--fg-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">
        <span>${isEn ? 'Soil Acidity' : 'مٹی کی تیزابیت'}</span>
        <span style="color:${phColor};font-weight:700;">pH ${ph} (${phStatus})</span>
      </div>
      <div class="ph-track-visual">
        <div class="ph-indicator-pin" id="${pinId}" style="left:50%;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--fg-muted);margin-bottom:16px;">
        <span>${isEn ? '3.5 (Acidic)' : '3.5 (تیزابی)'}</span>
        <span>${isEn ? '7.0 (Neutral)' : '7.0 (معتدل)'}</span>
        <span>${isEn ? '10.0 (Alkaline)' : '10.0 (اساسی)'}</span>
      </div>

      <div style="font-size:11px;font-weight:600;color:var(--fg-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">
        ${isEn ? 'Climate Conditions' : 'موسمی حالات'}
      </div>
      <div class="rec-climate-pills">
        <div class="rec-climate-pill">
          <i class="fas fa-cloud-showers-water"></i>
          <div style="font-size:9px;color:var(--fg-muted);">${isEn ? 'Rainfall' : 'بارش'}</div>
          <div class="rec-climate-val">${rain}mm</div>
        </div>
        <div class="rec-climate-pill">
          <i class="fas fa-temperature-high"></i>
          <div style="font-size:9px;color:var(--fg-muted);">${isEn ? 'Temp' : 'درجہ حرارت'}</div>
          <div class="rec-climate-val">${temp}°C</div>
        </div>
        <div class="rec-climate-pill">
          <i class="fas fa-droplet"></i>
          <div style="font-size:9px;color:var(--fg-muted);">${isEn ? 'Humidity' : 'نمی'}</div>
          <div class="rec-climate-val">${humid}%</div>
        </div>
      </div>

      <div class="advisory-section">
        <div style="font-size:11px;text-transform:uppercase;color:var(--accent);letter-spacing:0.5px;margin-bottom:6px;font-weight:700;display:flex;align-items:center;gap:6px;">
          <i class="fas fa-lightbulb" style="color:var(--accent);"></i> ${isEn ? 'AI Yield Advisory Plan' : 'اے آئی پیداواری منصوبہ'}
        </div>
        <div style="font-size:13px;line-height:1.6;color:var(--fg);">${parseMarkdown(advisory)}</div>
      </div>

      <button class="btn btn-sm btn-outline" id="${exportId}" type="button" style="width:100%;margin-top:10px;">
        <i class="fas fa-file-pdf"></i> ${isEn ? 'Download Soil Report (TXT)' : 'رپورٹ ڈاؤن لوڈ کریں'}
      </button>
    </div>
  `);

  setTimeout(() => {
    // Animate bars
    const nBar = chatContainer.querySelector(`#${nId}`);
    const pBar = chatContainer.querySelector(`#${pId}`);
    const kBar = chatContainer.querySelector(`#${kId}`);
    const phPin = chatContainer.querySelector(`#${pinId}`);
    
    if (nBar) nBar.style.width = Math.min((n / 150) * 100, 100) + '%';
    if (pBar) pBar.style.width = Math.min((p / 150) * 100, 100) + '%';
    if (kBar) kBar.style.width = Math.min((k / 250) * 100, 100) + '%';
    if (phPin) phPin.style.left = phPercent + '%';

    // PDF/TXT Export Handler
    chatContainer.querySelector(`#${exportId}`)?.addEventListener('click', () => {
      const reportTitle = `ArgoFarm AI Soil Recommendation Report - ${crop}`;
      const reportText = `
========================================
    ARGOFARM AI SOIL CHEMISTRY REPORT
========================================
Date: ${new Date().toLocaleDateString()}
Recommended Crop: ${crop}
Compatibility: Highly Compatible

Soil Parameters:
----------------
- Nitrogen (N): ${n} ppm (Target: 90)
- Phosphorus (P): ${p} ppm (Target: 42)
- Potassium (K): ${k} ppm (Target: 43)
- Soil pH: ${ph} (${phStatus})
- Temperature: ${temp} °C
- Humidity: ${humid} %
- Average Rainfall: ${rain} mm

========================================
          AI AGRONOMIST ADVISORY
========================================
${advisory.replace(/\*\*/g, '').replace(/###/g, '')}

========================================
Generated by CropMind AI — Thank you for using ArgoFarm!
      `;
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ArgoFarm_Soil_Report_${crop.replace(/\s+/g, '_')}.txt`;
      link.click();
      showToast(isEn ? 'Report downloaded successfully!' : 'رپورٹ کامیابی کے ساتھ ڈاؤن لوڈ ہو گئی!');
    });
  }, 100);
}

function renderCropRecommendForm() {
  const isEn = getState().currentLang === 'en';
  
  const formId = 'recForm_' + Math.random().toString(36).substr(2, 6);
  const submitBtnId = 'submitBtn_' + Math.random().toString(36).substr(2, 6);
  const nInputId = 'nInput_' + Math.random().toString(36).substr(2, 6);
  const pInputId = 'pInput_' + Math.random().toString(36).substr(2, 6);
  const kInputId = 'kInput_' + Math.random().toString(36).substr(2, 6);
  const phInputId = 'phInput_' + Math.random().toString(36).substr(2, 6);
  const rainInputId = 'rainInput_' + Math.random().toString(36).substr(2, 6);
  const tempInputId = 'tempInput_' + Math.random().toString(36).substr(2, 6);
  const humidInputId = 'humidInput_' + Math.random().toString(36).substr(2, 6);
  
  const nBadgeId = 'nB_' + Math.random().toString(36).substr(2, 6);
  const pBadgeId = 'pB_' + Math.random().toString(36).substr(2, 6);
  const kBadgeId = 'kB_' + Math.random().toString(36).substr(2, 6);
  const phBadgeId = 'phB_' + Math.random().toString(36).substr(2, 6);
  const rainBadgeId = 'rainB_' + Math.random().toString(36).substr(2, 6);
  const tempBadgeId = 'tempB_' + Math.random().toString(36).substr(2, 6);
  const humidBadgeId = 'humidB_' + Math.random().toString(36).substr(2, 6);
  
  const phLabelId = 'phL_' + Math.random().toString(36).substr(2, 6);
  
  const presetFertileId = 'presetF_' + Math.random().toString(36).substr(2, 6);
  const presetDryId = 'presetD_' + Math.random().toString(36).substr(2, 6);
  const presetWetId = 'presetW_' + Math.random().toString(36).substr(2, 6);

  addBotHTML(`
    <div class="inline-form" id="${formId}" style="max-width:480px;width:100%;margin-top:10px;">
      <div style="font-weight:700;margin-bottom:12px;font-size:14px;color:var(--accent);display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border);padding-bottom:8px;">
        <i class="fas fa-flask"></i> ${isEn ? 'AI Soil Analyzer Form' : 'اے آئی مٹی کا تجزیہ فارم'}
      </div>
      
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;align-items:center;">
        <span style="font-size:10px;font-weight:600;color:var(--fg-muted);">${isEn ? 'Presets:' : 'پریسیٹس:'}</span>
        <button class="rec-preset-btn" id="${presetFertileId}" type="button">${isEn ? 'Fertile Loam' : 'زرخیز مٹی'}</button>
        <button class="rec-preset-btn" id="${presetDryId}" type="button">${isEn ? 'Dry Sandy' : 'صحرائی ریتلی'}</button>
        <button class="rec-preset-btn" id="${presetWetId}" type="button">${isEn ? 'Wet Silty' : 'دلدلی مٹی'}</button>
      </div>

      <!-- Nutrients Section -->
      <div style="font-size:10px;font-weight:700;color:var(--fg-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
        ${isEn ? '1. Soil Chemistry (NPK & pH)' : '1۔ مٹی کی کیمسٹری'}
      </div>
      
      <div class="soil-slider-group">
        <div class="soil-slider-header">
          <span>${isEn ? 'Nitrogen (N)' : 'نائٹروجن (N)'}</span>
          <span class="soil-slider-badge"><span id="${nBadgeId}">90</span> ppm</span>
        </div>
        <input type="range" min="0" max="150" value="90" class="soil-range-input" id="${nInputId}">
      </div>

      <div class="soil-slider-group">
        <div class="soil-slider-header">
          <span>${isEn ? 'Phosphorus (P)' : 'فاسفورس (P)'}</span>
          <span class="soil-slider-badge"><span id="${pBadgeId}">42</span> ppm</span>
        </div>
        <input type="range" min="0" max="150" value="42" class="soil-range-input" id="${pInputId}">
      </div>

      <div class="soil-slider-group">
        <div class="soil-slider-header">
          <span>${isEn ? 'Potassium (K)' : 'پوٹاشیم (K)'}</span>
          <span class="soil-slider-badge"><span id="${kBadgeId}">43</span> ppm</span>
        </div>
        <input type="range" min="0" max="250" value="43" class="soil-range-input" id="${kInputId}">
      </div>

      <div class="soil-slider-group" style="margin-bottom:16px;">
        <div class="soil-slider-header">
          <span>${isEn ? 'Soil pH Level' : 'پی ایچ لیول (pH)'}</span>
          <span class="soil-slider-badge">
            <span id="${phBadgeId}">6.5</span> pH 
            <span style="font-size:9px;margin-left:4px;font-weight:600;color:var(--accent);" id="${phLabelId}">(${isEn ? 'Neutral' : 'معتدل'})</span>
          </span>
        </div>
        <input type="range" min="3.5" max="10" step="0.1" value="6.5" class="soil-range-input" id="${phInputId}">
      </div>

      <!-- Climate Section -->
      <div style="font-size:10px;font-weight:700;color:var(--fg-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
        ${isEn ? '2. Climate Conditions' : '2۔ موسمی حالات'}
      </div>

      <div class="soil-slider-group">
        <div class="soil-slider-header">
          <span>${isEn ? 'Average Rainfall' : 'اوسط بارش'}</span>
          <span class="soil-slider-badge"><span id="${rainBadgeId}">120</span> mm</span>
        </div>
        <input type="range" min="0" max="400" value="120" class="soil-range-input" id="${rainInputId}">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div class="soil-slider-group" style="margin-bottom:0;">
          <div class="soil-slider-header">
            <span>${isEn ? 'Temp' : 'درجہ حرارت'}</span>
            <span class="soil-slider-badge"><span id="${tempBadgeId}">28</span>°C</span>
          </div>
          <input type="range" min="10" max="50" value="28" class="soil-range-input" id="${tempInputId}">
        </div>
        <div class="soil-slider-group" style="margin-bottom:0;">
          <div class="soil-slider-header">
            <span>${isEn ? 'Humidity' : 'نمی'}</span>
            <span class="soil-slider-badge"><span id="${humidBadgeId}">60</span>%</span>
          </div>
          <input type="range" min="10" max="100" value="60" class="soil-range-input" id="${humidInputId}">
        </div>
      </div>

      <button class="btn btn-sm btn-accent" id="${submitBtnId}" type="button" style="width:100%;font-weight:700;">
        <i class="fas fa-magic"></i> ${isEn ? 'Calculate Best Crop' : 'بہترین فصل تجویز کریں'}
      </button>
    </div>
  `);

  setTimeout(() => {
    const formEl = chatContainer.querySelector(`#${formId}`);
    if (!formEl) return;

    // Sliders input events
    const wireSlider = (inputId, badgeId, isPh = false) => {
      const input = formEl.querySelector(`#${inputId}`);
      const badge = formEl.querySelector(`#${badgeId}`);
      if (!input || !badge) return;

      input.addEventListener('input', (e) => {
        const val = e.target.value;
        badge.textContent = val;
        
        if (isPh) {
          const phVal = parseFloat(val);
          const phLabel = formEl.querySelector(`#${phLabelId}`);
          if (phLabel) {
            let status = '';
            let color = '';
            if (phVal < 5.5) {
              status = isEn ? 'Acidic' : 'تیزابی';
              color = 'var(--danger)';
            } else if (phVal > 7.5) {
              status = isEn ? 'Alkaline' : 'کلراٹھی / اساسی';
              color = 'var(--warning)';
            } else {
              status = isEn ? 'Neutral' : 'معتدل';
              color = 'var(--accent)';
            }
            phLabel.textContent = `(${status})`;
            phLabel.style.color = color;
          }
        }
      });
    };

    wireSlider(nInputId, nBadgeId);
    wireSlider(pInputId, pBadgeId);
    wireSlider(kInputId, kBadgeId);
    wireSlider(phInputId, phBadgeId, true);
    wireSlider(rainInputId, rainBadgeId);
    wireSlider(tempInputId, tempBadgeId);
    wireSlider(humidInputId, humidBadgeId);

    // Wire Presets
    const setPreset = (n, p, k, ph, rain, temp, humid) => {
      const inputs = {
        [nInputId]: n,
        [pInputId]: p,
        [kInputId]: k,
        [phInputId]: ph,
        [rainInputId]: rain,
        [tempInputId]: temp,
        [humidInputId]: humid
      };
      for (const [id, val] of Object.entries(inputs)) {
        const inp = formEl.querySelector(`#${id}`);
        if (inp) {
          inp.value = val;
          inp.dispatchEvent(new Event('input'));
        }
      }
    };

    formEl.querySelector(`#${presetFertileId}`)?.addEventListener('click', () => {
      setPreset(105, 52, 65, 6.7, 140, 25, 75);
      showToast(isEn ? 'Fertile presets loaded' : 'زرخیز مٹی کی تفصیلات درج ہو گئیں');
    });
    formEl.querySelector(`#${presetDryId}`)?.addEventListener('click', () => {
      setPreset(35, 20, 30, 8.3, 30, 38, 25);
      showToast(isEn ? 'Arid presets loaded' : 'ریتلی صحرائی مٹی کی تفصیلات درج ہو گئیں');
    });
    formEl.querySelector(`#${presetWetId}`)?.addEventListener('click', () => {
      setPreset(85, 45, 45, 6.0, 240, 29, 85);
      showToast(isEn ? 'Silty/Wet presets loaded' : 'دلدلی چکنی مٹی کی تفصیلات درج ہو گئیں');
    });

    // Wire Submit Click
    formEl.querySelector(`#${submitBtnId}`)?.addEventListener('click', async () => {
      const state = getState();
      const nVal = parseFloat(formEl.querySelector(`#${nInputId}`)?.value || 90);
      const pVal = parseFloat(formEl.querySelector(`#${pInputId}`)?.value || 42);
      const kVal = parseFloat(formEl.querySelector(`#${kInputId}`)?.value || 43);
      const phVal = parseFloat(formEl.querySelector(`#${phInputId}`)?.value || 6.5);
      const rainVal = parseFloat(formEl.querySelector(`#${rainInputId}`)?.value || 120);
      const tempVal = parseFloat(formEl.querySelector(`#${tempInputId}`)?.value || 28);
      const humidVal = parseFloat(formEl.querySelector(`#${humidInputId}`)?.value || 60);

      addUserMessage(`${isEn ? 'Submitted Soil Metrics' : 'مٹی کی معلومات بھیج دی گئیں'}: N=${nVal}, P=${pVal}, K=${kVal}, pH=${phVal}`);
      
      addTyping();
      const result = await apiRecommendCrop({
        chat_session_id: state.activeChatSessionId,
        language: state.currentLang,
        n: nVal,
        p: pVal,
        k: kVal,
        ph: phVal,
        rainfall: rainVal,
        temperature: tempVal,
        humidity: humidVal
      });
      removeTyping();

      if (result && result.status === 'success') {
        showCropRecommendCard(result.data);
      }
    });
  }, 100);
}

// Voice recording removed

// ====== CHAT HISTORY ======
async function populateChatHistory() {
  const list = chatContainer?.querySelector('#chatHistoryList');
  if (!list) return;

  const state = getState();
  if (!state.authToken) { list.innerHTML = '<div style="padding:14px;text-align:center;color:var(--fg-muted);font-size:11px;">Login to see history</div>'; return; }

  const result = await apiGetChatSessions();
  if (!result || result.status !== 'success') { list.innerHTML = ''; return; }

  const sessions = result.data || [];
  if (!sessions.length) {
    list.innerHTML = '<div style="padding:14px;text-align:center;color:var(--fg-muted);font-size:11px;">No past chats</div>';
    return;
  }

  list.innerHTML = `
    <div class="chat-history-group-label">Recent Chats</div>
    ${sessions.map(s => {
      const sid = s.chat_session_id || s.id;
      const active = sid == state.activeChatSessionId;
      return `
        <div class="chat-history-item ${active ? 'active' : ''}" data-sid="${sid}">
          <i class="fa-regular fa-comments ch-icon"></i>
          <div class="ch-meta">
            <div class="ch-title">${s.title || 'Crop Chat'}</div>
            <div class="ch-preview">${s.preview || 'View conversation...'}</div>
          </div>
        </div>
      `;
    }).join('')}
  `;

  list.querySelectorAll('.chat-history-item').forEach(item => {
    item.addEventListener('click', () => loadChatSession(item.dataset.sid));
  });
}

async function loadChatSession(sid) {
  setState({ activeChatSessionId: sid });
  activateChat();

  const msgs = chatContainer.querySelector('#chatMessages');
  msgs.innerHTML = '';
  addTyping();

  const result = await apiGetChatHistory(sid);
  removeTyping();

  if (result?.status === 'success' && result.data.length > 0) {
    result.data.forEach(m => {
      if (m.sender === 'bot') {
        let meta = null;
        if (m.metadata) {
          try {
            meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
          } catch (e) {
            console.error("Error parsing message metadata:", e);
          }
        }

        if (meta && meta.is_crop_recommendation) {
          showCropRecommendCard(meta);
        } else if (meta && meta.is_scan_result) {
          showResultCard(meta);
        } else if (m.message.includes('<div class="result-card">') || m.message.includes('<div class="recommend-card">') || m.message.startsWith('<div')) {
          addBotHTML(m.message);
        } else {
          addBotMessage(m.message, false);
        }
      } else {
        addUserMessage(m.message);
      }
    });
  } else initChatWelcome();

  // Close history on mobile
  if (window.innerWidth <= 768) chatContainer.classList.remove('show-history');

  populateChatHistory();
}

function startNewChat() {
  setState({ activeChatSessionId: generateUUID(), chatStep: 0 });
  initChatWelcome();
  showToast('New chat started');
  populateChatHistory();
  if (window.innerWidth <= 768) chatContainer.classList.remove('show-history');
}

function toggleHistory() {
  chatContainer.classList.toggle('show-history');
}

// ====== LANG & AUDIO ======
function switchLangChat(lang) {
  setLang(lang);
  chatContainer.querySelector('#langEn').classList.toggle('active', lang === 'en');
  chatContainer.querySelector('#langUr').classList.toggle('active', lang === 'ur');

  const welcomeName = chatContainer.querySelector('#welcomeName');
  const user = getState().user;
  const name = user ? user.name : 'User';
  const title = chatContainer.querySelector('.welcome-title');
  if (title) {
    title.innerHTML = lang === 'ur'
      ? `کراپ مائنڈ سے پوچھیں، <span id="welcomeName">${name}</span>`
      : `Ask CropMind, <span id="welcomeName">${name}</span>`;
  }

  const chatInput = chatContainer.querySelector('#chatInput');
  if (chatInput) chatInput.placeholder = lang === 'ur' ? 'اپنا سوال لکھیں...' : 'Describe your crop issue...';
  const welcomeInput = chatContainer.querySelector('#welcomeInput');
  if (welcomeInput) welcomeInput.placeholder = lang === 'ur' ? 'کراپ مائنڈ سے پوچھیں...' : 'Ask CropMind...';

  // Force sidebar update
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) {
    sidebar.innerHTML = '';
    import('../components/sidebar.js').then(m => m.renderSidebar(sidebar));
  }
}

function toggleAudio() {
  const state = getState();
  const enabled = !state.audioPlaybackEnabled;
  setState({ audioPlaybackEnabled: enabled });
  const btn = chatContainer.querySelector('#audioToggle');
  if (btn) {
    btn.innerHTML = enabled
      ? '<i class="fas fa-volume-high" style="color:var(--accent);"></i>'
      : '<i class="fas fa-volume-xmark" style="color:var(--fg-muted);"></i>';
  }
  if (!enabled) window.speechSynthesis?.cancel();
  showToast(enabled ? 'Audio enabled' : 'Audio muted');
}

// ====== GLOBAL SAAS COPILOT INTEGRATION APIs ======

function formatDealReportInChat(rawText, isUr) {
  let html = rawText.trim();
  html = html.replace(/\n/g, '<br/>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--fg);font-weight:700;">$1</strong>');
  
  // Style headers
  html = html.replace(/###\s+([^\n<]+)/g, '<h3 style="font-size:13px;font-weight:800;color:var(--accent);margin-top:14px;margin-bottom:6px;border-bottom:1px dashed var(--border);padding-bottom:4px;">$1</h3>');
  html = html.replace(/##\s+([^\n<]+)/g, '<h2 style="font-size:15px;font-weight:800;color:var(--accent);margin-top:18px;margin-bottom:8px;">$1</h2>');
  
  // Convert bullets to checked rows
  html = html.replace(/[\*\-]\s+([^\n<]+)/g, '<div style="display:flex;gap:6px;margin-bottom:4px;align-items:flex-start;font-size:12.5px;"><i class="fas fa-circle-check" style="color:var(--accent);margin-top:4px;font-size:9px;flex-shrink:0;"></i><div>$1</div></div>');
  
  // Badges
  html = html.replace(/🔥\s*Excellent Bargain/gi, '<span class="badge badge-green" style="font-size:10px;padding:3px 8px;margin-bottom:8px;"><i class="fas fa-fire"></i> EXCELLENT BARGAIN</span>');
  html = html.replace(/🟢\s*Fair Price/gi, '<span class="badge badge-blue" style="font-size:10px;padding:3px 8px;margin-bottom:8px;"><i class="fas fa-circle-check"></i> FAIR PRICE</span>');
  html = html.replace(/⚠️\s*Overpriced/gi, '<span class="badge badge-red" style="font-size:10px;padding:3px 8px;margin-bottom:8px;"><i class="fas fa-circle-exclamation"></i> OVERPRICED</span>');
  
  html = html.replace(/🔥\s*بہترین قیمت/g, '<span class="badge badge-green" style="font-size:10px;padding:3px 8px;margin-bottom:8px;"><i class="fas fa-fire"></i> بہترین قیمت</span>');
  html = html.replace(/🟢\s*مناسب قیمت/g, '<span class="badge badge-blue" style="font-size:10px;padding:3px 8px;margin-bottom:8px;"><i class="fas fa-circle-check"></i> مناسب قیمت</span>');
  html = html.replace(/⚠️\s*زیادہ قیمت/g, '<span class="badge badge-red" style="font-size:10px;padding:3px 8px;margin-bottom:8px;"><i class="fas fa-circle-exclamation"></i> زیادہ قیمت</span>');

  return `
    <div class="result-card" style="margin-top:4px;">
      <div style="font-size:10px;text-transform:uppercase;color:var(--fg-muted);letter-spacing:0.5px;margin-bottom:8px;font-weight:600;display:flex;align-items:center;gap:4px;">
        <i class="fas fa-brain"></i> ${isUr ? 'کراپ مائنڈ ڈیل تجزیہ' : 'CropMind B2B Deal Analysis'}
      </div>
      <div style="font-size:12.5px;line-height:1.65;color:var(--fg);">${html}</div>
    </div>
  `;
}

window.__assessWholesaleDealInCopilot = async function(item) {
  // 1. Slide open the Copilot drawer
  window.__openCopilot && window.__openCopilot();
  
  // 2. Set active session if not exists
  const state = getState();
  if (!state.activeChatSessionId) {
    setState({ activeChatSessionId: generateUUID() });
  }
  
  // Activate chat layout in sidebar
  activateChat();
  
  const isUr = state.currentLang === 'ur';
  
  // 3. Print user inquiry message in chat bubble
  const inquiryText = isUr 
    ? `براہ کرم اس ہول سیل سودے کا جائزہ لیں: **${item.title}** (قیمت: ${item.price}، بیچنے والا: ${item.seller_name})`
    : `Please evaluate this wholesale B2B deal: **${item.title}** listed at **${item.price}** by **${item.seller_name}**.`;
    
  addUserMessage(inquiryText);
  
  // 4. Show typing indicator
  addTyping();
  
  // 5. Run wholesale evaluation API
  const res = await apiAnalyzeWholesaleDeal(item.id, state.currentLang);
  
  // 6. Remove typing indicator
  removeTyping();
  
  if (res && res.status === 'success') {
    const reportText = res.data.analysis;
    const formattedHtml = formatDealReportInChat(reportText, isUr);
    addBotHTML(formattedHtml);
    
    // Auto speak summary of evaluation if audio is enabled
    if (state.audioPlaybackEnabled) {
      const summaryText = isUr
        ? "سودے کا تجزیہ مکمل ہو گیا ہے۔ تفصیلات چیٹ میں دیکھیں۔"
        : "Deal evaluation is complete. Please review the advisory details displayed in the chat.";
      speakText(summaryText, state.currentLang);
    }
  } else {
    addBotMessage(isUr 
      ? "معذرت، میں اس وقت اس سودے کا جائزہ نہیں لے سکتا۔ براہ کرم دوبارہ کوشش کریں۔"
      : "Sorry, I was unable to evaluate this B2B deal at the moment. Please try again.");
  }
};
