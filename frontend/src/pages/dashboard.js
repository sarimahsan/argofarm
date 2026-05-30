// ====== ArgoFarm — Dashboard Page ======

import { getState } from '../state.js';
import { showToast, formatDate } from '../utils.js';
import { apiGetAnalytics, apiGetOutbreaks } from '../api.js';
import { openModal, closeModal } from '../components/modal.js';
import { renderMobileHeader } from '../components/sidebar.js';
import { navigate } from '../router.js';

let mapInstance = null;
let chartInstance = null;

export async function mountDashboard(container) {
  container.innerHTML = '';
  container.classList.add('dashboard-page');

  renderMobileHeader(container, 'ArgoFarm Dashboard');

  const main = document.createElement('div');
  main.className = 'main-content';
  main.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;">Good morning, <span id="dashName">User</span></h1>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="badge badge-green"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i> <span id="dashRegion">Region</span></span>
          <span class="pulse-dot"></span>
          <span style="font-size:12px;color:var(--fg-muted);">Season: Kharif 2025</span>
        </div>
      </div>
      <button class="btn btn-sm btn-accent" id="newScanBtn" type="button">
        <i class="fas fa-plus"></i> New Scan
      </button>
    </div>

    <!-- Weather Widget -->
    <div class="card weather-card" id="weatherWidget" style="margin-bottom:24px;padding:22px;border-radius:var(--radius-lg);position:relative;overflow:hidden;">
      <div style="text-align:center;padding:10px;"><i class="fas fa-spinner fa-spin" style="color:var(--accent);margin-right:8px;"></i> Loading Weather...</div>
    </div>

    <div class="stats-grid" id="statsGrid">
      <div class="card stat-card">
        <div class="stat-icon" style="background:rgba(46,204,64,0.12);color:var(--accent);"><i class="fas fa-microscope"></i></div>
        <div class="stat-value" id="statScans">0</div>
        <div class="stat-label">Total Scans</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon" style="background:rgba(239,68,68,0.12);color:var(--danger);"><i class="fas fa-virus"></i></div>
        <div class="stat-value" id="statDiseases">0</div>
        <div class="stat-label">Diseases Found</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon" style="background:rgba(245,158,11,0.12);color:var(--warning);"><i class="fas fa-wheat-awn"></i></div>
        <div class="stat-value" id="statCrops">0</div>
        <div class="stat-label">Crop Types</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon" style="background:rgba(59,130,246,0.12);color:var(--info);"><i class="fas fa-shield-halved"></i></div>
        <div class="stat-value" id="statHealthy">0%</div>
        <div class="stat-label">Healthy Rate</div>
      </div>
    </div>

    <div class="dash-grid-2">
      <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px;height:380px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-map-location-dot" style="color:var(--accent);"></i> Outbreak Radar
          </div>
          <span style="font-size:10px;color:var(--danger);font-weight:600;display:flex;align-items:center;gap:4px;text-transform:uppercase;letter-spacing:0.5px;">
            <span class="pulse-dot" style="background:var(--danger);width:6px;height:6px;"></span> Live
          </span>
        </div>
        <div style="flex:1;border-radius:10px;overflow:hidden;border:1px solid var(--border);background:var(--bg);">
          <div id="outbreakMap" style="width:100%;height:100%;"></div>
        </div>
      </div>
      <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px;height:380px;">
        <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;">
          <i class="fas fa-chart-pie" style="color:var(--accent);"></i> Crop Health Analytics
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:8px;position:relative;">
          <canvas id="diseaseChart" style="max-width:100%;max-height:100%;"></canvas>
        </div>
      </div>
    </div>

    <div>
      <h2 style="font-size:17px;font-weight:600;margin-bottom:14px;">Recent Scans</h2>
      <div class="card" style="padding:0;overflow:hidden;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr><th>Crop</th><th>Date</th><th>Status</th><th>Confidence</th><th>View</th></tr>
            </thead>
            <tbody id="dashTableBody">
              <tr><td colspan="5" style="text-align:center;padding:20px;color:var(--fg-muted);">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  container.appendChild(main);

  main.querySelector('#newScanBtn').addEventListener('click', () => navigate('chat'));

  // Load data
  await loadDashboardData(main);

  return () => {
    container.classList.remove('dashboard-page');
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  };
}

