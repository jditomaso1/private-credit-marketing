// api/media-feed.js
import Parser from 'rss-parser';

const UA = 'PrivateCreditAI/1.0 (+https://private-credit.ai)';
const parser = new Parser({
  requestOptions: { headers: { 'User-Agent': UA } }
});

// -------------------- Sources --------------------
const SOURCES = [
  // Industry
  'https://www.privatedebtinvestor.com/feed/',
  'https://www.hedgeweek.com/feed/',
  'https://alpha-week.com/rss.xml',
  'https://www.livewiremarkets.com/feeds',
  'https://privatemarketsreview.substack.com/feed',
  'https://www.privatemarketsmagazine.com/feed/',

  // GlobalCapital (site filter) + podcast
  'https://news.google.com/rss/search?q=site:globalcapital.com%20(securitization%20OR%20CLO%20OR%20%22private%20credit%22)&hl=en-US&gl=US&ceid=US:en',
  'https://feeds.buzzsprout.com/1811593.rss',

  // Catch-all breadth
  'https://news.google.com/rss/search?q=(private+credit%20OR%20%22direct%20lending%22%20OR%20CLO%20OR%20BDC%20OR%20%22NAV%20loan%22%20OR%20securitization)&hl=en-US&gl=US&ceid=US:en',

  // Publisher filters
  'https://news.google.com/rss/search?q=site:pitchbook.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:bloomberg.com%20(private%20credit%20OR%20direct%20lending%20OR%20CLO%20OR%20%22NAV%20financing%22)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:reuters.com%20(private%20credit%20OR%20%22direct%20lending%22%20OR%20CLO)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:spglobal.com%20(direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:wsj.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:ft.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:barrons.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',

  // SEC EDGAR (Atom)
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=10-Q&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=10-K&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=S-1&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=DEF+14A&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=S-3&owner=include&count=100&output=atom',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=424B5&owner=include&count=100&output=atom',

  // Ratings (site filters)
  'https://news.google.com/rss/search?q=site:moodys.com%20(%22rating%20action%22%20OR%20downgrade%20OR%20upgrade%20OR%20methodology)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:ratings.spglobal.com%20(%22rating%20action%22%20OR%20downgrade%20OR%20upgrade%20OR%20criteria%20update)&hl=en-US&gl=US&ceid=US:en',

  // Wires
  'https://news.google.com/rss/search?q=site:prnewswire.com%20(private%20credit%20OR%20direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:businesswire.com%20(private%20credit%20OR%20direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:globenewswire.com%20(private%20credit%20OR%20direct%20lending%20OR%20CLO%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',

  // Sponsors & direct lenders (site filters)
  'https://news.google.com/rss/search?q=site:kkr.com%20(%22press%20release%22%20OR%20credit)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:apollo.com%20(%22press%20release%22%20OR%20credit)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:blackstone.com%20(%22press%20release%22%20OR%20credit)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:carlyle.com%20(%22press%20release%22%20OR%20credit)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:aresmgmt.com%20(%22press%20release%22%20OR%20credit)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:barings.com%20(private%20credit%20OR%20direct%20lending%20OR%20press%20release)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:golubcapital.com%20(private%20credit%20OR%20direct%20lending%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:blueowl.com%20(owl%20rock%20OR%20direct%20lending%20OR%20BDC)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:hpspartners.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:antares.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:monroecap.com%20(private%20credit%20OR%20direct%20lending)&hl=en-US&gl=US&ceid=US:en',

  // Courts (CL mirror to start)
  'https://news.google.com/rss/search?q=site:courtlistener.com%20(chapter%2011%20OR%20bankruptcy%20OR%20DIP)&hl=en-US&gl=US&ceid=US:en',

  // UK Companies House mentions
  'https://news.google.com/rss/search?q=site:gov.uk%20(Companies%20House%20charge%20OR%20mortgage)&hl=en-US&gl=US&ceid=US:en'
];

