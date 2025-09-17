// /public/auth-guard.js
(() => {
  const s = document.currentScript || document.querySelector('script[data-auth-guard]');
  const LOGIN_URL  = (s && s.dataset.login)  || '/login.html';
  const CHECK_URL  = (s && s.dataset.check)  || '/api/auth/check';
  const LOGOUT_URL = (s && s.dataset.logout) || '/api/auth/logout';
  const LOGOUT_SEL = (s && (s.dataset.logoutBtn || s.dataset.logout)) || '#logout';

  const $ = (sel) => document.querySelector(sel);

  // Prevent content flash while we check
  const prevVis = document.body.style.visibility;
  document.body.style.visibility = 'hidden';

  // Insert a simple "Checking access…" banner at the top (auto-removed on success)
  const gate = document.createElement('div');
  gate.textContent = 'Checking access…';
  gate.setAttribute('data-auth-gate', '');
  gate.style.cssText = 'max-width:640px;margin:10vh auto;text-align:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;';
  document.body.insertBefore(gate, document.body.firstChild);

  function loginWithNext() {
    const next = encodeURIComponent((location.pathname + location.search + location.hash) || '/');
    window.location.replace(`${LOGIN_URL}?next=${next}`);
  }

  async function run() {
    try {
      const res = await fetch(CHECK_URL, { credentials: 'include' });
      if (!res.ok) {
        // Not authorized → go to login with ?next=
        loginWithNext();
        return;
      }

      // Authorized → show content, remove banner
      document.body.style.visibility = prevVis || '';
      gate.remove();

      // Wire up logout if a button/link exists (optional)
      const logoutBtn = $(LOGOUT_SEL);
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          try { await fetch(LOGOUT_URL, { method: 'POST' }); } catch {}
          // After logout, just send to plain login (no next)
          window.location.replace(LOGIN_URL);
        });
      }
    } catch (err) {
      console.error('auth-guard error:', err);
      // Network/other error → fail closed to login with ?next=
      loginWithNext();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
