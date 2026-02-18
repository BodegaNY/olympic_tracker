const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
// When set (e.g. /olympics), app is served under that path (for mounting under another site).
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');
const publicDir = path.join(__dirname, 'public');

// Allow frontend hosted elsewhere (e.g. poker site at /olmpc) to call this API.
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const OLYMPICS_EVENTS = [
  { event: 'OW2026', year: 2026, label: '2026 Winter (Milan-Cortina)', fallback: 'medals-fallback-OW2022.json' },
  { event: 'OG2024', year: 2024, label: '2024 Summer (Paris)', fallback: 'medals-fallback.json' },
  { event: 'OW2022', year: 2022, label: '2022 Winter (Beijing)', fallback: 'medals-fallback-OW2022.json' },
  { event: 'OG2020', year: 2020, label: '2020 Summer (Tokyo)', fallback: 'medals-fallback.json' },
  { event: 'OW2018', year: 2018, label: '2018 Winter (PyeongChang)', fallback: 'medals-fallback-OW2022.json' }
];
const DEFAULT_EVENT = 'OW2026';

// IOC code -> ISO 3166-1 alpha-3 for REST Countries / World Bank
const IOC_TO_ISO = {
  NED: 'NLD', GER: 'DEU', BUL: 'BGR', DEN: 'DNK', CRO: 'HRV', BRN: 'BHR',
  TPE: 'TWN', IRI: 'IRN', RSA: 'ZAF', SUI: 'CHE', POR: 'PRT', GRE: 'GRC',
  BOT: 'BWA', CHI: 'CHL', GUA: 'GTM', FIJ: 'FJI', MGL: 'MNG', GRN: 'GRD',
  MAS: 'MYS', PUR: 'PRI', ZAM: 'ZMB', KOS: 'XKX', PHI: 'PHL', ALG: 'DZA',
  INA: 'IDN', ROU: 'ROU', ROC: 'RUS', LAT: 'LVA'
};

function getIsoCode(country) {
  const code = (country.iso_alpha_3 || country.code || '').toUpperCase();
  return IOC_TO_ISO[code] || code;
}

const FETCH_TIMEOUT_MS = 12000;
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'en-US,en;q=0.9'
};

function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { headers: FETCH_HEADERS }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (ch) => { data += ch; });
      res.on('end', () => {
        clearTimeout(timer);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout (firewall or slow network?)'));
    }, timeoutMs);
    req.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    req.end();
  });
}

function fetchText(url, timeoutMs = FETCH_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { headers: FETCH_HEADERS }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (ch) => { data += ch; });
      res.on('end', () => {
        clearTimeout(timer);
        resolve(data);
      });
    });
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout'));
    }, timeoutMs);
    req.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    req.end();
  });
}

const router = express.Router();

// Redirect base path without trailing slash to base path with slash (so relative assets resolve).
if (BASE_PATH) {
  router.get('', (req, res) => res.redirect(BASE_PATH + '/'));
}
// Serve index.html with base path injected so the frontend can prefix API/stream URLs.
router.get('/', (req, res) => {
  fs.readFile(path.join(publicDir, 'index.html'), (err, buf) => {
    if (err) return res.status(500).end();
    let html = buf.toString();
    html = html.replace(/__BASE_PATH__/g, BASE_PATH);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });
});
router.use(express.static(publicDir, { index: false }));

router.get('/api/events', (req, res) => {
  res.json(OLYMPICS_EVENTS);
});

router.get('/api/medals', async (req, res) => {
  const eventCode = req.query.event || DEFAULT_EVENT;
  const ev = OLYMPICS_EVENTS.find((e) => e.event === eventCode) || OLYMPICS_EVENTS[0];
  const result = await fetchMedalsForEvent(ev, () => {});
  if (!result || !result.data.length) {
    return res.status(503).json({ error: `Can't fetch ${ev.label} data. Try again later or choose another edition.`, data: [] });
  }
  res.json(result.data);
});

