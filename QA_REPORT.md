# NFL Matchup Lab — QA & Hardening Report

**Date:** 2026-05-21  
**Scope:** `nfl-prediction/src/api.py` · `nfl-frontend/public/predictions.json` · `nfl-frontend/src/App.jsx`  
**Data:** 285 games, 2024 season, 1,710 factor cards (6 per game)  
**Model:** Logistic Regression pipeline · accuracy 71.2%

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 BUG — incorrect output | 3 |
| 🟠 DEFECT — degraded quality / waste | 4 |
| 🟡 EDGE CASE — logic gaps | 5 |
| 🔵 HARDENING — missing guards | 4 |

---

## 🔴 BUGS (incorrect output)

### BUG-01 · Playoff round labels are wrong

**Location:** `api.py → week_label()`

**What's happening:**  
Only Week 22 is mapped to "Super Bowl". Weeks 19, 20, and 21 fall through to the generic `"Week N"` template.

**Observed:**
```
Week 19 → "Week 19"    (should be "Wild Card")
Week 20 → "Week 20"    (should be "Divisional")
Week 21 → "Week 21"    (should be "Conference Championship")
Week 22 → "Super Bowl" ✓
```

**Fix:**
```python
PLAYOFF_LABELS = {19: "Wild Card", 20: "Divisional", 21: "Conference Championship", 22: "Super Bowl"}

def week_label(week: int) -> str:
    return PLAYOFF_LABELS.get(week, f"Week {week}")
```

**Impact:** All headline and UI week labels for 48 playoff games display incorrectly.

---

### BUG-02 · All 285 headlines use the exact same template

**Location:** `api.py → game_diagnosis_engine() → headline`

**What's happening:**  
Every game headline follows the pattern `"X lean: Y% win probability"` regardless of game context (blowout, toss-up, upset alert, divisional grudge match, etc.).

**Observed (sample):**
```
"Strong lean: 73% win probability"
"Strong lean: 78% win probability"
"Slight lean: 52% win probability"
```

**Fix:** Use confidence tiers, upset flags, and contextual data to vary the headline:
```python
def build_headline(winner: str, prob: float, is_div: bool, upset: bool, conf: str) -> str:
    if upset:
        return f"Upset alert: {winner} at {prob:.0%} despite market lean"
    if is_div:
        return f"Divisional battle: {winner} hold the edge at {prob:.0%}"
    if conf == "High":
        return f"Clear edge: {winner} at {prob:.0%}"
    if conf == "Low":
        return f"Coin flip — slight {winner} lean at {prob:.0%}"
    return f"Moderate lean: {winner} at {prob:.0%}"
```

**Impact:** The headline field is vestigial — every card looks the same, defeating its purpose.

---

### BUG-03 · Factors with score 0.0 produce misleading "Even" reason text

**Location:** `api.py → build_factor_cards()`

**What's happening:**  
14 factor cards have `score = 0.0` because their underlying differential value is exactly zero (teams are perfectly matched on that metric). The reason text currently falls through to a generic template that includes the word "Even", but the card's status is still `NEUTRAL` and the score reads `0.0 / 10` — which looks broken rather than intentional.

**Observed:** 14 / 1,710 factor cards affected.

**Fix:** Explicitly detect the zero-differential case and return a purpose-built reason:
```python
if abs(diff) < 1e-6:
    return FactorCard(label=label, score=0.0, status="NEUTRAL",
                      home_value=home_val, away_value=away_val,
                      reason=f"Teams are statistically even on {label}",
                      direction="neutral")
```

**Impact:** These cards are confusing in the UI — a `0.0` score with vague reason text signals a bug to users.

---

## 🟠 DEFECTS (degraded quality / waste)

### DEFECT-01 · `model_meta` and `trust_metadata` duplicated 285 times in JSON

**Location:** `export_predictions.py` · `predictions.json`

**What's happening:**  
Both `model_meta` (fields: model, version, accuracy, season_mode, generated_at) and `trust_metadata` (fields: model_accuracy, sample_size, backtest_note, data_source, confidence_note) are embedded in every game object. They are identical for all 285 games.

**Measured overhead:**
```
model_meta per game:     ~810 bytes × 285 = ~231 KB
trust_metadata per game: ~863 bytes × 285 = ~246 KB
Total avoidable waste:   ~477 KB (~13% of the 3.7 MB file)
```

**Fix:** Hoist both to a top-level `meta` key in the JSON envelope:
```json
{
  "meta": { "model_meta": {...}, "trust_metadata": {...} },
  "games": [ ... ]
}
```
Update `App.jsx` to read `data.meta` and `data.games` instead of `data` directly.

**Impact:** Unnecessary payload size; any change to model metadata requires regenerating the entire file.

---

### DEFECT-02 · 57 / 285 games (20%) use fallback `primary_reason`

