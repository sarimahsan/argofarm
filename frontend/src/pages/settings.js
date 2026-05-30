// ====== ArgoFarm — Settings Page ======

import { getState, setState, setUser, setTheme, setLang } from '../state.js';
import { showToast } from '../utils.js';
import { apiGetProfile, apiUpdateProfile } from '../api.js';
import { renderMobileHeader } from '../components/sidebar.js';

export async function mountSettings(container) {
  container.innerHTML = '';
  container.classList.add('settings-page');

  const { currentLang, theme } = getState();
  const isUr = currentLang === 'ur';

  // Translating UI strings
  const strings = {
    title: isUr ? 'اکاؤنٹ کی ترتیبات' : 'Account Settings',
    subtitle: isUr ? 'اپنے پروفائل، فعال فصلوں اور بصری تھیم کی ترجیحات کا انتظام کریں' : 'Manage your profile, active crops, and application visual theme preferences',
    profileInfo: isUr ? 'کسان کی پروفائل معلومات' : 'Farmer Profile Information',
    fullName: isUr ? 'پورا نام' : 'Full Name',
    email: isUr ? 'ای میل ایڈریس' : 'Email Address',
    phone: isUr ? 'فون نمبر' : 'Phone Number',
    region: isUr ? 'کاشتکاری کا علاقہ' : 'Farming Region',
    cropsGrown: isUr ? 'کاشت کی جانے والی فصلیں' : 'Crops Grown',
    saveBtn: isUr ? 'تبدیلیاں محفوظ کریں' : 'Save Changes',
    saving: isUr ? 'محفوظ ہو رہا ہے...' : 'Saving...',
    preferences: isUr ? 'درخواست کی ترجیحات' : 'Application Preferences',
    themeTitle: isUr ? 'بصری انٹرفیس تھیم' : 'Visual Interface Theme',
    themeDesc: isUr ? 'سلیقہ مند ڈارک سٹائل یا ہائی کنٹراسٹ لائٹ سٹائل کا انتخاب کریں' : 'Choose between sleek dark styling or high-contrast light styling',
    dark: isUr ? 'ڈارک تھیم' : 'Dark Theme',
    light: isUr ? 'لائٹ تھیم' : 'Light Theme',
    themeDark: 'Dark / ڈارک',
    themeLight: 'Light / لائٹ',
  };

  renderMobileHeader(container, strings.title);

  const main = document.createElement('div');
  main.className = 'main-content';
  main.innerHTML = `
    <div style="margin-bottom:32px;">
      <h1 style="font-size:26px;font-weight:700;margin-bottom:4px;">${strings.title}</h1>
      <p style="color:var(--fg-muted);font-size:14px;">${strings.subtitle}</p>
    </div>

    <div class="settings-grid">
      <!-- Profile Card -->
      <div class="card" style="padding:28px;">
        <h2 style="font-size:18px;font-weight:700;margin-bottom:24px;display:flex;align-items:center;gap:10px;">
          <i class="fas fa-user-gear" style="color:var(--accent);"></i>
          <span>${strings.profileInfo}</span>
        </h2>
        
        <form id="settingsProfileForm">
          <div class="form-grid">
            <div class="form-group">
              <label>${strings.fullName}</label>
              <input type="text" class="form-input" id="profileName" required placeholder="Ahmed Khan">
            </div>
            <div class="form-group">
              <label>${strings.email}</label>
              <input type="email" class="form-input" id="profileEmail" readonly style="opacity:0.6;cursor:not-allowed;" title="Email cannot be changed">
            </div>
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label>${strings.phone}</label>
              <input type="text" class="form-input" id="profilePhone" placeholder="03001234567">
            </div>
            <div class="form-group">
              <label>${strings.region}</label>
              <select class="form-input" id="profileRegion" style="cursor:pointer; color-scheme:dark;">
                <option value="Lahore">Lahore / لاہور</option>
                <option value="Karachi">Karachi / کراچی</option>
                <option value="Islamabad">Islamabad / اسلام آباد</option>
                <option value="Peshawar">Peshawar / پشاور</option>
                <option value="Quetta">Quetta / کوئٹہ</option>
                <option value="Multan">Multan / ملتان</option>
                <option value="Faisalabad">Faisalabad / فیصل آباد</option>
                <option value="Hyderabad">Hyderabad / حیدرآباد</option>
                <option value="Gujranwala">Gujranwala / گوجرانوالہ</option>
                <option value="Sialkot">Sialkot / سیالکوٹ</option>
                <option value="Rawalpindi">Rawalpindi / راولپنڈی</option>
                <option value="Gilgit">Gilgit / گلگت</option>
                <option value="Muzaffarabad">Muzaffarabad / مظفرآباد</option>
                <option value="Gwadar">Gwadar / گوادر</option>
                <option value="Bahawalpur">Bahawalpur / بہاولپور</option>
                <option value="Kasur">Kasur / قصور</option>
              </select>
            </div>
          </div>
          
          <div class="form-group" style="margin-bottom:28px;">
            <label>${strings.cropsGrown}</label>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;margin-top:8px;">
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" name="cropCheckbox" value="Wheat" style="accent-color:var(--accent);"> Wheat / گندم
              </label>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" name="cropCheckbox" value="Rice" style="accent-color:var(--accent);"> Rice / چاول
              </label>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" name="cropCheckbox" value="Cotton" style="accent-color:var(--accent);"> Cotton / کپاس
              </label>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" name="cropCheckbox" value="Maize" style="accent-color:var(--accent);"> Maize / مکئی
              </label>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" name="cropCheckbox" value="Sugarcane" style="accent-color:var(--accent);"> Sugarcane / گنا
              </label>
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary" id="saveProfileBtn" style="width:auto;min-width:180px;padding:12px 28px;">
            <i class="fas fa-save"></i> <span>${strings.saveBtn}</span>
          </button>
        </form>
      </div>

      <!-- App Preference Card -->
      <div class="card" style="padding:28px;margin-top:20px;">
        <h2 style="font-size:18px;font-weight:700;margin-bottom:20px;display:flex;align-items:center;gap:10px;">
          <i class="fas fa-wand-magic-sparkles" style="color:var(--accent);"></i>
          <span>${strings.preferences}</span>
        </h2>
        
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
          <div>
            <div style="font-weight:600;font-size:14px;">${strings.themeTitle}</div>
            <div style="font-size:12px;color:var(--fg-muted);">${strings.themeDesc}</div>
          </div>
          <div class="theme-toggle-wrap">
            <button id="themeBtnDark" class="theme-btn" type="button">
              <i class="fas fa-moon"></i> ${strings.themeDark}
            </button>
            <button id="themeBtnLight" class="theme-btn" type="button">
              <i class="fas fa-sun"></i> ${strings.themeLight}
            </button>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;margin-top:20px;padding-top:20px;border-top:1px dashed var(--border);">
          <div>
            <div style="font-weight:600;font-size:14px;">${isUr ? 'درخواست کی زبان' : 'Application Language'}</div>
            <div style="font-size:12px;color:var(--fg-muted);">${isUr ? 'انٹرفیس اور اے آئی ہدایات کے لیے اپنی زبان منتخب کریں' : 'Choose application language for user interface and AI advisories'}</div>
          </div>
          <div class="theme-toggle-wrap">
            <button id="langBtnEn" class="theme-btn" type="button">
              English
            </button>
            <button id="langBtnUr" class="theme-btn" type="button">
              اردو
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(main);

  // Initialize values
  const user = getState().user;
  if (user) {
    main.querySelector('#profileName').value = user.name || '';
    main.querySelector('#profileEmail').value = user.email || '';
    main.querySelector('#profilePhone').value = user.phone || '';
    main.querySelector('#profileRegion').value = user.region || 'Lahore';
    
    // Checkboxes
    const crops = user.crop_types || [];
    main.querySelectorAll('input[name="cropCheckbox"]').forEach(cb => {
      cb.checked = crops.includes(cb.value);
    });
  }

  // Fetch fresh profile from API to be sure
  fetchFreshProfile(main);

  // Form Submit
  main.querySelector('#settingsProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = main.querySelector('#saveProfileBtn');
    const saveText = saveBtn.querySelector('span');
    const saveIcon = saveBtn.querySelector('i');
    
    saveBtn.disabled = true;
    saveText.textContent = strings.saving;
    saveIcon.className = 'fas fa-spinner fa-spin';

    const name = main.querySelector('#profileName').value;
    const phone = main.querySelector('#profilePhone').value;
    const region = main.querySelector('#profileRegion').value;
    
    const crop_types = [];
    main.querySelectorAll('input[name="cropCheckbox"]:checked').forEach(cb => {
      crop_types.push(cb.value);
    });

    const result = await apiUpdateProfile({ name, phone, region, crop_types });
    
    saveBtn.disabled = false;
    saveText.textContent = strings.saveBtn;
    saveIcon.className = 'fas fa-save';

    if (result && result.status === 'success') {
      const { authToken } = getState();
      setUser(result.data.user, authToken);
      showToast(isUr ? 'پروفائل کامیابی سے اپ ڈیٹ ہو گئی!' : 'Profile updated successfully!');
    }
  });

  // Theme controls
  const btnDark = main.querySelector('#themeBtnDark');
  const btnLight = main.querySelector('#themeBtnLight');

  const updateThemeUI = (activeTheme) => {
    btnDark.classList.toggle('active', activeTheme === 'dark');
    btnLight.classList.toggle('active', activeTheme === 'light');
  };

  // Set initial theme UI
  updateThemeUI(theme);

  btnDark.addEventListener('click', () => {
    setTheme('dark');
    updateThemeUI('dark');
    showToast(isUr ? 'ڈارک تھیم فعال ہو گئی' : 'Dark theme enabled');
  });

  btnLight.addEventListener('click', () => {
    setTheme('light');
    updateThemeUI('light');
    showToast(isUr ? 'لائٹ تھیم فعال ہو گئی' : 'Light theme enabled');
  });

  // Language controls
  const btnEn = main.querySelector('#langBtnEn');
  const btnUr = main.querySelector('#langBtnUr');

  const updateLangUI = (activeLang) => {
    btnEn.classList.toggle('active', activeLang === 'en');
    btnUr.classList.toggle('active', activeLang === 'ur');
  };

  updateLangUI(currentLang);

  btnEn.addEventListener('click', () => {
    setLang('en');
    updateLangUI('en');
    mountSettings(container);
    showToast('Language set to English');
    // Force sidebar update
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) {
      sidebar.innerHTML = '';
      import('../components/sidebar.js').then(m => m.renderSidebar(sidebar));
    }
  });

  btnUr.addEventListener('click', () => {
    setLang('ur');
    updateLangUI('ur');
    mountSettings(container);
    showToast('زبان کامیابی سے تبدیل ہو گئی ہے');
    // Force sidebar update
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) {
      sidebar.innerHTML = '';
      import('../components/sidebar.js').then(m => m.renderSidebar(sidebar));
    }
  });

  return () => {
    container.classList.remove('settings-page');
  };
}

async function fetchFreshProfile(main) {
  const result = await apiGetProfile();
  if (result && result.status === 'success') {
    const user = result.data;
    const { authToken } = getState();
    setUser(user, authToken);

    const nameInput = main.querySelector('#profileName');
    const phoneInput = main.querySelector('#profilePhone');
    const regionSelect = main.querySelector('#profileRegion');

    if (nameInput) nameInput.value = user.name || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (regionSelect) regionSelect.value = user.region || 'Lahore';

    const crops = user.crop_types || [];
    main.querySelectorAll('input[name="cropCheckbox"]').forEach(cb => {
      cb.checked = crops.includes(cb.value);
    });
  }
}
