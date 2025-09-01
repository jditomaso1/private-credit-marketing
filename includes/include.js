<script>
(async () => {
  const variant = document.body?.dataset?.header || "full"; // "full" or "basic"

  async function inject(sel, url) {
    const el = document.querySelector(sel);
    if (!el) return;
    const r = await fetch(url, { cache: "no-store" });
    el.innerHTML = await r.text();
  }

  await inject("#site-header", `/includes/master-header-${variant}.html`);
  await inject("#site-footer", "/includes/master-footer.html");
})();
</script>