**Location:** `api.py → game_diagnosis_engine()`

**What's happening:**  
When no factor card reaches `DECISIVE` status for the predicted winner, `primary_reason` falls back to a generic template. This affects 1 in 5 games — low-confidence matchups where the engine has the least to say but produces the most generic output.

**Observed:** 57 games have the fallback text; these are clustered in the Low/Medium confidence tiers.

**Fix (two options):**  
Option A — Lower the DECISIVE threshold for close games (e.g., use p60 instead of p75 when `conf == "Low"`).  
Option B — Use the highest-scoring factor card regardless of tier, with adjusted language:
```python
best_card = max(winner_cards, key=lambda c: c["score"])
primary_reason = f"Best edge: {best_card['label']} — {best_card['reason']}"
```

**Impact:** Affects 57 game detail pages; users get boilerplate explanations for the games that are actually the most interesting (close calls).

---

### DEFECT-03 · 91 / 1,710 factor cards (5.3%) are capped at score 10.0

**Location:** `api.py → build_factor_cards() → score calculation`

**What's happening:**  
The score scale `min(abs(diff) / max_val * 10, 10.0)` uses fixed `max_val` thresholds per metric. 91 cards saturate the cap, meaning extreme values are indistinguishable from moderate ones on the 0–10 scale.

**Example:** EPA differential of 0.139 with `max_val=0.2` → score `6.95`. But 0.19 and 0.25 both score `10.0` — no differentiation above the cap.

**Fix:** Calibrate `max_val` using the 95th percentile of historical differentials rather than hand-tuned constants:
```python
# In a preprocessing step:
max_val = df["diff_season_epa_per_play"].abs().quantile(0.95)
```

**Impact:** High-scoring games all look identical on the factor cards; the visual differentiation collapses at extremes.

---

### DEFECT-04 · `contribution_percentiles()` uses `math.ceil()` — inflates low ranks

**Location:** `api.py → contribution_percentiles()`

**What's happening:**  
The function computes `math.ceil(rank / n * 100)` for percentile assignment. For the lowest-ranked item (rank=1) in a 6-card set, this returns `ceil(1/6 * 100) = ceil(16.67) = 17`, not the conventional `0` or `1`. Every factor is inflated by up to one percentile step.

**Also:** With only 6 data points per game, percentile thresholds (p25, p50, p75) land on exact rank boundaries. Ties are not broken — two equal scores get different percentiles based on sort order.

**Fix:**
```python
import scipy.stats
percentile = scipy.stats.percentileofscore(scores, score, kind='mean')
```
Or use `numpy.percentile` on the score array to compute thresholds before assigning status.

**Impact:** Mild systematic inflation of factor status; DECISIVE cards slightly overrepresent at the margin.

---

## 🟡 EDGE CASES (logic gaps)

### EDGE-01 · `home_field` advantage is baked into `spread_line` — double-counted

**Location:** Feature set: `spread_line` + `home_field` (binary flag)

**What's happening:**  
Vegas spread lines already price in home field advantage (typically ~2.5 points). Including a separate `home_field = 1/0` binary feature alongside `spread_line` causes the logistic regression to partially double-count the home-field effect.

**Impact:** Model predictions for home teams may be systematically overconfident. Worth testing an ablation: retrain without `home_field` and compare accuracy.

---

### EDGE-02 · Neutral-site games (Super Bowl) are tagged `home_field = 1` for one team

**Location:** `api.py` · `game_training_table.csv`

**What's happening:**  
The Super Bowl and potentially Pro Bowl / neutral-site London games assign `home_field = 1` to whichever team is listed as "home" in the raw data, even when no genuine home advantage exists.

**Fix:** Check `location_neutral` flag from `nflfastR` and set `home_field = 0` for those games.

---

### EDGE-03 · `confidence_score` never approaches 100 — scale is miscalibrated

**Location:** `api.py → game_diagnosis_engine() → confidence_score`

**What's happening:**  
Maximum observed `confidence_score` across all 285 games is 82.3 (CLE@BAL, 91.15% win probability). The scale suggests 100 is reachable but no game comes close. The formula likely has a component that prevents saturation.

**Impact:** The confidence gauge/bar will never display "full" — misleading to users who interpret the scale literally.

**Fix:** Audit the confidence_score formula and either rescale to practical max or document that 80+ = maximum meaningful confidence.

---

### EDGE-04 · `diff_last3_*` features are undefined for games played in Weeks 1–3

**Location:** Feature engineering in `game_training_table.csv`

**What's happening:**  
Rolling last-3-games features (`diff_last3_epa_per_play`, `diff_last3_win_pct`, etc.) cannot be computed for teams that have played fewer than 3 games in the current season. These are likely filled with season-to-date averages or NaN — the fill strategy is not documented.