function normalizeMedalsResponse(data) {
  let results = data.results || data.MedalNOCs || [];
  if (Array.isArray(data) && data.length && data[0].MedalNOC) {
    results = data[0].MedalNOCs || data[0].MedalNOC || [];
  }
  return results.map((r, i) => {
    const country = r.country || r.MedalNOC || {};
    const medals = r.medals || r.MedalCount || {};
    return {
      rank: r.rank != null ? r.rank : i + 1,
      country: {
        code: (country.code || country.NOC_Code || country.NOCCode || '').toUpperCase(),
        iso_alpha_3: country.iso_alpha_3 || country.code || country.NOC_Code || country.NOCCode,
        name: country.name || country.NOC_Name || country.NOCName || 'Unknown'
      },
      medals: {
        gold: medals.gold ?? medals.Gold ?? 0,
        silver: medals.silver ?? medals.Silver ?? 0,
        bronze: medals.bronze ?? medals.Bronze ?? 0,
        total: medals.total ?? medals.Total ?? (medals.gold + medals.silver + medals.bronze) ?? 0
      }
    };
  });
}

router.get('/api/countries', async (req, res) => {
  try {
    const data = await fetchJson('https://restcountries.com/v3.1/all?fields=name,cca3,population,area');
    const map = {};
    data.forEach((c) => {
      const cca3 = (c.cca3 || '').toUpperCase();
      map[cca3] = {
        cca3,
        name: c.name?.common || c.name || '',
        population: c.population ?? null,
        area: c.area ?? null
      };
    });
    res.json(map);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/api/gdp', async (req, res) => {
  const codes = (req.query.codes || '').split(',').filter(Boolean).map(c => c.trim().toUpperCase());
  if (!codes.length) {
    return res.json({});
  }
  const gdpMap = {};
  await Promise.all(codes.map(async (code) => {
    const wbCode = code === 'TWN' ? 'TWN' : code === 'XKX' ? 'XKX' : code;
    try {
      const url = `https://api.worldbank.org/v2/country/${wbCode}/indicator/NY.GDP.MKTP.CD?format=json&mrv=1&per_page=1`;
      const data = await fetchJson(url);
      const arr = Array.isArray(data) && data[1] ? data[1] : [];
      const val = arr[0] && arr[0].value != null ? arr[0].value : null;
      gdpMap[code] = val;
    } catch (e) {
      gdpMap[code] = null;
    }
  }));
  res.json(gdpMap);
});

function sendSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  if (typeof res.flush === 'function') res.flush();
}

const MEDAL_JSON_URLS_2026 = [
  'https://olympics.com/OWG2026/data/CIS_MedalNOCs~lang=ENG~comp=OWG2026.json',
  'https://olympics.com/OW2026/data/CIS_MedalNOCs~lang=ENG~comp=OW2026.json',
  'https://olympics.com/milano-cortina-2026/data/CIS_MedalNOCs~lang=ENG~comp=milano-cortina-2026.json'
];

// Page titles for https://en.wikipedia.org/wiki/2026_Winter_Olympics_medal_table etc.
const WIKIPEDIA_MEDAL_PAGE = {
  OW2026: '2026_Winter_Olympics_medal_table',
  OG2024: '2024_Summer_Olympics_medal_table',
  OW2022: '2022_Winter_Olympics_medal_table',
  OG2020: '2020_Summer_Olympics_medal_table',
  OW2018: '2018_Winter_Olympics_medal_table'
};
const WIKIPEDIA_API_TIMEOUT_MS = 25000;