function getWeatherDetails(region) {
  const r = (region || 'Punjab').trim().toLowerCase();
  
  if (r.includes('multan') || r.includes('bahawalpur') || r.includes('kasur')) {
    return {
      temp: 39,
      condition: 'Sunny & Hot',
      conditionUr: 'شدید گرمی اور دھوپ',
      icon: 'fa-sun',
      iconColor: '#f59e0b',
      humidity: 35,
      wind: 16,
      rainProb: 5,
      advice: 'High evaporation rates. Ensure timely evening/morning irrigation for cotton and maize crops to prevent heat stress.',
      adviceUr: 'پانی کے بخارات بننے کی شرح زیادہ ہے۔ گرمی کے دباؤ سے بچنے کے لیے کپاس اور مکئی کی فصلوں کو صبح یا شام کے وقت بروقت پانی دیں۔'
    };
  } else if (r.includes('karachi') || r.includes('hyderabad') || r.includes('gwadar')) {
    return {
      temp: 32,
      condition: 'Humid & Overcast',
      conditionUr: 'مرطوب اور ابر آلود',
      icon: 'fa-cloud-sun',
      iconColor: '#a1a1aa',
      humidity: 78,
      wind: 22,
      rainProb: 15,
      advice: 'High humidity increases risk of fungal blight. Monitor crop leaves closely and ensure proper field drainage.',
      adviceUr: 'زیادہ نمی فنگس (پھپھوندی) کے پھیلاؤ کا باعث بن سکتی ہے۔ پتوں کا باقاعدگی سے معائنہ کریں اور نکاسی آب درست رکھیں۔'
    };
  } else if (r.includes('islamabad') || r.includes('rawalpindi') || r.includes('gilgit') || r.includes('muzaffarabad')) {
    return {
      temp: 27,
      condition: 'Showers Forecast',
      conditionUr: 'بارش کا امکان',
      icon: 'fa-cloud-showers-water',
      iconColor: '#3b82f6',
      humidity: 85,
      wind: 14,
      rainProb: 80,
      advice: 'Rain showers expected today. Postpone any planned pesticide or fertilizer spraying to avoid run-off waste.',
      adviceUr: 'آج بارش متوقع ہے۔ کیڑے مار ادویات یا کھاد کا سپرے ملتوی کریں تاکہ وہ بارش کے پانی میں بہہ کر ضائع نہ ہوں۔'
    };
  } else if (r.includes('peshawar') || r.includes('quetta')) {
    return {
      temp: 29,
      condition: 'Windy & Clear',
      conditionUr: 'تیز ہوا اور صاف موسم',
      icon: 'fa-wind',
      iconColor: '#38bdf8',
      humidity: 40,
      wind: 28,
      rainProb: 10,
      advice: 'High wind speeds alert. Secure greenhouse covers and avoid spraying pesticides under gusty wind conditions.',
      adviceUr: 'تیز ہواؤں کا الرٹ۔ گرین ہاؤس کور کو مضبوط کریں اور تیز تیز ہوا کے دوران کیڑے مار ادویات کا سپرے کرنے سے گریز کریں۔'
    };
  } else {
    // Default Punjab / Lahore / Faisalabad / Gujranwala / Sialkot
    return {
      temp: 34,
      condition: 'Pleasant Sunshine',
      conditionUr: 'خوشگوار دھوپ',
      icon: 'fa-sun',
      iconColor: '#fbbf24',
      humidity: 50,
      wind: 12,
      rainProb: 20,
      advice: 'Excellent weather for field activity. Great time to apply balanced NPK fertilizers and perform weeding.',
      adviceUr: 'فیلڈ کی سرگرمی کے لیے بہترین موسم۔ متوازن کھادیں ڈالنے اور جڑی بوٹیوں کی تلفی کے لیے یہ مناسب وقت ہے۔'
    };
  }
}

