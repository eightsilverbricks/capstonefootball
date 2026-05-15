# Capstone Football

Primary UI: [`primary-ui`](./primary-ui)

The `primary-ui` app is the main frontend for the project. It presents the GridironAI prediction experience, model explanation, methodology, model performance, and actual prediction cards from the FastAPI backend.

Other folders:

- `nfl-prediction`: Python data pipeline, trained models, and FastAPI prediction API.
- `nfl-frontend`: older/simple React frontend for directly viewing API prediction cards.

## Run The Primary UI

```sh
cd primary-ui
npm install
npm run dev
```

If `5173` is already in use:

```sh
npm run dev -- --port 5174
```

Run the prediction API in another terminal:

```sh
cd nfl-prediction
.venv/bin/uvicorn src.api:app --reload
```
