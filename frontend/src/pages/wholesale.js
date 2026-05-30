// ====== ArgoFarm — B2B Wholesale Bazaar & AI DealMind ======

import { getState } from '../state.js';
import { showToast, formatDate } from '../utils.js';
import { renderMobileHeader } from '../components/sidebar.js';
import { apiGetMarketplace, apiAnalyzeWholesaleDeal } from '../api.js';

export async function mountWholesale(container) {
  container.innerHTML = '';
  container.classList.add('wholesale-page');

  const state = getState();
  const currentLang = state.currentLang || 'en';
  const isUr = currentLang === 'ur';

  // Localized dictionary keys
  const strings = {
    title: isUr ? 'تھوک بازار اور اے آئی ڈیل مائنڈ' : 'Wholesale Bazaar & B2B DealMind',
    subtitle: isUr 
      ? 'مقامی کسانوں کی تیار فصلیں بلک ہول سیل ریٹس پر خریدیں، قیمت کا اے آئی تجزیہ کریں اور براہِ راست رابطہ کریں' 
      : 'Browse bulk agricultural crops listed directly by local farmers, evaluate prices using AI DealMind, and secure wholesale trades.',
    loadingList: isUr ? 'فصلوں کی لسٹنگ لوڈ ہو رہی ہے...' : 'Loading wholesale listings...',
    noListings: isUr ? 'اس وقت بازار میں کوئی فصل دستیاب نہیں ہے' : 'No bulk crop listings found in the bazaar currently.',
    whatsappContact: isUr ? 'واٹس ایپ پر رابطہ کریں' : 'Order via WhatsApp',
    aiAnalyze: isUr ? 'اے آئی ڈیل ایڈوائزر' : 'AI Deal Advisor',
    analyzing: isUr ? 'اے آئی ڈیل مائنڈ جائزہ لے رہا ہے...' : 'DealMind is analyzing...',
    modalTitle: isUr ? 'اے آئی ڈیل مائنڈ رپورٹ' : 'AI DealMind B2B Assessment',
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

      <div id="wholesaleGridContainer" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:24px;">
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
      return;
    }

    grid.innerHTML = crops.map(item => {
      const img = item.image_url || 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400';
      const cleanPhone = item.phone.replace(/[^0-9]/g, '') || '923000000000';
      
      // WhatsApp prefilled B2B order text
      const waMsg = isUr
        ? `السلام علیکم ${item.seller_name}، میں ایک تھوک خریدار (Wholesale Buyer) ہوں۔ میں نے آرگوفارم پر آپ کی فصل کی ہول سیل لسٹنگ '${item.title}' دیکھی ہے جس کا ریٹ ${item.price} ہے۔ میں اس سودے میں دلچسپی رکھتا ہوں اور سپلائی اور لاجسٹکس کے حوالے سے تفصیلی بات چیت کرنا چاہتا ہوں۔`
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
                <button class="btn btn-sm btn-outline btn-ai-evaluate" style="width:100%;padding:9px;font-size:11.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;border-color:var(--accent);color:var(--accent);" type="button">
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
        handleAIDealAnalysis(item, modal, modalBody);
      });
    });
  }

  await render();

  return () => {
    container.classList.remove('wholesale-page');
  };
}
