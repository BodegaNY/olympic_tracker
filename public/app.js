const BASE = (typeof window !== 'undefined' && window.OLYMPICS_BASE !== undefined ? window.OLYMPICS_BASE : '') || '';
const api = (path) => (BASE + path).replace(/\/+/g, '/');

const ISO3_TO_ISO2 = {
  AFG:'AF',ALB:'AL',DZA:'DZ',AND:'AD',AGO:'AO',ARG:'AR',ARM:'AM',AUS:'AU',AUT:'AT',AZE:'AZ',BHR:'BH',BGD:'BD',BLR:'BY',BEL:'BE',BEN:'BJ',BOL:'BO',BIH:'BA',BWA:'BW',BRA:'BR',BGR:'BG',GBR:'GB',BFA:'BF',BDI:'BI',CPV:'CV',CMR:'CM',CAN:'CA',CHL:'CL',CHN:'CN',COL:'CO',COM:'KM',COD:'CD',COG:'CG',CRI:'CR',CIV:'CI',HRV:'HR',CUB:'CU',CYP:'CY',CZE:'CZ',DNK:'DK',DJI:'DJ',ECU:'EC',EGY:'EG',ERI:'ER',EST:'EE',SWZ:'SZ',ETH:'ET',FJI:'FJ',FIN:'FI',FRA:'FR',GAB:'GA',GMB:'GM',GEO:'GE',DEU:'DE',GHA:'GH',GRC:'GR',GTM:'GT',GIN:'GN',GNB:'GW',GUY:'GY',HTI:'HT',HND:'HN',HKG:'HK',HUN:'HU',ISL:'IS',IND:'IN',IDN:'ID',IRN:'IR',IRQ:'IQ',IRL:'IE',ISR:'IL',ITA:'IT',JAM:'JM',JPN:'JP',JOR:'JO',KAZ:'KZ',KEN:'KE',KOR:'KR',KWT:'KW',KGZ:'KG',LVA:'LV',LBN:'LB',LIE:'LI',LTU:'LT',LUX:'LU',MAC:'MO',MDG:'MG',MWI:'MW',MYS:'MY',MDV:'MV',MLI:'ML',MLT:'MT',MEX:'MX',MDA:'MD',MNG:'MN',MNE:'ME',MAR:'MA',MOZ:'MZ',MMR:'MM',NAM:'NA',NPL:'NP',NLD:'NL',NZL:'NZ',NIC:'NI',NGA:'NG',MKD:'MK',NOR:'NO',OMN:'OM',PAK:'PK',PSE:'PS',PAN:'PA',PNG:'PG',PRY:'PY',PER:'PE',PHL:'PH',POL:'PL',PRT:'PT',PRI:'PR',QAT:'QA',ROU:'RO',RUS:'RU',RWA:'RW',SAU:'SA',SEN:'SN',SRB:'RS',SGP:'SG',SVK:'SK',SVN:'SI',SOM:'SO',ZAF:'ZA',SSD:'SS',ESP:'ES',LKA:'LK',SDN:'SD',SUR:'SR',SWE:'SE',CHE:'CH',SYR:'SY',TWN:'TW',TJK:'TJ',TZA:'TZ',THA:'TH',TLS:'TL',TGO:'TG',TTO:'TT',TUN:'TN',TUR:'TR',TKM:'TM',UGA:'UG',UKR:'UA',ARE:'AE',USA:'US',URY:'UY',UZB:'UZ',VEN:'VE',VNM:'VN',YEM:'YE',ZMB:'ZM',ZWE:'ZW',
  TPE:'TW',ROC:'RU'
};
function getFlagUrl(codeOrIso) {
  if (!codeOrIso || typeof codeOrIso !== 'string') return '';
  const c = codeOrIso.toUpperCase().slice(0, 3);
  const iso2 = ISO3_TO_ISO2[c] || (c.length === 2 ? c : '');
  if (!iso2) return '';
  return 'https://flagcdn.com/w40/' + iso2.toLowerCase() + '.png';
}

function getSortCompare(sortKey) {
  const num = (key) => (a, b) => (a[key] ?? -Infinity) - (b[key] ?? -Infinity);
  const numNullLast = (key, nullVal = -1) => (a, b) => (a[key] ?? nullVal) - (b[key] ?? nullVal);
  const comparators = {
    rank: (a, b) => (a.rank ?? 0) - (b.rank ?? 0),
    country: (a, b) => (a.country || '').localeCompare(b.country || '', undefined, { sensitivity: 'base' }),
    gold: (a, b) => (a.gold ?? 0) - (b.gold ?? 0) || (a.silver ?? 0) - (b.silver ?? 0) || (a.bronze ?? 0) - (b.bronze ?? 0),
    silver: (a, b) => (a.silver ?? 0) - (b.silver ?? 0),
    bronze: (a, b) => (a.bronze ?? 0) - (b.bronze ?? 0),
    total: (a, b) => (a.total ?? 0) - (b.total ?? 0),
    athletes: numNullLast('athletes', -1),
    medalsPerAthlete: numNullLast('medalsPerAthlete', -1),
    population: numNullLast('population', -1),
    gdp: numNullLast('gdp', -1),
    area: numNullLast('area', -1),
    medalsPerMillionPop: numNullLast('medalsPerMillionPop', -1),
    medalsPerTrillionGDP: numNullLast('medalsPerTrillionGDP', -1)
  };
  return comparators[sortKey] || comparators.total;
}

