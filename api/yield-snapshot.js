// /api/yield-snapshot.js  (Vercel serverless function)
export default async function handler(req, res) {
  try {
    const FRED_KEY = process.env.FRED_API_KEY;
    if (!FRED_KEY) return res.status(500).json({ error: "FRED_API_KEY missing" });

    const SERIES = {
      SOFR: "SOFR",
      HY_OAS: "BAMLH0A0HYM2",
      UST: ["DGS1MO","DGS3MO","DGS6MO","DGS1","DGS2","DGS3","DGS5","DGS7","DGS10","DGS20","DGS30"],
    };

    // simple sleep
    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    async function latest(id, tries = 3) {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=1`;
      let lastErr;
      for (let attempt = 1; attempt <= tries; attempt++) {
        try {
          const r = await fetch(url, {
            headers: { "User-Agent": "private-credit.ai yield-snapshot" },
          });
          if (!r.ok) {
            // capture status text for debugging
            const txt = await r.text().catch(() => "");
            throw new Error(`HTTP ${r.status} for ${id} ${txt ? "- " + txt.slice(0,120) : ""}`);
          }
          const j = await r.json();
          const obs = j?.observations?.[0];
          return { id, date: obs?.date ?? null, value: obs && obs.value !== "." ? Number(obs.value) : null };
        } catch (e) {
          lastErr = e;
          // backoff: 200ms, 500ms, 1000ms
          await wait([200, 500, 1000][Math.min(attempt - 1, 2)]);
        }
      }
      // return a soft failure instead of crashing the whole API
      return { id, date: null, value: null, error: String(lastErr?.message || lastErr) };
    }

    // Fetch sequentially to be gentle on FRED & avoid 429s
    const sofr = await latest(SERIES.SOFR);
    await wait(120);
    const hyoas = await latest(SERIES.HY_OAS);
    await wait(120);

    const ust = [];
    for (const id of SERIES.UST) {
      ust.push(await latest(id));
      await wait(120);
    }

    // helpful debug info if caller appends ?debug=1
    if (req.query?.debug === "1") {
      res.setHeader("x-debug", "1");
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=300");

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
