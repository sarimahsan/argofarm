// ====== ArgoFarm — Utility Functions ======

let toastTimer = null;

export function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const item = document.createElement('div');
  item.className = 'toast-item';
  item.textContent = message;
  container.appendChild(item);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => item.classList.add('show'));
  });

  setTimeout(() => {
    item.classList.remove('show');
    setTimeout(() => item.remove(), 400);
  }, 2800);
}

export function generateUUID() {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

export function parseMarkdown(md) {
  let html = md;
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/^[-\*]\s+(.+)$/gm, '&bull; $1');
  return html;
}

export function formatDate(dateStr, lang = 'en') {
  const d = new Date(dateStr);
  const locale = lang === 'ur' ? 'ur-PK' : 'en-US';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getTimeString() {
  const now = new Date();
  return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

export function speakText(text, lang = 'en') {
  if (!window.speechSynthesis) return;
  const clean = text.replace(/<[^>]*>/g, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = lang === 'ur' ? 'ur-PK' : 'en-US';
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find(v => v.lang.startsWith(lang === 'ur' ? 'ur' : 'en'));
  if (match) utterance.voice = match;
  window.speechSynthesis.speak(utterance);
}

export function normalizeButtonTypes(root = document) {
  root.querySelectorAll('button[onclick]:not([type])').forEach(b => { b.type = 'button'; });
}
