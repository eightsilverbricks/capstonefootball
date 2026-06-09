# Plan: Clark Index — Full Revamp

**Source PRD**: `.claude/prds/clark-index-revamp.prd.md`
**Selected Milestone**: All four (shipped together per PRD scope decision)
**Complexity**: Large

---

## Summary

Three parallel tracks — backend data pipeline, game report redesign, home/about pages — converge into one release. The backend is the critical path: it fixes the factor-alignment bug (no retraining needed), adds game-by-game pressure context from the existing PBP parquet, computes wind impact tiers, and regenerates `predictions.json`. Frontend tracks can prototype in parallel and wire to the new JSON shape once backend ships.

---

## Audit Findings (drive all tasks below)

| Finding | Root Cause | Fix |
|---|---|---|
| Factors contradict predicted winner | `build_factor_cards()` uses season features + arbitrary scale — not model coefficients | Derive `advantage_team` from `coef × scaled_val` summed per factor bucket |
| `was_pressure` absent from PBP | Column doesn't exist in nflfastR 2018–2024 parquet | Proxy: `(qb_hit == 1) OR (sack == 1)` on `pass_attempt` plays |
| `spread_line` coef = **+1.40** | Market is 3× the next feature — dominates prediction | Expose "Market Edge" as an explicit factor card |
| `home_field` coef = **0.000** | No home-field signal in this dataset | Remove from factor display; keep in model |
| `diff_last3_epa_per_play_allowed` coef = **+0.216** | Largest football coefficient | Elevate into its own "Defensive Edge" factor card |
| `export_predictions.py` writes to `nfl-frontend/` | Stale path from old frontend | Update to `primary-ui/public/predictions.json` |

---

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Python data scripts | `src/build_game_context.py` | Read PBP parquet with column subset, group by game_id, write JSON |
| Factor card shape | `src/api.py:700-730` | `{name, advantage_team, raw_edge, contribution_strength, reason, why_it_matters}` |
| React routing | `src/App.tsx:9` | `<Route path="/about" element={<AboutPage />} />` |
| Hook pattern | `src/hooks/usePredictions.ts` | Module-level cache + single fetch |
| CSS tokens | `src/index.css:8-48` | CSS custom properties on `:root` |
| Team colors | `src/data/nflData.ts` | `NFL_TEAM_COLORS[abbr].primary / .secondary / .text` |

---

## Files to Change

### Backend

| File | Action | Why |
|---|---|---|
| `nfl-prediction/src/build_pressure_context.py` | CREATE | Game-by-game pressure rate per team per opponent week |
| `nfl-prediction/src/build_wind_impact.py` | CREATE | Wind impact tier lookup from historical EPA delta by wind bucket |
| `nfl-prediction/src/validate_alignment.py` | CREATE | Assert ≥90% factor–prediction alignment after export |
| `nfl-prediction/src/build_player_context.py` | UPDATE | Add QB last-3 EPA trend + pressure-faced rate |
| `nfl-prediction/src/api.py` | UPDATE | Fix `build_factor_cards()` to use model-derived contributions; enrich reasons |
| `nfl-prediction/src/export_predictions.py` | UPDATE | Fix output path; export `methodology.json` |
| `nfl-prediction/data/processed/pressure_context.json` | GENERATED | Output of `build_pressure_context.py` |
| `nfl-prediction/data/processed/wind_impact.json` | GENERATED | Output of `build_wind_impact.py` |
| `primary-ui/public/predictions.json` | REGENERATED | Re-export with aligned factors + new data fields |
| `primary-ui/public/methodology.json` | GENERATED | Static model metadata for /about page |

### Frontend

| File | Action | Why |
|---|---|---|
| `primary-ui/src/styles/tokens.css` | CREATE | Design tokens: colors, type scale, spacing — no gradients |
| `primary-ui/src/index.css` | UPDATE | Import tokens; strip shadcn variable blob |
| `primary-ui/src/App.tsx` | UPDATE | Add `/about` route |
| `primary-ui/src/pages/AboutPage.tsx` | CREATE | Methodology + glossary |
| `primary-ui/src/pages/GamePage.tsx` | UPDATE | Use new GameReport layout |
| `primary-ui/src/components/GameReport/GameReport.tsx` | CREATE | Horizontal two-column report container |
| `primary-ui/src/components/GameReport/FactorList.tsx` | CREATE | 5 model-derived factor rows |
| `primary-ui/src/components/GameReport/WeatherPanel.tsx` | CREATE | Wind arc + temp chip + consequence label |
| `primary-ui/src/components/GameReport/StadiumPanel.tsx` | CREATE | Stadium image + surface/roof metadata |
| `primary-ui/src/components/GameReport/PlayerMatchupCard.tsx` | CREATE | QB vs. pass-rush card; RB vs. box density |
| `primary-ui/src/components/GameReport/WinProbBar.tsx` | CREATE | Team-colored probability bar tied to factor colors |
| `primary-ui/src/components/AppLayout.tsx` | UPDATE | Remove hero, glossary, model sections |
| `primary-ui/src/components/GameCard.tsx` | UPDATE | Editorial style; show top factor headline |
| `primary-ui/src/components/Header.tsx` | UPDATE | Add About nav link |
| `primary-ui/src/components/HeroSection.tsx` | DELETE | No hero on home page |

