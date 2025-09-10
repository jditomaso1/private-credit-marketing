// api/media-feed.js
import Parser from 'rss-parser';

// Define parser once with a friendly UA (some publishers care)
const UA = 'PrivateCreditAI/1.0 (+https://private-credit.ai)';
const parser = new Parser({
  requestOptions: {
    headers: { 'User-Agent': UA }
  }
});

const SOURCES = [
  // === Direct industry feeds (existing)… ===
  'https://www.privatedebtinvestor.com/feed/',
  'https://www.hedgeweek.com/feed/',
  'https://alpha-week.com/rss.xml',
  'https://www.livewiremarkets.com/feeds',
  'https://privatemarketsreview.substack.com/feed',
  'https://www.privatemarketsmagazine.com/feed/',

  // === GlobalCapital (existing) ===
  'https://news.google.com/rss/search?q=site:globalcapital.com%20(securitization%20OR%20CLO%20OR%20%22private%20credit%22)&hl=en-US&gl=US&ceid=US:en',
  'https://feeds.buzzsprout.com/1811593.rss',

  // === Catch-all breadth (existing) ===
  'https://news.google.com/rss/search?q=(private+credit%20OR%20%22direct%20lending%22%20OR%20CLO%20OR%20BDC%20OR%20%22NAV%20loan%22%20OR%20securitization)&hl=en-US&gl=US&ceid=US:en',

  // === Publisher-specific site filters (existing)… ===
  'https://news.google.com/rss/search?q=site:pitchbook.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:bloomberg.com%20(private%20credit%20OR%20direct%20lending%20OR%20CLO%20OR%20%22NAV%20financing%22)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:reuters.com%20(private%20credit%20OR%20%22direct%20lending%22%20OR%20CLO)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:spglobal.com%20(direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:wsj.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:ft.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:barrons.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',

  // === SEC EDGAR (Atom feeds; broad + form-specific) ===
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=10-Q&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=10-K&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=S-1&owner=include&count=100&output=atom',
  // proxy / shelf / offering statements
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=DEF+14A&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=S-3&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=424B5&owner=include&count=100&output=atom',

  // === Ratings actions & methodologies (via site filters) ===
  'https://news.google.com/rss/search?q=site:moodys.com%20(%22rating%20action%22%20OR%20downgrade%20OR%20upgrade%20OR%20methodology)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:ratings.spglobal.com%20(%22rating%20action%22%20OR%20downgrade%20OR%20upgrade%20OR%20criteria%20update)&hl=en-US&gl=US&ceid=US:en',

  // === Wires (press releases) ===
  'https://news.google.com/rss/search?q=site:prnewswire.com%20(private%20credit%20OR%20direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:businesswire.com%20(private%20credit%20OR%20direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:globenewswire.com%20(private%20credit%20OR%20direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',

  // === Sponsors ===
  'https://news.google.com/rss/search?q=site:kkr.com%20(%22press%20release%22%20OR%20credit)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:apollo.com%20(%22press%20release%22%20OR%20credit)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:blackstone.com%20(%22press%20release%22%20OR%20credit)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:carlyle.com%20(%22press%20release%22%20OR%20credit)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:aresmgmt.com%20(%22press%20release%22%20OR%20credit)&hl=en-US&gl=US&ceid=US:en',

  // === Direct lenders ===
  'https://news.google.com/rss/search?q=site:barings.com%20(private%20credit%20OR%20direct%20lending%20OR%20press%20release)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:golubcapital.com%20(private%20credit%20OR%20direct%20lending%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:blueowl.com%20(owl%20rock%20OR%20direct%20lending%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:hpspartners.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:antares.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:monroecap.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:aresmgmt.com%20(credit%20OR%20direct%20lending%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:kkr.com%20(credit%20OR%20direct%20lending%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:apollo.com%20(credit%20OR%20direct%20lending%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',

  // === CourtListener (bankruptcy dockets via Google News mirror to start) ===
  'https://news.google.com/rss/search?q=site:courtlistener.com%20(chapter%2011%20OR%20bankruptcy%20OR%20DIP)&hl=en-US&gl=US&ceid=US:en',

  // === UK Companies House (announcements picked up by press) ===
  'https://news.google.com/rss/search?q=site:gov.uk%20(Companies%20House%20charge%20OR%20mortgage)&hl=en-US&gl=US&ceid=US:en'
];