const NOC_TO_NAME = {
  AUS: 'Australia', AUT: 'Austria', BEL: 'Belgium', BRA: 'Brazil', BUL: 'Bulgaria', CAN: 'Canada',
  CHN: 'China', CZE: 'Czech Republic', FIN: 'Finland', FRA: 'France', GBR: 'Great Britain',
  GEO: 'Georgia', GER: 'Germany', ITA: 'Italy', JPN: 'Japan', KAZ: 'Kazakhstan', KOR: 'South Korea',
  LAT: 'Latvia', NED: 'Netherlands', NZL: 'New Zealand', NOR: 'Norway', POL: 'Poland', ROC: 'ROC',
  SLO: 'Slovenia', SUI: 'Switzerland', SWE: 'Sweden', USA: 'United States', BLR: 'Belarus',
  ESP: 'Spain', UKR: 'Ukraine', EST: 'Estonia', HUN: 'Hungary', SVK: 'Slovakia', CRO: 'Croatia',
  INA: 'Indonesia', IRL: 'Ireland', SRB: 'Serbia', TPE: 'Chinese Taipei', HKG: 'Hong Kong',
  ROU: 'Romania', ALG: 'Algeria', BRN: 'Bahrain', CUB: 'Cuba', DOM: 'Dominican Republic',
  ECU: 'Ecuador', EGY: 'Egypt', ETH: 'Ethiopia', GRE: 'Greece', IND: 'India', IRI: 'Iran',
  JAM: 'Jamaica', MAR: 'Morocco', MGL: 'Mongolia', PHI: 'Philippines', PUR: 'Puerto Rico',
  RSA: 'South Africa', TUN: 'Tunisia', UGA: 'Uganda', ARG: 'Argentina', BOT: 'Botswana',
  CHI: 'Chile', DMA: 'Dominica', GUA: 'Guatemala', LCA: 'Saint Lucia', PAK: 'Pakistan',
  BIH: 'Bosnia and Herzegovina', MKD: 'North Macedonia', TTO: 'Trinidad and Tobago', UAE: 'United Arab Emirates',
  LIE: 'Liechtenstein', MON: 'Monaco', AND: 'Andorra', ARM: 'Armenia', AZE: 'Azerbaijan', CYP: 'Cyprus',
  ESA: 'El Salvador', HAI: 'Haiti', ISL: 'Iceland', KEN: 'Kenya', KGZ: 'Kyrgyzstan', LBN: 'Lebanon',
  LTU: 'Lithuania', LUX: 'Luxembourg', MAD: 'Madagascar', MLT: 'Malta', MEX: 'Mexico', MDA: 'Moldova',
  MNE: 'Montenegro', NGR: 'Nigeria', PRK: 'North Korea', OMA: 'Oman', SGP: 'Singapore',
  THA: 'Thailand', TUR: 'Turkey', ISV: 'Virgin Islands', VEN: 'Venezuela', BOL: 'Bolivia',
  COL: 'Colombia', ERI: 'Eritrea', GUY: 'Guyana', HON: 'Honduras', NEP: 'Nepal',
  PER: 'Peru', BEN: 'Benin', GBS: 'Guinea-Bissau'
};
const NAME_TO_NOC = {};
Object.entries(NOC_TO_NAME).forEach(([code, name]) => { NAME_TO_NOC[name] = code; });
NAME_TO_NOC['China'] = 'CHN';
NAME_TO_NOC["People's Republic of China"] = 'CHN';
NAME_TO_NOC['Bosnia and Herzegovina'] = 'BIH';
NAME_TO_NOC['North Macedonia'] = 'MKD';
NAME_TO_NOC['Trinidad and Tobago'] = 'TTO';
NAME_TO_NOC['United Arab Emirates'] = 'UAE';
NAME_TO_NOC['Chinese Taipei'] = 'TPE';

const WHEREIG_2026_URL = 'https://www.whereig.com/olympics/winter-olympics/winter-olympics-participating-countries-milano-cortina-2026.html';

