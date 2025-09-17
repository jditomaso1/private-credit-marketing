// /public/auth-guard.js
(() => {
  // Read config from script tag data-* attributes (with sensible defaults)
  const thisScript = document.currentScript || document.querySelector('script[data-auth-guard]');
  const LOGIN_URL  = (thisScript && thisScript.dataset.login)  || '/login.html';
  const CHECK_URL  = (thisScript && thisScript.dataset.check)  || '/api/auth/check';
  const LOGOUT_URL = (thisScript && thisScript.dataset.logout) || '/api/auth/logout';
  const APP_SEL    = (thisScript && thisScript.dataset.app)    || '#app';
  const GATE_SEL   = (thisScript && thisScript.dataset.gate)   || '#gate';
  const LOGOUT_SEL = (thisScript && thisScript.dataset.logoutBtn) || '#logout';

  // Utilities
  const $ = (sel) => document.querySelector(sel);

  // Ensure we have containers; create minimal ones if missing
  function ensureContainers() {
    let gate = $(GATE_SEL);
    let app  = $(APP_SEL);

    if (!gate) {
      gate = document.createElement('div');
      gate.id = GATE_SEL.startsWith('#') ? GATE_SEL.slice(1) : GATE_SEL;
      gate.textContent = 'Checking access…';
      gate.style.cssText = 'max-width:640px;margin:10vh auto;text-align:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;';
      document.body.insertBefore(gate, document.body.firstChild);
    }

    if (!app) {
      app = document.createElement('div');
      app.id = APP_SEL.startsWith('#') ? APP_SEL.slice(1) : APP_SEL;
      // If we auto-create, we assume your real content is already on the page.
      // So we won’t move content in—just treat the whole body as "app".
      // To keep it simple, we’ll hide body then reveal when authorized.
    }

    return { gate, app };
  }

  function hide(el) { if (el) el.style.display = 'none'; }
  function show(el) { if (el) el.style.display = ''; }

  async function checkAuth() {
    // If page doesn't have #app/#gate, fall back to hiding/showing <body>
    const hasApp = !!$(APP_SEL), hasGate = !!$(GATE_SEL);
    if (!hasApp) document.body.style.visibility = 'hidden'; // prevent flash
    const { gate, app } = ensureContainers();
    if (hasApp) hide(app); // start hidden if an explicit app container exists
    show(gate);

    try {
      const res = await fetch(CHECK_URL, { credentials: 'include' });
      if (!res.ok) {
        window.location.href = LOGIN_URL;
        return;
      }

      // Authorized
      hide(gate);
      if (hasApp) show(app); else document.body.style.visibility = 'visible';

      // Wire logout if present
      const logoutBtn = $(LOGOUT_SEL);
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try { await fetch(LOGOUT_URL, { method: 'POST' }); } catch {}
          window.location.href = LOGIN_URL;
        });
      }
    } catch (err) {
      console.error('Auth guard check failed:', err);
      window.location.href = LOGIN_URL;
    }
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }
})();