**Risk:** If NaN propagates into the model pipeline, prediction will fail silently (scikit-learn will return NaN probabilities without raising an exception).

**Fix:** Assert no NaN in feature columns before inference; document the fill strategy in the feature engineering notebook.

---

### EDGE-05 · Banker's rounding on score boundary (Python `round()`)

**Location:** `api.py → build_factor_cards() → score calculation`

**What's happening:**  
Python's built-in `round()` uses banker's rounding (round-half-to-even). A score of exactly 5.5 rounds to 6, but 4.5 also rounds to 4 — not 5. This can cause a factor to shift tier (weak/medium/strong) counterintuitively at exact boundary values.

**Fix:** Use `math.floor()` or explicit threshold comparisons instead of `round()` for tier assignment.

---

## 🔵 HARDENING (missing guards)

### HARD-01 · No error boundary on `predictions.json` fetch failure in frontend

**Location:** `App.jsx → useEffect fetch`

**What's happening:**  
If `predictions.json` fails to load (network error, 404, malformed JSON), the app currently renders a blank screen with no user-visible message. The error is swallowed or logged to console only.

**Fix:**
```jsx
const [error, setError] = useState(null);

fetch("/predictions.json")
  .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
  .then(data => setGames(data.games ?? data))
  .catch(err => setError(err.message));

if (error) return <div className="error-state">Failed to load predictions: {error}</div>;
```

---

### HARD-02 · No probability bounds validation in API response

**Location:** `api.py → get_predictions()`

**What's happening:**  
`home_win_prob` and `away_win_prob` are taken directly from `model.predict_proba()`. While scikit-learn guarantees [0, 1], the API does not validate this before returning. A model swap or pipeline misconfiguration could return out-of-bounds values that downstream UI math (e.g., percentage display, confidence score) would not handle gracefully.

**Fix:**
```python
assert 0.0 <= home_prob <= 1.0, f"Invalid probability: {home_prob}"
away_prob = round(1.0 - home_prob, 4)
```

---

### HARD-03 · Unknown team abbreviation in `NFL_TEAMS` silently returns black (#000000)

**Location:** `api.py → NFL_TEAMS dict lookup`

**What's happening:**  
If a team abbreviation not in `NFL_TEAMS` appears (e.g., a future expansion team, a data quirk like "STL" for old Rams, or a typo), the color lookup returns `#000000` / `#ffffff` defaults with no warning. Currently all 285 games resolve correctly, but this is fragile.

**Fix:**
```python
import logging
if abbr not in NFL_TEAMS:
    logging.warning(f"Unknown team abbreviation: {abbr} — using defaults")
```

---

### HARD-04 · `export_predictions.py` does not validate output before writing

**Location:** `nfl-prediction/src/export_predictions.py`

**What's happening:**  
The script writes `predictions.json` unconditionally. If `get_predictions()` raises mid-run (e.g., model file missing, data schema change), the script may write a partial or empty file, silently breaking the deployed frontend.

**Fix:**
```python
results = get_predictions()
assert len(results) > 0, "No predictions generated — aborting write"
assert all("home_win_prob" in g for g in results), "Missing required fields"
with open(out_path, "w") as f:
    json.dump(results, f)
print(f"✓ Wrote {len(results)} games to {out_path}")
```

---

## Prioritized Fix Order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | BUG-01 Playoff week labels | 5 min | All playoff game cards show wrong round |
| 2 | BUG-03 Score 0.0 reason text | 15 min | 14 broken-looking factor cards |
| 3 | HARD-01 Frontend error boundary | 20 min | Blank screen on load failure |
| 4 | HARD-04 Export script validation | 10 min | Silent data corruption risk |
| 5 | DEFECT-01 Hoist model_meta/trust_metadata | 30 min | 477 KB payload savings |
| 6 | BUG-02 Headline variety | 45 min | Every game headline looks identical |
| 7 | DEFECT-02 Fallback primary_reason | 30 min | 57 games get boilerplate |
| 8 | EDGE-04 Weeks 1–3 NaN risk | 20 min | Silent prediction failure risk |
| 9 | DEFECT-03 Score cap calibration | 1 hr | Better factor differentiation |
| 10 | EDGE-03 Confidence scale miscalibration | 20 min | Gauge never hits visual max |

---

## What's Working Well ✓

- All 285 games have no null values in critical fields
- All home + away probabilities sum to exactly 1.0
- No NaN or Infinity values in any JSON field
- Confidence distribution is reasonable: High 135 / Medium 81 / Low 69
- ESPN logo CDN with graceful fallback covers all 32 current NFL teams
- Vite dev/prod proxy split works correctly
- Model pipeline (StandardScaler + LogReg) is consistent with training artifacts
- Static Vercel deployment architecture is sound

---

*Generated by programmatic analysis of 285 games × 6 factor cards = 1,710 data points.*