function parseWhereigAthletesTable(html) {
  const athletesByNoc = {};
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let match;
  const cellTexts = [];
  while ((match = cellRe.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    cellTexts.push(text);
  }
  const nameNumRe = /^(.+?)\s*\((\d+)\)\s*(?:\(Host\))?\s*$/;
  for (const cell of cellTexts) {
    const m = cell.match(nameNumRe);
    if (!m) continue;
    let name = m[1].trim();
    const count = parseInt(m[2], 10);
    if (!name || !Number.isFinite(count)) continue;
    const code = NAME_TO_NOC[name] || Object.entries(NOC_TO_NAME).find(([, n]) => n === name)?.[0];
    if (code) athletesByNoc[code] = count;
  }
  return athletesByNoc;
}

async function fetchWhereigAthletes(onProgress) {
  onProgress({ step: 'athletes', message: 'Fetching athlete counts…' });
  try {
    const html = await fetchText(WHEREIG_2026_URL, 15000);
    const athletesByNoc = parseWhereigAthletesTable(html);
    return Object.keys(athletesByNoc).length > 0 ? athletesByNoc : null;
  } catch (e) {
    console.error('Whereig athletes fetch failed:', e.message);
    return null;
  }
}

function parseMedalTableFromHtml(html) {
  const results = [];
  const lines = html.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length - 5; i++) {
    const code = lines[i];
    if (/^[A-Z]{3}$/.test(code) && /^\d+$/.test(lines[i + 2]) && /^\d+$/.test(lines[i + 3]) && /^\d+$/.test(lines[i + 4]) && /^\d+$/.test(lines[i + 5])) {
      const name = lines[i + 1];
      const gold = parseInt(lines[i + 2], 10);
      const silver = parseInt(lines[i + 3], 10);
      const bronze = parseInt(lines[i + 4], 10);
      const total = parseInt(lines[i + 5], 10);
      results.push({
        rank: results.length + 1,
        country: { code, iso_alpha_3: code, name },
        medals: { gold, silver, bronze, total }
      });
      i += 5;
    }
  }
  if (results.length > 0) return { results };

  const tdPattern = /<td[^>]*>([^<]*)<\/td>/gi;
  const tds = [];
  let m;
  while ((m = tdPattern.exec(html)) !== null) tds.push(m[1].trim());
  for (let i = 0; i <= tds.length - 6; i++) {
    if (/^[A-Z]{3}$/.test(tds[i]) && /^\d+$/.test(tds[i + 2]) && /^\d+$/.test(tds[i + 3]) && /^\d+$/.test(tds[i + 4]) && /^\d+$/.test(tds[i + 5])) {
      results.push({
        rank: results.length + 1,
        country: { code: tds[i], iso_alpha_3: tds[i], name: tds[i + 1] },
        medals: {
          gold: parseInt(tds[i + 2], 10),
          silver: parseInt(tds[i + 3], 10),
          bronze: parseInt(tds[i + 4], 10),
          total: parseInt(tds[i + 5], 10)
        }
      });
      i += 5;
    }
  }
  return results.length > 0 ? { results } : null;
}

function parseWikipediaMedalTable(wikitext) {
  const medalsByCode = {};
  const goldRe = /\|\s*gold_([A-Z]{3})\s*=\s*(\d+)/g;
  const silverRe = /\|\s*silver_([A-Z]{3})\s*=\s*(\d+)/g;
  const bronzeRe = /\|\s*bronze_([A-Z]{3})\s*=\s*(\d+)/g;
  let m;
  while ((m = goldRe.exec(wikitext)) !== null) medalsByCode[m[1]] = { ...(medalsByCode[m[1]] || {}), gold: parseInt(m[2], 10) };
  while ((m = silverRe.exec(wikitext)) !== null) medalsByCode[m[1]] = { ...(medalsByCode[m[1]] || {}), silver: parseInt(m[2], 10) };
  while ((m = bronzeRe.exec(wikitext)) !== null) medalsByCode[m[1]] = { ...(medalsByCode[m[1]] || {}), bronze: parseInt(m[2], 10) };
  const entries = Object.entries(medalsByCode)
    .filter(([, v]) => v.gold != null && v.silver != null && v.bronze != null)
    .map(([code, v]) => ({
      total: v.gold + v.silver + v.bronze,
      code,
      gold: v.gold,
      silver: v.silver,
      bronze: v.bronze
    }))
    .sort((a, b) => b.total - a.total || b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze);
  if (entries.length === 0) return null;
  return entries.map((e, i) => ({
    rank: i + 1,
    country: { code: e.code, iso_alpha_3: e.code, name: NOC_TO_NAME[e.code] || e.code },
    medals: { gold: e.gold, silver: e.silver, bronze: e.bronze, total: e.total }
  }));
}