const TAGS = [
  { tag: 'CLO',            kws: [' clo ', ' aaa ', ' equity tranche', ' reset', ' refi', ' manager'] },
  { tag: 'Direct Lending', kws: ['unitranche','direct lending','private debt','sponsor','club deal'] },
  { tag: 'NAV',            kws: ['nav loan','nav financing'] },
  { tag: 'BDC',            kws: [' bdc ','arcc','bxsl','ocsl','main','psec','cgbd','fdus'] },
  { tag: 'ABS',            kws: ['securitization','warehouse','term abs','asset-backed'] },
  // NEW:
  { tag: 'Ratings',        kws: ['rating action','downgrade','upgrade','outlook revised','criteria update','methodology'] },
  { tag: 'Bankruptcy',     kws: ['chapter 11','prepack','pre-negotiated plan','dip financing','restructuring support agreement','rsa'] },
  { tag: 'Private Equity', kws: ['private equity','buyout','portfolio company','sponsor-backed','add-on acquisition'] },
  // in TAGS (you likely already added)
  { tag: 'Ratings',    kws: ['rating action','downgrade','upgrade','outlook revised','criteria update','methodology'] },
  { tag: 'Bankruptcy', kws: ['chapter 11','prepack','dip financing','restructuring support agreement','rsa'] },
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

// Convert GN redirect query (?url= / ?q=) to publisher URL if present
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

// Strong resolver that checks multiple item fields
function resolveLink(it) {
  // 1) Start from item link (and try query param extraction)
  let link = extractOriginalLink(it?.link || '');

  // 2) feedburner:origLink
  if ((!link || link.includes('news.google.com')) && it && it['feedburner:origLink']) {
    link = it['feedburner:origLink'];
  }

  // 3) rss-parser "links" array – pick first non-Google URL
  if ((!link || link.includes('news.google.com')) && Array.isArray(it?.links)) {
    const alt = it.links.find(l => {
      try { return l?.url && !new URL(l.url).hostname.endsWith('news.google.com'); }
      catch { return false; }
    });
    if (alt?.url) link = alt.url;
  }

  // 4) GUID sometimes contains canonical URL
  if ((!link || link.includes('news.google.com')) && typeof it?.guid === 'string' && it.guid.startsWith('http')) {
    link = it.guid;
  }

  return link;
}

// Follow GN /articles/... redirects to the real publisher (cap to avoid latency spikes)
const MAX_EXPANDS = 25;
async function expandGoogleNewsUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('news.google.com')) return url;
    if (!/\/articles\//.test(u.pathname)) return url;

    // Follow redirects; final response URL should be the publisher
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': UA }
    });
    return res.url || url;
  } catch {
    return url;
  }
}

const SEC_HOST = 'sec.gov';
const SEC_FORM_WHITELIST = new Set([
  '8-K','10-Q','10-K','6-K','20-F','S-1','S-3','424B5','DEF 14A'
]);

function isSecUrl(u='') {
  try { return new URL(u).hostname.replace(/^www\./,'') === SEC_HOST; } catch { return false; }
}

function extractSecForm(rawTitle='') {
  // Titles look like "424B2" or "FORM 8-K" or "SCHEDULE 13G"
  const t = String(rawTitle).toUpperCase();
  // Normalize variants like "FORM 8-K"→"8-K"
  const m = t.match(/\b(8-K|10-Q|10-K|6-K|20-F|S-1|S-3|424B5|DEF\s?14A|424B2|424B3|497K?|40-17G|SC\s?13[DG]|SCHEDULE\s?13[DG]|FORM\s+8-K|FORM\s+10-Q|FORM\s+10-K)\b/);
  if (!m) return null;
  let form = m[1].replace(/^FORM\s+/, '').replace(/\s+/g,' ').toUpperCase();
  // Normalize "DEF 14A"
  form = form.replace(/^DEF\s*14A$/, 'DEF 14A');
  return form;
}