let combinedData = [];
let sortKey = 'total';
let sortDir = -1;
let eventsList = [
  { event: 'OW2026', year: 2026, label: '2026 Winter (Milan-Cortina)' },
  { event: 'OG2024', year: 2024, label: '2024 Summer (Paris)' },
  { event: 'OW2022', year: 2022, label: '2022 Winter (Beijing)' },
  { event: 'OG2020', year: 2020, label: '2020 Summer (Tokyo)' },
  { event: 'OW2018', year: 2018, label: '2018 Winter (PyeongChang)' }
];

function formatNum(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'k';
  return String(n);
}

function formatArea(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatRate(n) {
  if (n == null || Number.isNaN(n) || n < 0) return '—';
  return n.toFixed(2);
}

function pctToClass(pct) {
  const band = Math.min(100, Math.max(0, Math.round(pct / 10) * 10));
  return ' pct-' + band;
}

function percentileClass(val, values) {
  if (val == null || !values.length) return '';
  const sorted = values.filter((v) => v != null && Number(v) >= 0).map(Number).sort((a, b) => a - b);
  if (!sorted.length) return '';
  const idx = sorted.indexOf(Number(val));
  const pct = sorted.length === 1 ? 100 : Math.round((100 * (idx + 1)) / sorted.length);
  return pctToClass(pct);
}

function rankToPctClass(rank1Based, n) {
  if (n <= 1) return pctToClass(100);
  const pct = 100 * (1 - (rank1Based - 1) / (n - 1));
  return pctToClass(pct);
}

function sparklineSvg(values, w, h) {
  if (!values || values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;
  const xScale = (w - 2 * pad) / (values.length - 1);
  const yScale = (h - 2 * pad) / range;
  const points = values.map((v, i) => `${pad + i * xScale},${pad + (max - v) * yScale}`).join(' ');
  return `<svg width="${w}" height="${h}" aria-hidden="true"><polyline fill="none" stroke="rgba(26,95,180,0.8)" stroke-width="1" points="${points}"/></svg>`;
}

function renderTable(rows) {
  const tbody = document.getElementById('tbody');
  const compare = getSortCompare(sortKey);
  const sorted = [...rows].sort((a, b) => sortDir * compare(a, b));
  const hasTrend = multiEditionData.editions && multiEditionData.editions.length > 0;
  const trendByCode = {};
  if (hasTrend) {
    multiEditionData.editions.forEach((ed) => {
      ed.data.forEach((r) => {
        const code = r.code || r.country;
        if (!trendByCode[code]) trendByCode[code] = [];
        trendByCode[code].push({ year: ed.year, total: r.total ?? 0 });
      });
    });
    Object.keys(trendByCode).forEach((k) => trendByCode[k].sort((a, b) => a.year - b.year));
  }

  const percentiles = {};
  NUMERIC_COLS.forEach((col) => {
    const vals = sorted.map((r) => r[col]).filter((v) => v != null && Number(v) >= 0);
    percentiles[col] = vals;
  });

  const n = sorted.length;
  const rankCols = ['rank', ...NUMERIC_COLS];
  const ranks = {};
  rankCols.forEach((col) => {
    const compare = getSortCompare(col);
    const ascending = col === 'rank';
    const sortedByCol = [...sorted].sort((a, b) => (ascending ? 1 : -1) * compare(a, b));
    ranks[col] = sorted.map((row) => sortedByCol.indexOf(row) + 1);
  });

  function cellHighlight(col, row, i, cellVal) {
    if (col === 'rank') return '';
    if (highlightByRank && ranks[col]) {
      if (!shadeAllColumns && col !== sortKey) return '';
      return rankToPctClass(ranks[col][i], n);
    }
    return percentileClass(cellVal, percentiles[col]);
  }

  const legendEl = document.getElementById('table-legend');
  if (legendEl) {
    if (!highlightByRank) legendEl.textContent = 'Cell shading: percentile within that column (darker = higher relative to other countries).';
    else if (shadeAllColumns) legendEl.textContent = 'Cell shading: rank within each column (darker = better rank).';
    else legendEl.textContent = 'Cell shading: rank in sort column only (darker = better rank).';
  }

  document.querySelectorAll('#medal-table thead th').forEach((th) => {
    const col = th.dataset.column;
    th.classList.toggle('col-hidden', col && columnVisibility[col] === false);
    if (th.classList.contains('th-sort')) {
      const key = th.dataset.sort;
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (key === sortKey) th.classList.add(sortDir === 1 ? 'sorted-asc' : 'sorted-desc');
    }
  });

  tbody.innerHTML = sorted.map((row, i) => {
    const rank = sortKey === 'rank' ? (row.rank ?? i + 1) : i + 1;
    const trendCell = (() => {
      if (!hasTrend) return `<td data-column="trend" class="sparkline-cell ${columnVisibility.trend === false ? 'col-hidden' : ''}">—</td>`;
      const pts = trendByCode[row.code || row.country];
      const vals = pts ? pts.map((p) => p.total) : [];
      return `<td data-column="trend" class="sparkline-cell ${columnVisibility.trend === false ? 'col-hidden' : ''}">${vals.length >= 2 ? sparklineSvg(vals, 60, 22) : '—'}</td>`;
    })();
    return `
      <tr>
        <td data-column="rank" class="num${cellHighlight('rank', row, i, rank)} ${columnVisibility.rank === false ? 'col-hidden' : ''}">${rank}</td>
        <td data-column="country" class="${columnVisibility.country === false ? 'col-hidden' : ''}"><span class="country-cell">${getFlagUrl(row.iso || row.code) ? '<img src="' + getFlagUrl(row.iso || row.code) + '" alt="" class="country-flag" loading="lazy">' : ''}<span>${escapeHtml(row.country)}</span></span></td>
        <td data-column="gold" class="num${cellHighlight('gold', row, i, row.gold)} ${columnVisibility.gold === false ? 'col-hidden' : ''}">${row.gold ?? 0}</td>
        <td data-column="silver" class="num${cellHighlight('silver', row, i, row.silver)} ${columnVisibility.silver === false ? 'col-hidden' : ''}">${row.silver ?? 0}</td>
        <td data-column="bronze" class="num${cellHighlight('bronze', row, i, row.bronze)} ${columnVisibility.bronze === false ? 'col-hidden' : ''}">${row.bronze ?? 0}</td>
        <td data-column="total" class="num${cellHighlight('total', row, i, row.total)} ${columnVisibility.total === false ? 'col-hidden' : ''}">${row.total ?? 0}</td>
        <td data-column="athletes" class="num ${row.athletes == null ? 'na' : ''}${cellHighlight('athletes', row, i, row.athletes)} ${columnVisibility.athletes === false ? 'col-hidden' : ''}">${row.athletes != null ? row.athletes : '—'}</td>
        <td data-column="medalsPerAthlete" class="num ${row.medalsPerAthlete == null ? 'na' : ''}${cellHighlight('medalsPerAthlete', row, i, row.medalsPerAthlete)} ${columnVisibility.medalsPerAthlete === false ? 'col-hidden' : ''}">${formatRate(row.medalsPerAthlete)}</td>
        <td data-column="population" class="num ${row.population == null ? 'na' : ''}${cellHighlight('population', row, i, row.population)} ${columnVisibility.population === false ? 'col-hidden' : ''}">${formatNum(row.population)}</td>
        <td data-column="gdp" class="num ${row.gdp == null ? 'na' : ''}${cellHighlight('gdp', row, i, row.gdp)} ${columnVisibility.gdp === false ? 'col-hidden' : ''}">${formatNum(row.gdp)}</td>
        <td data-column="area" class="num ${row.area == null ? 'na' : ''}${cellHighlight('area', row, i, row.area)} ${columnVisibility.area === false ? 'col-hidden' : ''}">${formatArea(row.area)}</td>
        <td data-column="medalsPerMillionPop" class="num ${row.medalsPerMillionPop == null ? 'na' : ''}${cellHighlight('medalsPerMillionPop', row, i, row.medalsPerMillionPop)} ${columnVisibility.medalsPerMillionPop === false ? 'col-hidden' : ''}">${formatRate(row.medalsPerMillionPop)}</td>
        <td data-column="medalsPerTrillionGDP" class="num ${row.medalsPerTrillionGDP == null ? 'na' : ''}${cellHighlight('medalsPerTrillionGDP', row, i, row.medalsPerTrillionGDP)} ${columnVisibility.medalsPerTrillionGDP === false ? 'col-hidden' : ''}">${formatRate(row.medalsPerTrillionGDP)}</td>
        ${trendCell}
      </tr>
    `;
  }).join('');
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function setStatus(msg, isError = false) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status' + (isError ? ' error' : '');
}

function setLoading(loading) {
  document.getElementById('refresh').disabled = loading;
  document.getElementById('table-wrap').classList.toggle('hidden', loading);
}

function setDataWarning(fallbackEdition, selectedLabel) {
  const el = document.getElementById('data-warning');
  if (fallbackEdition) {
    el.textContent = `Live data for ${selectedLabel} is not available. Showing ${fallbackEdition} results instead. Medal counts are from that edition, not current 2026 totals.`;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
    el.textContent = '';
  }
}

function setupSortHeaders() {
  document.querySelectorAll('.th-sort').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (key === sortKey) sortDir *= -1;
      else { sortKey = key; sortDir = -1; }
      renderTable(combinedData);
    });
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        th.click();
      }
    });
  });
}

