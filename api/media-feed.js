// api/media-feed.js
import Parser from 'rss-parser';

// Define parser once, with a friendly UA (some publishers prefer this)
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
  // Podcast (optional feed; audio-only entries will be skipped by the guard below)
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
  // S&P Global
  'https://news.google.com/rss/search?q=site:spglobal.com%20(direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US:en&ceid=US:en',
  // WSJ / FT / Barron’s (headlines only; paywalled content)
  'https://news.google.com/rss/search?q=site:wsj.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:ft.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:barrons.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en'
];

const TAGS = [
  { tag: 'CLO', kws: [' clo ', ' aaa ', ' equity tranche', ' reset', ' refi', ' manager'] },
  { tag: 'Direct Lending', kws: ['unitranche','direct lending','private debt','sponsor','club deal'] },
  { tag: 'NAV', kws: ['nav loan','nav financing'] },
  { tag: 'BDC', kws: [' bdc ','arcc','bxsl','ocsl','main','psec','cgbd','fdus'] },
  { tag: 'ABS', kws: ['securitization','warehouse','term abs','asset-backed'] },
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
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','fbclid','gclid'].forEach(p => url.searchParams.delete(p));
    return url.toString();
  } catch {
    return u;
  }
}

// Try to convert a Google News redirect link to the original publisher URL
function extractOriginalLink(link = '') {
  try {
    const u = new URL(link);
    if (u.hostname.endsWith('news.google.com')) {
      // Google News often stuffs the real URL into ?url= or ?q=
      const orig = u.searchParams.get('url') || u.searchParams.get('q');
      if (orig) return orig;
    }
  } catch {}
  return link;
}

function cleanUrl(u='') {
  try {
    const url = new URL(u);
    url.hash = '';
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','fbclid','gclid']
      .forEach(p => url.searchParams.delete(p));
    return url.toString();
  } catch { return u; }
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
        // --- Podcast guard: skip audio-only entries ---
        if (it.enclosure && it.enclosure.type && String(it.enclosure.type).startsWith('audio')) {
          continue;
        }

        const summary = it.contentSnippet || it.content || '';
        
        let link = it.link || '';
        link = extractOriginalLink(link);  // NEW: rewrite Google News redirect
        link = cleanUrl ? cleanUrl(link) : link; // OK if you didn't add cleanUrl()
        
        let host = '';
        try { host = new URL(link).hostname.replace(/^www\./,''); } catch {}
        
        all.push({
          title: it.title,
          url: link,         // use the rewritten link
          source: host,      // now shows reuters.com / bloomberg.com / etc.
          published_at: it.isoDate || it.pubDate || new Date().toISOString(),
          summary,
          tags: tagger(`${it.title} ${summary}`)
        });
      }
    } catch (e) {
      // Swallow source errors to keep the whole feed resilient
      // console.error('Source error', url, e);
    }
  }

  // De-dupe by cleaned URL (fallback to title)
  const seen = new Set();
  const items = all.filter(i => {
    const key = i.url || i.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a,b) => new Date(b.published_at) - new Date(a.published_at));

  // Top10 = last 24h (fallback to most recent if fewer than 10)
  const cutoff = Date.now() - 24*3600*1000;
  const pool = items.filter(i => new Date(i.published_at).getTime() >= cutoff);
  const base = (pool.length ? pool : items);
  
  function topNWithDomainCap(list, n = 10, cap = 3) {
    const seenByDomain = new Map();
    const out = [];
    for (const it of list) {
      const d = it.source || 'unknown';
      const c = seenByDomain.get(d) || 0;
      if (c < cap) {
        out.push(it);
        seenByDomain.set(d, c + 1);
        if (out.length === n) break;
      }
    }
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