---

## Tasks

### MILESTONE 1 — Backend data pipeline

#### Task 1.1 — Fix factor-prediction alignment (`api.py`)

Replace the independent-scaling approach in `build_factor_cards()` with model-derived contributions.

**Steps:**
1. At module load, extract `scaler.mean_`, `scaler.scale_`, `clf.coef_[0]` from the saved model
2. Define `FACTOR_BUCKETS` mapping display names → PRODUCTION_FEATURES subsets:
   ```python
   FACTOR_BUCKETS = {
       "Market Edge":    ["spread_line", "home_moneyline", "away_moneyline"],
       "Recent Offense": ["diff_last3_epa_per_play", "diff_last3_success_rate",
                          "diff_last3_point_diff_pg"],
       "Defensive Edge": ["diff_last3_epa_per_play_allowed",
                          "diff_last3_success_rate_allowed"],
       "Momentum":       ["diff_last3_win_pct"],
       "Game Context":   ["rest_diff", "div_game"],
   }
   ```
3. Per game row: `contribution_i = (val - mean_i) / scale_i * coef_i` for each feature
4. Sum contributions within each bucket → `bucket_score`
5. `advantage_team` = home if `bucket_score > 0`, else away
6. `contribution_strength` = `abs(bucket_score) / max(abs(scores))` across all buckets for this game

**Note on `diff_last3_epa_per_play_allowed`:** Verify sign convention in `build_team_game_stats.py` before coding — coefficient +0.216 with positive = home allows more EPA. If direction is inverted vs. intuition, the model-derived approach still works correctly since we're using the actual coefficient sign.

**Validate:** `python3 src/validate_alignment.py` → ≥90% of games have `factor_cards[0].advantage_team == predicted_winner`

---

#### Task 1.2 — `build_pressure_context.py`

```
Reads:  data/raw/pbp.parquet (qb_hit, sack, pass_attempt, posteam, defteam, game_id, season)
Writes: data/processed/pressure_context.json

Output shape per game_id:
{
  "2024_22_KC_PHI": {
    "KC": {"pressure_generated_rate": 0.28, "pressure_faced_rate": 0.22, "dropbacks": 35},
    "PHI": {"pressure_generated_rate": 0.22, "pressure_faced_rate": 0.28, "dropbacks": 38}
  }
}

Pressure proxy: (qb_hit == 1) OR (sack == 1) on rows where pass_attempt == 1
pressure_generated: defteam perspective (defteam generated pressure on posteam's dropbacks)
pressure_faced: posteam perspective (same rows, from offense's view)
```

**Validate:** Spot-check 3 games; rates between 0.15–0.45 (typical NFL range).

---

#### Task 1.3 — `build_wind_impact.py`

```
Reads:  data/raw/pbp.parquet (wind, temp, roof, pass_attempt, epa, game_id)
Writes: data/processed/wind_impact.json

Wind buckets:
  calm:     0–9 mph
  moderate: 10–19 mph
  high:     20–29 mph
  severe:   30+ mph

For each bucket: median pass EPA vs. calm baseline
Output:
{
  "calm":     {"label": "Calm", "pass_epa_delta": 0.000, "consequence": "No wind impact expected."},
  "moderate": {"label": "Moderate wind", "pass_epa_delta": -0.012, "consequence": "Mild reduction. Negligible impact."},
  "high":     {"label": "High wind", "pass_epa_delta": -0.041, "consequence": "Pass efficiency drops notably. More run-heavy play-calling expected."},
  "severe":   {"label": "Severe wind", "pass_epa_delta": -0.087, "consequence": "Passing severely impacted. Weather becomes a primary game factor."}
}
```

Only applies to games where `roof` is 'outdoors' or 'open'. Domes get tier `"dome"` with consequence `"Indoors — no weather impact."`.

**Validate:** Delta magnitudes increase monotonically from calm → severe.

---

#### Task 1.4 — Update `build_player_context.py`

Add to each QB entry:
- `last3_epa_trend: [float, float, float]` — EPA per attempt for last 3 games chronologically
- `pressure_faced_rate_last3: float` — avg pressure rate faced over last 3 games (join from pressure_context.json output)

Add to each RB entry (if `defenders_in_box` col exists in PBP):
- `avg_box_defenders_last3: float`

