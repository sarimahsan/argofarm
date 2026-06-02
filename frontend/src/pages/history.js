// ====== ArgoFarm — Scan History Page ======

import { getState } from '../state.js';
import { showToast, formatDate } from '../utils.js';
import { apiGetHistory, apiGetCropTypes } from '../api.js';
import { renderMobileHeader } from '../components/sidebar.js';
import { navigate } from '../router.js';

let cropTypesList = [];

export async function mountHistory(container) {
  container.innerHTML = '';
  container.classList.add('history-page');

  const { currentLang } = getState();
  const isUr = currentLang === 'ur';

  // Translating UI strings
  const strings = {
    title: isUr ? 'اسکین کی تاریخ' : 'Scan History',
    newScan: isUr ? 'نیا اسکین' : 'New Scan',
    allCrops: isUr ? 'تمام فصلیں' : 'All Crops',
    allStatus: isUr ? 'تمام صورتحال' : 'All Status',
    healthy: isUr ? 'صحت مند' : 'Healthy',
    diseased: isUr ? 'بیمار' : 'Diseased',
    warning: isUr ? 'وارننگ' : 'Warning',
    clearBtn: isUr ? 'صاف کریں' : 'Clear',
    noScans: isUr ? 'کوئی بھی اسکین آپ کے فلٹر سے مطابقت نہیں رکھتا' : 'No scans match your filters',
    confidence: isUr ? 'اعتماد' : 'Confidence',
    loading: isUr ? 'لوڈ ہو رہا ہے...' : 'Loading scan history...',
  };

  renderMobileHeader(container, strings.title);

  const main = document.createElement('div');
  main.className = 'main-content';
  main.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <h1 style="font-size:24px;font-weight:700;">${strings.title}</h1>
      <button class="btn btn-sm btn-accent" id="histNewScanBtn" type="button">
        <i class="fas fa-plus"></i> ${strings.newScan}
      </button>
    </div>

    <div class="filter-bar" id="historyFilters">
      <select id="filterCrop" aria-label="Filter by crop" style="color-scheme: dark;">
        <option value="">${strings.allCrops}</option>
      </select>
      <select id="filterStatus" aria-label="Filter by status" style="color-scheme: dark;">
        <option value="">${strings.allStatus}</option>
        <option value="Healthy">${strings.healthy}</option>
        <option value="Diseased">${strings.diseased}</option>
        <option value="Warning">${strings.warning}</option>
      </select>
      <input type="date" id="filterDate" aria-label="Filter by date" style="color-scheme:dark;">
      <button class="btn btn-sm btn-outline" id="histClearFiltersBtn" type="button">${strings.clearBtn}</button>
    </div>

    <div id="historyGrid" class="scans-grid">
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--fg-muted);">${strings.loading}</div>
    </div>
  `;
  container.appendChild(main);

  main.querySelector('#histNewScanBtn').addEventListener('click', () => navigate('chat'));

  // Load initial crop types
  await loadFilterCropTypes(main, strings);

  // Setup event listeners for filters
  const filterCrop = main.querySelector('#filterCrop');
  const filterStatus = main.querySelector('#filterStatus');
  const filterDate = main.querySelector('#filterDate');
  const clearBtn = main.querySelector('#histClearFiltersBtn');

  const onFilterChange = () => fetchAndRenderHistory(main, strings);

  filterCrop.addEventListener('change', onFilterChange);
  filterStatus.addEventListener('change', onFilterChange);
  filterDate.addEventListener('change', onFilterChange);

  clearBtn.addEventListener('click', () => {
    filterCrop.value = '';
    filterStatus.value = '';
    filterDate.value = '';
    onFilterChange();
  });

  // Fetch initial history list
  await fetchAndRenderHistory(main, strings);

  return () => {
    container.classList.remove('history-page');
  };
}

async function loadFilterCropTypes(main, strings) {
  const select = main.querySelector('#filterCrop');
  if (!select) return;

  if (cropTypesList.length === 0) {
    const result = await apiGetCropTypes();
    if (result && result.status === 'success' && result.data.crop_types) {
      cropTypesList = result.data.crop_types;
    }
  }

  // Populate options
  select.innerHTML = `<option value="">${strings.allCrops}</option>` + 
    cropTypesList.map(crop => `<option value="${crop}">${crop}</option>`).join('');
}

async function fetchAndRenderHistory(main, strings) {
  const grid = main.querySelector('#historyGrid');
  if (!grid) return;

  const crop = main.querySelector('#filterCrop').value;
  const status = main.querySelector('#filterStatus').value;
  const dateVal = main.querySelector('#filterDate').value;

  const params = {};
  if (crop) params.crop_type = crop;
  if (status) params.status = status;
  
  // Format local date if needed, but backend takes 'YYYY-MM-DD' usually
  if (dateVal) params.date = dateVal;

  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--fg-muted);"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>${strings.loading}</div>`;

  const result = await apiGetHistory(params);
  if (!result || result.status !== 'success') {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--danger);">Failed to load history</div>`;
    return;
  }

  const scans = result.data.scans || [];

  if (scans.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--fg-muted);">${strings.noScans}</div>`;
    return;
  }

  grid.innerHTML = scans.map(s => {
    const statusClass = s.status === 'Healthy' ? 'badge-green' : s.status === 'Diseased' ? 'badge-red' : 'badge-yellow';
    
    // Resolve upload static path relative to the Flask server
    const baseServer = ''; // Proxied via Vite
    const imgUrl = s.image_url 
      ? (s.image_url.startsWith('http') || s.image_url.startsWith('blob:') ? s.image_url : (baseServer + s.image_url))
      : '';

    const fallbackHtml = `
      <div class="scan-card-fallback">
        <i class="fas fa-leaf"></i>
      </div>
    `;
    const imgHtml = imgUrl 
      ? `<img src="${imgUrl}" alt="${s.crop_type}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width:100%;height:100%;object-fit:cover;"/>
         <div class="scan-card-fallback" style="display:none;"><i class="fas fa-leaf"></i></div>`
      : fallbackHtml;

    return `
      <div class="scan-card" data-id="${s.id}">
        <div class="scan-card-img-wrap">
          ${imgHtml}
          <span class="badge ${statusClass} scan-card-status">${s.status}</span>
        </div>
        <div class="scan-card-body">
          <div class="scan-card-top">
            <span class="scan-card-crop">${s.crop_type}</span>
            <span class="scan-card-date">${formatDate(s.created_at)}</span>
          </div>
          <h3 class="scan-card-disease">${s.disease}</h3>
          <div class="scan-card-bottom">
            <span><i class="fas fa-map-marker-alt"></i> ${s.region || 'Punjab'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Click handler
  grid.querySelectorAll('.scan-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      window.__openScanModal && window.__openScanModal(parseInt(id));
    });
  });
}
