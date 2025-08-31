async function loadYield() {
  const FRED_KEY = "YOUR_FRED_API_KEY"; // replace with your actual key
  const series = [
    "SOFR", "BAMLH0A0HYM2",
    "DGS1MO","DGS3MO","DGS6MO","DGS1","DGS2","DGS3","DGS5","DGS7","DGS10","DGS20","DGS30"
  ];

  let results = {};
  for (let id of series) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=1`;
    const r = await fetch(url);
    const j = await r.json();
    const obs = j.observations[0];
    results[id] = obs.value === "." ? null : obs.value;
  }

  // Build output
  let html = `<p><strong>SOFR:</strong> ${results.SOFR}%</p>`;
  html += `<p><strong>HY OAS:</strong> ${results.BAMLH0A0HYM2}%</p>`;
  html += "<table border='1' cellpadding='4'><tr><th>Tenor</th><th>Yield (%)</th></tr>";
  ["DGS1MO","DGS3MO","DGS6MO","DGS1","DGS2","DGS3","DGS5","DGS7","DGS10","DGS20","DGS30"].forEach(id=>{
    html += `<tr><td>${id}</td><td>${results[id] ?? "—"}</td></tr>`;
  });
  html += "</table>";

  document.getElementById("yield-output").innerHTML = html;
}
