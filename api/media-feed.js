// api/media-feed.js
import Parser from 'rss-parser';

// Define parser once with a friendly UA (some publishers care)
const parser = new Parser({
  requestOptions: {
    headers: {
      'User-Agent': 'PrivateCreditAI/1.0 (+https://private-credit.ai)'
    }
  }
});

const SOURCES = [
  // === Direct industry feeds ===
  'https://www.privatedebtinvestor.com/feed/',
  'https://www.hedgeweek.com/feed/',
  'https://alpha-week.com/rss.xml',
  'https://www.livewiremarkets.com/feeds',
  'https://privatemarketsreview.substack.com/feed',
  'https://www.privatemarketsmagazine.com/feed/',

  // === GlobalCapital ===
  // Articles (via Google News site filter)
  'https://news.google.com/rss/search?q=site:globalcapital.com%20(securitization%20OR%20CLO%20OR%20%22private%20credit%22)&hl=en-US&gl=US&ceid=US:en',
  // Podcast (optional; audio-only entries will be skipped)
  'https://feeds.buzzsprout.com/1811593.rss',

  // === Catch-all for breadth ===
  'https://news.google.com/rss/search?q=(private+credit%20OR%20%22direct%20lending%22%20OR%20CLO%20OR%20BDC%20OR%20%22NAV%20loan%22%20OR%20securitization)&hl=en-US&gl=US&ceid=US:en',

  // === Publisher-specific site filters ===
  // PitchBook (public mentions only; full API upgrade later)
  'https://news.google.com/rss/search?q=site:pitchbook.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  // Bloomberg (free articles via GN; Digest = manual/paid API later)
  'https://news.google.com/rss/search?q=site:bloomberg.com%20(private%20credit%20OR%20direct%20lending%20OR%20CLO%20OR%20%22NAV%20financing%22)&hl=en-US&gl=US&ceid=US:en',
  // Reuters
  'https://news.google.com/rss/search?q=site:reuters.com%20(private%20credit%20OR%20%22direct%20lending%22%20OR%20CLO)&hl=en-US&gl=US&ceid=US:en',
  // S&P Global (fixed gl/ceid)
  'https://news.google.com/rss/search?q=site:spglobal.com%20(direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  // WSJ / FT / Barron’s (headlines only; paywalled content)
  'https://news.google.com/rss/search?q=site:wsj.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:ft.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:barrons.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en'
];

const TAGS = [
  { tag: 'CLO',           kws: [' clo ', ' aaa ', ' equity tranche', ' reset', ' refi', ' manager'] },
  { tag: 'Direct Lending',kws: ['unitranche','direct lending','private debt','sponsor','club deal'] },
  { tag: 'NAV',           kws: ['nav loan','nav financing'] },
  { tag: 'BDC',           kws: [' bdc ','arcc','bxsl','ocsl','main','psec','cgbd','fdus'] },
  { tag: 'ABS',           kws: ['securitization','warehouse','term abs','asset-backed'] },
];

function tagger(str='') {
  const s = ` ${String(str).toLowerCase()} `;
  const out = [];
  for (const r of TAGS) if (r.kws.some(k => s.includes(k))) out.push(r.tag);
  return [...new Set(out)];
}

// Strip common tracking params so duplicates collapse cleanly
function cleanUrl(u='') {
  try {
    const url = new URL(u);
    url.hash = '';
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','fbclid','gclid']
      .forEach(p => url.searchParams.delete(p));
    return url.toString();
  } catch { return u; }
}

function resolveLink(it) {
  // 1) Start from the item link
  let link = it?.link || '';

  // 2) If it's a Google News URL with a ?url= or ?q= param, use that
  try {
    const u = new URL(link);
    if (u.hostname.endsWith('news.google.com')) {
      const q = u.searchParams.get('url') || u.searchParams.get('q');
      if (q) {
        try { link = decodeURIComponent(q); } catch { link = q; }
      }
    }
  } catch { /* ignore */ }

  // 3) feedburner:origLink (commonly carries the publisher URL)
  if ((!link || link.includes('news.google.com')) && it && it['feedburner:origLink']) {
    link = it['feedburner:origLink'];
  }

  // 4) rss-parser "links" array – pick the first non-Google URL
  if ((!link || link.includes('news.google.com')) && Array.isArray(it?.links)) {
    const alt = it.links.find(l => l?.url && !/news\.google\.com$/.test(new URL(l.url).hostname));
    if (alt?.url) link = alt.url;
  }

  // 5) GUID sometimes contains the canonical
  if ((!link || link.includes('news.google.com')) && typeof it?.guid === 'string' && it.guid.startsWith('http')) {
    link = it.guid;
  }

  return link;
}

// Convert Google News redirect links to original publisher URLs
function extractOriginalLink(link = '') {
  try {
    const u = new URL(link);
    if (u.hostname.endsWith('news.google.com')) {
      let orig = u.searchParams.get('url') || u.searchParams.get('q');
      if (orig) {
        try { orig = decodeURIComponent(orig); } catch {}
        return orig;
      }
    }
  } catch {}
  return link;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const all = [];

  for (const url of SOURCES) {
    try {
      const feed = await parser.parseURL(url);

      for (const it of (feed.items || [])) {
        // Podcast guard: skip audio-only items
        if (it.enclosure && it.enclosure.type && String(it.enclosure.type).startsWith('audio')) continue;

        const summary = it.contentSnippet || it.content || '';

        // Normalize link and source
        let link = resolveLink(it);      // NEW: stronger resolver (handles feedburner/links/guid)
        link = cleanUrl(link);           // keep your deduper

        let host = '';
        try { host = new URL(link).hostname.replace(/^www\./,''); } catch {}

        all.push({
          title: it.title,
          url: link,
          source: host,
          published_at: it.isoDate || it.pubDate || new Date().toISOString(),
          summary,
          tags: tagger(`${it.title} ${summary}`)
        });
      }
    } catch (e) {
      // Keep the whole feed resilient even if one source fails
      // console.error('Source error', url, e);
    }
  }

  // Sort newest → oldest
  all.sort((a,b) => new Date(b.published_at) - new Date(a.published_at));

  // De-dupe by cleaned URL (fallback to title)
  const seen = new Set();
  const items = all.filter(i => {
    const key = i.url || i.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Top10 = last 24h with domain diversity (cap)
  const cutoff = Date.now() - 24*3600*1000;
  const within24h = items.filter(i => new Date(i.published_at).getTime() >= cutoff);
  const base = (within24h.length ? within24h : items);

  function topNWithDomainCap(list, n = 10, cap = 3) {
    const byDomain = new Map();
    const out = [];
    for (const it of list) {
      const d = it.source || 'unknown';
      const c = byDomain.get(d) || 0;
      if (c < cap) {
        out.push(it);
        byDomain.set(d, c + 1);
        if (out.length === n) break;
      }
    }
    // top-up if we didn’t reach N due to caps
    if (out.length < n) {
      for (const it of list) {
        if (out.length === n) break;
        if (!out.includes(it)) out.push(it);
      }
    }
    return out.slice(0, n);
  }

  const top10 = topNWithDomainCap(base, 10, 3);

  // Edge cache (fast + auto refresh)
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800'); // 1h
  res.status(200).json({ top10, items: items.slice(0, 300) });
}
