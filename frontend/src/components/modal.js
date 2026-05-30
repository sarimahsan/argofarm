// ====== ArgoFarm — Modal Component ======

export function openModal(title, contentHTML) {
  const overlay = document.getElementById('modalOverlay');
  const titleEl = document.getElementById('modalTitle');
  const contentEl = document.getElementById('modalContent');

  if (titleEl) titleEl.textContent = title;
  if (contentEl) contentEl.innerHTML = contentHTML;
  if (overlay) overlay.classList.add('active');
}

export function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('active');
}

// Expose globally for inline onclick handlers in modal content
window.__closeModal = closeModal;
