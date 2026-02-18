# Olympics Medal Tracker

A local web app that displays Olympics medal counts with country statistics (population, GDP, area, athletes), sortable tables, charts, a world map, and cross-edition comparison. Data is fetched from Olympics.com, Wikipedia, REST Countries, World Bank, and (for athlete counts) whereig.com.

## Prerequisites

- **Node.js** and **npm** (included with Node.js). [Download Node.js](https://nodejs.org/) (LTS recommended).
- Restart your terminal (or Cursor) after installing so `node` and `npm` are recognized. Verify: `node -v` and `npm -v`.

**Windows (if npm not in PATH):** Run once from any folder, then open a new terminal:
```powershell
[Environment]::SetEnvironmentVariable("Path", "C:\Program Files\nodejs;" + [Environment]::GetEnvironmentVariable("Path", "User"), "User")
```
Or from this project: `.\fix-path.ps1` (current terminal only). To run without PATH:
```powershell
cd d:\projects\Olympics
.\start-server.bat
```
Or: `& "C:\Program Files\nodejs\npm.cmd" start`

## Running locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Updating the live site (Render)

The app is deployed at **https://olympic-tracker-ss4b.onrender.com/** from the repo **BodegaNY/olympic_tracker**. To update the live site:

1. **Commit and push** to `main`:
   ```bash
   git add .
   git commit -m "Your change description"
   git push origin main
   ```
2. **Render auto-deploys** on every push to `main`. Check [dashboard.render.com](https://dashboard.render.com) → your **olympic_tracker** service → **Logs** to confirm the build and deploy. The live URL stays the same unless you change the service name.

If the Render URL ever changes, update it in **DEPLOY.md** and **docs/RENDER-SETUP.md** (and in the poker site’s `/olmpc` `index.html` if that frontend points at this API).

## Running on a remote server

The app is set up to run on a remote host: it listens on all interfaces (`0.0.0.0`) and uses `PORT` from the environment when set (e.g. cloud platforms).

1. **Port** – Set `PORT` if your host uses something other than 3000 (e.g. `PORT=8080 npm start` or your platform’s config).
2. **Host** – Optional: set `HOST` to bind to a specific IP; default `0.0.0.0` accepts external connections.
3. **Process manager** – On a VPS, use a process manager so the app restarts on crash, e.g. **PM2**: `npm install -g pm2` then `pm2 start server.js --name olympics-tracker` and `pm2 save` / `pm2 startup`.
4. **Reverse proxy** – Put **nginx** or **Caddy** in front to serve HTTPS and proxy to Node (e.g. proxy `http://127.0.0.1:3000`). Example Caddy: `yourdomain.com { reverse_proxy localhost:3000 }`.
5. **Firewall** – Open port 80/443 on the server (and optionally 3000 only if you’re not using a reverse proxy and want direct access).

No code changes are required for CORS or API URLs: the frontend uses relative `/api/...` and is served by the same Express app.

### Running under a subpath (e.g. poker site at `yoursite.com/olympics`)

To serve this app from a folder off the root of another site (e.g. your poker site on Render):

1. **Copy this app** into your poker repo, e.g. as `olympics/` (so you have `poker-repo/olympics/server.js`, `olympics/public/`, etc.).
2. **Set the base path** when starting the poker server, e.g. `BASE_PATH=/olympics`.
3. **Mount the Olympics router** in your poker app (Node/Express):

   ```js
   process.env.BASE_PATH = '/olympics';  // set before require
   const { router } = require('./olympics/server');
   app.use('/olympics', router);
   ```

4. Ensure the poker app’s `package.json` has the same Node version and that the `olympics` folder has run `npm install` (or the poker app’s root has dependencies that satisfy `olympics/package.json`).

Then the Olympics tracker is available at `https://your-poker-site.com/olympics/`. The app uses `BASE_PATH` to prefix all API and stream URLs in the frontend.

### Frontend only on one site, API elsewhere (e.g. poker site at `/olmpc`)

If you **only uploaded the `public` folder** (e.g. to `yoursite.com/olmpc`), the page loads but you get **"Connection closed or timeout"** because there is no backend—the API and event stream live in the Node server, not in the static files.

**Fix: run the Olympics backend and point the frontend at it.**

1. **Deploy the full Olympics app** (this repo: `server.js` + `public/` + `package.json`) as a **separate** Render Web Service (or any Node host). You’ll get a URL like `https://olympics-xyz.onrender.com`.
2. **In the copy of `public` you uploaded to the poker site**, edit **`index.html`** and set the API base URL. Find this line:
   ```html
   <script>window.OLYMPICS_BASE = '__BASE_PATH__';</script>
   ```
   Change it to the **full URL** of your Olympics backend (no trailing slash), e.g.:
   ```html
   <script>window.OLYMPICS_BASE = 'https://olympics-xyz.onrender.com';</script>
   ```
3. Save and re-upload that `index.html` (or redeploy the poker site). The frontend will then call your Olympics API and stream from that URL. The server sends CORS headers so the poker site’s origin is allowed (by default `Access-Control-Allow-Origin: *`; set env `CORS_ORIGIN=https://your-poker-site.com` to restrict if you prefer).

After this, the page at `yoursite.com/olmpc/` will load data from your Olympics backend.

## Features

- **Table view**: Sortable medal table with rank, country (with flag), gold/silver/bronze/total, athletes, medals per athlete, population, GDP, area, medals per million pop, medals per trillion GDP. Optional **Trend** column (sparkline when Compare data is loaded). **Highlight by rank** (default) or by percentile within column. CSV export and column visibility menu.
- **Charts**: Bar (top N by metric, stacked gold/silver/bronze), medal composition (stacked top 10), scatter (demographics vs medals; optional flag markers when ≤25 points).
- **Map**: Choropleth world map colored by total / gold / medals per million pop, with sequential legend.
- **Compare**: Select multiple editions; cross-edition table and single-country trend line chart. Default editions: 2026 Winter, 2022 Winter, 2018 Winter.

## Data sources

| Data | Source |
|------|--------|
| Medals | Olympics.com JSON API; fallback: Wikipedia medal table (API then HTML); then bundled JSON fallback |
| Population / area | [REST Countries](https://restcountries.com) (latest for 2026; otherwise by year) |
| GDP | [World Bank API](https://api.worldbank.org) (`mrv=1` for 2026; otherwise by edition year) |
| Athlete counts (2026) | [whereig.com](https://www.whereig.com/olympics/...) scrape |

## Olympics selection

The app defaults to **2026 Winter (Milan-Cortina)**. Use the **Olympics** dropdown to switch to 2024 Summer (Paris), 2022 Winter (Beijing), 2020 Summer (Tokyo), or 2018 Winter (PyeongChang). The server uses `server.js` → `OLYMPICS_EVENTS` and `DEFAULT_EVENT`; the frontend loads the list from `GET /api/events`.

---

## Guide: Adding the next Olympics

Use this checklist when preparing the app for a **new** Olympics edition (e.g. 2028 Summer, 2030 Winter).

### 1. Event code and label

- **Convention**: `OG` = Summer, `OW` = Winter; then 4-digit year. Examples: `OG2028`, `OW2030`.
- In **`server.js`**:
  - Add an entry to **`OLYMPICS_EVENTS`** at the top:
    - `event`: e.g. `'OG2028'`
    - `year`: e.g. `2028`
    - `label`: e.g. `'2028 Summer (Los Angeles)'`
    - `fallback`: existing JSON file to use if live data fails (e.g. `'medals-fallback.json'` for Summer, `'medals-fallback-OW2022.json'` for Winter).
  - Optionally set **`DEFAULT_EVENT`** to the new edition.

### 2. Wikipedia fallback (medals)

- In **`server.js`**, add the new event to **`WIKIPEDIA_MEDAL_PAGE`**:
  - Key: same `event` code (e.g. `OG2028`).
  - Value: Wikipedia page title for the medal table, e.g. `'2028_Summer_Olympics_medal_table'` or `'2030_Winter_Olympics_medal_table'`.
- The server tries Olympics.com first, then Wikipedia API/HTML, then the bundled fallback file.

### 3. Olympics.com / live medal URLs (optional but recommended)

- For **Winter** games, **`MEDAL_JSON_URLS_2026`** is used for 2026; for a new Winter edition (e.g. 2030), add a similar array (e.g. `MEDAL_JSON_URLS_2030`) and in **`fetchMedalsForEvent`** add a branch that uses it for that event (same pattern as `ev.event === 'OW2026'`).
- For **Summer**, the primary URL is built as:  
  `https://olympics.com/${ev.event}/data/CIS_MedalNOCs~lang=ENG~comp=${ev.event}.json`  
  So adding the event to `OLYMPICS_EVENTS` is usually enough once the IOC site exposes that path.

### 4. “Latest data” and athlete counts

- For a **future** edition (e.g. 2028 or 2030), the server uses “latest available” population/GDP (REST Countries + World Bank `mrv=1`) and may skip World Bank population for that year. This is controlled in **`runCombinedLogic`** with a check like `ev.event === 'OW2026'`; add the new event code there if you want the same behavior (e.g. `ev.event === 'OW2026' || ev.event === 'OW2030'`).
- **Athlete counts** are currently fetched only for 2026 (whereig.com). For another edition, add a URL constant and a branch in the combined logic (and optionally in `fetchWhereigAthletes` or a similar fetcher) to scrape that edition’s page; then in **`runCombinedLogic`** set `athletesByNoc` for the new event similarly to 2026.

### 5. Frontend

- The frontend **event list** comes from **`GET /api/events`** (populated from `OLYMPICS_EVENTS`). No change needed in `public/app.js` for the dropdown.
- If you added a new default set for **Compare**, update the default checked editions in **`public/app.js`** where the Compare checkboxes are built (e.g. include `'OW2030'` in the list of checked events if desired).

### 6. Bundled fallback JSON (optional)

- To add a dedicated fallback for the new edition (e.g. pre-filled medal table): add a file under **`public/data/`**, e.g. `medals-fallback-OG2028.json`, in the same shape as `medals-fallback.json` or `medals-fallback-OW2022.json` (see those files for `results` and country/code/medals structure). Then set **`fallback`** for that event in `OLYMPICS_EVENTS` to this filename.

### 7. IOC / NOC codes

- If the new edition introduces new NOCs or name changes, add them to **`IOC_TO_ISO`** and/or **`NOC_TO_NAME`** / **`NAME_TO_NOC`** in `server.js` so country matching and ISO codes stay correct. The frontend uses **`ISO3_TO_ISO2`** in `public/app.js` for flags; add any new ISO3 there if needed (flagcdn.com uses ISO2).

### Quick checklist

| Step | Where | What |
|------|--------|------|
| 1 | `server.js` | Add to `OLYMPICS_EVENTS` (event, year, label, fallback); optionally `DEFAULT_EVENT` |
| 2 | `server.js` | Add to `WIKIPEDIA_MEDAL_PAGE` |
| 3 | `server.js` | Add Olympics.com URL array + branch in `fetchMedalsForEvent` if needed |
| 4 | `server.js` | Extend “latest data” and athlete logic for new event if needed |
| 5 | `public/app.js` | Update Compare default editions if desired |
| 6 | `public/data/` | Optional: new fallback JSON and set `fallback` in `OLYMPICS_EVENTS` |
| 7 | `server.js` / `public/app.js` | Add NOC/ISO mappings if new countries |

After changes, run `npm start` and test the new edition from the Olympics dropdown and in Compare.