let currentView = 'table';
let chartInstance = null;
let mapInstance = null;
let mapGeoJsonLayer = null;
let multiEditionData = { editions: [] };
let trendsChartInstance = null;
const TOP_N = 15;
const columnVisibility = { rank: true, country: true, gold: true, silver: true, bronze: true, total: true, athletes: true, medalsPerAthlete: true, population: true, gdp: true, area: true, medalsPerMillionPop: true, medalsPerTrillionGDP: true, trend: true };
const NUMERIC_COLS = ['gold', 'silver', 'bronze', 'total', 'athletes', 'medalsPerAthlete', 'population', 'gdp', 'area', 'medalsPerMillionPop', 'medalsPerTrillionGDP'];
let highlightByRank = true;
let shadeAllColumns = false;

function showView(view) {
  currentView = view;
  document.querySelectorAll('.view-tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  document.getElementById('table-wrap').classList.toggle('hidden', view !== 'table');
  document.getElementById('charts-wrap').classList.toggle('hidden', view !== 'charts');
  document.getElementById('map-wrap').classList.toggle('hidden', view !== 'map');
  document.getElementById('compare-wrap').classList.toggle('hidden', view !== 'compare');
  if (view === 'table') renderTable(combinedData);
  if (view === 'charts') {
    document.getElementById('bar-metric').classList.toggle('hidden', document.getElementById('chart-type').value === 'scatter');
    document.getElementById('bar-metric-label').classList.toggle('hidden', document.getElementById('chart-type').value === 'scatter');
    document.getElementById('scatter-x').classList.toggle('hidden', document.getElementById('chart-type').value !== 'scatter');
    document.getElementById('scatter-x-label').classList.toggle('hidden', document.getElementById('chart-type').value !== 'scatter');
    document.getElementById('scatter-y').classList.toggle('hidden', document.getElementById('chart-type').value !== 'scatter');
    document.getElementById('scatter-y-label').classList.toggle('hidden', document.getElementById('chart-type').value !== 'scatter');
    renderCharts();
  }
  if (view === 'map') renderMap();
  if (view === 'compare') renderCompareView();
}

function renderCharts() {
  const type = document.getElementById('chart-type').value;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  if (!combinedData.length) return;
  if (type === 'bar') renderBarChart();
  else if (type === 'composition') renderCompositionChart();
  else if (type === 'scatter') renderScatterChart();
}

var barChartFlagPlugin = {
  id: 'barChartFlags',
  afterDraw: function (chart) {
    var imgs = chart.options.plugins && chart.options.plugins.barChartFlags && chart.options.plugins.barChartFlags.images;
    if (!imgs || !imgs.length || chart.scales.y == null) return;
    var yScale = chart.scales.y;
    var flagW = 24;
    var flagH = 18;
    var flagX = 12;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!img || !img.complete) continue;
      var y = yScale.getPixelForValue(i) - flagH / 2;
      chart.ctx.drawImage(img, flagX, y, flagW, flagH);
    }
  }
};

