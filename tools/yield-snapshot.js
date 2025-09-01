async function loadYield() {
  const out = document.getElementById("yield-output");
  out.textContent = "Loading…";

  const API = "https://private-credit.ai/api/yield-snapshot";
  const fmt = (n) => (n == null ? "—" : Number(n).toFixed(2));
  const niceDate = (s) => (s ? new Date(s + "T00:00:00Z").toLocaleDateString() : "—");
  const label = { DGS1MO:"1M", DGS3MO:"3M", DGS6MO:"6M", DGS1:"1Y", DGS2:"2Y",
                  DGS3:"3Y", DGS5:"5Y", DGS7:"7Y", DGS10:"10Y", DGS20:"20Y", DGS30:"30Y" };

  try {
    const r = await fetch(API, { cache: "no-store", mode: "cors" });
    if (!r.ok) throw new Error(`Proxy error ${r.status}`);
    const data = await r.json();

    // Build table HTML
    let html = `
      <div style="margin-bottom:10px;">
        <strong>SOFR:</strong> ${fmt(data.sofr?.value)}%
        <span style="color:#666;">(as of ${niceDate(data.sofr?.date)})</span>
        &nbsp; | &nbsp;
        <strong>HY OAS:</strong> ${fmt(data.hy_oas?.value)}%
        <span style="color:#666;">(as of ${niceDate(data.hy_oas?.date)})</span>
      </div>

      <div id="curve-svg" style="margin:6px 0 12px;border:1px solid #eee;border-radius:6px;padding:6px;"></div>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #ddd;text-align:left;">
            <th style="padding:6px 4px;">Tenor</th>
            <th style="padding:6px 4px;">UST Yield (%)</th>
          </tr>
        </thead>
        <tbody>
    `;
    (data.ust_curve || []).forEach(p => {
      const t = label[p.id] || p.tenor || p.id;
      html += `
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:6px 4px;">${t}</td>
          <td style="padding:6px 4px;">${fmt(p.value)}</td>
        </tr>`;
    });
    html += "</tbody></table>";

    out.innerHTML = html;

    // ---- Minimal SVG curve (no libs) ----
    const pts = (data.ust_curve || []).filter(p => p.value != null);
    if (pts.length >= 2) {
      const w = 520, h = 160, pad = 14;
      const xs = (i) => pad + i * ((w - pad*2) / (pts.length - 1));
      const values = pts.map(p => p.value);
      const min = Math.min(...values), max = Math.max(...values);
      const ys = (v) => pad + (1 - (v - min) / ((max - min) || 1)) * (h - pad*2);

      const path = pts.map((p, i) => `${i===0?'M':'L'} ${xs(i)} ${ys(p.value)}`).join(" ");
      const dots = pts.map((p, i) => `<circle cx="${xs(i)}" cy="${ys(p.value)}" r="3" />`).join("");

      const xLabels = pts.map((p, i) => {
        const t = label[p.id] || p.tenor || p.id;
        return `<text x="${xs(i)}" y="${h-2}" font-size="10" text-anchor="middle">${t}</text>`;
      }).join("");

      const svg = `
        <svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="UST yield curve">
          <polyline fill="none" stroke="currentColor" stroke-width="2"
            points="${pts.map((p,i)=>`${xs(i)},${ys(p.value)}`).join(' ')}" opacity="0.85" />
          ${dots}
          ${xLabels}
        </svg>`;
      document.getElementById("curve-svg").innerHTML = svg;
    } else {
      document.getElementById("curve-svg").innerHTML =
        '<div style="color:#666;font-size:12px;">Curve unavailable</div>';
    }
    // --------------------------------------

  } catch (err) {
    console.error(err);
    out.textContent = `Error loading data: ${String(err?.message || err)}`;
  }
}
