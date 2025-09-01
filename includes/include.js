<!-- /includes/include.js -->
<script>
(async () => {
  async function inject(sel, url){
    const el = document.querySelector(sel);
    if (!el) return;
    const r = await fetch(url, { cache: "no-store" });
    el.innerHTML = await r.text();
  }
  // Inject the basic header and (later) the master footer
  await inject("#site-header", "/includes/master-header-basic.html");
  await inject("#site-footer", "/includes/master-footer.html");
})();
</script>