// -------------------- Tagger --------------------
const TAGS = [
  { tag: 'CLO',            kws: [' clo ', ' aaa ', ' equity tranche', ' reset', ' refi', ' manager'] },
  { tag: 'Direct Lending', kws: ['unitranche','direct lending','private debt','sponsor','club deal'] },
  { tag: 'NAV',            kws: ['nav loan','nav financing'] },
  { tag: 'BDC',            kws: [' bdc ','arcc','bxsl','ocsl','main','psec','cgbd','fdus'] },
  { tag: 'ABS',            kws: ['securitization','warehouse','term abs','asset-backed'] },
  { tag: 'Ratings',        kws: ['rating action','downgrade','upgrade','outlook revised','criteria update','methodology'] },
  { tag: 'Bankruptcy',     kws: ['chapter 11','prepack','pre-negotiated plan','dip financing','restructuring support agreement','rsa'] },
  { tag: 'Private Equity', kws: ['private equity','buyout','portfolio company','sponsor-backed','add-on acquisition'] },
];

function tagger(str='') {
  const s = ` ${String(str).toLowerCase()} `;
  const out = [];
  for (const r of TAGS) if (r.kws.some(k => s.includes(k))) out.push(r.tag);
  return [...new Set(out)];
}

// -------------------- Helpers --------------------
const BOOST = new Map([
  ['prnewswire.com', -300000],    // 5 min bump
  ['businesswire.com', -300000],
  ['globenewswire.com', -180000],
  ['moodys.com', -240000],
  ['ratings.spglobal.com', -240000],
]);

