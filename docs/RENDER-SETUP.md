# Step-by-step: Set up Olympics Tracker on Render.com

Use this to deploy **BodegaNY/olympic_tracker** as a Web Service so you get a live URL.

**Live URL:** **https://olympic-tracker-ss4b.onrender.com/** The app runs at the root of that URL; you can also point your poker site’s `/olmpc` frontend at this URL for the API.

**Updating the online site:** Push to `main`; Render auto-deploys. See **DEPLOY.md** (“Updating the live site”) or **README.md** (same section).

---

## 1. Open Render

1. Go to **https://dashboard.render.com** and log in.
2. You should see your existing services (e.g. First TD, phgpoker). We’re adding a **new Web Service** for the Olympics tracker.

---

## 2. Create a new Web Service

1. Click **New +** (top right) → **Web Service**.
2. You’ll see **Connect a repository**.
   - If **BodegaNY/olympic_tracker** is in the list, select it and click **Connect** (or **Continue**).
   - If it’s **not** in the list: click **Configure account** or **Connect account**, connect GitHub, grant access to the **BodegaNY** org if asked, then pick **BodegaNY/olympic_tracker** and click **Connect**.

---

## 3. Configure the service

Use these settings (match the table; leave anything not listed as default):

| Field | Value |
|--------|--------|
| **Name** | `olympic_tracker` (or any name; this becomes part of the URL, e.g. `https://olympic_tracker-xxxx.onrender.com`) |
| **Region** | Pick one (e.g. Oregon, Ohio). |
| **Branch** | `main` |
| **Root Directory** | **Leave empty** (the repo root is the app). |
| **Runtime** | **Node** |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** (or paid if you prefer). |

**Environment variables:** None required. Render sets `PORT`; the app uses it automatically.

Click **Create Web Service**.

---

## 4. Wait for the first deploy

1. Render will clone the repo, run **Build Command** (`npm install`), then **Start Command** (`npm start`).
2. Watch the **Logs** tab. You should see something like:  
   `Olympics tracker running at http://0.0.0.0:10000` (port is set by Render).
3. When the deploy shows **Live** (green), the app is running.

---

## 5. Get your app URL

1. At the top of the service page, find the **URL**, e.g. **https://olympic_tracker-xxxx.onrender.com**.
2. Open that URL in a browser. You should see the Olympics Medal Tracker (table, charts, map, compare).

That URL is your **Olympics backend**. Use it as-is, or point the poker site’s `/olmpc` frontend at it (step 6).

---

## 6. (Optional) Use this URL from the poker site at `/olmpc`

If the poker site serves the Olympics frontend from a folder (e.g. `/olmpc`) and you want it to load data from this Render service:

1. In the **copy of the Olympics `public` folder** you uploaded to the poker site, edit **index.html**.
2. Find:
   ```html
   <script>window.OLYMPICS_BASE = '__BASE_PATH__';</script>
   ```
3. Replace it with (use your real Render URL, **no trailing slash**; current live URL below):
   ```html
   <script>window.OLYMPICS_BASE = 'https://olympic-tracker-ss4b.onrender.com';</script>
   ```
4. Save and re-upload (or redeploy) so the poker site serves the updated file.

The page at `yoursite.com/olmpc/` will then call this Render service for all API and event-stream requests.

---

## Troubleshooting

| Issue | What to do |
|--------|------------|
| **Repo not listed** | **Configure account** → connect GitHub → grant access to **BodegaNY** (and the repo). Then select **BodegaNY/olympic_tracker** again. |
| **Build fails** | Check the **Logs** tab. Common: wrong **Root Directory** (leave empty), or **Build Command** not `npm install`. |
| **Service won’t start** | Ensure **Start Command** is `npm start` (runs `node server.js`). Check logs for missing dependencies or port errors. |
| **Free instance spins down** | Free instances sleep after ~15 min of no traffic. First load after that can take 30–60 seconds; then it’s fast. |
| **Private repo / permission errors** | In Render: **Account Settings** (gear) → **Integrations** → **GitHub** → re-authorize and ensure **BodegaNY** (and the repo) are allowed. |

---

## Summary

- **Repo:** BodegaNY/olympic_tracker  
- **Build:** `npm install`  
- **Start:** `npm start`  
- **URL:** https://*your-service-name*-xxxx.onrender.com (shown on the service page after deploy).
