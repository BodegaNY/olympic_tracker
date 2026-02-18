# Deploy Olympics Tracker to GitHub + Render

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
