async function loadYield() {
  const out = document.getElementById("yield-output");
  out.textContent = "Loading…";

  const fmt = (n) => (n == null ? "—" : Number(n).toFixed(2));
  const niceDate = (s) => (s ? new Date(s + "T00:00:00Z").toLocaleDateString() : "—");
  const label = { DGS1MO:"1M", DGS3MO:"3M", DGS6MO:"6M", DGS1:"1Y", DGS2:"2Y",
                  DGS3:"3Y", DGS5:"5Y", DGS7:"7Y", DGS10:"10Y", DGS20:"20Y", DGS30:"30Y" };

  try {
    const r = await fetch("/api/yield-snapshot", { cache: "no-store" });
    if (!r.ok) throw new Error(`Proxy error ${r.status}`);
    const data = await r.json();

    let html = `
      <div style="margin-bottom:10px;">
        <strong>SOFR:</strong> ${fmt(data.sofr?.value)}%
        <span style="color:#666;">(as of ${niceDate(data.sofr?.date)})</span>
        &nbsp; | &nbsp;
        <strong>HY OAS:</strong> ${fmt(data.hy_oas?.value)}%
        <span style="color:#666;">(as of ${niceDate(data.hy_oas?.date)})</span>
      </div>

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
  } catch (err) {
    console.error(err);
    out.textContent = `Error loading data: ${String(err?.message || err)}`;
  }
}