function extractSecCompany(summary='', content='', title='') {
  const blob = [summary, content, title].join(' ');
  // Common patterns inside Atom content: "Company Name (CIK XXXXXXXX) (Filer)"
  let m = blob.match(/([A-Z0-9&.,' -]{3,100})\s*\(CIK\s*\d{3,}\)\s*\(Filer\)/i);
  if (m) return m[1].trim();
  // Another pattern: "Company: Acme Corp"
  m = blob.match(/Company(?: Name)?:\s*([^\n<]{3,100})/i);
  if (m) return m[1].trim();
  // Last resort: "For: Acme Corp"
  m = blob.match(/For:\s*([^\n<]{3,100})/i);
  if (m) return m[1].trim();
  return '';
}

function formatSecTitle(it) {
  const form = extractSecForm(it?.title || '') || '';
  const company = extractSecCompany(it?.contentSnippet || it?.content || '', it?.content || '', it?.title || '');
  return (form && company) ? `${form}: ${company}` : (form || (it?.title || 'SEC Filing'));
}

// Keep only SEC forms we care about; drop the rest (e.g., 424B2, 497, 40-17G, 13D/G, Form D)
function isUsefulSecItem(it, link) {
  const form = extractSecForm(it?.title || '') || '';
  return SEC_FORM_WHITELIST.has(form);
}
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // ------------- PARALLEL FETCH -------------
    const results = await Promise.allSettled(
      SOURCES.map(url => parser.parseURL(url))
    );

    const all = [];

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const feed = r.value;
      for (const it of (feed.items || [])) {
        // podcast guard
        if (it.enclosure && it.enclosure.type && String(it.enclosure.type).startsWith('audio')) continue;

        const summary = it.contentSnippet || it.content || '';
        
        // fast link resolution …
        let link = resolveLink(it);
        link = cleanUrl(link);
        
        let host = '';
        try { host = new URL(link).hostname.replace(/^www\./,''); } catch {}
        
        // SEC: drop noisy forms and prettify title
        if (host === SEC_HOST) {
          if (!isUsefulSecItem(it, link)) continue; // skip noisy SEC forms
          const prettyTitle = formatSecTitle(it);
          all.push({
            title: prettyTitle,
            url: link,
            source: host,
            published_at: it.isoDate || it.pubDate || new Date().toISOString(),
            summary,
            tags: Array.from(new Set([...tagger(`${it.title} ${summary}`), 'Regulatory']))
          });
          continue;
        }
        
        // Non-SEC (unchanged)
        all.push({
          title: it.title,
          url: link,
          source: host,
          published_at: it.isoDate || it.pubDate || new Date().toISOString(),
          summary,
          tags: tagger(`${it.title} ${summary}`)
        });
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

    // Top10 = last 24h with domain cap
    const cutoff = Date.now() - 24*3600*1000;
    const within24h = items.filter(i => new Date(i.published_at).getTime() >= cutoff);
    const base = (within24h.length ? within24h : items);

    function topNWithDomainCap(list, n = 10) {
      const caps = new Map([
        ['sec.gov', 2], // harder cap for SEC
      ]);
      const defaultCap = 3;
    
      const byDomain = new Map();
      const out = [];
    
      // First pass: honor caps
      for (const it of list) {
        const d = it.source || 'unknown';
        const limit = caps.has(d) ? caps.get(d) : defaultCap;
        const c = byDomain.get(d) || 0;
        if (c < limit) {
          out.push(it);
          byDomain.set(d, c + 1);
          if (out.length === n) break;
        }
      }
    
      // Second pass: if still short, fill regardless of caps to reach N
      if (out.length < n) {
        for (const it of list) {
          if (out.length === n) break;
          if (!out.includes(it)) out.push(it);
        }
      }
    
      return out.slice(0, n);
    }

    const top10 = topNWithDomainCap(base, 10, 3);

    // Cache on the edge
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=900'); // 15m
    res.status(200).json({ top10, items: items.slice(0, 300) });
  } catch (e) {
    res.status(500).json({ error: 'media feed failed' });
  }
}
