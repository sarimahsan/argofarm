// ====== ArgoFarm — Main Entry ======

import './style.css';
import { initState, getState, onStateChange } from './state.js';
import { registerRoute, initRouter, navigate } from './router.js';
import { mountLanding } from './pages/landing.js';
import { mountDashboard } from './pages/dashboard.js';
import { mountChat } from './pages/chat.js';
import { mountHistory } from './pages/history.js';
import { mountSettings } from './pages/settings.js';
import { mountCalendar } from './pages/calendar.js';
import { mountCommunity } from './pages/community.js';
import { mountPlanner } from './pages/planner.js';
import { mountWholesale } from './pages/wholesale.js';
import { renderSidebar } from './components/sidebar.js';
import { openModal } from './components/modal.js';
import { apiGetScan, apiGetProfile } from './api.js';
import { showToast, formatDate, parseMarkdown } from './utils.js';

// Initialize state from localstorage
initState();

// Verify token validity on app load
const initialState = getState();
if (initialState.authToken) {
  apiGetProfile().then(result => {
    if (!result || result.status !== 'success') {
      // Token is invalid, clear it
      import('./state.js').then(({ clearUser }) => {
        clearUser();
      });
    }
  }).catch(() => {
    // Network error, keep token for now but user will be redirected on first 401
  });
}

// Setup App Layout container
const appEl = document.getElementById('app');
appEl.innerHTML = `
  <div class="app-sidebar" id="appSidebar" style="display: none;"></div>
  <div class="app-content" id="appContent"></div>
  <div class="copilot-drawer" id="copilotDrawer"></div>
  <button class="copilot-trigger-fab" id="copilotTriggerFab" title="Ask CropMind AI" style="display: none;">
    <i class="fas fa-robot"></i>
    <span class="pulse-dot" style="position:absolute;top:2px;right:2px;width:8px;height:8px;border:2px solid var(--bg);animation:pulse 2s infinite;"></span>
  </button>
`;

const sidebarContainer = document.getElementById('appSidebar');
const contentContainer = document.getElementById('appContent');

// Render layout elements once
let sidebarRendered = null;
let copilotInitialized = false;

// Global toggle logic
window.__openCopilot = function() {
  const drawer = document.getElementById('copilotDrawer');
  const fab = document.getElementById('copilotTriggerFab');
  if (drawer) drawer.classList.add('active');
  if (fab) fab.classList.add('active');
};

window.__closeCopilot = function() {
  const drawer = document.getElementById('copilotDrawer');
  const fab = document.getElementById('copilotTriggerFab');
  if (drawer) drawer.classList.remove('active');
  if (fab) fab.classList.remove('active');
};

window.__toggleCopilot = function() {
  const drawer = document.getElementById('copilotDrawer');
  const fab = document.getElementById('copilotTriggerFab');
  if (drawer) {
    const isActive = drawer.classList.toggle('active');
    if (fab) fab.classList.toggle('active', isActive);
  }
};

document.getElementById('copilotTriggerFab').addEventListener('click', () => {
  window.__toggleCopilot();
});

function updateLayout(state) {
  const { authToken, currentPage } = state;
  const isAuthPage = currentPage === 'landing';
  const fab = document.getElementById('copilotTriggerFab');
  
  if (authToken && !isAuthPage) {
    sidebarContainer.style.display = 'block';
    if (fab) fab.style.display = 'flex';
    if (!sidebarRendered) {
      sidebarRendered = renderSidebar(sidebarContainer);
    } else {
      // Sync active state in sidebar buttons
      sidebarContainer.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === currentPage);
      });
    }
  } else {
    sidebarContainer.style.display = 'none';
    if (fab) {
      fab.style.display = 'none';
      fab.classList.remove('active');
    }
    const drawer = document.getElementById('copilotDrawer');
    if (drawer) drawer.classList.remove('active');
  }
}

async function handleCopilotInitialization(state) {
  const { authToken } = state;
  const drawer = document.getElementById('copilotDrawer');
  if (authToken && drawer && !copilotInitialized) {
    copilotInitialized = true;
    await mountChat(drawer);
  } else if (!authToken) {
    copilotInitialized = false;
    if (drawer) drawer.innerHTML = '';
  }
}

// Watch state changes to dynamically hide/show sidebar and initialize/refresh copilot
onStateChange(updateLayout);
onStateChange(handleCopilotInitialization);

// Register Pages to router
registerRoute('landing', mountLanding);
registerRoute('dashboard', mountDashboard);
registerRoute('chat', async (pageEl) => {
  // Opening the copilot drawer automatically
  window.__openCopilot && window.__openCopilot();
  
  // Redirect to previous page or dashboard so a page context remains underneath
  const state = getState();
  const prevPage = state.currentPage && state.currentPage !== 'chat' ? state.currentPage : 'dashboard';
  setTimeout(() => {
    navigate(prevPage);
  }, 100);
});
registerRoute('history', mountHistory);
registerRoute('settings', mountSettings);
registerRoute('calendar', mountCalendar);
registerRoute('community', mountCommunity);
registerRoute('planner', mountPlanner);
registerRoute('wholesale', mountWholesale);

