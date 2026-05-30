// ====== ArgoFarm — Crop Calendar Page ======

import { getState } from '../state.js';
import { renderMobileHeader } from '../components/sidebar.js';
import { apiGetAICalendar } from '../api.js';
import { showToast } from '../utils.js';

const CALENDAR_DATA = {
  wheat: {
    name: 'Wheat (گندم)',
    season: 'Rabi',
    months: {
      October: {
        activity: 'Land Preparation & Seed Treatment',
        activityUr: 'زمین کی تیاری اور بیج کا علاج',
        details: 'Plough field 2-3 times. Apply organic compost and treat seeds with fungicides to prevent root rot. Buy certified seeds (Inqalab-91, Faisalabad-08).',
        detailsUr: 'کھیت میں 2 سے 3 بار ہل چلائیں۔ نامیاتی کھاد ڈالیں اور جڑوں کے گلنے سڑنے سے بچاؤ کے لیے بیجوں کو پھپھوندی کش ادویات سے علاج کریں۔ مصدقہ بیج خریدیں۔'
      },
      November: {
        activity: 'Sowing Season Peak',
        activityUr: 'کپاس/گندم کی بوائی کا عروج',
        details: 'Ideal sowing temperature is 20-22°C. Sow seeds using seed drills at 50 kg per acre. Keep row-to-row distance of 22 cm.',
        detailsUr: 'بوائی کے لیے موزوں ترین درجہ حرارت 20 سے 22 ڈگری ہے۔ بیج ڈرل کے ذریعے 50 کلوگرام فی ایکڑ بوائی کریں۔ قطاروں کا درمیانی فاصلہ 22 سینٹی میٹر رکھیں۔'
      },
      December: {
        activity: 'First Irrigation (Crown Root)',
        activityUr: 'پہلا پانی (تاج جڑیں نکلنے پر)',
        details: 'Apply first irrigation 20-22 days after sowing (crown root initiation stage). Apply 1 bag of Urea fertilizer per acre.',
        detailsUr: 'بوائی کے 20 سے 22 دن بعد پہلا پانی دیں (تاج جڑیں نکلنے کا مرحلہ)۔ فی ایکڑ 1 بوری یوریا کھاد ڈالیں۔'
      },
      January: {
        activity: 'Weed Control & Second Irrigation',
        activityUr: 'جڑی بوٹیوں کا تدارک اور دوسرا پانی',
        details: 'Spray selective weedicides for broadleaf and narrow-leaf weeds. Apply second irrigation at tillering stage.',
        detailsUr: 'چوڑے اور نوکیلے پتے والی جڑی بوٹیوں کے لیے مناسب زہروں کا سپرے کریں۔ شگوفے نکلنے کے مرحلے پر دوسرا پانی دیں۔'
      },
      February: {
        activity: 'Third Irrigation & Rust Monitoring',
        activityUr: 'تیسرا پانی اور کنگی (Rust) کی نگرانی',
        details: 'Apply third irrigation at booting stage. Monitor crop for Yellow Rust outbreaks. Spray fungicides if symptoms appear.',
        detailsUr: 'بوٹ کے مرحلے پر تیسرا پانی دیں۔ زرد کنگی (Yellow Rust) کے حملے کی نگرانی کریں۔ علامات ظاہر ہونے کی صورت میں پھپھوندی کش سپرے کریں۔'
      },
      March: {
        activity: 'Final Irrigation (Milking Stage)',
        activityUr: 'آخری پانی (دودھیا مرحلہ)',
        details: 'Apply final irrigation at milk stage. Avoid irrigating during high winds to prevent lodging (crop falling over).',
        detailsUr: 'دودھیا مرحلے پر آخری پانی دیں۔ تیز ہواؤں کے دوران پانی دینے سے گریز کریں تاکہ فصل گرنے (Lodging) سے محفوظ رہے۔'
      },
      April: {
        activity: 'Harvesting & Threshing',
        activityUr: 'کٹائی اور گہائی',
        details: 'Harvest when grains are dry and golden (moisture below 12%). Use combine harvesters or manual cutting. Store in dry, clean bags.',
        detailsUr: 'کٹائی اس وقت کریں جب دانے خشک اور سنہری ہو جائیں (نمی 12 فیصد سے کم)۔ کمبائن ہارویسٹر استعمال کریں اور خشک, صاف تھیلوں میں ذخیرہ کریں۔'
      }
    }
  },
  rice: {
    name: 'Rice (چاول)',
    season: 'Kharif',
    months: {
      May: {
        activity: 'Nursery Bed Preparation',
        activityUr: 'پنیری کی تیاری',
        details: 'Prepare nursery beds using high-yield varieties (Basmati-385, Super Basmati). Wet nursery method is recommended.',
        detailsUr: 'اعلیٰ پیداواری اقسام کے بیجوں کی مدد سے نرسری کی کیاریاں تیار کریں۔ گیلی پنیری کا طریقہ بہترین ہے۔'
      },
      June: {
        activity: 'Transplanting Nursery',
        activityUr: 'پنیری کی منتقلی',
        details: 'Transplant 25-30 days old nursery seedlings into flooded fields. Maintain standing water of 2-3 inches for weed control.',
        detailsUr: '25 سے 30 دن پرانی پنیری کے پودوں کو پانی سے بھرے کھیتوں میں منتقل کریں۔ جڑی بوٹیوں کی تلفی کے لیے 2 سے 3 انچ پانی کھڑا رکھیں۔'
      },
      July: {
        activity: 'Fertilizer Application',
        activityUr: 'کھادوں کا استعمال',
        details: 'Apply Zinc Sulfate and Urea 10-15 days after transplanting. Keep checking field water levels daily.',
        detailsUr: 'پنیری کی منتقلی کے 10 سے 15 دن بعد زنک سلفیٹ اور یوریا کھاد ڈالیں۔ کھیت میں پانی کی سطح روزانہ چیک کرتے رہیں۔'
      },
      August: {
        activity: 'Stem Borer & Blight Prevention',
        activityUr: 'تنا جھلسنے اور تنے کی سنڈی سے بچاؤ',
        details: 'Monitor for Rice Stem Borer and Bacterial Leaf Blight. Apply recommended granular insecticides.',
        detailsUr: 'چاول کے تنے کی سنڈی اور بیکٹیریل لیف بلائٹ کی نگرانی کریں۔ تجویز کردہ دانے دار کیڑے مار ادویات کا استعمال کریں۔'
      },
      September: {
        activity: 'Water Management (Panicle Stage)',
        activityUr: 'پانی کی دیکھ بھال',
        details: 'Ensure proper water availability during panicle initiation and flowering. Drain field 10 days before harvesting.',
        detailsUr: 'سٹہ نکلنے اور پھول آنے کے دوران پانی کی مناسب فراہمی یقینی بنائیں۔ کٹائی سے 10 دن پہلے کھیت کا پانی نکال دیں۔'
      },
      October: {
        activity: 'Harvest Peak',
        activityUr: 'کٹائی کا عروج',
        details: 'Harvest when 90% of panicles turn golden. Slow dry harvested paddy to prevent grain cracking.',
        detailsUr: 'جب 90 فیصد سٹے سنہری ہو جائیں تو کٹائی کریں۔ دانے ٹوٹنے سے بچانے کے لیے دھان کو آہستہ آہستہ خشک کریں۔'
      }
    }
  },
  cotton: {
    name: 'Cotton (کپاس)',
    season: 'Kharif',
    months: {
      April: {
        activity: 'Sowing Preparation',
        activityUr: 'کپاس کی تیاری',
        details: 'Deep plough soil to break hardpans. Treat BT cotton seeds with insecticides to protect against sucking pests.',
        detailsUr: 'سخت مٹی کو توڑنے کے لیے گہرا ہل چلائیں۔ چوسنے والے کیڑوں سے بچاؤ کے لیے بی ٹی کاٹن کے بیجوں پر زہر لگائیں۔'
      },
      May: {
        activity: 'Sowing & Early Stand',
        activityUr: 'بوائی اور ابتدائی نگہداشت',
        details: 'Sow on beds/ridges. Keep distance of 75 cm between beds. Deliver first water 3-4 days after sowing.',
        detailsUr: 'کھیلیوں/پٹریوں پر کاشت کریں۔ پٹریوں کا درمیانی فاصلہ 75 سینٹی میٹر رکھیں۔ بوائی کے 3 سے 4 دن بعد پہلا پانی دیں۔'
      },
      June: {
        activity: 'First Fertilizer & Thinning',
        activityUr: 'پہلی کھاد اور چھدرائی',
        details: 'Perform thinning to maintain plant-to-plant distance of 20-30 cm. Apply first dose of Nitrogen fertilizer.',
        detailsUr: 'پودوں کا درمیانی فاصلہ 20 سے 30 سینٹی میٹر رکھنے کے لیے چھدرائی کریں۔ نائٹروجن والی کھاد کی پہلی قسط ڈالیں۔'
      },
      July: {
        activity: 'Whitefly & Pink Bollworm Alerts',
        activityUr: 'سفید مکھی اور گلابی سنڈی کے الرٹ',
        details: 'High temperature and humidity cause pests. Spray pesticides if pest population exceeds economic threshold limits.',
        detailsUr: 'زیادہ درجہ حرارت اور نمی کی وجہ سے کیڑوں کا حملہ بڑھتا ہے۔ اگر کیڑوں کی تعداد حد سے تجاوز کرے تو سپرے کریں۔'
      },
      August: {
        activity: 'Peak Flowering & Irrigation',
        activityUr: 'پھول آنے کا عروج اور آبپاشی',
        details: 'Critical water stage. Water stress at flowering/bolling causes boll shedding. Apply Potassium fertilizer to enhance size.',
        detailsUr: 'آبپاشی کا نازک ترین مرحلہ۔ پھول اور ٹینڈے بننے کے دوران پانی کی کمی ٹینڈے گرنے کا سبب بنتی ہے۔ پوٹاشیم کھاد ڈالیں۔'
      },
      September: {
        activity: 'Boll Opening & Picking',
        activityUr: 'ٹینڈوں کا کھلنا اور چنائی',
        details: 'Pick cotton when bolls are fully open. Pick in dry weather after dew has dried up. Store in clean bags.',
        detailsUr: 'جب ٹینڈے مکمل کھل جائیں تو چنائی کریں۔ شبنم خشک ہونے کے بعد خشک موسم میں چنائی کریں۔ صاف بیگ میں اسٹور کریں۔'
      }
    }
  }
};