function parseWikipediaMedalTableFromHtml(html) {
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const cells = [];
  let match;
  while ((match = cellRe.exec(html)) !== null) cells.push(match[1].replace(/<[^>]+>/g, '').trim());
  const rows = [];
  for (let i = 0; i <= cells.length - 6; i++) {
    const rankVal = parseInt(cells[i], 10);
    const name = (cells[i + 1] || '').replace(/\s+/g, ' ').replace(/\*+$/, '').trim();
    const gold = parseInt(cells[i + 2], 10);
    const silver = parseInt(cells[i + 3], 10);
    const bronze = parseInt(cells[i + 4], 10);
    const total = parseInt(cells[i + 5], 10);
    if (!Number.isFinite(gold) || !Number.isFinite(silver) || !Number.isFinite(bronze) || !Number.isFinite(total)) continue;
    if (cells[i] === 'Rank' || name === 'NOC' || name === '' || /^Totals?$/i.test(name)) continue;
    const code = NAME_TO_NOC[name] || Object.entries(NOC_TO_NAME).find(([, n]) => n === name)?.[0] || null;
    if (!code) continue;
    rows.push({
      rank: Number.isFinite(rankVal) ? rankVal : rows.length + 1,
      country: { code, iso_alpha_3: code, name: NOC_TO_NAME[code] || name },
      medals: { gold, silver, bronze, total }
    });
  }
  rows.sort((a, b) => a.rank - b.rank || (b.medals.total - a.medals.total) || (b.medals.gold - a.medals.gold));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows.length > 0 ? rows : null;
}

async function fetchWikipediaMedals(ev, onProgress) {
  const title = WIKIPEDIA_MEDAL_PAGE[ev.event];
  if (!title) return null;
  onProgress({ step: 'medals', message: 'Trying Wikipedia (API)…' });
  try {
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const data = await fetchJson(apiUrl, WIKIPEDIA_API_TIMEOUT_MS);
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    const wikitext = page?.revisions?.[0]?.slots?.main?.['*'];
    if (!wikitext || typeof wikitext !== 'string') return null;
    const results = parseWikipediaMedalTable(wikitext);
    if (results && results.length > 0) return { data: results, source: 'wikipedia' };
  } catch (e) {
    console.error('Wikipedia API failed:', e.message);
  }
  onProgress({ step: 'medals', message: 'Trying Wikipedia (page)…' });
  try {
    const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    const html = await fetchText(pageUrl, WIKIPEDIA_API_TIMEOUT_MS);
    const results = parseWikipediaMedalTableFromHtml(html);
    if (results && results.length > 0) return { data: results, source: 'wikipedia' };
  } catch (e) {
    console.error('Wikipedia page fetch failed:', e.message);
  }
  return null;
}