function renderBarChart() {
  const metric = document.getElementById('bar-metric').value;
  const compare = getSortCompare(metric);
  const sorted = [...combinedData].sort((a, b) => -1 * compare(a, b)).slice(0, TOP_N);
  const labels = sorted.map((r) => r.country);
  const ctx = document.getElementById('chart-canvas').getContext('2d');
  const isStacked = metric === 'total' || metric === 'gold';
  const getVal = (r, k) => (r[k] != null && Number(r[k]) >= 0 ? Number(r[k]) : 0);
  Promise.all(sorted.map((r) => loadImage(getFlagUrl(r.iso || r.code)))).then((flagImages) => {
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'bar',
      plugins: [barChartFlagPlugin],
      data: isStacked
        ? {
            labels,
            datasets: [
              { label: 'Gold', data: sorted.map((r) => getVal(r, 'gold')), backgroundColor: 'rgba(212,175,55,0.9)' },
              { label: 'Silver', data: sorted.map((r) => getVal(r, 'silver')), backgroundColor: 'rgba(192,192,192,0.9)' },
              { label: 'Bronze', data: sorted.map((r) => getVal(r, 'bronze')), backgroundColor: 'rgba(205,127,50,0.9)' }
            ]
          }
        : { labels, datasets: [{ label: metric === 'gold' ? 'Gold' : metric === 'medalsPerAthlete' ? 'Medals/athlete' : metric === 'medalsPerMillionPop' ? 'Medals/M pop' : 'Total', data: sorted.map((r) => getVal(r, metric)), backgroundColor: 'rgba(26,95,180,0.7)' }] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { left: 44 } },
        plugins: { legend: { display: isStacked }, barChartFlags: { images: flagImages } },
        scales: {
          x: { stacked: isStacked, beginAtZero: true },
          y: { stacked: isStacked, ticks: { align: 'start' } }
        }
      }
    });
  });
}