// Expose modal handler globally for recent scans or history list cards
window.__openScanModal = async function(id) {
  const { currentLang } = getState();
  const isUr = currentLang === 'ur';
  
  openModal(
    isUr ? 'اسکین کی تفصیلات لوڈ ہو رہی ہیں...' : 'Loading scan details...',
    `<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--accent);"></i></div>`
  );

  const result = await apiGetScan(id);
  if (!result || result.status !== 'success') {
    showToast(isUr ? 'تفصیلات لوڈ کرنے میں ناکامی' : 'Failed to load details');
    window.__closeModal && window.__closeModal();
    return;
  }

  const d = result.data;
  const statusClass = d.status === 'Healthy' ? 'badge-green' : d.status === 'Diseased' ? 'badge-red' : 'badge-yellow';
  
  const imgUrl = d.image_url 
    ? (d.image_url.startsWith('http') || d.image_url.startsWith('blob:') ? d.image_url : d.image_url)
    : '';

  const scanImgHtml = imgUrl ? `
    <div style="text-align:center;margin-bottom:18px;">
      <img src="${imgUrl}" 
           style="max-width:100%;max-height:280px;border-radius:var(--radius-md);border:1px solid var(--border);display:block;margin:0 auto;object-fit:cover;"
           onerror="this.style.display='none';"/>
    </div>
  ` : '';

  const contentHTML = `
    ${scanImgHtml}
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(135px, 1fr));gap:16px;margin-bottom:20px;">
      <div style="background:var(--bg-input);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border);">
        <div style="font-size:11px;text-transform:uppercase;color:var(--fg-muted);margin-bottom:6px;">${isUr ? 'صورتحال' : 'Status'}</div>
        <span class="badge ${statusClass}">${d.status}</span>
      </div>
      <div style="background:var(--bg-input);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border);">
        <div style="font-size:11px;text-transform:uppercase;color:var(--fg-muted);margin-bottom:6px;">${isUr ? 'بیماری' : 'Disease'}</div>
        <div style="font-weight:600;color:var(--danger);font-size:14px;">${d.disease}</div>
      </div>
      <div style="background:var(--bg-input);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border);">
        <div style="font-size:11px;text-transform:uppercase;color:var(--fg-muted);margin-bottom:6px;">${isUr ? 'علاقہ' : 'Region'}</div>
        <div style="font-weight:500;">${d.region || 'Punjab'}</div>
      </div>
    </div>
    <div style="margin-bottom:16px;">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--accent);display:flex;align-items:center;gap:6px;">
        <i class="fas fa-prescription-bottle-medical"></i> Advisory (English)
      </div>
      <div style="background:var(--bg-input);padding:16px;border-radius:10px;font-size:13px;line-height:1.7;color:var(--fg);border:1px solid var(--border);">${d.advisory_english ? parseMarkdown(d.advisory_english) : 'No English advisory available'}</div>
    </div>
    <div style="margin-bottom:20px;">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--accent);display:flex;align-items:center;gap:6px;">
        <i class="fas fa-prescription-bottle-medical"></i> مشورہ (اردو)
      </div>
      <div class="urdu-text" style="background:var(--bg-input);padding:16px;border-radius:10px;font-size:14px;line-height:2.0;color:var(--fg);border:1px solid var(--border);">${d.advisory_urdu ? parseMarkdown(d.advisory_urdu) : 'کوئی اردو مشورہ دستیاب نہیں ہے'}</div>
    </div>
    <button class="btn btn-accent" style="width:100%;padding:12px;display:flex;align-items:center;justify-content:center;gap:8px;" id="modalDownloadReportBtn">
      <i class="fas fa-file-pdf"></i> ${isUr ? 'پی ڈی ایف رپورٹ ڈاؤن لوڈ کریں' : 'Download PDF Report'}
    </button>
  `;

  // Update modal
  openModal(`${d.crop_type} — ${formatDate(d.created_at)}`, contentHTML);

  // Add PDF click listener
  const downloadBtn = document.getElementById('modalDownloadReportBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (typeof html2pdf === 'undefined') {
        showToast(isUr ? 'پی ڈی ایف لائبریری دستیاب نہیں ہے' : 'PDF generator library not loaded yet');
        return;
      }
      
      showToast(isUr ? 'پی ڈی ایف رپورٹ تیار کی جا رہی ہے...' : 'Generating PDF report...');
      
      // Build offscreen printable template
      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.left = '-9999px';
      printContainer.style.top = '-9999px';
      
      printContainer.innerHTML = `
        <div style="font-family:'Inter', sans-serif; padding: 30px; color: #1f2937; background: #ffffff; width: 720px; border-radius: 12px; box-sizing: border-box;">
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid #2ecc40; padding-bottom: 20px; margin-bottom: 24px;">
            <div>
              <div style="font-size:26px; font-weight:800; color:#2ecc40; display:flex; align-items:center; gap:8px;">
                <i class="fas fa-leaf"></i> ArgoFarm
              </div>
              <div style="font-size:10px; text-transform:uppercase; color:#9ca3af; letter-spacing:1px; margin-top:4px; font-weight:600;">Smart Crop Diagnostics Advisory</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px; font-weight:700; color:#4b5563;">REPORT ID: #AF-${d.id || Math.floor(Math.random() * 90000) + 10000}</div>
              <div style="font-size:11px; color:#9ca3af; margin-top:2px;">Issued: ${formatDate(d.created_at)}</div>
            </div>
          </div>

          <!-- Main Diagnostic Information -->
          <div style="display:flex; gap: 30px; margin-bottom: 28px;">
            <!-- Left Info -->
            <div style="flex:1;">
              <div style="margin-bottom:14px;">
                <div style="font-size:10px; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:0.5px;">CROP SPECIES</div>
                <div style="font-size:18px; font-weight:700; color:#111827; margin-top:2px;">${d.crop_type}</div>
              </div>
              
              <div style="margin-bottom:14px;">
                <div style="font-size:10px; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:0.5px;">DIAGNOSTIC STATUS</div>
                <div style="margin-top:4px;">
                  <span style="background:${d.status === 'Healthy' ? '#d1fae5' : '#fee2e2'}; color:${d.status === 'Healthy' ? '#065f46' : '#991b1b'}; padding: 5px 12px; border-radius: 9999px; font-size:11px; font-weight:800; text-transform:uppercase; display:inline-block; border:1px solid ${d.status === 'Healthy' ? '#a7f3d0' : '#fca5a5'};">
                    ${d.status}
                  </span>
                </div>
              </div>
              
              <div style="margin-bottom:14px;">
                <div style="font-size:10px; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:0.5px;">DETECTED PATHOLOGY / DISEASE</div>
                <div style="font-size:16px; font-weight:700; color:#e11d48; margin-top:2px;">${d.disease}</div>
              </div>

              <div>
                <div style="font-size:10px; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:0.5px;">SAMPLE REGION</div>
                <div style="font-size:16px; font-weight:700; color:#111827; margin-top:2px;">${d.region || 'Punjab'}</div>
              </div>
            </div>

            <!-- Right Image -->
            ${imgUrl ? `
            <div style="width:240px; text-align:center;">
              <img src="${imgUrl}" style="width:100%; height:160px; border-radius:8px; border:1.5px solid #e5e7eb; object-fit:cover; display:block;" />
              <div style="font-size:9px; color:#9ca3af; margin-top:6px; font-style:italic; font-weight:500;">Submitted leaf sample scan</div>
            </div>
            ` : ''}
          </div>

          <!-- Advisory Details -->
          <div style="margin-bottom:20px; padding: 18px; background:#f9fafb; border-radius: 10px; border: 1px solid #f3f4f6; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="font-size:13px; font-weight:700; color:#2ecc40; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <i class="fas fa-circle-info"></i> Agro-Advisor Recommendation (English)
            </div>
            <div style="font-size:12px; line-height:1.6; color:#4b5563; text-align:justify;">${d.advisory_english || 'No English advisory details available.'}</div>
          </div>

          <div style="margin-bottom:28px; padding: 18px; background:#f9fafb; border-radius: 10px; border: 1px solid #f3f4f6; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="font-size:13px; font-weight:700; color:#2ecc40; margin-bottom:8px; display:flex; align-items:center; gap:6px; direction:rtl;">
               مشاورتی زراعتی تجزیہ (اردو)
            </div>
            <div style="font-size:13px; line-height:2.0; color:#374151; text-align:right; font-family:'Noto Nastaliq Urdu', serif; direction:rtl;">${d.advisory_urdu || 'کوئی اردو مشورہ دستیاب نہیں ہے۔'}</div>
          </div>

          <!-- Footer Disclaimer -->
          <div style="border-top:1.5px solid #e5e7eb; padding-top:16px; margin-top:30px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:9px; color:#9ca3af; font-weight:500;">Report compiled by ArgoFarm Neural Engine</div>
            <div style="font-size:8px; color:#9ca3af; max-width:400px; text-align:right; font-style:italic; line-height:1.4;">
              Disclaimer: This AI-generated report is intended for advisory and informational purposes. Please cross-reference with local agricultural department agents or certified agronomists before deploying extensive pesticide or chemical remedies.
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(printContainer);
      
      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `ArgoFarm_Report_${d.crop_type.replace(/\s+/g, '_')}_${d.disease.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.5, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().from(printContainer).set(opt).save()
        .then(() => {
          showToast(isUr ? 'پی ڈی ایف رپورٹ کامیابی سے ڈاؤن لوڈ ہو گئی ہے' : 'PDF Report downloaded successfully!');
          printContainer.remove();
        })
        .catch(err => {
          console.error('PDF error:', err);
          showToast(isUr ? 'پی ڈی ایف بنانے میں خرابی پیش آئی' : 'Failed to generate PDF Report');
          printContainer.remove();
        });

      window.__closeModal && window.__closeModal();
    });
  }
};

// Initialize SPA Router
initRouter();

// Initial layout rendering
updateLayout(getState());

