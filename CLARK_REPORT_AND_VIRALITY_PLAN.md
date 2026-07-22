# Clark Report Rewrite + Virality Restructure — Implementation Plan

Goal: make the Clark Report **reason like a smart friend explaining the game** (not a stats dump), and restructure the whole site so the **non-obvious, transparent insight** is the thing people screenshot and share. Two workstreams: **(A) Explanation quality** (mostly backend text generation) and **(B) UX/IA + virality** (mostly frontend). They are related — the best rewritten sentence from (A) becomes the shareable unit in (B).

Read this whole file before implementing. Work in the phases at the end; verify each in the running app; do not auto-continue across phases.

---

## 0. Current-state audit (what exists today)

### Where the explanation text is generated — `nfl-prediction/src/api.py`
The frontend renders text that is **authored in the backend and baked into `primary-ui/public/predictions.json`** (regenerated via `export_predictions.py` + `add_actual_results.py`). Key generators:

- `build_factor_cards(row, player_ctx)` (~L735) — builds the `factor_cards[]`. Each card = `{ name, advantage_team, raw_edge, contribution_strength, status, reason, why_it_matters, football_translation }`.
- `_factor_reason(...)` / inner `_reason(...)` (~L681, L798) — produces `reason`: a **template string with live numbers plugged in** (e.g. `"ARI holding opponents to -0.109 EPA/play allowed last 3 games. Generates pressure on 12% of dropbacks vs. J.Allen."`).
- `FACTOR_WHY_IT_MATTERS` (dict) — **static, generic, per-factor-name** copy. **`why_it_matters` AND `football_translation` are BOTH just `FACTOR_WHY_IT_MATTERS.get(name)`** (L874–875) → they're identical and generic. This is the core redundancy.
- `game_diagnosis_engine(row)` (~L995) → `football_story`, `primary_reason`, `secondary_reason`, `risk_factor`. `football_story` (~L1118) is a short template summary: *"BUF hold a meaningful edge in Market Edge and Momentum. Weather factor… The market agrees."*
- `build_key_battle`, `build_market_note`, `build_flip_scenarios` — supporting copy.

**The problem, concretely:** the text is **metric-first, comparison-less, and un-synthesized**. It states a number without a baseline ("is -0.109 good?"), without a cause ("why is ARI's defense better lately?"), without an implication ("so on Sunday, expect…"), and without weaving factors together. `why_it_matters`/`football_translation` are generic boilerplate that repeat the stat's definition instead of reasoning about *this* game.

### Data available but under-used (for richer reasoning)
Per game in `predictions.json`: `home_players`/`away_players` (QB/RB names + recent stats), `home_season_record`/`away_season_record`, `home_last3_record`/`away_last3_record`, `weather`, `market_context`, `factor_cards[].raw_edge`, `confidence_score`. Backend also has `player_context.json` and `game_context.json` (season + last-3 splits per team) already loaded — these hold the **baselines** we need ("team avg vs last-3" deltas) but aren't fully surfaced in prose.

### The evidence UX today — `primary-ui/src/components/game-report/`
`GameReport.tsx` order: header → **Your Call** (voting panel) → ThreeWayCompare (You/Clark/Vegas/Fans) → `BeliefTracker` (takeaway + fan sentiment + splits) → **"View the evidence" toggle** → (when open) two-column body: left = `football_story` lede + `FactorList` + `risk_factor`; right = Weather / Stadium / PlayerMatchup / Market panels.

**Nested-dropdown problem the user flagged:** the Clark Report is behind **one** dropdown (evidence toggle), and inside it **each factor** in `FactorList.tsx` has **another** dropdown ("Why does this matter?"), and inside *that* each factor also renders a `ChallengeFactor` community thread. So the "why" — the most valuable, most shareable content — is buried **two-to-three levels deep** and written in the most generic language. That is exactly backwards for virality.