function renderCompositionChart() {
  const compare = getSortCompare('total');
  const sorted = [...combinedData].sort((a, b) => -1 * compare(a, b)).slice(0, 10);
  const labels = sorted.map((r) => r.country);
  const ctx = document.getElementById('chart-canvas').getContext('2d');
  Promise.all(sorted.map((r) => loadImage(getFlagUrl(r.iso || r.code)))).then((flagImages) => {
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'bar',
      plugins: [barChartFlagPlugin],
      data: {
        labels,
        datasets: [
          { label: 'Gold', data: sorted.map((r) => r.gold ?? 0), backgroundColor: 'rgba(212,175,55,0.9)' },
          { label: 'Silver', data: sorted.map((r) => r.silver ?? 0), backgroundColor: 'rgba(192,192,192,0.9)' },
          { label: 'Bronze', data: sorted.map((r) => r.bronze ?? 0), backgroundColor: 'rgba(205,127,50,0.9)' }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { left: 44 } },
        plugins: { legend: { display: true }, barChartFlags: { images: flagImages } },
        scales: {
          x: { stacked: true, beginAtZero: true },
          y: { stacked: true, ticks: { align: 'start' } }
        }
      }
    });
  });
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function renderScatterChart() {
  const xKey = document.getElementById('scatter-x').value;
  const yKey = document.getElementById('scatter-y').value;
  const points = combinedData.filter((r) => r[xKey] != null && r[yKey] != null && Number(r[xKey]) > 0 && Number(r[yKey]) >= 0);
  const ctx = document.getElementById('chart-canvas').getContext('2d');
  const useFlags = points.length <= 25;
  const data = points.map((r) => ({ x: Number(r[xKey]), y: Number(r[yKey]), country: r.country, ...r }));

  function buildScatter(flagImages) {
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Countries',
          data,
          backgroundColor: useFlags && flagImages ? 'transparent' : 'rgba(26,95,180,0.6)',
          borderColor: useFlags && flagImages ? 'rgba(0,0,0,0.2)' : 'rgba(26,95,180,0.9)',
          borderWidth: useFlags && flagImages ? 1 : 1,
          pointRadius: useFlags && flagImages ? 14 : 6,
          pointStyle: useFlags && flagImages ? flagImages.map((img) => img || undefined) : undefined
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const d = ctx.raw;
                return [d.country, `Pop: ${formatNum(d.population)}`, `GDP: ${formatNum(d.gdp)}`, `Medals: ${d.total}`, `Medals/M pop: ${formatRate(d.medalsPerMillionPop)}`].filter(Boolean);
              }
            }
          }
        },
        scales: {
          x: { type: 'logarithmic', title: { display: true, text: xKey === 'population' ? 'Population' : 'GDP' } },
          y: { beginAtZero: true, title: { display: true, text: yKey === 'total' ? 'Total medals' : 'Medals per M pop' } }
        }
      }
    });
  }

  if (useFlags && points.length > 0) {
    Promise.all(points.map((r) => loadImage(getFlagUrl(r.iso || r.code)))).then((imgs) => {
      buildScatter(imgs);
    });
  } else {
    buildScatter(null);
  }
}

const MAP_SEQUENTIAL_COLORS = ['#deebf7', '#9ecae1', '#4292c6', '#2171b5', '#084594'];

function renderMap() {
  if (!window.L || !combinedData.length) return;
  const metric = document.getElementById('map-metric').value;
  const metricLabels = { total: 'Total medals', gold: 'Gold medals', medalsPerMillionPop: 'Medals per million population' };
  const byIso = {};
  combinedData.forEach((r) => {
    const key = (r.iso || r.code || '').toString().toUpperCase();
    if (key) byIso[key] = r;
  });
  const getVal = (iso) => {
    const key = iso != null ? String(iso).toUpperCase() : '';
    const r = byIso[key];
    if (!r) return null;
    const v = r[metric];
    return v != null && Number(v) >= 0 ? Number(v) : null;
  };
  const values = combinedData.map((r) => getVal(r.iso || r.code)).filter((v) => v != null);
  const maxVal = values.length ? Math.max(...values) : 1;
  const minVal = values.length ? Math.min(...values) : 0;

  let legendLabels = [];
  if (values.length && maxVal > minVal) {
    const breaks = [];
    for (let i = 0; i <= 5; i++) breaks.push(minVal + (i / 5) * (maxVal - minVal));
    for (let j = 0; j < 5; j++) {
      const lo = breaks[j];
      const hi = breaks[j + 1];
      if (metric === 'medalsPerMillionPop') {
        legendLabels.push(j === 4 ? (lo.toFixed(2) + '+') : (lo.toFixed(2) + ' – ' + hi.toFixed(2)));
      } else {
        legendLabels.push(j === 4 ? (Math.round(lo) + '+') : (Math.round(lo) + ' – ' + Math.round(hi)));
      }
    }
  } else {
    legendLabels = ['0', '1+'];
  }

  function getColorForValue(v) {
    if (v == null) return '#bdbdbd';
    if (maxVal <= minVal) return MAP_SEQUENTIAL_COLORS[2];
    const t = (v - minVal) / (maxVal - minVal);
    const idx = t >= 1 ? 4 : Math.min(4, Math.floor(t * 5));
    return MAP_SEQUENTIAL_COLORS[idx];
  }

  const legendEl = document.getElementById('map-legend');
  legendEl.innerHTML =
    '<div class="map-legend-title">' + escapeHtml(metricLabels[metric] || metric) + '</div>' +
    '<div class="map-legend-scale">' +
    legendLabels.map((label, i) =>
      '<div class="map-legend-item"><span class="map-legend-swatch" style="background:' + MAP_SEQUENTIAL_COLORS[i] + '"></span><span>' + escapeHtml(label) + '</span></div>'
    ).join('') +
    '<div class="map-legend-item"><span class="map-legend-swatch" style="background:#bdbdbd"></span><span>No medals</span></div>' +
    '</div>';

  if (!mapInstance) {
    mapInstance = L.map('map-container').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstance);
  }
  if (mapGeoJsonLayer) { mapInstance.removeLayer(mapGeoJsonLayer); mapGeoJsonLayer = null; }

  fetch(api('/api/geojson/countries'))
    .then((res) => { if (!res.ok) throw new Error(res.statusText); return res.json(); })
    .then((geojson) => {
      mapGeoJsonLayer = L.geoJSON(geojson, {
        style: (feature) => {
          const iso = feature.id || feature.properties?.ISO_A3 || feature.properties?.ADM0_A3 || feature.properties?.iso_a3 || feature.properties?.id;
          const v = getVal(iso);
          const fill = getColorForValue(v);
          return { fillColor: fill, color: '#333', weight: 0.5, fillOpacity: 0.75 };
        },
        onEachFeature: (feature, layer) => {
          const iso = feature.id || feature.properties?.ISO_A3 || feature.properties?.ADM0_A3 || feature.properties?.iso_a3 || feature.properties?.id;
          const key = iso != null ? String(iso).toUpperCase() : '';
          const r = byIso[key];
          const name = feature.properties?.name || feature.properties?.ADMIN || iso;
          layer.bindTooltip(r ? `${r.country}: ${r.gold}G ${r.silver}S ${r.bronze}B (${r.total} total)` : name, { permanent: false });
        }
      });
      mapGeoJsonLayer.addTo(mapInstance);
    })
    .catch(() => { document.querySelector('.map-tip').textContent = 'Map data could not be loaded.'; });
}

