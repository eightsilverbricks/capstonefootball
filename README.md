# Capstone Football

The Clark Index — an NFL game prediction experience backed by a logistic
regression model trained on play-by-play derived team features.

Primary UI: [`primary-ui`](./primary-ui)

The `primary-ui` app is the main frontend. It presents the prediction cards,
model explanation, methodology, model performance, real accounts, and picks.

Other folders:

- [`nfl-prediction`](./nfl-prediction): Python data pipeline, trained models, and the FastAPI prediction API.
- `nfl-frontend`: a legacy React frontend, kept for reference only. Not deployed.

## Run The Primary UI

```sh
cd primary-ui
npm install
npm run dev
```

Vite serves the app at `http://localhost:8080/` (the port is set in
`primary-ui/vite.config.ts`). To use a different port:

```sh
npm run dev -- --port 8081
```

The frontend reads predictions from the static `primary-ui/public/predictions.json`
by default, so **the backend is not required for frontend work**. See
[`primary-ui/README.md`](./primary-ui/README.md) for the Supabase environment
variables that accounts and picks need.

## Run The Prediction API (optional)

Only needed if you are changing the model or the API itself. Setup and usage
are documented in [`nfl-prediction/README.md`](./nfl-prediction/README.md):

```sh
cd nfl-prediction
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn src.api:app --reload
```

Point the frontend at it by setting `VITE_API_BASE_URL` in `primary-ui/.env.local`.

## Deployment

Production is a Vercel project built from the repo root via `vercel.json`
(`cd primary-ui && npm run build`, output `primary-ui/dist`). Pushing to `main`
deploys. The API is not deployed — production serves the static
`predictions.json`, so `VITE_API_BASE_URL` is deliberately left unset there.
