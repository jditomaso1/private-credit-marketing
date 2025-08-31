async function loadYield() {
  const out = document.getElementById("yield-output");
  const FRED_KEY = "831a95b60d57089bbf815d7d866b3009"; // <-- replace with your real key

  // Quick checks
  if (!FRED_KEY || FRED_KEY === "YOUR_FRED_API_KEY") {
    out.innerHTML = "Error: FRED API key is missing.";
    return;
  }

  out.textContent = "Loading…";

  const series = [
    "SOFR", "BAMLH0A0HYM2",
    "DGS1MO","DGS3MO","DGS6MO","DGS1","DGS2","DGS3","DGS5","DGS7","DGS10","DGS20","DGS30"
  ];
  const label = {
    DGS1MO: "1M", DGS3MO: "3M", DGS6MO: "6M", DGS1: "1Y", DGS2: "2Y",
    DGS3: "3Y", DGS5: "5Y", DGS7: "7Y", DGS10: "10Y", DGS20: "20Y", DGS30: "30Y"
  };

  try {
    const results = {};
    // Fetch each series (sequential keeps it simple and avoids rate limits)
    for (const id of series) {
      const url =
        `https://api.stlouisfed.org/fred/series/observations` +
        `?series_id=${id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=1`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`FRED request failed for ${id} (HTTP ${r.status})`);
      const j = await r.json();
      const obs = j?.observations?.[0];
      results[id] = obs && obs.value !== "." ? Number(obs.value) : null;
    }

    // Build HTML
    let html = `
      <div style="margin-bottom:8px;">
        <strong>SOFR:</strong> ${results.SOFR ?? "—"}%
        &nbsp; | &nbsp;
        <strong>HY OAS:</strong> ${results.BAMLH0A0HYM2 ?? "—"}%
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
    [
      "DGS1MO","DGS3MO","DGS6MO","DGS1","DGS2","DGS3","DGS5","DGS7","DGS10","DGS20","DGS30"
    ].forEach(id => {
      html += `
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:6px 4px;">${label[id]}</td>
          <td style="padding:6px 4px;">${results[id] ?? "—"}</td>
        </tr>`;
    });
    html += "</tbody></table>";

    out.innerHTML = html;
  } catch (err) {
    console.error(err);
    out.innerHTML = `Error loading data: ${String(err?.message || err)}`;
  }
}
