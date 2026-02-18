# Deploy Olympics Tracker to GitHub + Render

## 1. Create the GitHub repo and push (using your poker token)

The repo is already initialized with an initial commit. Create the GitHub repo and push in one step using the **same token** you use for the poker site.

**Option A – Token in environment (recommended)**  
Add `GITHUB_TOKEN` to Cursor so it’s available in the terminal (e.g. **Cursor Settings → Environment → Environment variables** or **Secrets**). Then run:

```powershell
cd "d:\Projects\Olympics Tracker\Olympics"
.\scripts\create-github-repo.ps1
```

**Option B – Token for this run only**

```powershell
cd "d:\Projects\Olympics Tracker\Olympics"
$env:GITHUB_TOKEN = "ghp_YourTokenHere"
.\scripts\create-github-repo.ps1
```

The script creates the `olympic_tracker` repo on your GitHub account and pushes the current branch. It uses the GitHub API (and `gh` if installed), so no manual repo creation is needed.

**Option C – Manual**  
Create an empty repo named `olympic_tracker` on GitHub, then:

```powershell
cd "d:\Projects\Olympics Tracker\Olympics"
git remote add origin https://github.com/YOUR_USERNAME/olympic_tracker.git
git push -u origin main
```

## 3. Set up on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) and log in.
2. Click **New +** → **Web Service**.
3. **Connect** the `olympic_tracker` repo (if it’s not listed, use "Configure account" to grant Render access to GitHub).
4. Choose the **olympic_tracker** repository.
5. Configure:
   - **Name:** `olympic_tracker` (or any name you like).
   - **Region:** pick one close to you.
   - **Branch:** `main`.
   - **Runtime:** **Node**.
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free (or paid if you prefer).
6. Click **Create Web Service**.

Render will build and deploy. When it’s done, the app will be at a URL like `https://olympic_tracker-xxxx.onrender.com`.

## 4. (Optional) Use the API from your poker site

If the poker site frontend at `/olmpc` should use this Render service for data, set in the **uploaded** `index.html` on the poker site:

```html
<script>window.OLYMPICS_BASE = 'https://olympic_tracker-xxxx.onrender.com';</script>
```

Use the real URL Render shows for this service (no trailing slash).