async function fetchMedalsForEvent(ev, onProgress) {
  const primaryUrl = `https://olympics.com/${ev.event}/data/CIS_MedalNOCs~lang=ENG~comp=${ev.event}.json`;
  const urlsToTry = ev.event === 'OW2026' ? [...MEDAL_JSON_URLS_2026, primaryUrl] : [primaryUrl];

  for (const url of urlsToTry) {
    try {
      const data = await fetchJson(url);
      const normalized = normalizeMedalsResponse(data);
      if (normalized.length > 0) return { data: normalized, source: 'api' };
    } catch (e) {
      continue;
    }
  }

  const wikiResult = await fetchWikipediaMedals(ev, onProgress);
  if (wikiResult) return wikiResult;

  if (ev.event === 'OW2026') {
    onProgress({ step: 'medals', message: 'Trying Olympics.com medal page…' });
    try {
      const html = await fetchText('https://www.olympics.com/en/milano-cortina-2026/medals', 15000);
      const parsed = parseMedalTableFromHtml(html);
      if (parsed && parsed.results.length > 0) return { data: parsed.results, source: 'scrape' };
    } catch (e) {
      console.error('2026 scrape failed:', e.message);
    }
  }

  const fallbackPath = path.join(__dirname, 'public', 'data', ev.fallback);
  const fallbackEvent = ev.fallback.includes('OW2022') ? 'OW2022' : ev.fallback.includes('OG2024') ? 'OG2024' : null;
  if (fallbackEvent === ev.event) {
    const raw = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    return { data: normalizeMedalsResponse(raw), source: 'fallback' };
  }

  return null;
}

async function runCombinedLogic(req, res, onProgress) {
  const eventCode = req.query.event || DEFAULT_EVENT;
  const ev = OLYMPICS_EVENTS.find((e) => e.event === eventCode) || OLYMPICS_EVENTS[0];
  const year = parseInt(req.query.year, 10) || ev.year;
  const useLatestData = (ev.event === 'OW2026');
  let countriesMap = {};
  let gdpMap = {};
  let popMap = {};

  onProgress({ step: 'medals', message: 'Fetching medal table…' });
  const medalResult = await fetchMedalsForEvent(ev, onProgress);
  if (!medalResult || !medalResult.data.length) {
    const err = new Error(`Can't fetch ${ev.label} data. Try again later or choose another edition.`);
    err.code = 'MEDAL_DATA_UNAVAILABLE';
    throw err;
  }
  const results = medalResult.data;
  onProgress({ step: 'medals_done', message: `Medals loaded (${results.length} countries)`, count: results.length });

  let athletesByNoc = {};
  if (ev.event === 'OW2026') {
    const whereig = await fetchWhereigAthletes(onProgress);
    if (whereig) athletesByNoc = whereig;
  }

  const isoCodes = [...new Set(results.map((r) => getIsoCode(r.country)))];

  onProgress({ step: 'countries', message: 'Fetching country list (area' + (useLatestData ? ', population' : '') + ')…' });
  if (!year || useLatestData) {
    try {
      const countriesData = await fetchJson('https://restcountries.com/v3.1/all?fields=name,cca3,population,area');
      countriesData.forEach((c) => {
        const cca3 = (c.cca3 || '').toUpperCase();
        countriesMap[cca3] = {
          name: c.name?.common || c.name || '',
          population: c.population ?? null,
          area: c.area ?? null
        };
      });
      if (useLatestData) {
        isoCodes.forEach((iso) => {
          if (iso && countriesMap[iso]?.population != null) popMap[iso] = countriesMap[iso].population;
        });
      }
    } catch (e) {
      console.error('Countries fetch failed (timeout or firewall?):', e.message);
    }
  } else {
    try {
      const countriesData = await fetchJson('https://restcountries.com/v3.1/all?fields=name,cca3,area');
      countriesData.forEach((c) => {
        const cca3 = (c.cca3 || '').toUpperCase();
        countriesMap[cca3] = { name: c.name?.common || c.name || '', population: null, area: c.area ?? null };
      });
    } catch (e) {
      console.error('Countries fetch failed:', e.message);
    }
  }
  onProgress({ step: 'countries_done', message: 'Country list loaded' });

  const wbCodes = isoCodes.filter((c) => c && c.length === 3 && c !== 'XKX');
  const BATCH = 12;
  const totalBatches = Math.ceil(wbCodes.length / BATCH);
  const dateParam = useLatestData ? '&mrv=1' : (year ? `&date=${year}` : '&mrv=1');

  for (let i = 0; i < wbCodes.length; i += BATCH) {
    const batchNum = Math.floor(i / BATCH) + 1;
    onProgress({
      step: 'gdp',
      message: `Fetching GDP${useLatestData ? ' (latest)' : ''}… batch ${batchNum}/${totalBatches}`,
      batch: batchNum,
      totalBatches
    });
    const batch = wbCodes.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map(async (code) => {
        const gdpVal = await fetchJson(`https://api.worldbank.org/v2/country/${code}/indicator/NY.GDP.MKTP.CD?format=json${dateParam}&per_page=1`)
          .then((g) => (Array.isArray(g) && g[1] && g[1][0] && g[1][0].value != null ? g[1][0].value : null))
          .catch(() => null);
        const popVal = (!useLatestData && year)
          ? await fetchJson(`https://api.worldbank.org/v2/country/${code}/indicator/SP.POP.TOTL?format=json&date=${year}&per_page=1`)
              .then((p) => (Array.isArray(p) && p[1] && p[1][0] && p[1][0].value != null ? p[1][0].value : null))
              .catch(() => null)
          : null;
        return { code, gdp: gdpVal, pop: popVal };
      })
    );
    batchResults.forEach(({ code, gdp, pop }) => {
      gdpMap[code] = gdp;
      if (pop != null) popMap[code] = pop;
    });
  }

  const combined = results.map((r) => {
    const iso = getIsoCode(r.country);
    const stats = countriesMap[iso] || {};
    const population = popMap[iso] != null ? popMap[iso] : stats.population ?? null;
    const area = stats.area ?? null;
    const gdp = gdpMap[iso] ?? null;
    const total = r.medals.total || 0;
    const medalsPerMillionPop = population && population > 0 && total != null
      ? total / (population / 1e6) : null;
    const medalsPerTrillionGDP = gdp && gdp > 0 && total != null
      ? total / (gdp / 1e12) : null;
    const athletes = athletesByNoc[r.country.code] ?? null;
    const medalsPerAthlete = (athletes != null && athletes > 0 && total != null)
      ? total / athletes : null;

    return {
      rank: r.rank,
      country: r.country.name,
      code: r.country.code,
      iso,
      gold: r.medals.gold,
      silver: r.medals.silver,
      bronze: r.medals.bronze,
      total,
      athletes: athletes ?? null,
      medalsPerAthlete,
      population,
      gdp,
      area,
      medalsPerMillionPop,
      medalsPerTrillionGDP
    };
  });

  return { data: combined, event: ev.event, year, dataSource: medalResult.source, fallbackEdition: null };
}

