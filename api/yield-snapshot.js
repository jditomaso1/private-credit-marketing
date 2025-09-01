// /api/yield-snapshot.js  (Vercel Serverless Function - Node runtime)
export default async function handler(req, res) {
  const FRED_KEY = process.env.FRED_API_KEY;
  if (!FRED_KEY) {
    res.status(500).json({ error: "FRED_API_KEY missing" });
    return;
  }

  const SERIES = {
    SOFR: "SOFR",
    HY_OAS: "BAMLH0A0HYM2",
    UST: ["DGS1MO","DGS3MO","DGS6MO","DGS1","DGS2","DGS3","DGS5","DGS7","DGS10","DGS20","DGS30"],
  };

  async function latest(id) {
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=1`;
      const r = await fetch(url);
      if (!r.ok) {
        // don’t throw — return a soft failure
        return { id, date: null, value: null, error: `HTTP ${r.status}` };
      }
      const j = await r.json();
      const obs = j?.observations?.[0];
      return { id, date: obs?.date ?? null, value: obs && obs.value !== "." ? Number(obs.value) : null };
    } catch (e) {
      return { id, date: null, value: null, error: String(e?.message || e) };
    }
  }

  // Limit concurrency to keep things fast but under rate limits/timeouts
  async function inBatches(ids, size = 5) {
    const out = [];
    for (let i = 0; i < ids.length; i += size) {
      const batch = ids.slice(i, i + size);
      const results = await Promise.allSettled(batch.map(latest));
      for (const r of results) out.push(r.status === "fulfilled" ? r.value : { id: "unknown", date: null, value: null, error: "batch failure" });
    }
    return out;
  }

  try {
    const [sofr, hyoas] = await Promise.all([latest(SERIES.SOFR), latest(SERIES.HY_OAS)]);
    const ust = await inBatches(SERIES.UST, 5);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=300");
    res.status(200).json({
      updated_at: new Date().toISOString(),
      sofr,
      hy_oas: hyoas,
      ust_curve: ust,
    });
  } catch (e) {
    // Last-resort safety net — include message so you can see it in the browser/logs
    res.status(500).json({ error: `Unhandled: ${String(e?.message || e)}` });
  }
}
