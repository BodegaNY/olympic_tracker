# Deploy Olympics Tracker to GitHub + Render

## 1. Create the GitHub repo

1. Log in to **GitHub** with the same account you use for the poker site.
2. Click **+** → **New repository**.
3. Set:
   - **Repository name:** `olympic_tracker`
   - **Visibility:** Public (or Private if you prefer).
   - Leave "Add a README" **unchecked** (this folder already has one).
4. Click **Create repository**.

## 2. Push this project to the repo

In a terminal, from **this project folder** (the one that contains `server.js`, `public/`, `package.json`):

```bash
cd "d:\Projects\Olympics Tracker\Olympics"

git init
git add .
git commit -m "Initial commit: Olympics medal tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/olympic_tracker.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. If GitHub asks for credentials, use your normal login (or a Personal Access Token if you use 2FA).

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
