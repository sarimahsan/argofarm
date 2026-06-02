// ====== ArgoFarm — B2B Wholesale Bazaar & AI DealMind ======

import { getState } from '../state.js';
import { showToast, formatDate } from '../utils.js';
import { renderMobileHeader } from '../components/sidebar.js';
import { apiGetMarketplace, apiAnalyzeWholesaleDeal, apiSuggestPrice } from '../api.js';

export async function mountWholesale(container) {
  container.innerHTML = '';
  container.classList.add('wholesale-page');

  const state = getState();
  const currentLang = state.currentLang || 'en';
  const isUr = currentLang === 'ur';

  // Localized dictionary keys
  const strings = {
    title: isUr ? 'تھوک بازار اور کراپ مائنڈ AI' : 'Wholesale Bazaar & CropMind AI',
    subtitle: isUr 
      ? 'مقامی کسانوں کی تیار فصلیں بلک ہول سیل ریٹس پر خریدیں، قیمت کا کراپ مائنڈ AI سے تجزیہ کریں' 
      : 'Browse bulk agricultural crops listed directly by local farmers, evaluate deals using CropMind AI, and secure wholesale trades.',
    loadingList: isUr ? 'فصلوں کی لسٹنگ لوڈ ہو رہی ہے...' : 'Loading wholesale listings...',
    noListings: isUr ? 'اس وقت بازار میں کوئی فصل دستیاب نہیں ہے' : 'No bulk crop listings found in the bazaar currently.',
    whatsappContact: isUr ? 'واٹس ایپ پر رابطہ کریں' : 'Order via WhatsApp',
    aiAnalyze: isUr ? 'کراپ مائنڈ ڈیل ایویلیوایٹر' : 'CropMind AI Deal Evaluator',
    analyzing: isUr ? 'کراپ مائنڈ ڈیل ایویلیوایٹر جائزہ لے رہا ہے...' : 'CropMind AI is evaluating...',
    modalTitle: isUr ? 'کراپ مائنڈ AI رپورٹ' : 'CropMind AI B2B Assessment',
    locationTag: isUr ? 'جگہ:' : 'Location:',
    sellerTag: isUr ? 'بیچنے والا:' : 'Seller:',
    priceTag: isUr ? 'ہول سیل ریٹ:' : 'Wholesale Price:'
  };

  renderMobileHeader(container, strings.title);

  const main = document.createElement('div');
  main.className = 'main-content';
  container.appendChild(main);

  let crops = [];

  async function loadWholesaleData() {
    // Get marketplace products in category "Crops" which represent wholesale farmer listings
    const result = await apiGetMarketplace('Crops');
    if (result && result.status === 'success') {
      crops = result.data || [];
    }
  }

  async function handleAIDealAnalysis(item, modalOverlay, modalContent) {
    modalOverlay.style.display = 'flex';
    modalContent.innerHTML = `
      <div style="text-align:center;padding:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
        <i class="fas fa-brain fa-spin fa-3x" style="color:var(--accent);animation:floatBlob 4s ease-in-out infinite;"></i>
        <h3 style="font-size:15px;font-weight:700;color:var(--fg);">${strings.analyzing}</h3>
        <p style="font-size:12px;color:var(--fg-muted);max-width:280px;line-height:1.6;">
          ${isUr 
            ? 'سودے کا مقامی ہول سیل منڈی کے ریٹس، منافع کی شرح اور گفت و شنید کی شرائط کے لیے تجزیہ کیا جا رہا ہے...' 
            : 'Analyzing current listing rate against Pakistani wholesale mandi rates, retail margins, and negotiation splits...'}
        </p>
      </div>
    `;

    const res = await apiAnalyzeWholesaleDeal(item.id, currentLang);
    if (res && res.status === 'success') {
      const report = res.data.analysis;
      modalContent.innerHTML = `
        <div style="line-height:1.8;font-size:13.5px;" class="${isUr ? 'urdu-text' : ''}">
          ${formatDealReportMarkdown(report)}
        </div>
      `;
    } else {
      modalOverlay.style.display = 'none';
      showToast(isUr ? 'اے آئی تجزیہ ناکام ہو گیا ہے۔ دوبارہ کوشش کریں' : 'AI analysis failed. Please try again shortly.');
    }
  }

  function formatDealReportMarkdown(rawText) {
    let html = rawText.trim();
    html = html.replace(/\n/g, '<br/>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--fg);font-weight:700;">$1</strong>');
    
    // Style H3 headers as beautiful sections
    html = html.replace(/###\s+([^\n<]+)/g, '<h3 style="font-size:15px;font-weight:800;color:var(--accent);margin-top:18px;margin-bottom:8px;border-bottom:1px dashed var(--border);padding-bottom:4px;">$1</h3>');
    html = html.replace(/##\s+([^\n<]+)/g, '<h2 style="font-size:17px;font-weight:800;color:var(--accent);margin-top:22px;margin-bottom:10px;">$1</h2>');
    
    // Convert bullets to checked rows
    html = html.replace(/[\*\-]\s+([^\n<]+)/g, '<div style="display:flex;gap:8px;margin-bottom:6px;align-items:flex-start;"><i class="fas fa-circle-check" style="color:var(--accent);margin-top:4px;font-size:10px;flex-shrink:0;"></i><div>$1</div></div>');
    
    // Wrap Deal badges dynamically with beautiful styled containers
    html = html.replace(/🔥\s*Excellent Bargain/gi, '<span class="badge badge-green" style="font-size:12px;padding:6px 12px;margin-bottom:10px;"><i class="fas fa-fire"></i> EXCELLENT BARGAIN</span>');
    html = html.replace(/🟢\s*Fair Price/gi, '<span class="badge badge-blue" style="font-size:12px;padding:6px 12px;margin-bottom:10px;"><i class="fas fa-circle-check"></i> FAIR PRICE</span>');
    html = html.replace(/⚠️\s*Overpriced/gi, '<span class="badge badge-red" style="font-size:12px;padding:6px 12px;margin-bottom:10px;"><i class="fas fa-circle-exclamation"></i> OVERPRICED</span>');
    
    // Urdu badging fallbacks
    html = html.replace(/🔥\s*بہترین قیمت/g, '<span class="badge badge-green" style="font-size:12px;padding:6px 12px;margin-bottom:10px;"><i class="fas fa-fire"></i> بہترین قیمت (Excellent)</span>');
    html = html.replace(/🟢\s*مناسب قیمت/g, '<span class="badge badge-blue" style="font-size:12px;padding:6px 12px;margin-bottom:10px;"><i class="fas fa-circle-check"></i> مناسب قیمت (Fair)</span>');
    html = html.replace(/⚠️\s*زیادہ قیمت/g, '<span class="badge badge-red" style="font-size:12px;padding:6px 12px;margin-bottom:10px;"><i class="fas fa-circle-exclamation"></i> زیادہ قیمت (Overpriced)</span>');

    return html;
  }

  async function render() {
    main.innerHTML = `
      <div style="margin-bottom:28px;">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;" class="${isUr ? 'urdu-text' : ''}">
          ${strings.title}
        </h1>
        <p style="font-size:13px;color:var(--fg-muted);" class="${isUr ? 'urdu-text' : ''}">
          ${strings.subtitle}
        </p>
      </div>

      <!-- AI Price Advisor Panel -->
      <div class="card" style="margin-bottom:32px;padding:24px;border:1px solid var(--border);position:relative;overflow:hidden;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg, rgba(46,204,64,0.15), rgba(59,130,246,0.15));display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-tags" style="color:var(--accent);font-size:16px;"></i>
          </div>
          <div>
            <h3 style="font-size:16px;font-weight:800;color:var(--fg);margin:0;" class="${isUr ? 'urdu-text' : ''}">
              ${isUr ? '🤖 کراپ مائنڈ AI — پرائس ایڈوائزر' : '🤖 CropMind AI — Price Advisor'}
            </h3>
            <p style="font-size:11px;color:var(--fg-muted);margin:2px 0 0;" class="${isUr ? 'urdu-text' : ''}">
              ${isUr ? 'فصل کی قسم درج کریں اور کراپ مائنڈ AI سے ہول سیل قیمت حاصل کریں' : 'Enter your crop details and get CropMind AI-powered wholesale pricing suggestions'}
            </p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px;align-items:end;" id="priceAdvisorForm">
          <div>
            <label style="font-size:10px;font-weight:600;color:var(--fg-muted);text-transform:uppercase;display:block;margin-bottom:4px;">${isUr ? 'فصل کی قسم' : 'Crop Type'}</label>
            <select id="paCrop" class="form-input" style="padding:10px 12px;font-size:13px;height:42px;">
              <option value="Wheat">${isUr ? 'گندم' : 'Wheat'}</option>
              <option value="Rice">${isUr ? 'چاول' : 'Rice'}</option>
              <option value="Cotton">${isUr ? 'کپاس' : 'Cotton'}</option>
              <option value="Maize">${isUr ? 'مکئی' : 'Maize'}</option>
              <option value="Sugarcane">${isUr ? 'گنا' : 'Sugarcane'}</option>
              <option value="Potato">${isUr ? 'آلو' : 'Potato'}</option>
              <option value="Tomato">${isUr ? 'ٹماٹر' : 'Tomato'}</option>
              <option value="Onion">${isUr ? 'پیاز' : 'Onion'}</option>
            </select>
          </div>
          <div>
            <label style="font-size:10px;font-weight:600;color:var(--fg-muted);text-transform:uppercase;display:block;margin-bottom:4px;">${isUr ? 'علاقہ' : 'Region'}</label>
            <select id="paRegion" class="form-input" style="padding:10px 12px;font-size:13px;height:42px;">
              <option value="Lahore">Lahore</option>
              <option value="Faisalabad">Faisalabad</option>
              <option value="Multan">Multan</option>
              <option value="Karachi">Karachi</option>
              <option value="Peshawar">Peshawar</option>
              <option value="Islamabad">Islamabad</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Quetta">Quetta</option>
            </select>
          </div>
          <div>
            <label style="font-size:10px;font-weight:600;color:var(--fg-muted);text-transform:uppercase;display:block;margin-bottom:4px;">${isUr ? 'مقدار' : 'Quantity'}</label>
            <input id="paQuantity" class="form-input" type="text" value="1 Ton" style="padding:10px 12px;font-size:13px;height:42px;" />
          </div>
          <button class="btn btn-accent" id="priceAdvisorBtn" type="button" style="padding:10px 20px;height:42px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;width:100%;">
            <i class="fas fa-wand-magic-sparkles"></i> ${isUr ? 'قیمت تجویز کریں' : 'Suggest Price'}
          </button>
        </div>

        <div id="priceAdvisorResult" style="display:none;margin-top:20px;"></div>
      </div>

      <div style="margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <h2 style="font-size:16px; font-weight:700; margin:0;" class="${isUr ? 'urdu-text' : ''}">
          ${isUr ? 'دستیاب ہول سیل لسٹنگز' : 'Available Wholesale Listings'}
        </h2>
        <span style="font-size:11px; color:var(--fg-muted); background:var(--bg-input); padding:4px 8px; border-radius:6px; border:1px solid var(--border); font-weight:600; display:inline-block;">
          ${isUr ? 'براہِ راست کسان سے' : 'Direct From Farmer'}
        </span>
      </div>

      <div id="wholesaleGridContainer" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:24px;margin-bottom:40px;">
        <div style="text-align:center;grid-column:1/-1;padding:50px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--accent);"></i><div style="margin-top:10px;font-size:12px;color:var(--fg-muted);">${strings.loadingList}</div></div>
      </div>

      <!-- AI Deal Advisor Modal Overlay -->
      <div class="modal-overlay" id="aiDealModal" style="display:none;z-index:1000;background:rgba(0,0,0,0.7);backdrop-filter:blur(5px);position:fixed;top:0;left:0;width:100%;height:100%;align-items:center;justify-content:center;padding:16px;">
        <div class="card" style="width:100%;max-width:540px;max-height:85vh;overflow-y:auto;padding:26px;border:1px solid var(--border);position:relative;animation:pageIn 0.3s forwards;">
          <button class="icon-btn" id="closeDealModalBtn" type="button" style="position:absolute;top:16px;right:16px;background:none;border:none;color:var(--fg-muted);cursor:pointer;"><i class="fas fa-xmark fa-lg"></i></button>
          
          <h2 style="font-size:18px;font-weight:800;color:var(--accent);margin-bottom:18px;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-brain"></i> ${strings.modalTitle}
          </h2>
          
          <div id="aiDealModalBody"></div>
        </div>
      </div>
    `;

    // Load data
    await loadWholesaleData();

    const grid = main.querySelector('#wholesaleGridContainer');
    const modal = main.querySelector('#aiDealModal');
    const modalBody = main.querySelector('#aiDealModalBody');
    const closeModalBtn = main.querySelector('#closeDealModalBtn');

    closeModalBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    if (!crops.length) {
      grid.innerHTML = `
        <div class="card" style="padding:50px;text-align:center;color:var(--fg-muted);grid-column:1/-1;">
          <i class="fas fa-truck-ramp-box fa-3x" style="margin-bottom:16px;color:var(--border);animation:floatBlob 5s ease-in-out infinite;"></i>
          <h3 style="font-size:15px;font-weight:700;color:var(--fg);margin-bottom:6px;">${isUr ? 'کوئی ہول سیل فصل دستیاب نہیں ہے' : 'No Bulk Crops Available'}</h3>
          <p style="font-size:12px;max-width:280px;line-height:1.6;margin:0 auto;">${strings.noListings}</p>
        </div>
      `;
    } else {
      grid.innerHTML = crops.map(item => {
        const img = item.image_url || 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400';
        const cleanPhone = item.phone.replace(/[^0-9]/g, '') || '923000000000';
        
        // WhatsApp prefilled B2B order text
        const waMsg = isUr
          ? `السلام علیکم ${item.seller_name}، میں ایک تھوک خریدار (Wholesale Buyer) ہو۔ میں نے آرگوفارم پر آپ کی فصل کی ہول سیل لسٹنگ '${item.title}' دیکھی ہے جس کا ریٹ ${item.price} ہے۔ میں اس سودے میں دلچسپی رکھتا ہوں اور سپلائی اور لاجسٹکس کے حوالے سے تفصیلی بات چیت کرنا چاہتا ہو۔`
        : `Assalam-o-Alaikum ${item.seller_name}, I am a wholesale bulk buyer. I saw your listing for '${item.title}' at ${item.price} on ArgoFarm. I am highly interested in buying wholesale volume and would like to discuss transport logistics and grading details.`;
      
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;

      return `
        <div class="card product-card" data-id="${item.id}" style="padding:0;overflow:hidden;border:1px solid var(--border);display:flex;flex-direction:column;justify-content:between;">
          <div style="position:relative;height:150px;background:var(--bg-input);">
            <img src="${img}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400'"/>
            <span class="badge badge-green" style="position:absolute;top:12px;left:12px;font-size:9px;text-transform:uppercase;font-weight:700;">WHOLESALE CROPS</span>
          </div>

          <div style="padding:18px;flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
            <div>
              <h3 style="font-size:16px;font-weight:800;color:var(--fg);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</h3>
              <div style="font-size:18px;font-weight:900;color:var(--accent);margin-bottom:8px;">${item.price}</div>
              <p style="font-size:12px;color:var(--fg-muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:0;">
                ${item.description || 'No description provided by the farmer.'}
              </p>
            </div>

            <div style="border-top:1px solid var(--border);padding-top:12px;display:flex;flex-direction:column;gap:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--fg-muted);">
                <span><i class="fas fa-user-tie"></i> <strong>${strings.sellerTag}</strong> ${item.seller_name}</span>
                <span><i class="fas fa-location-dot"></i> <strong>${strings.locationTag}</strong> ${item.location}</span>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <button class="btn btn-sm btn-outline btn-ai-evaluate" style="width:100%;padding:9px;font-size:11.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;border-color:var(--accent);color:var(--accent);" type="button" title="${strings.aiAnalyze}">
                  <i class="fas fa-brain"></i> ${strings.aiAnalyze}
                </button>
                <a href="${waLink}" target="_blank" class="btn btn-sm btn-accent" style="width:100%;padding:9px;font-size:11.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;">
                  <i class="fab fa-whatsapp fa-lg"></i> ${strings.whatsappContact}
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners
    grid.querySelectorAll('.product-card').forEach(card => {
      const itemId = parseInt(card.dataset.id);
      const item = crops.find(c => c.id === itemId);
      if (!item) return;

      const evalBtn = card.querySelector('.btn-ai-evaluate');
      evalBtn.addEventListener('click', () => {
        if (window.__assessWholesaleDealInCopilot) {
          window.__assessWholesaleDealInCopilot(item);
        } else {
          handleAIDealAnalysis(item, modal, modalBody);
        }
      });
    });
  }

  // AI Price Advisor listener
  const paBtn = main.querySelector('#priceAdvisorBtn');
  const paResult = main.querySelector('#priceAdvisorResult');
  if (paBtn && paResult) {
    paBtn.addEventListener('click', async () => {
      const crop = main.querySelector('#paCrop').value;
      const region = main.querySelector('#paRegion').value;
      const quantity = main.querySelector('#paQuantity').value || '1 Ton';

      paBtn.disabled = true;
      paBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isUr ? 'تجزیہ جاری ہے...' : 'Analyzing...'}`;
      paResult.style.display = 'block';
      paResult.innerHTML = `
        <div style="text-align:center;padding:24px;">
          <i class="fas fa-brain fa-2x" style="color:var(--accent);animation:pulse 1.5s infinite;"></i>
          <p style="font-size:12px;color:var(--fg-muted);margin-top:10px;">${isUr ? 'جیمنی اے آئی پاکستانی منڈی کا تجزیہ کر رہا ہے...' : 'Gemini AI is analyzing Pakistani mandi rates...'}</p>
        </div>
      `;

      const res = await apiSuggestPrice({
        crop_type: crop,
        region: region,
        quantity: quantity,
        language: currentLang,
      });

      paBtn.disabled = false;
      paBtn.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${isUr ? 'قیمت تجویز کریں' : 'Suggest Price'}`;

      if (res && res.status === 'success' && res.data && res.data.suggestion) {
        const s = res.data.suggestion;
        const confColor = s.confidence === 'High' ? 'var(--accent)' : s.confidence === 'Medium' ? 'var(--warning)' : 'var(--fg-muted)';
        const confBadge = s.confidence === 'High' ? 'badge-green' : s.confidence === 'Medium' ? 'badge-yellow' : 'badge-red';

        paResult.innerHTML = `
          <div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;background:rgba(46,204,64,0.03);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
              <div>
                <div style="font-size:11px;color:var(--fg-muted);text-transform:uppercase;font-weight:600;margin-bottom:4px;">${isUr ? 'تجویز کردہ قیمت' : 'Suggested Price'}</div>
                <div style="font-size:28px;font-weight:900;color:var(--accent);letter-spacing:-0.5px;">${s.suggested_price || '--'}</div>
              </div>
              <div style="text-align:right;">
                <span class="badge ${confBadge}" style="font-size:10px;padding:4px 10px;">
                  <i class="fas fa-signal"></i> ${isUr ? 'اعتماد:' : 'Confidence:'} ${s.confidence || 'N/A'}
                </span>
              </div>
            </div>

            <!-- Price Range Bar -->
            <div style="margin-bottom:16px;">
              <div style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;font-weight:600;margin-bottom:8px;">${isUr ? 'منڈی کی قیمت کی حد' : 'Market Price Range'}</div>
              <div style="position:relative;height:8px;background:var(--bg-input);border-radius:4px;overflow:hidden;">
                <div style="position:absolute;left:10%;right:10%;top:0;bottom:0;background:linear-gradient(90deg, #ef4444, #f59e0b, #2ecc40);border-radius:4px;opacity:0.7;"></div>
                <div style="position:absolute;left:45%;top:-4px;bottom:-4px;width:4px;background:var(--fg);border-radius:2px;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;">
                <span style="color:var(--danger);font-weight:600;">${s.price_range_low || '--'}</span>
                <span style="color:var(--accent);font-weight:700;font-size:12px;">▲ ${isUr ? 'تجویز' : 'Suggested'}</span>
                <span style="color:var(--fg-muted);font-weight:600;">${s.price_range_high || '--'}</span>
              </div>
            </div>

            <!-- Reasoning -->
            <div style="border-top:1px dashed var(--border);padding-top:12px;margin-bottom:10px;">
              <div style="display:flex;align-items:flex-start;gap:8px;">
                <i class="fas fa-lightbulb" style="color:var(--warning);margin-top:3px;flex-shrink:0;"></i>
                <p class="${isUr ? 'urdu-text' : ''}" style="font-size:12px;color:var(--fg);line-height:1.7;margin:0;">${s.reasoning || ''}</p>
              </div>
            </div>

            <!-- Market Insight -->
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:12px;">
              <i class="fas fa-chart-line" style="color:var(--info);margin-top:3px;flex-shrink:0;"></i>
              <p class="${isUr ? 'urdu-text' : ''}" style="font-size:11px;color:var(--fg-muted);line-height:1.6;margin:0;font-style:italic;">${s.market_insight || ''}</p>
            </div>

            <!-- Discuss on Copilot button -->
            <div style="margin-top:14px;border-top:1px dashed var(--border);padding-top:12px;text-align:right;">
              <button class="btn btn-sm btn-outline discuss-pricing-btn" style="padding:6px 12px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px;" type="button">
                <i class="fas fa-comments"></i> ${isUr ? 'کراپ مائنڈ سے تبادلہ خیال کریں' : 'Discuss with CropMind AI'}
              </button>
            </div>
          </div>
        `;

        const discussBtn = paResult.querySelector('.discuss-pricing-btn');
        if (discussBtn) {
          discussBtn.addEventListener('click', () => {
            if (window.__openCopilot) {
              window.__openCopilot();
              // Preload discussions into CropMind input box
              const chatInput = document.getElementById('chatInput');
              if (chatInput) {
                chatInput.value = isUr
                  ? `مجھے اپنی فصل کے ریٹ کے متعلق مشورہ چاہیے۔ فصل: ${crop}، مارکیٹ ریٹ: ${s.suggested_price}۔`
                  : `I want to discuss my crop price. Crop: ${crop}, predicted rate: ${s.suggested_price}.`;
                chatInput.focus();
              }
            }
          });
        }
      } else {
        paResult.innerHTML = `
          <div style="text-align:center;padding:20px;color:var(--fg-muted);font-size:13px;">
            <i class="fas fa-exclamation-triangle" style="color:var(--warning);margin-right:6px;"></i>
            ${isUr ? 'قیمت کا تجزیہ ناکام ہو گیا۔ دوبارہ کوشش کریں۔' : 'Price analysis failed. Please try again.'}
          </div>
        `;
      }
    });
  }
}

await render();

return () => {
  container.classList.remove('wholesale-page');
};
}
