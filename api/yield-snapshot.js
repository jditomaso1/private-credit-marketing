// /api/yield-snapshot.js  (Vercel Serverless Function)
export default async function handler(req, res) {
  try {
    const FRED_KEY = process.env.FRED_API_KEY;
    if (!FRED_KEY) {
      return res.status(500).json({ error: "FRED_API_KEY missing" });
    }

    const series = {
      SOFR: "SOFR",
      HY_OAS: "BAMLH0A0HYM2",
      UST: ["DGS1MO","DGS3MO","DGS6MO","DGS1","DGS2","DGS3","DGS5","DGS7","DGS10","DGS20","DGS30"],
    };

    async function latest(id) {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=1`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`FRED fetch failed for ${id} (${r.status})`);
      const j = await r.json();
      const obs = j?.observations?.[0];
      return { id, date: obs?.date ?? null, value: obs && obs.value !== "." ? Number(obs.value) : null };
    }

    const [sofr, hyoas, ...ust] = await Promise.all([
      latest(series.SOFR),
      latest(series.HY_OAS),
      ...series.UST.map(latest),
    ]);

    // CORS headers (optional if only your site calls it)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=300"); // cache at edge

    res.status(200).json({
      updated_at: new Date().toISOString(),
      sofr,
      hy_oas: hyoas,
      ust_curve: ust,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
