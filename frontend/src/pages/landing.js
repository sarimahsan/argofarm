// ====== ArgoFarm — Landing / Auth Page ======

import { setUser } from '../state.js';
import { showToast } from '../utils.js';
import { navigate } from '../router.js';
import { apiLogin, apiRegister, apiForgotPassword } from '../api.js';

let authMode = 'login';

export function mountLanding(container) {
  container.innerHTML = '';
  container.classList.add('landing-page');

  container.innerHTML = `
    <div class="auth-card">
      <div style="text-align:center; margin-bottom:28px;">
        <div style="display:inline-flex; align-items:center; gap:10px; margin-bottom:10px;">
          <div style="width:44px;height:44px;background:linear-gradient(135deg,var(--accent),var(--accent-dim));border-radius:14px;display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-leaf" style="color:#000;font-size:20px;"></i>
          </div>
          <span style="font-size:22px;font-weight:700;letter-spacing:-0.5px;">ArgoFarm</span>
        </div>
        <p style="color:var(--fg-muted);font-size:13px;">AI-powered crop diagnostics for Pakistani farmers</p>
      </div>

      <div id="authFormContainer">
        <div class="auth-toggle" id="authToggle">
          <button class="active" type="button" id="btnLogin">Login</button>
          <button type="button" id="btnRegister">Register</button>
        </div>

        <form id="authForm">
          <div id="registerFields" style="display:none;">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" class="form-input" placeholder="Ahmed Khan" id="regName">
            </div>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" class="form-input" placeholder="ahmed@argofarm.pk" id="authEmail">
          </div>
          <div class="form-group" id="passwordFieldGroup">
            <label>Password</label>
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <input type="password" class="form-input" placeholder="Enter your password" id="authPass" style="width: 100%; padding-right: 40px; margin-bottom: 0;">
              <button type="button" id="togglePasswordBtn" style="position: absolute; right: 12px; background: none; border: none; color: var(--fg-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; font-size: 14px; padding: 0; outline: none; transition: color 0.2s;" title="Toggle Password Visibility">
                <i class="fas fa-eye" id="togglePasswordIcon"></i>
              </button>
            </div>
          </div>
          
          <div id="authStatusLog" style="display:none; margin-top: 15px; margin-bottom: 15px; padding: 10px; border-radius: 8px; font-family: monospace; font-size: 11px; text-align: left; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-weight: bold; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span id="authStatusDot" style="width: 7px; height: 7px; border-radius: 50%; display: inline-block;"></span>
              SYSTEM LOG:
            </div>
            <div id="authStatusText" style="word-break: break-word; color: var(--fg-muted);">Ready</div>
          </div>

          <button type="submit" class="btn btn-primary" id="authBtn">
            <i class="fas fa-arrow-right-to-bracket"></i> Sign In
          </button>
        </form>

        <p style="text-align:center;margin-top:16px;font-size:12px;">
          <a href="#" id="forgotLink" style="color:var(--accent);text-decoration:none;cursor:pointer;">Forgot Password?</a>
        </p>
      </div>

      <div id="resetContainer" style="display:none;">
        <button type="button" id="backToLogin" style="margin-bottom:16px;background:none;border:none;color:var(--accent);cursor:pointer;font-size:13px;font-family:inherit;">
          ← Back to Login
        </button>
        <h3 style="text-align:center;margin-bottom:20px;font-size:17px;">Reset Password</h3>
        <form id="resetForm">
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" class="form-input" placeholder="ahmed@argofarm.pk" id="resetEmail" required>
          </div>
          <p style="text-align:center;margin-bottom:14px;font-size:11px;color:var(--fg-muted);">
            We'll send a temporary password to your email
          </p>
          <button type="submit" class="btn btn-primary" id="resetBtn">
            <i class="fas fa-paper-plane"></i> Send Temporary Password
          </button>
          <p id="resetMsg" style="text-align:center;margin-top:10px;font-size:12px;color:var(--fg-muted);"></p>
        </form>
      </div>

      <p style="text-align:center;margin-top:18px;font-size:11px;color:var(--fg-muted);">
        Built for Punjab's agricultural community
      </p>
    </div>
  `;

  // Switch auth mode
  const btnLogin = container.querySelector('#btnLogin');
  const btnReg = container.querySelector('#btnRegister');
  btnLogin.addEventListener('click', () => switchMode('login'));
  btnReg.addEventListener('click', () => switchMode('register'));

  function switchMode(mode) {
    authMode = mode;
    btnLogin.classList.toggle('active', mode === 'login');
    btnReg.classList.toggle('active', mode === 'register');
    container.querySelector('#registerFields').style.display = mode === 'register' ? 'block' : 'none';
    container.querySelector('#passwordFieldGroup').style.display = mode === 'register' ? 'none' : 'block';
    container.querySelector('#authBtn').innerHTML = mode === 'login'
      ? '<i class="fas fa-arrow-right-to-bracket"></i> Sign In'
      : '<i class="fas fa-user-plus"></i> Create Account';
    
    // Reset status log
    const statusLog = container.querySelector('#authStatusLog');
    if (statusLog) statusLog.style.display = 'none';
  }

  // Auth form submit
  container.querySelector('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#authEmail').value;
    const name = container.querySelector('#regName').value;
    
    const statusLog = container.querySelector('#authStatusLog');
    const statusText = container.querySelector('#authStatusText');
    const statusDot = container.querySelector('#authStatusDot');

    let pass;
    if (authMode === 'login') {
      pass = container.querySelector('#authPass').value;
      if (!email || !pass) { showToast('Please fill in all fields'); return; }
    } else {
      pass = 'abc123';
      if (!email || !name) { showToast('Please fill in all fields'); return; }
    }

    // Show initial loading status log
    statusLog.style.display = 'block';
    statusText.style.color = 'var(--fg-muted)';
    statusDot.style.background = 'var(--info)';
    statusDot.style.boxShadow = '0 0 8px var(--info)';
    statusText.textContent = authMode === 'login'
      ? `[INFO] Connecting and authenticating user (${email})...`
      : `[INFO] Attempting to create user account (${email})...`;

    const result = authMode === 'login'
      ? await apiLogin(email, pass)
      : await apiRegister(name, email, pass);

    if (result && result.status === 'success') {
      statusDot.style.background = 'var(--accent)';
      statusDot.style.boxShadow = '0 0 8px var(--accent)';
      statusText.style.color = 'var(--accent)';
      statusText.textContent = authMode === 'login'
        ? `[SUCCESS] Logged in successfully! Initializing dashboard...`
        : `[SUCCESS] Account created! Welcome, ${result.data.user.name}!`;

      setUser(result.data.user, result.data.token);
      showToast(`Welcome, ${result.data.user.name}!`);
      setTimeout(() => navigate('dashboard'), 600);
    } else if (!result) {
      statusDot.style.background = 'var(--danger)';
      statusDot.style.boxShadow = '0 0 8px var(--danger)';
      statusText.style.color = 'var(--danger)';
      statusText.textContent = `[ERROR] Connection error. Could not connect to authentication server.`;
    } else {
      statusDot.style.background = 'var(--danger)';
      statusDot.style.boxShadow = '0 0 8px var(--danger)';
      statusText.style.color = 'var(--danger)';
      statusText.textContent = `[ERROR] ${result.message || 'Authentication request failed.'}`;
    }
  });

  // Toggle password visibility
  const togglePassBtn = container.querySelector('#togglePasswordBtn');
  const authPassInput = container.querySelector('#authPass');
  const togglePassIcon = container.querySelector('#togglePasswordIcon');

  if (togglePassBtn && authPassInput && togglePassIcon) {
    togglePassBtn.addEventListener('click', () => {
      const isPass = authPassInput.type === 'password';
      authPassInput.type = isPass ? 'text' : 'password';
      togglePassIcon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
      togglePassIcon.style.color = isPass ? 'var(--accent)' : 'var(--fg-muted)';
    });
  }

  // Forgot password
  container.querySelector('#forgotLink').addEventListener('click', (e) => {
    e.preventDefault();
    container.querySelector('#authFormContainer').style.display = 'none';
    container.querySelector('#resetContainer').style.display = 'block';
  });

  container.querySelector('#backToLogin').addEventListener('click', () => {
    container.querySelector('#resetContainer').style.display = 'none';
    container.querySelector('#authFormContainer').style.display = 'block';
    switchMode('login');
  });

  container.querySelector('#resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#resetEmail').value;
    const msg = container.querySelector('#resetMsg');
    if (!email) { msg.textContent = 'Please enter your email'; msg.style.color = 'var(--danger)'; return; }

    const btn = container.querySelector('#resetBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    const result = await apiForgotPassword(email);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Temporary Password';

    if (result && result.status === 'success') {
      msg.textContent = '✓ Temporary password sent! Check your inbox.';
      msg.style.color = 'var(--accent)';
      setTimeout(() => {
        container.querySelector('#backToLogin').click();
        showToast('Temporary password sent to ' + email);
      }, 2500);
    } else {
      msg.textContent = result?.message || 'Failed to send';
      msg.style.color = 'var(--danger)';
    }
  });

  // Cleanup
  return () => { container.classList.remove('landing-page'); };
}