---

#### Task 1.5 — Enrich factor reasons in `api.py`

Load `pressure_context.json` and `wind_impact.json` at module startup.

Update `_factor_reason()` per bucket with real numbers:

- **Market Edge**: `"Vegas lines {team} at {spread:+.1f} ({ml:+d}). Market and model {agree/diverge}."`
- **Recent Offense**: `"{team} averaging {epa:+.3f} EPA/play last 3 games. Facing a defense that generates pressure {rate:.0%} of dropbacks."`
- **Defensive Edge**: `"{team} holding opponents to {allowed:+.3f} EPA/play last 3. {opp_qb} faces pressure on {pressure_generated:.0%} of dropbacks."`
- **Momentum**: `"{team} are {last3_record}. {opp} are {opp_last3_record}."`
- **Game Context**: compose from rest_diff, div_game, weather consequence label

---

#### Task 1.6 — Fix `export_predictions.py`

```python
OUTPUT_PATH = REPO_ROOT / "primary-ui" / "public" / "predictions.json"
METHODOLOGY_PATH = REPO_ROOT / "primary-ui" / "public" / "methodology.json"
```

Add `export_methodology()` writing model accuracy, feature labels, glossary definitions.

---

#### Task 1.7 — `validate_alignment.py`

```python
# Load primary-ui/public/predictions.json
# For each game: check factor_cards[0].advantage_team == predicted_winner
# Print: alignment rate, list of misaligned game_ids
# sys.exit(1) if rate < 0.90
```

---

### MILESTONE 2 — Game report redesign

#### Task 2.1 — `tokens.css`

```css
:root {
  --font-editorial: 'Fraunces', Georgia, serif;
  --font-data: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --color-bg: #09090f;
  --color-surface: #111118;
  --color-surface-raised: #18181f;
  --color-border: rgba(255,255,255,0.07);
  --color-border-strong: rgba(255,255,255,0.14);
  --color-text: #f0ece3;
  --color-text-muted: rgba(240,236,227,0.45);
  --color-text-faint: rgba(240,236,227,0.22);
  --color-gold: #c8a96e;

  --color-edge-key: #4ade80;
  --color-edge-notable: #fbbf24;
  --color-edge-slight: #94a3b8;
  --color-edge-even: #475569;
}
```

No gradients anywhere. Depth via surface layering + borders only.

---

#### Task 2.2 — `GameReport.tsx` — horizontal container

```
Desktop (lg+):
┌─────────────────────────────────────────────────────────┐
│  HEADER: logos · probability · top-line story           │
├────────────────────────────┬────────────────────────────┤
│  FACTORS (60%)             │  CONTEXT (40%)             │
│  FactorList                │  WeatherPanel              │
│  Flip scenarios            │  StadiumPanel              │
│                            │  PlayerMatchupCard × 2     │
└────────────────────────────┴────────────────────────────┘

Mobile: single column, Context panels collapse below Factors
```

No modals. No prose walls. Sections separated by `border-top: 1px solid var(--color-border)`.

---

#### Task 2.3 — `FactorList.tsx`

Five factor rows. Each:
```
[●  TEAM]  Factor Name                          Key edge
One sharp headline sentence with real numbers embedded.
• Bullet A with specific stat
• Bullet B if second data point exists
[██████████░░░░░░░░░░]   fill bar, left-aligned
```

- Bar width = `contribution_strength * 100%`
- Bar color = `NFL_TEAM_COLORS[advantage_team].primary`
- "Market Edge" factor: prefixed with a `~` chip labeled "Market read" to distinguish from football stats
- Status: "Key edge" / "Notable" / "Slight" / "Even"

---

#### Task 2.4 — `WeatherPanel.tsx`

```
28°F  ·  18 mph  ·  Natural grass  ·  Open roof
HIGH WIND — pass efficiency drops notably. More run-heavy play-calling expected.
```

- No weather library icons — inline SVG thermometer + wind arrow
- Consequence label shown only for moderate/high/severe tiers (not calm/dome)
- Label color: `var(--color-gold)` for high/severe, `var(--color-text-muted)` for moderate

---

#### Task 2.5 — `StadiumPanel.tsx`

```
[Stadium image 16:9]
Arrowhead Stadium · Kansas City, MO
Natural grass · Open roof
```

- Images: `public/stadiums/{ABBR}.jpg` (home team abbr)
- Fallback: `background-color: {home team primary}; display: flex; align-items: center` with stadium name as text
- v1 ships with color placeholders; real photos added in a follow-up

---

#### Task 2.6 — `PlayerMatchupCard.tsx`

QB card:
```
P. MAHOMES        vs.        J. HURTS
+0.18 EPA/att               +0.22 EPA/att
Pressure faced: 26%         Pressure faced: 22%
[trend sparkline L3]        [trend sparkline L3]
```