### Virality-relevant surfaces today
- `SignalCard.tsx` + `StoryModules.tsx` (homepage) — insight cards ("Clark and Vegas agree on DET, LA fans don't"), team-colored, one conclusion. Good hooks, but they **link to the game and the reasoning lives elsewhere**.
- `my-season/ShareableWeekCard.tsx` — a screenshot-ready recap **exists** but is only weekly totals; no per-pick "I called this" artifact.
- Fan/community data is provisional (`threeWaySignal.ts`, seeded) — labeled `†`.

---

## WORKSTREAM A — Make the explanation reason in plain English

**Principle:** every explanation is a **claim → evidence → implication** chain, led by the plain-English claim, with the number as *supporting* detail (parenthetical / smaller), and at least one **baseline comparison** ("vs their own season", "vs league average", "vs last week"). Where possible name a **cause** (a player's recent form, a trend) rather than just a correlation.

This is a **text-generation rewrite in `api.py`**, then a regen of `predictions.json`. The model math and `contribution_strength` ordering stay exactly as-is (do not touch the logistic regression). We are rewriting the prose layer only.

### A1. Add a baseline/delta layer to every factor
For each factor, compute and pass into the reason builder:
- **Season baseline** vs **last-3** (already in `game_context`/`player_context`) → a delta + direction word ("sharper", "slipping", "steady").
- **League-average** reference for the metric (precompute per-season league means for EPA/play, success rate, etc. in the export step; store a small `league_baselines` block or inline the comparison result).
- A **percentile or plain adjective** so the number is legible ("elite", "middle-of-the-pack", "bottom-third"), not a raw decimal.

Output a new structured field per factor, e.g. `baseline_note: "ARI's pass defense has tightened sharply — they're allowing 31% less EPA/play over the last 3 weeks than their season average, and that recent stretch ranks top-8 in the league."`

### A2. Rewrite each factor into a single reasoning paragraph
Replace the three near-duplicate fields (`reason`, `why_it_matters`, `football_translation`) with **one coherent paragraph** built from a **cause → evidence → implication** template, plus keep a short one-liner for compact contexts:
- `headline` (≤ ~8 words, plain claim, no jargon): *"Arizona's defense has quietly turned into a problem."*
- `explanation` (2–4 sentences, the paragraph): *cause* ("A healthier front seven has let ARI generate pressure without blitzing…") → *evidence* ("…they're getting to the QB on 12% of dropbacks and cutting EPA allowed by nearly a third over three weeks") → *implication for THIS matchup* ("Against a Buffalo line that's allowed pressure up the middle, that's the kind of edge that shows up on third down").
- Keep `advantage_team`, `status`, `contribution_strength` for the bar.
- **Deprecate** the generic `FACTOR_WHY_IT_MATTERS` boilerplate; only fall back to it if the paragraph builder lacks data.

Implementation: extend `build_factor_cards` / `_factor_reason` with per-factor **paragraph templates** that take (advantage_team, opponent, metric value, baseline delta, league percentile, relevant player name + recent line). One template per factor family (Market Edge, Defensive Edge, EPA/play, Turnover Control, Sack Pressure, QB Efficiency, Recent Form, Rest, Weather, etc.). Templates must degrade gracefully when a value is missing (never emit "undefined").

### A3. Weave a real synthesis lede (`football_story`)
Rewrite `game_diagnosis_engine`'s `football_story` to **connect the top 2–3 factors into one narrative** with tension, not a list:
> "Clark likes Buffalo here, but not for the obvious reason. The market and Josh Allen's recent form point the same way — yet the number Clark keeps coming back to is Arizona's pass rush, which has quietly become top-8 over the last month. It's the one thing that could turn this into a game." 

Rules: name the pick, give the **main** reason, add **one reinforcing** reason, then the **one thing that could go wrong** (ties into `risk_factor`). This is the paragraph that also feeds the shareable card in Workstream B.

### A4. Player-form narrative
Use `home_players`/`away_players` recent stats to generate a **"what changed with a key player"** sentence where the data supports it ("Kyler Murray has thrown for a top-5 EPA over his last three; a year ago this line reads very differently"). Surface poor recent form as a *cause* inside the relevant factor's paragraph, and in `PlayerMatchupCard`.

### A5. Schema + regen
- Add fields to each factor card: `headline`, `explanation`, `baseline_note` (keep old fields during migration for safety, remove after frontend switches).
- Update `primary-ui/src/types/prediction.ts` `FactorCard` type accordingly.
- Regenerate `predictions.json` (run export + `add_actual_results.py`). **⛔ Manual/verify step:** confirm the regen ran and spot-check 3 games' prose for hallucinated numbers before shipping.

---

## WORKSTREAM B — Restructure the site so the insight is the product & it goes viral

**Principle:** the non-obvious, transparent insight is the hook. It must be **visible without digging**, feel like **one self-contained claim + proof**, and produce a **shareable artifact**. Flatten the burial. Lead everywhere with the *claim*, not the percentage.

### B1. Flatten the evidence hierarchy (fix the nested dropdowns)
Current: evidence dropdown → per-factor "Why does this matter?" dropdown → challenge thread. Target:
- **Keep the top-level "View the evidence" toggle** (curiosity gate is correct per product thesis).
- **Inside, do NOT hide the "why".** Each `FactorRow` shows `headline` + full `explanation` paragraph **inline, expanded by default** — no second dropdown for the core reasoning. The bar + status stays.
- Move `ChallengeFactor` (community thread) behind a lightweight, clearly-secondary affordance ("Debate this factor · N") so it doesn't compete with the reasoning. That's the only thing that should collapse.
- Result: **one dropdown to reach the report, zero dropdowns to read the reasoning.**

### B2. Promote a "Clark noticed…" insight card above the evidence gate
Between BeliefTracker and the evidence toggle, add a **single hero insight** built from the top factor's new `headline` + one line of `explanation` — the *non-obvious connection*, stated as a claim, team-colored. This is the "makes connections that aren't obvious" selling point, surfaced **before** anyone opts into the full report. The evidence toggle then reads as "See why / the full breakdown", promising the specific insight rather than generic "evidence".

### B3. Sharpen the evidence-gate teaser copy
Replace generic "View the evidence — why Clark thinks this" with a **specific promise pulled from the data**: e.g. "See the one factor Clark weighted most — and the upset path." Dynamic, per-game, generated from the top factor name + risk factor.

### B4. Per-pick shareable artifact ("I called this")
Extend `ShareableWeekCard` pattern into a **per-matchup share card** generated on pick lock and on resolution:
- Front: your team + conviction, **the one-line Clark insight**, You vs Clark vs Vegas vs Fans, and (if resolved) the outcome + points ("I backed ARI at 85% when Vegas didn't — cashed +35").
- Wordmark + no external dependencies (render to an image/`<canvas>` or a clean static card for screenshotting).
- Surfaced from: the locked "Your Call" panel, the game page, and My Season highlights.
This is the artifact that travels off-platform — the actual viral loop.

### B5. Homepage: make the insight modules carry the reasoning
`SignalCard` / `StoryModules` currently tease and link away. Add the **new one-line `headline`** from the game's top factor to each module so the homepage itself delivers a non-obvious observation ("Clark sees Arizona's pass rush as the hidden edge no one's pricing"), not just a disagreement stat. Keep the click-through to the full report.

### B6. Community/competition as the credibility + bragging layer
- Lead hooks with **crowd-vs-model tension** ("68% of the public is on DAL — against Clark") — already partly present via StoryModules; make it the dominant framing over raw accuracy.
- Surface **"Clark Differential"** and streaks (already computed in `seasonSummary`) on the shareable artifacts, not just in-app — bragging rights that post well.
- Keep accuracy (71%) as a **trust footer**, never the headline.

### B7. IA / navigation coherence
Nav stays Home / My Season / About. But ensure the **reasoning → pick → share** loop is one continuous flow: homepage insight module → game page insight card → vote → reveal + share card → My Season history. Audit each transition for a visible next step (no dead ends). Verify the whole flow at desktop + mobile breakpoints (mobile not yet validated this project).

---

---

## WORKSTREAM C — Game-page visual banner & atmosphere

**Goal (user request):** opening a game breakdown should feel like arriving at a *venue*, not a data card — a layered hero banner: stadium/field imagery, weather reflected in the art *and* the background, optional player imagery, and the whole page tinted toward the **home team's colors** with stronger contrast.

### C0. Reality check on assets (decides what's actually buildable now)
Grounded in the current code/data:
- **Team colors** — full `{primary, secondary, text}` per team in `nflData.ts`. ✅ Free.
- **Logos/remote images** — `TeamLogo` already loads `https://a.espncdn.com/i/teamlogos/nfl/500/{abbr}.png` with a colored-circle fallback, so remote images are permitted. ✅
- **Weather** — `game.weather` = `{temp, wind, surface, roof, stadium, is_outdoor, is_notable, summary}`. ✅ Rich enough to drive art + tint with zero new assets.
- **Stadium** — `public/stadium_meta.json` has `{name, city, dome, capacity, lat, lng, elevation_ft}` but **NO image**. There are **no bundled stadium photos**. → **Do NOT promise real stadium photos.** Use a **stylized SVG stadium/field illustration** (indoor vs open-air chosen from `roof`/`stadium_meta.dome`), tinted to the home team. Real photos = a separate licensing+hosting decision; flag, don't assume.
- **Player images** — `home_players.qb.name` is an **abbreviated name only** (`"J.Allen"`), **no player id**. ESPN headshots need a numeric id. → Headshots require a **backend join** (nflverse roster → `espn_id`, matched on team+season+name) adding `espn_id` to each player object; only then use `https://a.espncdn.com/i/headshots/nfl/players/full/{id}.png`. Until that ships, **fallback to the team logo / jersey-number chip**. Flag as a gated sub-task.

### C1. New component: `GameBanner.tsx` (replaces the current plain matchup header)
Today `GameReport.tsx`'s header is a flat `--surface` card (teams, win-prob number, prob bar, confidence label / FINAL score). Wrap/replace it with a **layered banner** (`position: relative`, fixed responsive height, `overflow: hidden`), stacked back-to-front:

1. **Base tint layer** — a home-team **duotone gradient** (`home.primary` → transparent → `--bg`) as the user described ("half stadium up top fading into a transparent split, same colors"). ⚠️ **Design-rule tension:** the system doc says *no gradients*. The user is explicitly overriding **for this banner surface only** — keep it a single disciplined duotone (2–3 stops, one hue family), not decorative. Note the override in code comments so it isn't "fixed" later.
2. **Stadium/field illustration layer** — a stylized SVG (`StadiumScene.tsx`): open-air grandstand silhouette if `is_outdoor`, enclosed/roof glyph if dome; tinted with home colors, top-anchored, `~15–25%` opacity, masked to fade into the gradient. Optionally a **field SVG** (yard lines, hashes, end zones in each team's color) as a thin strip behind the teams.
3. **Weather atmosphere layer** — `WeatherScene.tsx` SVG driven by `weather`: sun/cloud/rain/snow glyphs + **wind motion lines** when `wind` is high; only shown when `is_outdoor`. The base tint also **shifts with weather** (cold→cooler blue overlay, high wind→streaked, dome→neutral warm). Compositor-friendly only (`opacity`/`transform`), respect `prefers-reduced-motion` (freeze any drift).
4. **Content layer** — existing header content (logos/optional headshots, the big win-prob number, prob bar, records, confidence/FINAL) sitting on a subtle scrim so text stays legible over the art.

### C2. Home-team theming (scoped, contrast-safe)
- Scope a set of CSS custom props on the `GameReport` root via inline `style` (e.g. `--home-accent`, `--home-accent-soft`) derived from `getTeamColors(home)`, and let the banner + section accents read them → the whole breakdown leans into the home identity.
- **Contrast guard (required):** several team primaries/secondaries are light (ARI gold, GB gold, MIN gold, etc.). Add a small luminance helper (`lib/color.ts`) to pick a legible on-color and to darken/scrim behind text so WCAG contrast holds in the dark theme. Never render light-on-light. This is the "increased color contrast" ask done safely.

### C3. Player imagery (gated on C0 backend join)
- If `espn_id` present: show QB headshots (home/away) flanking the matchup, team-color ring (reuse `TeamLogo`'s ring pattern), `loading="lazy"` except the above-fold banner uses eager + `fetchpriority="high"` for the single hero image; explicit `width`/`height` to avoid CLS; `onError` → team-logo fallback.
- If not: keep current `TeamLogo`. `PlayerMatchupCard` (in the evidence body) can also upgrade to headshots under the same gate.

### C4. Performance / correctness constraints
- Banner is above-the-fold: one eager hero image max; everything else lazy. All `<img>` get explicit dimensions. SVG scenes are inline (cheap, themeable, no network).
- Motion stays on `transform`/`opacity`; honor `prefers-reduced-motion`.
- Every asset has a graceful fallback (image fail → tint + logo; missing weather → plain tint; missing stadium meta → generic field). Never a broken-image or empty banner.
- Mobile: banner height scales down, art opacity/detail reduces, content reflows to a compact stack; verify 375/768/1280 (mobile not yet validated in this project).

### C5. Files touched
- New: `components/game-report/GameBanner.tsx`, `StadiumScene.tsx`, `WeatherScene.tsx`, `lib/color.ts` (luminance/contrast helpers).
- Edit: `GameReport.tsx` (swap header for `GameBanner`, scope home-theme vars), `WeatherPanel.tsx`/`PlayerMatchupCard.tsx` (optional headshot upgrade), `types/prediction.ts` (add `espn_id?` if C3 pursued), backend export + `player_context` (add `espn_id` join — gated).
- Reuse: `getTeamColors`, `stadium_meta.json` (`dome`/`name`), `TeamLogo` fallback pattern.

### C6. Open decisions to confirm with user
- **Real stadium photos vs stylized illustration?** (Recommend illustration — no licensing/hosting; photos are a separate sourcing task.)
- **Pursue the backend `espn_id` join for real player headshots now, or ship team-logo placeholders first?**
- **Gradient override** — confirm we intentionally break the "no gradients" rule for this one banner surface.

---

## Phasing (stop + verify after each)

1. **A1–A2 backend prose rewrite** for factor cards (headline + explanation + baseline_note), one factor family at a time; unit-test the template builders (pure functions) with fixture rows; regen a *sample* game and eyeball.
2. **A3–A4** synthesis lede + player-form narrative; regen full `predictions.json`; spot-check for hallucinated numbers.
3. **A5** schema + `FactorCard` type update; keep old fields until B1 lands.
4. **B1** flatten `FactorList` (inline expanded explanation; collapse only the challenge thread) + wire new fields.
5. **B2–B3** "Clark noticed…" insight card + dynamic evidence-gate teaser.
6. **B4** per-pick shareable artifact.
7. **B5–B6** homepage modules carry the headline; competition framing as credibility/bragging layer.
8. **B7** full-flow + responsive audit; remove deprecated fields/boilerplate; typecheck + tests green; screenshot every screen.

## Guardrails
- **Do not touch the logistic-regression model or `contribution_strength` ordering** — prose layer only.
- All generated prose must be **template-driven and degrade gracefully** (never "undefined"/empty); **no fabricated specifics** beyond what the row's numbers support. Provisional/seeded data (fan sentiment) stays labeled `†`.
- Keep the design system (dark, Fraunces/Inter, gold accent, no gradients).
- Any regen of `predictions.json` is a **verify step** — confirm it ran and spot-check before shipping.
- Preserve the full Clark Report depth (factors, weather, stadium, market, players, records, methodology, challenges) — we are **reorganizing and rewriting**, not deleting.