async function fetchMultiEdition() {
  const eventCodes = Array.from(document.querySelectorAll('#compare-editions-checkboxes input:checked')).map((c) => c.value);
  if (eventCodes.length < 2) { multiEditionData = { editions: [] }; renderCompareView(); return; }
  try {
    const res = await fetch(api(`/api/combined-multi?events=${encodeURIComponent(eventCodes.join(','))}`));
    if (!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    multiEditionData = json;
    renderCompareView();
  } catch (e) {
    multiEditionData = { editions: [] };
    document.getElementById('compare-placeholder').textContent = 'Could not load comparison data.';
    document.getElementById('compare-placeholder').className = 'status error';
    document.getElementById('compare-placeholder').classList.remove('hidden');
    document.getElementById('compare-table').classList.add('hidden');
    document.getElementById('trends-chart-wrap').classList.add('hidden');
  }
}

function renderCompareView() {
  const wrap = document.getElementById('compare-wrap');
  const checkboxesDiv = document.getElementById('compare-editions-checkboxes');
  checkboxesDiv.innerHTML = eventsList.map((e) => `<label><input type="checkbox" value="${escapeHtml(e.event)}" ${['OW2018','OW2022','OW2026'].includes(e.event) ? 'checked' : ''}> ${escapeHtml(e.label)}</label>`).join('');
  checkboxesDiv.querySelectorAll('input').forEach((cb) => cb.addEventListener('change', fetchMultiEdition));

  if (!multiEditionData.editions || multiEditionData.editions.length === 0) {
    document.getElementById('compare-placeholder').classList.remove('hidden');
    document.getElementById('compare-table').classList.add('hidden');
    document.getElementById('trends-chart-wrap').classList.add('hidden');
    fetchMultiEdition();
    return;
  }
  document.getElementById('compare-placeholder').classList.add('hidden');
  document.getElementById('compare-table').classList.remove('hidden');

  const editions = [...multiEditionData.editions].sort((a, b) => a.year - b.year);
  const countryKeys = new Set();
  editions.forEach((ed) => ed.data.forEach((r) => countryKeys.add(r.code || r.country)));
  const countries = Array.from(countryKeys);
  const byCountry = {};
  countries.forEach((c) => { byCountry[c] = {}; });
  editions.forEach((ed) => {
    ed.data.forEach((r) => {
      const key = r.code || r.country;
      if (!byCountry[key]) byCountry[key] = {};
      byCountry[key][ed.year] = r;
    });
  });

  const thead = document.getElementById('compare-thead');
  thead.innerHTML = '<tr><th>Country</th>' + editions.map((e) => `<th>${e.year} Total</th><th>${e.year} Pop</th>`).join('') + '</tr>';

  const sortedCountries = countries.sort((a, b) => {
    const aName = editions[0].data.find((r) => (r.code || r.country) === a)?.country || a;
    const bName = editions[0].data.find((r) => (r.code || r.country) === b)?.country || b;
    return (aName || '').localeCompare(bName || '');
  });

  const tbody = document.getElementById('compare-tbody');
  tbody.innerHTML = sortedCountries.map((key) => {
    const row = byCountry[key];
    const first = editions[0].data.find((r) => (r.code || r.country) === key);
    const name = first ? first.country : key;
    const flagUrl = getFlagUrl(first?.iso || first?.code || key);
    const flagHtml = flagUrl ? '<img src="' + flagUrl + '" alt="" class="country-flag" loading="lazy">' : '';
    const cells = editions.flatMap((e) => {
      const r = row[e.year];
      return [
        `<td class="num">${r ? (r.total ?? '—') : '—'}</td>`,
        `<td class="num">${r && r.population != null ? formatNum(r.population) : '—'}</td>`
      ];
    });
    return '<tr><td><span class="country-cell">' + flagHtml + '<span>' + escapeHtml(name) + '</span></span></td>' + cells.join('') + '</tr>';
  }).join('');

  const countrySelect = document.getElementById('compare-country');
  const allNames = [...new Set(editions.flatMap((e) => e.data.map((r) => r.country)))].filter(Boolean).sort();
  countrySelect.innerHTML = '<option value="">-- Select country --</option>' + allNames.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  countrySelect.onchange = () => renderSingleCountryTrend();
  renderSingleCountryTrend();
}

function renderSingleCountryTrend() {
  const countryName = document.getElementById('compare-country').value;
  const wrap = document.getElementById('trends-chart-wrap');
  if (!countryName || !multiEditionData.editions || multiEditionData.editions.length === 0) {
    wrap.classList.add('hidden');
    return;
  }
  const editions = [...multiEditionData.editions].sort((a, b) => a.year - b.year);
  const points = editions.map((e) => {
    const r = e.data.find((row) => row.country === countryName);
    return r ? { year: e.year, total: r.total ?? 0, medalsPerMillionPop: r.medalsPerMillionPop ?? null } : null;
  }).filter(Boolean);
  if (points.length === 0) { wrap.classList.add('hidden'); return; }

  wrap.classList.remove('hidden');
  const ctx = document.getElementById('trends-canvas').getContext('2d');
  if (trendsChartInstance) { trendsChartInstance.destroy(); trendsChartInstance = null; }
  trendsChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: points.map((p) => p.year),
      datasets: [{
        label: `${countryName} – total medals`,
        data: points.map((p) => p.total),
        borderColor: 'rgb(26,95,180)',
        backgroundColor: 'rgba(26,95,180,0.1)',
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

const FETCH_TIMEOUT_MS = 90000;
let timerInterval = null;

function getSelectedEvent() {
  const sel = document.getElementById('olympics');
  const eventCode = sel.value;
  return eventsList.find((e) => e.event === eventCode) || eventsList[0];
}

function startTimer() {
  const start = Date.now();
  const el = document.getElementById('timer');
  el.classList.remove('hidden');
  el.textContent = '0s';
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const sec = Math.floor((Date.now() - start) / 1000);
    el.textContent = `${sec}s`;
  }, 1000);
  return start;
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  document.getElementById('timer').classList.add('hidden');
}

async function fetchData() {
  const ev = getSelectedEvent();
  const streamUrl = api(`/api/combined-stream?event=${encodeURIComponent(ev.event)}&year=${ev.year}`);
  setStatus('Connecting…');
  setDataWarning(null);
  setLoading(true);
  const start = startTimer();
  let finished = false;

  function cleanup() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    document.getElementById('timer').classList.add('hidden');
    setLoading(false);
  }

  const es = new EventSource(streamUrl);
  es.addEventListener('progress', (e) => {
    try {
      const d = JSON.parse(e.data);
      setStatus(d.message || d.step);
    } catch (err) {
      setStatus('Loading…');
    }
  });
  es.addEventListener('done', (e) => {
    if (finished) return;
    finished = true;
    try {
      const payload = JSON.parse(e.data);
      combinedData = payload.data || [];
      renderTable(combinedData);
      const sec = Math.floor((Date.now() - start) / 1000);
      setStatus(`${combinedData.length} countries · ${ev.label} (stats for ${payload.year || ev.year}). Loaded in ${sec}s.`);
      setDataWarning(payload.fallbackEdition, ev.label);
    } catch (err) {
      setStatus('Failed to parse response', true);
      combinedData = [];
      setDataWarning(null);
    }
    es.close();
    cleanup();
    showView(currentView);
  });
  es.addEventListener('error', (e) => {
    if (finished) return;
    if (e.data) {
      try {
        const payload = JSON.parse(e.data);
        if (payload.message) {
          finished = true;
          setStatus(payload.message, true);
          combinedData = [];
          setDataWarning(null);
          document.getElementById('table-wrap').classList.add('hidden');
          es.close();
          cleanup();
        }
      } catch (err) {
        if (es.readyState === EventSource.CLOSED) {
          finished = true;
          setStatus('Connection closed or timeout. Try again or check firewall.', true);
          combinedData = [];
          setDataWarning(null);
          document.getElementById('table-wrap').classList.add('hidden');
          cleanup();
        }
      }
    } else if (es.readyState === EventSource.CLOSED) {
      finished = true;
      setStatus('Connection closed or timeout. Try again or check firewall.', true);
      combinedData = [];
      setDataWarning(null);
      document.getElementById('table-wrap').classList.add('hidden');
      cleanup();
    }
  });

  setTimeout(() => {
    if (finished) return;
    finished = true;
    es.close();
    setStatus('Request timed out. External APIs may be blocked. Try again.', true);
    combinedData = [];
    cleanup();
  }, FETCH_TIMEOUT_MS);
}

async function initEvents() {
  try {
    const res = await fetch(api('/api/events'));
    if (res.ok) {
      eventsList = await res.json();
      const olympicsSel = document.getElementById('olympics');
      olympicsSel.innerHTML = eventsList.map((e) => `<option value="${escapeHtml(e.event)}">${escapeHtml(e.label)}</option>`).join('');
    }
  } catch (e) {
    console.warn('Could not load events list, using defaults');
  }
  fetchData();
}

document.getElementById('olympics').addEventListener('change', fetchData);
document.getElementById('refresh').addEventListener('click', fetchData);
setupSortHeaders();

document.querySelectorAll('.view-tab').forEach((tab) => {
  tab.addEventListener('click', () => showView(tab.dataset.view));
});
document.getElementById('chart-type').addEventListener('change', () => {
  document.getElementById('bar-metric').classList.toggle('hidden', document.getElementById('chart-type').value === 'scatter');
  document.getElementById('bar-metric-label').classList.toggle('hidden', document.getElementById('chart-type').value === 'scatter');
  document.getElementById('scatter-x').classList.toggle('hidden', document.getElementById('chart-type').value !== 'scatter');
  document.getElementById('scatter-x-label').classList.toggle('hidden', document.getElementById('chart-type').value !== 'scatter');
  document.getElementById('scatter-y').classList.toggle('hidden', document.getElementById('chart-type').value !== 'scatter');
  document.getElementById('scatter-y-label').classList.toggle('hidden', document.getElementById('chart-type').value !== 'scatter');
  renderCharts();
});
document.getElementById('bar-metric').addEventListener('change', renderCharts);
document.getElementById('scatter-x').addEventListener('change', renderCharts);
document.getElementById('scatter-y').addEventListener('change', renderCharts);
document.getElementById('map-metric').addEventListener('change', renderMap);

function exportCSV() {
  if (!combinedData.length) return;
  const compare = getSortCompare(sortKey);
  const sorted = [...combinedData].sort((a, b) => sortDir * compare(a, b));
  const headers = ['Rank', 'Country', 'Code', 'Gold', 'Silver', 'Bronze', 'Total', 'Athletes', 'Medals/athlete', 'Population', 'GDP', 'Area', 'Medals/M pop', 'Medals/trillion GDP'];
  const row = (r, i) => {
    const rank = sortKey === 'rank' ? (r.rank ?? i + 1) : i + 1;
    return [rank, r.country, r.code, r.gold ?? '', r.silver ?? '', r.bronze ?? '', r.total ?? '', r.athletes ?? '', r.medalsPerAthlete ?? '', r.population ?? '', r.gdp ?? '', r.area ?? '', r.medalsPerMillionPop ?? '', r.medalsPerTrillionGDP ?? ''];
  };
  const escapeCsv = (v) => (v == null ? '' : String(v).replace(/"/g, '""'));
  const lines = [headers.join(','), ...sorted.map((r, i) => row(r, i).map((v) => (v !== '' && /[,"\n]/.test(String(v)) ? '"' + escapeCsv(v) + '"' : escapeCsv(v))).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `olympics-medals-${getSelectedEvent().year || 'export'}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
document.getElementById('export-csv').addEventListener('click', exportCSV);

document.getElementById('highlight-by-rank').addEventListener('change', (e) => {
  highlightByRank = e.target.checked;
  document.getElementById('shade-all-columns').disabled = !highlightByRank;
  renderTable(combinedData);
});
document.getElementById('shade-all-columns').disabled = !highlightByRank;
document.getElementById('shade-all-columns').addEventListener('change', (e) => {
  shadeAllColumns = e.target.checked;
  renderTable(combinedData);
});

document.getElementById('columns-btn').addEventListener('click', () => {
  const menu = document.getElementById('columns-menu');
  const open = !menu.classList.contains('hidden');
  menu.classList.toggle('hidden', open);
  document.getElementById('columns-btn').setAttribute('aria-expanded', !open);
});
document.getElementById('columns-menu').querySelectorAll('input[data-col]').forEach((cb) => {
  cb.addEventListener('change', () => {
    columnVisibility[cb.dataset.col] = cb.checked;
    document.querySelectorAll(`[data-column="${cb.dataset.col}"]`).forEach((el) => el.classList.toggle('col-hidden', !cb.checked));
  });
});
document.addEventListener('click', (e) => {
  if (!document.getElementById('columns-menu').contains(e.target) && !document.getElementById('columns-btn').contains(e.target)) {
    document.getElementById('columns-menu').classList.add('hidden');
    document.getElementById('columns-btn').setAttribute('aria-expanded', 'false');
  }
});

initEvents();