function boostedTime(it){
  let t = new Date(it.published_at).getTime();
  const host = (it.source || '').replace(/^www\./,'');
  if (BOOST.has(host)) t += BOOST.get(host);
  return t;
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

function extractOriginalLink(link='') {
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

function resolveLink(it) {
  let link = extractOriginalLink(it?.link || '');
  if ((!link || link.includes('news.google.com')) && it && it['feedburner:origLink']) {
    link = it['feedburner:origLink'];
  }
  if ((!link || link.includes('news.google.com')) && Array.isArray(it?.links)) {
    const alt = it.links.find(l => {
      try { return l?.url && !new URL(l.url).hostname.endsWith('news.google.com'); }
      catch { return false; }
    });
    if (alt?.url) link = alt.url;
  }
  if ((!link || link.includes('news.google.com')) && typeof it?.guid === 'string' && it.guid.startsWith('http')) {
    link = it.guid;
  }
  return link;
}

// -------------------- SEC formatting/filter --------------------
const SEC_HOST = 'sec.gov';
const SEC_FORM_WHITELIST = new Set([
  '8-K','10-Q','10-K','6-K','20-F',
  'S-1','S-3','424B5','424B2',
  'DEF 14A','497','497K','SC 13D','SC 13G','SCHEDULE 13D','SCHEDULE 13G','D'
]);

function extractSecForm(rawTitle='') {
  const t = String(rawTitle).toUpperCase();
  const m = t.match(/\b(8-K|10-Q|10-K|6-K|20-F|S-1|S-3|424B5|DEF\s?14A|424B2|424B3|497K?|40-17G|SC\s?13[DG]|SCHEDULE\s?13[DG]|FORM\s+8-K|FORM\s+10-Q|FORM\s+10-K)\b/);
  if (!m) return null;
  let form = m[1].replace(/^FORM\s+/, '').replace(/\s+/g,' ').toUpperCase();
  return form.replace(/^DEF\s*14A$/, 'DEF 14A');
}

// Extra company extractors (title & summary)
function extractSecCompanyFromTitle(t='') {
  const s = String(t);

  // Common: "Form 8-K - Company Name (Filer)"
  let m = s.match(/Form\s+[A-Z0-9-]+\s*[-–—]\s*([^<(]{2,120})/i);
  if (m) return m[1].trim();

  // Sometimes: "8-K - Company Name"
  m = s.match(/\b[0-9A-Z-]{3,}\b\s*[-–—]\s*([^<(]{2,120})/);
  if (m) return m[1].trim();

  // Sometimes reversed: "Company Name - 8-K"
  m = s.match(/^([^–—-]{3,120})\s*[-–—]\s*(?:Form\s+)?[0-9A-Z-]{3,}\b/i);
  if (m) return m[1].trim();

  return '';
}

function extractSecCompany(summary='', content='', title='') {
  // Try title patterns first (most reliable)
  let fromTitle = extractSecCompanyFromTitle(title);
  if (fromTitle) return fromTitle;

  const blob = [summary, content, title].join(' ');

  // Atom often includes "Company Name: XYZ" or "For: XYZ"
  let m = blob.match(/Company(?: Name)?:\s*([^\n<]{3,120})/i);
  if (m) return m[1].trim();

  m = blob.match(/Registrant(?: Name)?:\s*([^\n<]{3,120})/i);
  if (m) return m[1].trim();

  m = blob.match(/\bIssuer:\s*([^\n<]{3,120})/i);
  if (m) return m[1].trim();

  m = blob.match(/For:\s*([^\n<]{3,120})/i);
  if (m) return m[1].trim();

  // Filer line: "ACME CORP (CIK 000012345) (Filer)"
  m = blob.match(/([A-Z0-9&.,' /-]{3,120})\s*\(CIK\s*\d{3,}\)\s*\(Filer\)/i);
  if (m) return m[1].trim();

  return '';
}

function formatSecTitle(it) {
  const form = extractSecForm(it?.title || '') || '';
  const company = extractSecCompany(it?.contentSnippet || it?.content || '', it?.content || '', it?.title || '');
  if (form && company) return `${form}: ${company}`;
  if (form) return form;
  return it?.title || 'SEC Filing';
}

function isUsefulSecItem(it) {
  const form = extractSecForm(it?.title || '') || '';
  return SEC_FORM_WHITELIST.has(form);
}

// -------------------- Domain balancing --------------------
// Keep Top 10 varied (sec.gov <=2), and prevent "All Stories" flood.
function topNWithDomainCap(list, n = 10) {
  const caps = new Map([['sec.gov', 2]]);
  const defaultCap = 3;
  const byDomain = new Map();
  const out = [];
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
  if (out.length < n) {
    for (const it of list) {
      if (out.length === n) break;
      if (!out.includes(it)) out.push(it);
    }
  }
  return out.slice(0, n);
}

// Interleave/cap for the long list as well.
function interleaveWithCaps(list, total = 300) {
  const perDomainDefault = 30;
  const perDomainCaps = new Map([['sec.gov', 20]]); // hard cap for SEC
  const counts = new Map();
  const out = [];
  for (const it of list) {
    const d = it.source || 'unknown';
    const cap = perDomainCaps.get(d) ?? perDomainDefault;
    const c = counts.get(d) || 0;
    if (c >= cap) continue;
    out.push(it);
    counts.set(d, c + 1);
    if (out.length === total) break;
  }
  return out;
}

// -------------------- Handler --------------------
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const results = await Promise.allSettled(SOURCES.map(url => parser.parseURL(url)));
    const all = [];

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const feed = r.value;

      for (const it of (feed.items || [])) {
        // skip audio-only items
        if (it.enclosure && it.enclosure.type && String(it.enclosure.type).startsWith('audio')) continue;

        const summary = it.contentSnippet || it.content || '';
        let link = cleanUrl(resolveLink(it));

        let host = '';
        try { host = new URL(link).hostname.replace(/^www\./,''); } catch {}

        if (host === SEC_HOST) {
          // TEMP: skip SEC items entirely
          continue;
        
          /*
          if (!isUsefulSecItem(it)) continue;
          all.push({
            title: formatSecTitle(it),
            url: link,
            source: host,
            published_at: it.isoDate || it.pubDate || new Date().toISOString(),
            summary,
            tags: Array.from(new Set([...tagger(`${it.title} ${summary}`), 'Regulatory']))
          });
          continue;
          */
        }

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

    // Sort with boost
    all.sort((a,b) => boostedTime(b) - boostedTime(a));

    // De-dupe
    const seen = new Set();
    const itemsDeduped = all.filter(i => {
      const key = i.url || i.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 24h window preference
    const cutoff = Date.now() - 24*3600*1000;
    const within24h = itemsDeduped.filter(i => new Date(i.published_at).getTime() >= cutoff);
    const base = within24h.length ? within24h : itemsDeduped;

    // Domain-balanced outputs
    const top10 = topNWithDomainCap(base, 10);
    const items = interleaveWithCaps(base, 300);

    // Cache & respond
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=900');
    res.status(200).json({ top10, items });
  } catch (e) {
    console.error('media-feed failed', e);
    res.status(500).json({ error: 'media feed failed' });
  }
}