export async function mountCalendar(container) {
  container.innerHTML = '';
  container.classList.add('calendar-page');

  renderMobileHeader(container, 'Crop Calendar');

  const state = getState();
  const currentLang = state.currentLang || 'en';
  const isUr = currentLang === 'ur';

  const main = document.createElement('div');
  main.className = 'main-content';

  let activeCrop = 'wheat';
  let activeMonth = 'November';

  function renderUI() {
    const cropData = CALENDAR_DATA[activeCrop];
    const months = Object.keys(cropData.months);
    if (!months.includes(activeMonth)) {
      activeMonth = months[0];
    }
    const currentActivity = cropData.months[activeMonth];

    main.innerHTML = `
      <div style="margin-bottom:28px;">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;" class="${isUr ? 'urdu-text' : ''}">
          ${isUr ? 'فصلوں کا کیلنڈر' : 'Interactive Crop Calendar'}
        </h1>
        <p style="font-size:13px;color:var(--fg-muted);" class="${isUr ? 'urdu-text' : ''}">
          ${isUr ? 'پاکستان کے زراعتی موسموں کے مطابق بوائی، آبپاشی اور دیکھ بھال کا تفصیلی نظام' : 'Track and plan critical agricultural phases tailored to Pakistani climates (Rabi and Kharif seasons).'}
        </p>
      </div>

      <!-- Crop Selector Tabs -->
      <div class="crop-selector-tabs" style="display:flex;gap:10px;margin-bottom:24px;overflow-x:auto;padding-bottom:6px;">
        ${Object.keys(CALENDAR_DATA).map(key => `
          <button class="btn ${activeCrop === key ? 'btn-accent' : 'btn-outline'} crop-tab-btn" data-crop="${key}" type="button" style="white-space:nowrap;padding:10px 18px;">
            <i class="fas ${key === 'wheat' ? 'fa-wheat-awn' : key === 'rice' ? 'fa-bowl-rice' : 'fa-shirt'}" style="margin-right:6px;"></i> ${CALENDAR_DATA[key].name}
          </button>
        `).join('')}
      </div>

      <!-- Crop Banner Info -->
      <div class="card" style="padding:18px 24px;background:rgba(46,204,64,0.04);border:1px solid var(--accent-alpha);margin-bottom:28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-green" style="text-transform:uppercase;font-size:10px;font-weight:700;">
            ${cropData.season} Season (${cropData.season === 'Rabi' ? (isUr ? 'سردی کی فصل' : 'Winter') : (isUr ? 'گرمی کی فصل' : 'Summer')})
          </span>
          <h2 style="font-size:18px;font-weight:700;margin-top:6px;">${cropData.name} Planning</h2>
        </div>
        <div style="font-size:12px;color:var(--fg-muted);font-weight:500;">
          <i class="fas fa-circle-info" style="color:var(--accent);margin-right:4px;"></i> Select a month below to view details.
        </div>
      </div>

      <!-- Main Interactive Calendar Layout -->
      <div class="dash-grid-2" style="align-items:start;">
        
        <!-- Months Navigation Column -->
        <div class="card" style="padding:18px;overflow:hidden;max-width:100%;">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;">
            ${isUr ? 'مہینہ منتخب کریں' : 'Crop Timeline Phases'}
          </h3>
          <div class="calendar-months-container">
            ${months.map(m => {
              const act = cropData.months[m];
              const isActive = activeMonth === m;
              return `
                <button class="calendar-month-btn ${isActive ? 'active' : ''}" data-month="${m}" type="button" style="text-align:left;padding:12px 16px;border-radius:10px;background:${isActive ? 'rgba(46,204,64,0.08)' : 'var(--bg-input)'};border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'};cursor:pointer;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;width:100%;">
                  <div>
                    <div style="font-weight:700;font-size:13px;color:${isActive ? 'var(--accent)' : 'var(--fg)'};">${m}</div>
                    <div class="calendar-month-activity" style="font-size:11px;color:var(--fg-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">
                      ${isUr ? act.activityUr : act.activity}
                    </div>
                  </div>
                  <i class="fas fa-chevron-${isActive ? 'left' : 'right'} calendar-month-chevron" style="font-size:10px;color:${isActive ? 'var(--accent)' : 'var(--fg-muted)'};"></i>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Activity & Details Column -->
        <div class="card" style="padding:22px;min-height:300px;display:flex;flex-direction:column;justify-content:space-between;border-left:4px solid var(--accent);">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
              <span style="font-size:11px;text-transform:uppercase;color:var(--accent);font-weight:700;letter-spacing:1px;">
                ${isUr ? 'تجویز کردہ سرگرمی' : 'Recommended Monthly Operation'}
              </span>
              <span class="badge badge-yellow">${activeMonth}</span>
            </div>
            
            <h2 class="${isUr ? 'urdu-text' : ''}" style="font-size:20px;font-weight:800;color:var(--fg);margin-bottom:14px;line-height:1.4;">
              <i class="fas fa-calendar-check" style="color:var(--accent);margin-right:8px;"></i>
              ${isUr ? currentActivity.activityUr : currentActivity.activity}
            </h2>

            <div style="margin:20px 0;background:var(--bg-input);padding:18px;border-radius:10px;border:1px solid var(--border);box-shadow:inset 0 1px 2px rgba(0,0,0,0.03);">
              <div style="font-size:11px;text-transform:uppercase;color:var(--fg-muted);margin-bottom:6px;font-weight:600;">
                ${isUr ? 'تفصیلی ہدایات' : 'Technical Guidance'}
              </div>
              <p class="${isUr ? 'urdu-text' : ''}" style="font-size:13px;line-height:1.8;color:var(--fg);font-weight:500;">
                ${isUr ? currentActivity.detailsUr : currentActivity.details}
              </p>
            </div>

            <!-- AI Advisory Section -->
            <button class="btn btn-sm btn-accent" id="askAICalendarBtn" type="button" style="width:100%;padding:11px;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:18px;box-shadow:0 4px 14px var(--accent-glow);">
              <i class="fas fa-wand-magic-sparkles"></i> ${isUr ? 'اے آئی ماہر زراعت کی رائے حاصل کریں' : 'Consult AI Agronomist'}
            </button>
            <div id="aiCalendarResponse" style="display:none;margin-bottom:18px;background:rgba(46,204,64,0.03);border:1px dashed var(--accent);padding:16px;border-radius:10px;animation:pageIn 0.35s ease;">
              <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">
                ✨ Dr. Crop AI Agronomist Advice
              </div>
              <div id="aiCalendarText" style="font-size:12px;line-height:1.8;color:var(--fg);font-weight:500;"></div>
            </div>
          </div>

          <div style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);padding:12px 16px;border-radius:10px;display:flex;gap:12px;align-items:flex-start;margin-top:14px;">
            <i class="fas fa-triangle-exclamation" style="color:var(--warning);margin-top:2px;"></i>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--warning);text-transform:uppercase;letter-spacing:0.5px;">
                ${isUr ? 'پیسٹ الرٹ / بیماریوں کا خدشہ' : 'Seasonal Pest Alert'}
              </div>
              <div style="font-size:11px;color:var(--fg-muted);margin-top:2px;">
                ${activeCrop === 'wheat' 
                  ? (isUr ? 'فروری اور مارچ کے دوران گندم کی فصل میں پیلی اور بھوری کنگی کی نگرانی ضروری ہے۔' : 'Watch out for Yellow and Brown Rust during damp February-March periods.')
                  : activeCrop === 'rice'
                  ? (isUr ? 'اگست کے دوران تنے کی سنڈی اور تنا جھلسنے کے حملے کا زیادہ خطرہ ہوتا ہے۔' : 'August and September present high risks of Stem Borer and Bacterial Leaf Blight.')
                  : (isUr ? 'جون سے اگست تک سفید مکھی، گلابی سنڈی اور تھرپس کے حملوں پر نظر رکھیں۔' : 'Peak whitefly, jassid, and pink bollworm infestation occurs between June and August.')
                }
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    // Add Tab Event Listeners
    main.querySelectorAll('.crop-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCrop = btn.dataset.crop;
        activeMonth = Object.keys(CALENDAR_DATA[activeCrop])[0];
        renderUI();
      });
    });

    // Add Month Event Listeners
    main.querySelectorAll('.calendar-month-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeMonth = btn.dataset.month;
        renderUI();
      });
    });

    // Add AI Agronomist Button Listener
    const aiBtn = main.querySelector('#askAICalendarBtn');
    if (aiBtn) {
      aiBtn.addEventListener('click', async () => {
        aiBtn.disabled = true;
        aiBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isUr ? 'حساب لگا رہا ہے...' : 'Analyzing Season...'}`;
        
        const res = await apiGetAICalendar(activeCrop, activeMonth, currentLang);
        
        aiBtn.disabled = false;
        aiBtn.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${isUr ? 'اے آئی ماہر زراعت کی رائے حاصل کریں' : 'Consult AI Agronomist'}`;

        if (res && res.status === 'success') {
          const respContainer = main.querySelector('#aiCalendarResponse');
          const respText = main.querySelector('#aiCalendarText');
          
          if (respContainer && respText) {
            respContainer.style.display = 'block';
            respText.innerHTML = res.data.advisory.replace(/\n/g, '<br/>');
            if (isUr) respText.classList.add('urdu-text');
            showToast(isUr ? 'اے آئی ماہر زراعت نے رپورٹ تیار کر دی ہے' : 'AI Agronomist advice updated!');
          }
        }
      });
    }
  }

  container.appendChild(main);
  renderUI();

  return () => {
    container.classList.remove('calendar-page');
  };
}