RB card:
```
D. HENRY  (KC)              S. Barkley (PHI)
22 carries/gm L3            18 carries/gm L3
```

Sparklines: 3-point SVG path from `last3_epa_trend` array — up/flat/down only, no axis labels.

---

#### Task 2.7 — `WinProbBar.tsx`

```
[KC ████████████░░░░░░░░ PHI]
   60%                   40%
```

- Away fills left, home fills right
- Winner side: full opacity; loser: 0.35 opacity
- Numbers outside bar ends, not overlaid

---

### MILESTONE 3 — Home + About pages

#### Task 3.1 — Strip `AppLayout.tsx`

Remove: `HeroSection`, `GLOSSARY_ITEMS` section, `ModelAccuracy` section.

Add above WeekStrip:
```tsx
<div className="page-identity">
  <h1>The Clark Index</h1>
  <p>2024 season · {totalGames} games analyzed · {accuracy}% model accuracy</p>
</div>
```
Left-aligned, editorial — not centered, not a hero.

---

#### Task 3.2 — `GameCard.tsx` editorial redesign

```
[Away color] ─────────── [Home color]   ← 3px color band
[AWAY]          [vs]         [HOME]
 logo  abbr              abbr  logo

   61%  KC favored
   "Recent form: KC 3-0 L3, PHI 2-1 L3"   ← top factor headline

  ● High                                   ← confidence dot only
```

Bold abbreviations at `1.5rem`. Win probability at `2rem font-editorial`. One-line factor headline in `var(--color-text-muted)`. No "Away" / "Home" sublabels.

---

#### Task 3.3 — `AboutPage.tsx`

Route: `/about`

```
/about
├── The Model
│   ├── Expanding-window methodology paragraph
│   ├── Accuracy table (week ranges + accuracy)
│   └── Feature list (from methodology.json)
├── Glossary
│   └── (cards from current AppLayout GLOSSARY_ITEMS)
└── Data Sources
    └── nflfastR, nflverse, Vegas spreads
```

Sourced from `public/methodology.json` + hardcoded glossary constants.

---

### MILESTONE 4 — Visual consistency pass

#### Task 4.1 — Typography pass
- Display numbers → `var(--font-editorial)` (Fraunces)
- Data labels / stats → `var(--font-data)` (Inter)
- Kill `text-gray-*` Tailwind; replace with `var(--color-text-muted)`
- All-caps labels: `letter-spacing: 0.06em` (not `tracking-widest`)

#### Task 4.2 — Remove all gradients
- Grep: `linear-gradient` across `src/` — replace card backgrounds with flat `var(--color-surface)`
- `radial-gradient` blobs on home — remove
- Probability bar: already replaced by `WinProbBar.tsx`

#### Task 4.3 — Surface depth system
- `--color-bg` → page background
- `--color-surface` → cards, panels
- `--color-surface-raised` → hover state, active panel
- No box shadows except `0 0 0 1px` focus ring

---

## Validation

```bash
# From nfl-prediction/ with venv activated
python3 src/build_pressure_context.py
python3 src/build_wind_impact.py
python3 src/build_player_context.py
python3 src/build_game_context.py
python3 src/export_predictions.py
python3 src/validate_alignment.py   # must exit 0 with ≥90% alignment

# Frontend
cd ../primary-ui
npm run build                        # must exit 0, no TS errors
npm run dev
# Check: localhost:8080 (game index), /game/2024/22/KC/PHI (report), /about
```

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `diff_last3_epa_per_play_allowed` sign direction unclear | Medium | Verify in `build_team_game_stats.py` before coding; model-derived approach correct regardless |
| Alignment still <90% after fix | Low | If it fails, audit NaN-filled rows and market-only games separately |
| Stadium photos licensing | Medium | Ship color placeholders in v1; add photos follow-up |
| CSS token refactor breaks Tailwind utilities | Low | Tokens only change custom property values; Tailwind classes unaffected |

---

## Acceptance

- [ ] `validate_alignment.py` exits 0 — ≥90% factor–prediction alignment
- [ ] All 285 games have `pressure_context` entries
- [ ] All outdoor games have a `wind_tier` label
- [ ] Factor reason text contains real numbers, not template strings
- [ ] Home page: no hero, no glossary, no model section
- [ ] `/about` renders methodology and glossary
- [ ] `/game/2024/22/KC/PHI` renders horizontal layout: 5 factors + weather + stadium + player cards
- [ ] No `linear-gradient` in any component
- [ ] `npm run build` exits 0
- [ ] Top 2 factors point toward predicted winner on the KC vs PHI Super Bowl game

---
*Generated from `.claude/prds/clark-index-revamp.prd.md` — all milestones in-progress.*
