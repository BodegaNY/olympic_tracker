# Deploy Olympics Tracker to GitHub + Render

## Updating the live site (for agents / next developer)

- **Live URL:** https://olympic-tracker-ss4b.onrender.com/
- **Repo:** https://github.com/BodegaNY/olympic_tracker (branch `main`)

**To update the online site:** commit your changes and push to `main`. Render is connected to this repo and **auto-deploys on every push to `main`**. No manual deploy step; just `git push origin main`. Check [dashboard.render.com](https://dashboard.render.com) → olympic_tracker service → Logs if you need to verify the build.

If the Render service URL changes (e.g. new service), update the live URL in this file, in **docs/RENDER-SETUP.md**, and in the poker site’s `/olmpc` copy of **index.html** (the `window.OLYMPICS_BASE` line) if that page uses this API.

---

## 1. Create the GitHub repo and push (same access as poker)

The script `scripts\create-github-repo.ps1` uses the **same GitHub access** as the poker project (BodegaNY/phgpoker):

1. **GITHUB_TOKEN** (or GH_TOKEN) env if set  
2. Else **git credential for github.com** (Windows Credential Manager — same credential used when you push to phgpoker)

So from this machine you can run (no manual token needed if you’ve already pushed to GitHub):

```powershell
cd "d:\Projects\Olympics Tracker\Olympics"
.\scripts\create-github-repo.ps1
```

The script creates the repo (under the same org/user as your credential) and pushes. **Repo (already created):** **https://github.com/BodegaNY/olympic_tracker**

## 2. Set up on Render

**Full step-by-step:** see **[docs/RENDER-SETUP.md](docs/RENDER-SETUP.md)**.

Short version:

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**.
2. Connect **BodegaNY/olympic_tracker** (use **Configure account** if it’s not listed; grant access to BodegaNY).
3. Set **Name** (e.g. `olympic_tracker`), **Branch** `main`, **Root Directory** empty, **Runtime** Node, **Build Command** `npm install`, **Start Command** `npm start`, **Instance type** Free (or paid).
4. Click **Create Web Service**. When the deploy is **Live**, your app is at the URL shown.

**Live URL:** **https://olympic-tracker-ss4b.onrender.com/**

## 4. (Optional) Use the API from your poker site

If the poker site frontend at `/olmpc` should use this Render service for data, set in the **uploaded** `index.html` on the poker site:

```html
<script>window.OLYMPICS_BASE = 'https://olympic-tracker-ss4b.onrender.com';</script>
```

Use the real URL Render shows for this service (no trailing slash).
