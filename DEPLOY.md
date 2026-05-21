# Deploying NFL Matchup Lab

## How it works

- **Local dev** — `./start.sh` runs FastAPI (port 8000) + Vite (port 5173).
  Vite proxies `/predictions.json` → `http://127.0.0.1:8000/predictions` so
  you always get live backend data.

- **Production (Vercel)** — no backend required. The frontend fetches
  `/predictions.json`, which is served as a static file from `public/`.
  The file was generated once by the export script and is committed to the repo.

---

## One-time GitHub setup

```bash
cd /path/to/capstonefootball

git init
git add .
git commit -m "Initial commit — NFL Matchup Lab"

# Create a new public repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/nfl-matchup-lab.git
git branch -M main
git push -u origin main
```

---

## Deploy to Vercel (takes ~2 minutes)

1. Go to **vercel.com** → Log in → **Add New Project**
2. Import your GitHub repo
3. Set these build settings:
   - **Root Directory**: `nfl-frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**

Vercel gives you a public URL like `https://nfl-matchup-lab.vercel.app` instantly.
Every `git push` to `main` triggers a new deploy automatically.

---

## Updating predictions (re-running the model)

When you want to refresh the predictions (e.g. new season data):

```bash
cd nfl-prediction
source .venv/bin/activate
python3 src/export_predictions.py

# Then commit and push — Vercel auto-deploys
cd ..
git add nfl-frontend/public/predictions.json
git commit -m "Refresh predictions — 2024 season"
git push
```

---

## Future: adding live weekly picks

When you're ready for real-time predictions:

1. Deploy the FastAPI backend to **Railway** (railway.app)
   - Connect your GitHub repo
   - Set start command: `cd nfl-prediction && uvicorn src.api:app --host 0.0.0.0 --port $PORT`
   - Add a `requirements.txt` at `nfl-prediction/requirements.txt` if not already there

2. Update `CORS` in `api.py` to allow your Vercel domain:
   ```python
   allow_origins=["https://your-app.vercel.app"]
   ```

3. In `App.jsx`, switch the fetch back to the Railway URL:
   ```js
   const API = import.meta.env.VITE_API_URL || '/predictions.json'
   fetch(API)
   ```

4. Set `VITE_API_URL=https://your-railway-app.up.railway.app/predictions`
   in Vercel's Environment Variables settings.

---

## File structure

```
capstonefootball/
├── nfl-frontend/          ← Vite/React app (deploy this to Vercel)
│   ├── public/
│   │   └── predictions.json   ← static data file (committed, served by Vercel)
│   ├── src/
│   └── vite.config.js     ← proxy config (dev only)
├── nfl-prediction/        ← Python model + API
│   └── src/
│       ├── api.py             ← FastAPI app (local dev only)
│       └── export_predictions.py  ← run this to regenerate predictions.json
├── start.sh               ← local dev: starts both servers
└── DEPLOY.md              ← this file
```
