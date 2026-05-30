// ====== AgroFarm — AI Crop Planner Page ======

import { getState } from '../state.js';
import { showToast } from '../utils.js';
import { renderMobileHeader } from '../components/sidebar.js';
import { apiGenerateCropPlan } from '../api.js';

export async function mountPlanner(container) {
  container.innerHTML = '';
  container.classList.add('planner-page');

  const state = getState();
  const currentLang = state.currentLang || 'en';
  const isUr = currentLang === 'ur';

  // Translate page strings
  const strings = {
    title: isUr ? 'اے آئی فصل کا منصوبہ کار' : 'AI Crop Planner',
    subtitle: isUr 
      ? 'اپنے بجٹ، زمین کے رقبے اور پانی کی دستیابی کے مطابق 4 ماہ کا زراعتی منصوبہ حاصل کریں' 
      : 'Generate a highly customized, 4-month agricultural timeline tailored to your budget, acreage, and water availability.',
    labelLand: isUr ? 'زمین کا رقبہ (ایکڑ)' : 'Land Size (Acres)',
    placeholderLand: 'e.g. 5',
    labelBudget: isUr ? 'کل بجٹ (روپے)' : 'Total Budget (PKR)',
    placeholderBudget: 'e.g. 80000',
    labelWater: isUr ? 'پانی کی دستیابی' : 'Water Availability',
    waterHigh: isUr ? 'بھرپور پانی (High)' : 'High',
    waterMedium: isUr ? 'مناسب پانی (Medium)' : 'Medium',
    waterLow: isUr ? 'پانی کی قلت (Low)' : 'Low',
    labelCrop: isUr ? 'فصل منتخب کریں' : 'Select Crop Type',
    cropWheat: isUr ? 'گندم (Wheat)' : 'Wheat',
    cropRice: isUr ? 'دھان / چاول (Rice)' : 'Rice',
    cropCotton: isUr ? 'کپاس (Cotton)' : 'Cotton',
    cropMaize: isUr ? 'مکئی (Maize)' : 'Maize',
    cropSugarcane: isUr ? 'گنا (Sugarcane)' : 'Sugarcane',
    btnGenerate: isUr ? 'اے آئی زراعتی منصوبہ تیار کریں' : 'Generate AI Crop Plan',
    loading: isUr ? 'اے آئی منصوبہ ساز کام کر رہا ہے...' : 'AI Planner is working...',
    lastPlanTitle: isUr ? 'آپ کا تازہ ترین زراعتی منصوبہ' : 'Your Customized Crop Plan',
    freshTip: isUr 
      ? 'نوٹ: یہ منصوبہ اے آئی کے ذریعے خاص طور پر آپ کے زراعتی حالات کے مطابق تیار کیا گیا ہے۔' 
      : 'Note: This schedule is custom generated using neural models tailored precisely to your budget and resource limitations.'
  };

  renderMobileHeader(container, strings.title);

  const main = document.createElement('div');
  main.className = 'main-content';
  container.appendChild(main);

  // Check for cached plan
  let cached = null;
  try {
    const raw = localStorage.getItem('agroFarmLastPlan');
    if (raw) cached = JSON.parse(raw);
  } catch (e) { /* ignore */ }

  function renderForm() {
    // Read previous form inputs if cached
    const pLand = cached ? cached.inputs.land_size : '5';
    const pBudget = cached ? cached.inputs.budget : '80000';
    const pWater = cached ? cached.inputs.water_availability : 'Medium';
    const pCrop = cached ? cached.inputs.crop_type : 'Wheat';

    main.innerHTML = `
      <div style="margin-bottom:28px;">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;" class="${isUr ? 'urdu-text' : ''}">
          ${strings.title}
        </h1>
        <p style="font-size:13px;color:var(--fg-muted);" class="${isUr ? 'urdu-text' : ''}">
          ${strings.subtitle}
        </p>
      </div>

      <div class="planner-grid">
        <!-- Inputs Form Column -->
        <div class="card" style="padding:22px;">
          <form id="cropPlannerForm" style="display:flex;flex-direction:column;gap:16px;">
            <div>
              <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:6px;font-weight:600;text-transform:uppercase;">${strings.labelLand}</label>
              <input type="number" id="planLandSize" class="form-input" min="0.1" max="1000" step="0.1" value="${pLand}" placeholder="${strings.placeholderLand}" required style="width:100%;" />
            </div>

            <div>
              <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:6px;font-weight:600;text-transform:uppercase;">${strings.labelBudget}</label>
              <input type="number" id="planBudget" class="form-input" min="1000" max="50000000" step="1000" value="${pBudget}" placeholder="${strings.placeholderBudget}" required style="width:100%;" />
            </div>

            <div class="planner-form-row">
              <div>
                <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:6px;font-weight:600;text-transform:uppercase;">${strings.labelWater}</label>
                <select id="planWater" class="form-input" style="width:100%;background:var(--bg-input);cursor:pointer;color-scheme:dark;">
                  <option value="High" ${pWater === 'High' ? 'selected' : ''}>${strings.waterHigh}</option>
                  <option value="Medium" ${pWater === 'Medium' ? 'selected' : ''}>${strings.waterMedium}</option>
                  <option value="Low" ${pWater === 'Low' ? 'selected' : ''}>${strings.waterLow}</option>
                </select>
              </div>

              <div>
                <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:6px;font-weight:600;text-transform:uppercase;">${strings.labelCrop}</label>
                <select id="planCrop" class="form-input" style="width:100%;background:var(--bg-input);cursor:pointer;color-scheme:dark;">
                  <option value="Wheat" ${pCrop === 'Wheat' ? 'selected' : ''}>${strings.cropWheat}</option>
                  <option value="Rice" ${pCrop === 'Rice' ? 'selected' : ''}>${strings.cropRice}</option>
                  <option value="Cotton" ${pCrop === 'Cotton' ? 'selected' : ''}>${strings.cropCotton}</option>
                  <option value="Maize" ${pCrop === 'Maize' ? 'selected' : ''}>${strings.cropMaize}</option>
                  <option value="Sugarcane" ${pCrop === 'Sugarcane' ? 'selected' : ''}>${strings.cropSugarcane}</option>
                </select>
              </div>
            </div>

            <button class="btn btn-accent" type="submit" id="planSubmitBtn" style="width:100%;padding:14px;font-weight:600;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px var(--accent-glow);">
              <i class="fas fa-wand-magic-sparkles"></i> ${strings.btnGenerate}
            </button>
          </form>
        </div>

        <!-- AI Plan Display Column -->
        <div id="planDisplayContainer" style="display:flex;flex-direction:column;gap:20px;max-width:100%;">
          ${cached ? renderPlanOutput(cached.plan) : renderInitialPlaceholder()}
        </div>
      </div>
    `;

    // Attach form submit
    const form = main.querySelector('#cropPlannerForm');
    form.addEventListener('submit', handleFormSubmit);

    // Bind PDF listener if cached content is rendered
    if (cached) {
      bindExportPdfListener();
    }
  }

  function renderInitialPlaceholder() {
    return `
      <div class="card" style="padding:40px;text-align:center;color:var(--fg-muted);min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <i class="fas fa-compass-drafting fa-3x" style="color:var(--border);margin-bottom:16px;animation:floatBlob 6s ease-in-out infinite;"></i>
        <h3 style="font-size:15px;font-weight:700;color:var(--fg);margin-bottom:6px;">
          ${isUr ? 'کوئی فعال منصوبہ موجود نہیں ہے' : 'No Active Plan Generated'}
        </h3>
        <p style="font-size:12px;max-width:280px;line-height:1.6;margin:0 auto;">
          ${isUr 
            ? 'فصل کی پیداوار اور بجٹ کی بچت بڑھانے کے لیے اپنے فارم کی تفصیلات بائیں طرف درج کر کے منصوبہ بنائیں۔' 
            : 'Fill out your farm details and click Generate to compile an optimized monthly agronomist planner.'}
        </p>
      </div>
    `;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    
    const landSize = main.querySelector('#planLandSize').value;
    const budget = main.querySelector('#planBudget').value;
    const water = main.querySelector('#planWater').value;
    const crop = main.querySelector('#planCrop').value;
    
    const btn = main.querySelector('#planSubmitBtn');
    const display = main.querySelector('#planDisplayContainer');
    
    // Set loading
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${strings.loading}`;
    
    display.innerHTML = `
      <div class="card" style="padding:40px;text-align:center;color:var(--fg-muted);min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <i class="fas fa-seedling fa-spin fa-3x" style="color:var(--accent);margin-bottom:20px;"></i>
        <h3 style="font-weight:700;color:var(--fg);margin-bottom:6px;font-size:15px;">${isUr ? 'اے آئی زراعتی منصوبہ تیار کیا جا رہا ہے...' : 'Generating AI Agricultural Plan...'}</h3>
        <p style="font-size:12px;max-width:280px;line-height:1.6;">
          ${isUr 
            ? 'انجن مٹی، بجٹ کی حد اور پانی کی دستیابی کے لحاظ سے گائیڈ لائنز کا حساب لگا رہا ہے...' 
            : 'Calculating seed quantities, organic fertilizer splits, and drought protection schedules for your acreage...'}
        </p>
      </div>
    `;

    const result = await apiGenerateCropPlan({
      crop_type: crop,
      land_size: landSize,
      budget: budget,
      water_availability: water,
      lang: currentLang
    });

    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${strings.btnGenerate}`;

    if (result && result.status === 'success') {
      const plan = result.data.plan;
      
      // Cache
      cached = {
        plan,
        inputs: {
          crop_type: crop,
          land_size: landSize,
          budget: budget,
          water_availability: water
        }
      };
      localStorage.setItem('agroFarmLastPlan', JSON.stringify(cached));
      
      // Update UI
      display.innerHTML = renderPlanOutput(plan);
      bindExportPdfListener();
      showToast(isUr ? 'نیا زراعتی منصوبہ کامیابی سے تیار ہو گیا ہے' : 'AI Crop Plan updated!');
    } else {
      // Revert placeholder
      display.innerHTML = renderInitialPlaceholder();
    }
  }

  function renderPlanOutput(planText) {
    // Parse the Markdown plan dynamically into high-fidelity monthly steps!
    const months = parseMarkdownPlan(planText);
    
    const bannerHtml = `
      <div class="card" style="padding:16px 20px;background:rgba(46,204,64,0.05);border:1px solid var(--accent-alpha);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:20px;color:var(--accent);"><i class="fas fa-circle-check"></i></div>
          <div>
            <h4 style="font-size:15px;font-weight:700;">${strings.lastPlanTitle}</h4>
            <span style="font-size:11px;color:var(--fg-muted);">${strings.freshTip}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-outline" id="exportPdfBtn" type="button" style="padding:8px 14px;border-color:var(--accent);color:var(--accent);display:flex;align-items:center;gap:6px;font-weight:600;">
          <i class="fas fa-file-pdf"></i> ${isUr ? 'پی ڈی ایف رپورٹ' : 'Export PDF'}
        </button>
      </div>
    `;

    if (!months || !months.length) {
      // Robust fallback if parsing fails: render formatted text directly inside a beautiful glass card
      return `
        ${bannerHtml}
        <div class="card" style="padding:22px;line-height:1.8;font-size:13.5px;" class="${isUr ? 'urdu-text' : ''}">
          ${formatRawMarkdown(planText)}
        </div>
      `;
    }

    // Render monthly timeline step cards!
    const timelineHtml = months.map((m, index) => {
      // Choose step icon
      let icon = 'fa-leaf';
      if (m.header.toLowerCase().includes('1') || m.header.toLowerCase().includes('preparation') || m.header.includes('پہلا')) icon = 'fa-shovel';
      else if (m.header.toLowerCase().includes('2') || m.header.toLowerCase().includes('sowing') || m.header.includes('دوسرا')) icon = 'fa-seedling';
      else if (m.header.toLowerCase().includes('3') || m.header.toLowerCase().includes('fertilizer') || m.header.includes('تیسرا')) icon = 'fa-flask-wheat';
      else if (m.header.toLowerCase().includes('4') || m.header.toLowerCase().includes('harvest') || m.header.toLowerCase().includes('irrigation') || m.header.includes('چوتھا')) icon = 'fa-crop-simple';

      return `
        <div class="card planner-step-card" style="padding:20px;border-left:4px solid var(--accent);position:relative;animation:msgSlide 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;animation-delay:${index * 0.08}s;">
          <div style="position:absolute;top:20px;right:20px;width:34px;height:34px;background:rgba(46,204,64,0.08);color:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:1px solid var(--border);">
            <i class="fas ${icon}"></i>
          </div>
          
          <h3 class="${isUr ? 'urdu-text' : ''}" style="font-size:16px;font-weight:800;color:var(--accent);margin-bottom:12px;padding-right:28px;">
            ${m.header}
          </h3>
          
          <div class="${isUr ? 'urdu-text' : ''}" style="display:flex;flex-direction:column;gap:10px;">
            ${m.bullets.map(b => `
              <div style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.65;color:var(--fg);">
                <i class="fas fa-circle-check" style="color:var(--accent);margin-top:3.5px;font-size:11px;flex-shrink:0;"></i>
                <div>${formatBoldText(b)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    return `
      ${bannerHtml}
      <div style="display:flex;flex-direction:column;gap:16px;max-width:100%;">
        ${timelineHtml}
      </div>
    `;
  }

  function bindExportPdfListener() {
    const btn = main.querySelector('#exportPdfBtn');
    if (btn) {
      btn.addEventListener('click', handleExportPdf);
    }
  }

  function handleExportPdf() {
    if (!cached) return;

    const { inputs, plan } = cached;
    const userName = state.user?.name || (isUr ? 'معزز کسان' : 'Valued Farmer');
    const parsed = parseMarkdownPlan(plan);

    let monthsHtml = '';
    if (parsed && parsed.length) {
      monthsHtml = parsed.map(m => {
        const bulletsList = m.bullets.map(b => `
          <div class="bullet-row">
            <span class="bullet-icon">✔</span>
            <span class="bullet-text">${b.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</span>
          </div>
        `).join('');

        return `
          <div class="month-card">
            <div class="month-header">${m.header}</div>
            <div class="bullets-container">
              ${bulletsList}
            </div>
          </div>
        `;
      }).join('');
    } else {
      monthsHtml = `<div class="month-card" style="white-space: pre-wrap; font-size: 13.5px;">${formatRawMarkdown(plan)}</div>`;
    }

    const pdfHtml = `
      <!DOCTYPE html>
      <html lang="${currentLang}">
      <head>
        <meta charset="utf-8">
        <title>${isUr ? 'اے آئی زراعتی رپورٹ' : 'AI Agricultural Report'} - ${inputs.crop_type}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
        <style>
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print { display: none !important; }
          }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 30px;
            background-color: #ffffff;
            line-height: 1.6;
          }
          body.urdu {
            font-family: 'Noto Nastaliq Urdu', 'Inter', sans-serif;
          }
          .header {
            border-bottom: 2px solid #2ecc40;
            padding-bottom: 15px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-title h1 {
            font-size: 20px;
            font-weight: 800;
            color: #1b5e20;
            margin: 0 0 5px 0;
          }
          .header-title p {
            font-size: 12px;
            color: #64748b;
            margin: 0;
          }
          .brand-logo {
            font-size: 28px;
            color: #2ecc40;
            font-weight: 800;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 18px;
            margin-bottom: 25px;
          }
          @media (min-width: 600px) {
            .meta-grid {
              grid-template-columns: repeat(4, 1fr);
            }
          }
          .meta-item {
            display: flex;
            flex-direction: column;
            margin-bottom: 8px;
          }
          .meta-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
          }
          .meta-value {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
          }
          .plan-section-title {
            font-size: 16px;
            font-weight: 800;
            color: #1b5e20;
            margin-top: 0;
            margin-bottom: 15px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
          }
          .month-card {
            border: 1px solid #e2e8f0;
            border-left: 5px solid #2ecc40;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            page-break-inside: avoid;
            background-color: #ffffff;
          }
          .month-header {
            font-size: 14px;
            font-weight: 800;
            color: #1b5e20;
            margin-top: 0;
            margin-bottom: 10px;
          }
          .bullets-container {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .bullet-row {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            font-size: 12px;
          }
          .bullet-icon {
            color: #2ecc40;
            margin-top: 2px;
            font-size: 10px;
            font-weight: bold;
          }
          .bullet-text {
            color: #334155;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
          }
          .print-btn-container {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 15px;
          }
          .print-btn {
            background-color: #1b5e20;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 5px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          .print-btn:hover {
            background-color: #2e7d32;
          }
        </style>
      </head>
      <body class="${isUr ? 'urdu' : ''}">
        <div class="print-btn-container no-print">
          <button class="print-btn" onclick="window.print()">
            🖨️ ${isUr ? 'پرنٹ / پی ڈی ایف محفوظ کریں' : 'Print / Save as PDF'}
          </button>
        </div>

        <div class="header">
          <div class="header-title">
            <h1>${isUr ? 'اے آئی فصل کا منصوبہ کار — آرگوفارم' : 'AI Crop Planner — ArgoFarm'}</h1>
            <p>${isUr ? 'بجٹ، زمین اور پانی کے وسائل کے مطابق تیار کردہ منصوبہ' : 'Customized Agronomist Schedule & Recommendations'}</p>
          </div>
          <div class="brand-logo">🌾</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">${isUr ? 'کسان کا نام' : 'Farmer Name'}</span>
            <span class="meta-value">${userName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${isUr ? 'منتخب فصل' : 'Selected Crop'}</span>
            <span class="meta-value">${isUr ? strings['crop' + inputs.crop_type] || inputs.crop_type : inputs.crop_type}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${isUr ? 'زمین کا رقبہ' : 'Land Size'}</span>
            <span class="meta-value">${inputs.land_size} ${isUr ? 'ایکڑ' : 'Acres'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${isUr ? 'کل بجٹ' : 'Total Budget'}</span>
            <span class="meta-value">Rs. ${parseFloat(inputs.budget).toLocaleString()}</span>
          </div>
          <div class="meta-item" style="grid-column: span 2;">
            <span class="meta-label">${isUr ? 'پانی کی دستیابی' : 'Water Availability'}</span>
            <span class="meta-value">${isUr ? strings['water' + inputs.water_availability] || inputs.water_availability : inputs.water_availability}</span>
          </div>
          <div class="meta-item" style="grid-column: span 2;">
            <span class="meta-label">${isUr ? 'تاریخِ تیاری' : 'Date Generated'}</span>
            <span class="meta-value">${new Date().toLocaleDateString(isUr ? 'ur-PK' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div class="plan-section-title">${isUr ? 'ماہانہ زراعتی شیڈول' : 'Monthly Agricultural Schedule'}</div>

        <div class="months-container">
          ${monthsHtml}
        </div>

        <div class="footer">
          ${isUr 
            ? 'آرگوفارم — سمارٹ زراعت پاکستان۔ یہ رپورٹ اے آئی سسٹم کے ذریعے تیار کی گئی ہے۔' 
            : 'ArgoFarm — Smart Agriculture Pakistan. This is an automatically generated AI advisory report.'}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast(isUr ? 'براہ کرم پی ڈی ایف ایکسپورٹ کے لیے پاپ اپ کی اجازت دیں' : 'Popup blocked! Please allow popups to export PDF.');
      return;
    }
    printWindow.document.write(pdfHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  function parseMarkdownPlan(planText) {
    // Splits the agronomist plan into clean Month objects based on H3 headers (### Month 1 etc.)
    try {
      const parts = planText.split(/###\s+/);
      const list = [];
      
      parts.forEach(part => {
        const lines = part.trim().split('\n');
        if (!lines.length || !lines[0]) return;
        
        const header = lines[0].trim();
        // Skip header intro text
        if (header.toLowerCase().includes('crop plan') || header.includes('منصوبہ') && !header.includes('مہینہ') && !header.includes('Month')) return;
        
        const bullets = [];
        for (let i = 1; i < lines.length; i++) {
          let ln = lines[i].trim();
          if (ln.startsWith('*') || ln.startsWith('-')) {
            ln = ln.replace(/^[\*\-]\s+/, '');
            if (ln) bullets.push(ln);
          }
        }
        
        if (bullets.length > 0) {
          list.push({ header, bullets });
        }
      });
      
      return list;
    } catch (e) {
      console.warn("Regex monthly parsing failed, using fallback raw renderer:", e);
      return null;
    }
  }

  function formatBoldText(txt) {
    // Replaces **bold** with beautiful strong tags
    return txt.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--fg);font-weight:700;">$1</strong>');
  }

  function formatRawMarkdown(raw) {
    // General simple parser for raw text fallback
    let html = raw.trim();
    html = html.replace(/\n/g, '<br/>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--fg);font-weight:700;">$1</strong>');
    html = html.replace(/###\s+([^\n<]+)/g, '<h3 style="font-size:16px;font-weight:800;color:var(--accent);margin-top:16px;margin-bottom:8px;">$1</h3>');
    html = html.replace(/##\s+([^\n<]+)/g, '<h2 style="font-size:18px;font-weight:800;color:var(--accent);margin-top:20px;margin-bottom:10px;">$1</h2>');
    html = html.replace(/[\*\-]\s+([^\n<]+)/g, '<div style="display:flex;gap:8px;margin-bottom:6px;align-items:flex-start;"><i class="fas fa-circle-check" style="color:var(--accent);margin-top:4px;font-size:10px;"></i><div>$1</div></div>');
    return html;
  }

  // Render initial form setup
  renderForm();

  return () => {
    container.classList.remove('planner-page');
  };
}