router.get('/api/combined', async (req, res) => {
  try {
    const payload = await runCombinedLogic(req, res, () => {});
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: 'Could not load medal data', data: [] });
  }
});

router.get('/api/combined-multi', async (req, res) => {
  const eventCodes = (req.query.events || 'OW2026,OW2022,OW2018').split(',').map((s) => s.trim()).filter(Boolean);
  const editions = [];
  for (const code of eventCodes) {
    const ev = OLYMPICS_EVENTS.find((e) => e.event === code);
    if (!ev) continue;
    const mockReq = { query: { event: ev.event, year: ev.year } };
    const mockRes = { setHeader: () => {}, write: () => {}, end: () => {} };
    try {
      const payload = await runCombinedLogic(mockReq, mockRes, () => {});
      editions.push({ event: payload.event, year: payload.year, label: ev.label, data: payload.data || [] });
    } catch (e) {
      console.error(`combined-multi failed for ${code}:`, e.message);
    }
  }
  res.json({ editions });
});

router.get('/api/combined-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  runCombinedLogic(req, res, (progress) => {
    sendSSE(res, 'progress', progress);
  })
    .then((payload) => {
      sendSSE(res, 'done', payload);
      res.end();
    })
    .catch((e) => {
      sendSSE(res, 'error', { message: e.message });
      res.end();
    });
});

app.use(BASE_PATH || '/', router);

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    const root = BASE_PATH ? `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}${BASE_PATH}` : `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
    console.log(`Olympics tracker running at ${root}`);
  });
} else {
  module.exports = { router, app, BASE_PATH };
}
