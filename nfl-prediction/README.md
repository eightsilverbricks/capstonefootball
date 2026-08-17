# nfl-prediction

The data pipeline, trained models, and FastAPI prediction API behind The Clark
Index. Seasons 2018–2023 train the model; 2024 is the held-out test season.

## Setup

The pinned dependencies (numpy 2.x, pandas 3.x) require **Python 3.11+**. The
macOS system Python 3.9 will not work.

```sh
cd nfl-prediction
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Run The API

```sh
.venv/bin/uvicorn src.api:app --reload
```

Serves on `http://127.0.0.1:8000`. CORS already allows the frontend dev ports
(8080/8081 and 5173/5174).

| Endpoint | Returns |
|---|---|
| `GET /` | Health/name check |
| `GET /model-info` | Model type, accuracy, train/test seasons, feature categories |
| `GET /predictions` | Every game card — factors, prose, market context, results |
| `GET /docs` | FastAPI interactive docs |

The frontend only calls this when `VITE_API_BASE_URL` is set; otherwise it
reads the committed static export. See [`../primary-ui/README.md`](../primary-ui/README.md).

## Models

| File | Model | Role |
|---|---|---|
| `models/logreg_model.joblib` | scikit-learn `GridSearchCV` over logistic regression | **Served by the API.** ~71.2% on 2024 |
| `models/xgboost_model.joblib` | `XGBClassifier` | Alternative, for comparison in `outputs/` |

Metrics land in `outputs/metrics.json` and `outputs/xgboost_metrics.json`.

## Pipeline

Run from the `nfl-prediction` directory with the venv. Each step writes into
`data/` and later steps depend on earlier ones:

```sh
.venv/bin/python src/download_data.py          # nflverse schedules + play-by-play -> data/raw
.venv/bin/python src/build_team_game_stats.py  # per-team per-game stats -> data/processed
.venv/bin/python src/build_training_table.py   # joins features -> game_training_table.csv
.venv/bin/python src/train_model.py            # logistic regression -> models/ + outputs/
```

Optional context builders that enrich the prediction cards (weather, QB and
rusher detail, pressure, wind, stadium metadata):

```sh
.venv/bin/python src/build_game_context.py
.venv/bin/python src/build_player_context.py
.venv/bin/python src/build_pressure_context.py
.venv/bin/python src/build_wind_impact.py
.venv/bin/python src/build_stadium_meta.py
```

## Export To The Frontend

The deployed site reads a committed static file, so any model or data change
must be re-exported and committed:

```sh
.venv/bin/python src/export_predictions.py   # -> ../primary-ui/public/predictions.json
.venv/bin/python src/add_actual_results.py   # patches in real 2024 outcomes
.venv/bin/python src/validate_alignment.py   # gate: exits 1 if alignment < 90%
```

`add_actual_results.py` is required — without the outcome fields the frontend
can never resolve a pick, so records and season pages stay empty.

## Tests

```sh
.venv/bin/python -m pytest tests
```
