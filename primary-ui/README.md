# Primary UI

This is the main user interface for the NFL prediction project.

It contains the GridironAI experience, real prediction cards from the FastAPI model endpoint, model performance, and methodology content. Mock community/video/auth surfaces have been removed from the primary app.

## Run

```sh
npm install
npm run dev
```

By default Vite serves this app at `http://localhost:5173/`. If another app is already using that port, run it on another port:

```sh
npm run dev -- --port 5174
```

The prediction cards expect the backend API to be running:

```sh
cd ../nfl-prediction
.venv/bin/uvicorn src.api:app --reload
```