async function loadDashboardData(main) {
  const result = await apiGetAnalytics();
  if (!result || result.status !== 'success') return;

  const { user, summary, recent_scans, crop_stats } = result.data;
  const currentLang = getState().currentLang || 'en';
  const isUr = currentLang === 'ur';

  main.querySelector('#dashName').textContent = user.name.split(' ')[0] || 'User';
  main.querySelector('#dashRegion').textContent = user.region || 'Your Region';

  // Render Weather Widget
  const wEl = main.querySelector('#weatherWidget');
  if (wEl) {
    const w = getWeatherDetails(user.region);
    wEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;">
        <div style="display:flex;align-items:center;gap:18px;">
          <div style="font-size:42px;color:${w.iconColor};filter:drop-shadow(0 0 8px ${w.iconColor}55);animation:pulse 2s infinite alternate;">
            <i class="fas ${w.icon}"></i>
          </div>
          <div>
            <div style="display:flex;align-items:baseline;gap:4px;">
              <span style="font-size:32px;font-weight:800;color:var(--fg);">${w.temp}</span>
              <span style="font-size:20px;font-weight:600;color:var(--accent);">°C</span>
            </div>
            <div style="font-size:14px;font-weight:600;color:var(--fg-muted);">${isUr ? w.conditionUr : w.condition}</div>
            <div style="font-size:11px;color:var(--accent);margin-top:2px;">
              <i class="fas fa-map-marker-alt"></i> ${user.region || 'Punjab'}
            </div>
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;background:rgba(255,255,255,0.03);padding:10px 18px;border-radius:12px;border:1px solid var(--border);">
          <div style="text-align:center;">
            <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;">${isUr ? 'نمی' : 'Humidity'}</div>
            <div style="font-size:13px;font-weight:700;color:var(--fg);margin-top:2px;">${w.humidity}%</div>
          </div>
          <div style="text-align:center;border-left:1px solid var(--border);border-right:1px solid var(--border);padding:0 12px;">
            <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;">${isUr ? 'ہوا' : 'Wind'}</div>
            <div style="font-size:13px;font-weight:700;color:var(--fg);margin-top:2px;">${w.wind} <span style="font-size:9px;">km/h</span></div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;">${isUr ? 'بارش' : 'Precip.'}</div>
            <div style="font-size:13px;font-weight:700;color:var(--fg);margin-top:2px;">${w.rainProb}%</div>
          </div>
        </div>
      </div>
      
      <div style="margin-top:16px;padding-top:14px;border-top:1px dashed var(--border);display:flex;align-items:flex-start;gap:10px;">
        <span class="badge badge-green" style="font-size:10px;padding:3px 8px;margin-top:2px;flex-shrink:0;">
          <i class="fas fa-user-doctor"></i> ${isUr ? 'ماہرِ زراعت مشورہ' : 'Agronomist Tip'}
        </span>
        <div class="${isUr ? 'urdu-text' : ''}" style="font-size:12px;color:var(--fg);line-height:1.6;font-weight:500;">
          ${isUr ? w.adviceUr : w.advice}
        </div>
      </div>
      
      <button class="icon-btn" id="refreshWeatherBtn" type="button" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--fg-muted);cursor:pointer;" title="${isUr ? 'تازہ کریں' : 'Refresh Weather'}">
        <i class="fas fa-rotate"></i>
      </button>
    `;
    
    // Refresh listener
    wEl.querySelector('#refreshWeatherBtn').addEventListener('click', () => {
      const icon = wEl.querySelector('#refreshWeatherBtn i');
      icon.classList.add('fa-spin');
      showToast(isUr ? 'موسم کی تازہ ترین معلومات حاصل کی جا رہی ہیں...' : 'Refreshing weather data...');
      setTimeout(() => {
        icon.classList.remove('fa-spin');
        loadDashboardData(main);
      }, 1000);
    });
  }

  main.querySelector('#statScans').textContent = summary.total_scans || 0;
  main.querySelector('#statCrops').textContent = summary.crop_types_count || 0;

  const diseased = recent_scans.filter(s => s.status === 'Diseased').length;
  main.querySelector('#statDiseases').textContent = diseased;

  const healthy = recent_scans.filter(s => s.status === 'Healthy').length;
  const rate = recent_scans.length > 0 ? Math.round((healthy / recent_scans.length) * 100) : 0;
  main.querySelector('#statHealthy').textContent = rate + '%';

  // Table
  const tbody = main.querySelector('#dashTableBody');
  if (!recent_scans.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--fg-muted);">No scans yet. Start a new scan!</td></tr>';
  } else {
    tbody.innerHTML = recent_scans.slice(0, 5).map(s => `
      <tr data-id="${s.id}">
        <td style="font-weight:500;">${s.crop_type}</td>
        <td style="color:var(--fg-muted);">${formatDate(s.created_at)}</td>
        <td><span class="badge ${s.status === 'Healthy' ? 'badge-green' : s.status === 'Diseased' ? 'badge-red' : 'badge-yellow'}">${s.status}</span></td>
        <td>${s.confidence || 0}%</td>
        <td><button class="btn btn-sm btn-outline view-btn" type="button">View</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        window.__openScanModal && window.__openScanModal(parseInt(id));
      });
    });
  }

  // Map
  setTimeout(() => initMap(main), 80);
  // Chart
  setTimeout(() => initChart(main, crop_stats || []), 100);
}

async function initMap(main) {
  const el = main.querySelector('#outbreakMap');
  if (!el || typeof L === 'undefined') return;

  mapInstance = L.map(el, { center: [30.3753, 69.3451], zoom: 5, zoomControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB &copy; OSM', subdomains: 'abcd', maxZoom: 19
  }).addTo(mapInstance);
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

  const result = await apiGetOutbreaks();
  if (result && result.status === 'success') {
    result.data.forEach(o => {
      const color = o.status === 'Healthy' ? '#2ecc40' : o.status === 'Warning' ? '#f59e0b' : '#ef4444';
      L.circle(o.coordinates, { color, fillColor: color, fillOpacity: 0.3, radius: 12000 })
        .bindPopup(`<div style="font-family:Inter,sans-serif;"><b style="color:${color};">${o.disease}</b><br>${o.crop} — ${o.region}<br>Confidence: ${o.confidence}%</div>`)
        .addTo(mapInstance);
    });
  }
}

function initChart(main, cropStats) {
  const canvas = main.querySelector('#diseaseChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = cropStats.length > 0 ? cropStats.map(c => c.crop_type) : ['Wheat', 'Rice', 'Cotton', 'Maize', 'Sugarcane'];
  const counts = cropStats.length > 0 ? cropStats.map(c => c.count) : [12, 8, 5, 4, 3];

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: ['#2ecc40', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderWidth: 2,
        borderColor: 'rgba(6,13,6,0.8)',
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: 'var(--fg-muted)', font: { family: 'Inter', size: 11 } },
        },
      },
    },
  });
}
