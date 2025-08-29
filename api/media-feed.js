// api/media-feed.js
import Parser from 'rss-parser';

const SOURCES = [
  // Catch-all (private credit / direct lending / CLO / BDC / NAV / securitization)
  'https://news.google.com/rss/search?q=(private+credit%20OR%20%22direct%20lending%22%20OR%20CLO%20OR%20BDC%20OR%20%22NAV%20loan%22%20OR%20securitization)&hl=en-US&gl=US&ceid=US:en',
  // Specific publishers (headlines only; many will be gated — that’s fine, you link out)
  'https://news.google.com/rss/search?q=site:reuters.com%20(private%20credit%20OR%20%22direct%20lending%22%20OR%20CLO)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:bloomberg.com%20(CLO%20OR%20%22NAV%20financing%22)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:spglobal.com%20(direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en'
];

const TAGS = [
  { tag: 'CLO', kws: [' clo ', ' aaa ', ' equity tranche', ' reset', ' refi', ' manager'] },
  { tag: 'Direct Lending', kws: ['unitranche','direct lending','private debt','sponsor','club deal'] },
  { tag: 'NAV', kws: ['nav loan','nav financing'] },
  { tag: 'BDC', kws: [' bdc ','arcc','bxsl','ocsl','main','psec','cgbd','fdus'] },
  { tag: 'ABS', kws: ['securitization','warehouse','term abs','asset-backed'] },
];

function tagger(str='') {
  const s = ` ${str.toLowerCase()} `;
  const out = [];
  for (const r of TAGS) if (r.kws.some(k => s.includes(k))) out.push(r.tag);
  return [...new Set(out)];
}

export default async function handler(req, res) {
  // CORS (so your news.html can call this from anywhere)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const parser = new Parser();
  const all = [];

  for (const url of SOURCES) {
    try {
      const feed = await parser.parseURL(url);
      for (const it of (feed.items || [])) {
        const summary = it.contentSnippet || it.content || '';
        let host = '';
        try { host = new URL(it.link).hostname.replace(/^www\./,''); } catch {}
        all.push({
          title: it.title,
          url: it.link,
          source: host,
          published_at: it.isoDate || it.pubDate || new Date().toISOString(),
          summary,
          tags: tagger(`${it.title} ${summary}`)
        });
      }
    } catch (e) {
      // console.error('Source error', url, e);
    }
  }

  // De-dupe by URL (fallback to title)
  const seen = new Set();
  const items = all.filter(i => {
    const key = i.url || i.title;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b) => new Date(b.published_at) - new Date(a.published_at));

  // Top10 = last 24h (fallback to most recent if fewer than 10)
  const cutoff = Date.now() - 24*3600*1000;
  const last24 = items.filter(i => new Date(i.published_at).getTime() >= cutoff);
  const top10 = (last24.length >= 10 ? last24 : items).slice(0, 10);

  // Edge cache (fast + auto refresh)
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800'); // 1h
  res.status(200).json({ top10, items: items.slice(0, 300) });
}
