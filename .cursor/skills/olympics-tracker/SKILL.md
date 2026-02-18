---
name: olympics-tracker
description: Project-specific guidance for the Olympics Medal Tracker codebase. Use when modifying server.js, public/app.js, charts, table highlighting, map, Compare view, or adding a new Olympics edition.
---

# Olympics Tracker – Project Skills

Apply this skill when working on the Olympics Medal Tracker: adding features, fixing bugs, or preparing for the next Olympics.

## Project layout

- **server.js**: Express app. Defines `OLYMPICS_EVENTS`, medal fetch (Olympics.com → Wikipedia → fallback), REST Countries, World Bank GDP, whereig athlete scrape, `runCombinedLogic`, `/api/events`, `/api/medals`, `/api/combined`, `/api/combined-multi`, `/api/combined-stream`.
- **public/app.js**: Frontend. Table (sortable, rank/percentile highlight, flags, CSV export, column visibility, trend sparkline), bar/composition/scatter charts (Chart.js + barChartFlagPlugin), map (Leaflet + GeoJSON), Compare (editions + single-country trend).
- **public/index.html**: View tabs (Table | Charts | Map | Compare), table legend + “Highlight by rank” checkbox, chart/map/compare controls.
- **public/styles.css**: Table, chart, map, compare, legend, column visibility.
- **public/data/*.json**: Bundled medal fallbacks; structure must match `normalizeMedalsResponse` in server.js.

Adding a new Olympics: see **README.md → “Guide: Adding the next Olympics”**.

---

## Best practices and learned approaches

### Table highlighting

- **Default: rank-based.** Users expect “best in column = darkest.” For each numeric column, compute each row’s **rank** when sorted by that column (1 = best). Map rank to a 0–100 scale (rank 1 → 100, last → 0) and reuse the same `pct-*` CSS classes. So shading = “position in that column,” not raw value.
- **Optional: percentile within column.** Keep as a toggle (“Highlight by rank” checkbox). Percentile mode: shade by where the value falls in the column’s distribution (same value can be same shade for different columns). Use a short legend above the table that updates with the selected mode so intent is clear.

### Chart.js: flags next to axis labels (bar / composition)

- **Do not** draw flags at `chartArea.left - flagWidth`: that overlaps the right side of the y-axis labels (country names).
- **Reserve space for flags:** use the y-scale **`afterFit`** callback to add a fixed width to the scale (e.g. 28px): `s.width += 28; s.right += 28`. That shifts the chart area right and leaves a gap between labels and bars.
- **Draw flags in the gap:** in the plugin, draw at `yScale.right - flagWidth - 2` so flags sit after the text, before the bars. Use a small left padding (e.g. 16) so labels aren’t cramped on the left edge.

### External APIs and robustness

- **User-Agent:** Set a browser-like `User-Agent` (and `Accept` / `Accept-Language`) on outbound requests to avoid 403s (Wikipedia, Olympics.com).
- **Timeouts:** Use generous timeouts (e.g. 12–25s) for medal and Wikipedia fetches; fail gracefully and fall back to the next source or bundled JSON.
- **Future editions (e.g. 2026):** For “next” Olympics, use latest-available data: REST Countries for population/area, World Bank with `mrv=1` for GDP; skip World Bank population for that year. Optionally add a dedicated athlete-count source (e.g. whereig.com) and wire it only for that edition in `runCombinedLogic`.

### Map

- Use a **sequential color scale** (e.g. light → dark blue) so “more = darker” is obvious. Include a **legend** (e.g. “No medals” in gray, then gradient steps). GeoJSON: match `feature.id` to country ISO (e.g. johan world GeoJSON uses 2-letter or 3-letter codes); normalize to the same code the app uses (e.g. ISO3) when looking up medal/country data.

### Compare view

- **Default editions:** Pre-check a sensible set (e.g. last three Winter games: OW2018, OW2022, OW2026) so the trend and single-country chart are meaningful without extra clicks.
- **Failure handling:** On fetch error for one edition, set a placeholder and hide the table/chart; do **not** re-call the render in a loop. Show a single error/placeholder message.

### Data and country codes

- **IOC (NOC) vs ISO:** Medals often use IOC codes (e.g. NED, GER). Keep a mapping **IOC → ISO 3166-1 alpha-3** in server.js for REST Countries and World Bank. Frontend flags use **ISO3 → ISO2** (e.g. for flagcdn.com). Add entries for new or alternate codes (e.g. TPE, ROC) so names and flags resolve correctly.
- **Fallback JSON:** Structure must match what `normalizeMedalsResponse` expects (e.g. `results` or `MedalNOCs`, with country code/name and medals object). When adding a new edition, re-use an existing fallback file or add one under `public/data/` and set `fallback` in `OLYMPICS_EVENTS`.

### Frontend state and re-render

- **Single source of events:** The Olympics dropdown is populated from `GET /api/events` (server’s `OLYMPICS_EVENTS`). Do not duplicate the full event list in the frontend; at most duplicate default selections (e.g. Compare checkboxes).
- After changing highlight mode, sort, or column visibility, re-render the table once (e.g. `renderTable(combinedData)`) and update the legend text to match the current mode.

---

## Quick reference

| Task | Location |
|------|----------|
| Add new Olympics | server.js: `OLYMPICS_EVENTS`, `WIKIPEDIA_MEDAL_PAGE`; README checklist |
| Medal fetch order | server.js: Olympics.com → Wikipedia → optional scrape → fallback file |
| Table highlight mode | app.js: `highlightByRank`, `cellHighlight()`, rank vs `percentileClass()` |
| Bar/composition flags | app.js: `barChartFlagPlugin`, y-scale `afterFit` + `FLAG_ZONE_WIDTH` |
| Map legend / scale | app.js: `renderMap()`; styles: `.map-legend` |
| Compare defaults | app.js: checkboxes default list (e.g. OW2018, OW2022, OW2026) |
| NOC/ISO mapping | server.js: `IOC_TO_ISO`, `getIsoCode`; app.js: `ISO3_TO_ISO2`, `getFlagUrl` |
