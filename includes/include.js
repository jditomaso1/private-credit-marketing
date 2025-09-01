// /includes/include.js  (pure JS, no <script> wrappers)
(async () => {
  const variant = (document.body && document.body.dataset && document.body.dataset.header) || "basic"; // "basic" or "full"

  async function inject(sel, url) {
    const el = document.querySelector(sel);
    if (!el) return;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      el.innerHTML = await r.text();
    } catch (e) {
      console.error("Include inject failed:", url, e);
      el.innerHTML = ""; // fail silently on page
    }
  }

  await inject("#site-header", `/includes/master-header-${variant}.html`);
  await inject("#site-footer", "/includes/master-footer.html");
})();
