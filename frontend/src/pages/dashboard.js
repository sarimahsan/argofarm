// ====== ArgoFarm — Dashboard Page ======

import { getState } from '../state.js';
import { showToast, formatDate } from '../utils.js';
import { apiGetAnalytics, apiGetOutbreaks, apiGetWeatherAdvisory, apiGetOutbreakForecast } from '../api.js';
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
              <tr><th>Crop</th><th>Date</th><th>Disease</th><th>Status</th><th>View</th></tr>
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

async function loadWeatherWidget(main, region, isUr) {
  const wEl = main.querySelector('#weatherWidget');
  if (!wEl) return;

  try {
    const lang = isUr ? 'ur' : 'en';
    const result = await apiGetWeatherAdvisory(lang);

    if (!result || result.status !== 'success' || !result.data) {
      wEl.innerHTML = `<div style="text-align:center;padding:16px;color:var(--fg-muted);font-size:13px;"><i class="fas fa-cloud-sun" style="margin-right:6px;"></i> Weather data unavailable</div>`;
      return;
    }

    const d = result.data;
    const c = d.current || {};
    const advisory = isUr ? (d.advisory_ur || d.advisory_en || '') : (d.advisory_en || '');
    const forecast = d.forecast || [];
    const isLive = d.source === 'live';

    // Format day name from date string
    const dayName = (dateStr) => {
      try {
        const dt = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (dt.getTime() === today.getTime()) return isUr ? 'آج' : 'Today';
        if (dt.getTime() === tomorrow.getTime()) return isUr ? 'کل' : 'Tomorrow';
        return dt.toLocaleDateString(isUr ? 'ur-PK' : 'en-US', { weekday: 'short' });
      } catch { return dateStr; }
    };

    // Build 7-day forecast HTML
    let forecastHTML = '';
    if (forecast.length > 0) {
      forecastHTML = `
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">
          <div style="font-size:11px;font-weight:700;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <i class="fas fa-calendar-week" style="color:var(--accent);"></i>
            ${isUr ? '7 دن کی پیش گوئی' : '7-Day Forecast'}
            ${isLive ? '<span class="pulse-dot" style="width:5px;height:5px;background:var(--accent);"></span><span style="font-size:9px;color:var(--accent);font-weight:600;">LIVE</span>' : ''}
          </div>
          <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:6px;overflow-x:auto;">
            ${forecast.map((f, i) => `
              <div style="text-align:center;padding:8px 4px;border-radius:10px;background:${i === 0 ? 'rgba(46,204,64,0.08)' : 'rgba(255,255,255,0.02)'};border:1px solid ${i === 0 ? 'rgba(46,204,64,0.2)' : 'var(--border)'};transition:all 0.2s;" onmouseenter="this.style.background='rgba(46,204,64,0.1)';this.style.transform='translateY(-2px)'" onmouseleave="this.style.background='${i === 0 ? 'rgba(46,204,64,0.08)' : 'rgba(255,255,255,0.02)'}';this.style.transform='none'">
                <div style="font-size:10px;font-weight:700;color:${i === 0 ? 'var(--accent)' : 'var(--fg-muted)'};margin-bottom:6px;">${dayName(f.date)}</div>
                <div style="font-size:18px;margin-bottom:4px;color:${f.icon_color};filter:drop-shadow(0 0 4px ${f.icon_color}44);"><i class="fas ${f.icon}"></i></div>
                <div style="font-size:11px;font-weight:800;color:var(--fg);">${f.temp_max != null ? Math.round(f.temp_max) : '--'}°</div>
                <div style="font-size:9px;color:var(--fg-muted);">${f.temp_min != null ? Math.round(f.temp_min) : '--'}°</div>
                <div style="font-size:9px;margin-top:4px;color:${f.precip_prob > 50 ? '#3b82f6' : 'var(--fg-muted)'};font-weight:${f.precip_prob > 50 ? '700' : '500'};"><i class="fas fa-droplet" style="font-size:7px;"></i> ${f.precip_prob != null ? f.precip_prob : 0}%</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    wEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;">
        <div style="display:flex;align-items:center;gap:18px;">
          <div style="font-size:42px;color:${c.icon_color || '#fbbf24'};filter:drop-shadow(0 0 8px ${c.icon_color || '#fbbf24'}55);animation:pulse 2s infinite alternate;">
            <i class="fas ${c.icon || 'fa-cloud-sun'}"></i>
          </div>
          <div>
            <div style="display:flex;align-items:baseline;gap:4px;">
              <span style="font-size:32px;font-weight:800;color:var(--fg);">${c.temp != null ? Math.round(c.temp) : '--'}</span>
              <span style="font-size:20px;font-weight:600;color:var(--accent);">°C</span>
            </div>
            <div style="font-size:14px;font-weight:600;color:var(--fg-muted);">${isUr ? (c.condition_ur || 'موسم') : (c.condition_en || 'Weather')}</div>
            <div style="font-size:11px;color:var(--accent);margin-top:2px;display:flex;align-items:center;gap:4px;">
              <i class="fas fa-map-marker-alt"></i> ${d.city || region || 'Pakistan'}
              ${isLive ? '<span class="badge badge-green" style="font-size:8px;padding:1px 5px;margin-left:4px;">LIVE</span>' : ''}
            </div>
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;background:rgba(255,255,255,0.03);padding:10px 18px;border-radius:12px;border:1px solid var(--border);">
          <div style="text-align:center;">
            <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;">${isUr ? 'نمی' : 'Humidity'}</div>
            <div style="font-size:13px;font-weight:700;color:var(--fg);margin-top:2px;">${c.humidity != null ? Math.round(c.humidity) : '--'}%</div>
          </div>
          <div style="text-align:center;border-left:1px solid var(--border);border-right:1px solid var(--border);padding:0 12px;">
            <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;">${isUr ? 'ہوا' : 'Wind'}</div>
            <div style="font-size:13px;font-weight:700;color:var(--fg);margin-top:2px;">${c.wind != null ? Math.round(c.wind) : '--'} <span style="font-size:9px;">km/h</span></div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;">${isUr ? 'بارش' : 'Precip.'}</div>
            <div style="font-size:13px;font-weight:700;color:var(--fg);margin-top:2px;">${forecast.length > 0 ? (forecast[0].precip_prob || 0) : '--'}%</div>
          </div>
        </div>
      </div>
      
      <div style="margin-top:16px;padding-top:14px;border-top:1px dashed var(--border);display:flex;align-items:flex-start;gap:10px;">
        <span class="badge badge-green" style="font-size:10px;padding:3px 8px;margin-top:2px;flex-shrink:0;">
          <i class="fas fa-robot"></i> ${isUr ? 'کراپ مائنڈ AI مشورہ' : 'CropMind AI Advisory'}
        </span>
        <div class="${isUr ? 'urdu-text' : ''}" style="font-size:12px;color:var(--fg);line-height:1.7;font-weight:500;">
          ${advisory || (isUr ? 'مشورہ دستیاب نہیں' : 'Advisory unavailable')}
        </div>
      </div>

      ${forecastHTML}
      
      <button class="icon-btn" id="refreshWeatherBtn" type="button" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--fg-muted);cursor:pointer;" title="${isUr ? 'تازہ کریں' : 'Refresh Weather'}">
        <i class="fas fa-rotate"></i>
      </button>
    `;

    // Refresh listener
    wEl.querySelector('#refreshWeatherBtn').addEventListener('click', () => {
      const icon = wEl.querySelector('#refreshWeatherBtn i');
      icon.classList.add('fa-spin');
      showToast(isUr ? 'موسم کی تازہ ترین معلومات حاصل کی جا رہی ہیں...' : 'Refreshing live weather data...');
      loadWeatherWidget(main, region, isUr).then(() => {
        const newIcon = wEl.querySelector('#refreshWeatherBtn i');
        if (newIcon) newIcon.classList.remove('fa-spin');
      });
    });

  } catch (err) {
    console.error('Weather widget error:', err);
    wEl.innerHTML = `<div style="text-align:center;padding:16px;color:var(--fg-muted);font-size:13px;"><i class="fas fa-exclamation-triangle" style="margin-right:6px;color:var(--warning);"></i> Weather data error</div>`;
  }
}

async function loadDashboardData(main) {
  const result = await apiGetAnalytics();
  if (!result || result.status !== 'success') return;

  const { user, summary, recent_scans, disease_stats } = result.data;
  const currentLang = getState().currentLang || 'en';
  const isUr = currentLang === 'ur';

  main.querySelector('#dashName').textContent = user.name.split(' ')[0] || 'User';
  main.querySelector('#dashRegion').textContent = user.region || 'Your Region';

  // Render Weather Widget (real-time via Open-Meteo + Gemini AI)
  loadWeatherWidget(main, user.region, isUr);

  main.querySelector('#statScans').textContent = summary.total_scans || 0;
  main.querySelector('#statCrops').textContent = summary.crop_types_count || 0;

  main.querySelector('#statDiseases').textContent = summary.diseased_count || 0;
  main.querySelector('#statHealthy').textContent = (summary.healthy_rate || 0) + '%';

  // Table
  const tbody = main.querySelector('#dashTableBody');
  if (!recent_scans.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--fg-muted);">No scans yet. Start a new scan!</td></tr>';
  } else {
    tbody.innerHTML = recent_scans.slice(0, 5).map(s => `
      <tr data-id="${s.id}">
        <td style="font-weight:500;">${s.crop_type}</td>
        <td style="color:var(--fg-muted);">${formatDate(s.created_at)}</td>
        <td style="font-weight:600;color:var(--fg);">${s.disease}</td>
        <td><span class="badge ${s.status === 'Healthy' ? 'badge-green' : s.status === 'Diseased' ? 'badge-red' : 'badge-yellow'}">${s.status}</span></td>
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
  setTimeout(() => initChart(main, disease_stats || []), 100);
}

async function initMap(main) {
  const el = main.querySelector('#outbreakMap');
  if (!el || typeof L === 'undefined') return;

  // Initialize Map
  mapInstance = L.map(el, { center: [30.3753, 69.3451], zoom: 5, zoomControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB &copy; OSM', subdomains: 'abcd', maxZoom: 19
  }).addTo(mapInstance);
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

  // Initialize Layer Groups
  const activePinsGroup = L.layerGroup();
  const predictedHotspotsGroup = L.layerGroup();
  let heatLayer = null;

  // 1. Fetch Active Outbreaks
  const activeResult = await apiGetOutbreaks();
  if (activeResult && activeResult.status === 'success') {
    const activeData = activeResult.data || [];
    
    // Create Circle Markers for Active Pins
    activeData.forEach(o => {
      const color = o.status === 'Healthy' ? '#2ecc40' : o.status === 'Warning' ? '#f59e0b' : '#ef4444';
      L.circle(o.coordinates, { color, fillColor: color, fillOpacity: 0.25, radius: 14000, weight: 1.5 })
        .bindPopup(`<div style="font-family:Inter,sans-serif;"><b style="color:${color};">${o.disease}</b><br>${o.crop} — ${o.region}<br>Status: ${o.status}</div>`)
        .addTo(activePinsGroup);
    });

    // Create Density Heatmap Points (scaling intensity based on confidence / severity)
    if (typeof L.heatLayer !== 'undefined') {
      const heatPoints = activeData.map(o => {
        const intensity = o.status === 'Healthy' ? 0.3 : o.status === 'Warning' ? 0.6 : 0.9;
        return [o.coordinates[0], o.coordinates[1], intensity];
      });
      heatLayer = L.heatLayer(heatPoints, {
        radius: 30,
        blur: 18,
        maxZoom: 9,
        gradient: { 0.2: '#3b82f6', 0.4: '#10b981', 0.6: '#eab308', 0.9: '#ef4444' }
      });
    }
  }

  // 2. Fetch AI Outbreak Forecast Predictions
  const forecastResult = await apiGetOutbreakForecast();
  if (forecastResult && forecastResult.status === 'success') {
    const predictions = forecastResult.data || [];
    predictions.forEach(p => {
      const popupHTML = `
        <div style="font-family:'Inter', sans-serif;width:240px;padding:2px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:9px;text-transform:uppercase;color:var(--accent);letter-spacing:0.5px;font-weight:700;">🔮 CropMind AI Forecast</span>
            <span class="badge ${p.risk_level === 'High' ? 'badge-red' : 'badge-yellow'}" style="font-size:9px;padding:2px 6px;text-transform:uppercase;">${p.risk_level} Risk</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:var(--danger);margin-bottom:4px;">${p.predicted_disease}</div>
          <div style="font-size:11px;color:var(--fg-muted);margin-bottom:8px;">Crop: <b>${p.crop}</b> in <b>${p.region}</b></div>
          <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px;background:rgba(234,88,12,0.1);padding:6px;border-radius:6px;border:1px solid rgba(234,88,12,0.15);">
            <span style="color:var(--fg-muted);">Migration Probability</span>
            <span style="font-weight:700;color:#ea580c;">${p.spread_probability}%</span>
          </div>
          <div style="font-size:11px;line-height:1.6;color:var(--fg);border-top:1px solid var(--border);padding-top:8px;margin-top:6px;">
            ${p.reasoning}
          </div>
        </div>
      `;

      // Draw radar scan rings for forecasting
      L.circle(p.coordinates, {
        color: '#f97316', 
        fillColor: '#ea580c', 
        fillOpacity: 0.05, 
        radius: 20000, 
        weight: 1.2,
        dashArray: '6, 6'
      }).addTo(predictedHotspotsGroup);

      // Core pulsing radar hotspot node
      L.circleMarker(p.coordinates, {
        radius: 7,
        color: '#ea580c',
        fillColor: '#ffffff',
        fillOpacity: 0.9,
        weight: 2
      }).bindPopup(popupHTML).addTo(predictedHotspotsGroup);
    });
  }

  // 3. Set Default Overlay States
  activePinsGroup.addTo(mapInstance);
  predictedHotspotsGroup.addTo(mapInstance);
  if (heatLayer) heatLayer.addTo(mapInstance);

  // 4. Construct Overlay Selector Maps
  const overlays = {
    '<i class="fas fa-map-marker-alt" style="color:#ef4444;margin-right:6px;"></i> Active Outbreaks': activePinsGroup,
    '<i class="fas fa-bullseye" style="color:#ea580c;margin-right:6px;"></i> CropMind Predicted Hotspots': predictedHotspotsGroup
  };
  
  if (heatLayer) {
    overlays['<i class="fas fa-fire" style="color:#eab308;margin-right:6px;"></i> Density Heatmap'] = heatLayer;
  }

  // 5. Add Control to Map (beautiful styled widget in top-right)
  L.control.layers(null, overlays, { collapsed: false, position: 'topright' }).addTo(mapInstance);
}

function initChart(main, diseaseStats) {
  const canvas = main.querySelector('#diseaseChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = diseaseStats.length > 0 ? diseaseStats.map(d => d.disease) : ['Healthy (صحت مند)', 'Late Blight (جھلساؤ)', 'Leaf Rust (کنگی)', 'Rice Blast (بلاسٹ)'];
  const counts = diseaseStats.length > 0 ? diseaseStats.map(d => d.count) : [10, 3, 2, 1];

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: ['#2ecc40', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'],
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
