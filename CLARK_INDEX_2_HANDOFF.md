# Clark Index 2.0 — Full Redesign Handoff

You are the Lead Product Designer + Senior Full-Stack Engineer finishing a redesign of **The Clark Index**, an NFL prediction web app. A previous instance completed the groundwork (Phases 1–6 below) and this document hands off the remaining, larger redesign. **Read this entire file before writing any code.** Everything you need is here — do not re-derive it.

Work in small phases. After each phase: state what changed and why, verify in the running app, and stop for the user's approval before the next phase. Do not auto-continue across phases.

---

## 0. Product thesis (do not drift from this)

The product is **watching three forms of football intelligence compete: Clark (a transparent logistic-regression model), Vegas (the market), and NFL Fans (the community) — and the user stakes their own conviction against all three.** Clark is one opinion, not the star. The experience, not model accuracy, is the product. Optimize every screen for: *would someone screenshot this? send it to a friend? return next week?*

Emotional flow, in order: **Curiosity** (open on disagreement, not a schedule) → **Commitment** (pick a winner + drag conviction, blind, before seeing the numbers) → **Validation** (reveal You vs Clark vs Vegas vs Fans + a personalized read of your pick) → **Evidence** (opt into the full Clark Report only if you want the "why"). Transparency is the reward for curiosity, never the entry fee.

---

## 1. Repo layout & how to run

- `primary-ui/` — React 18 + TypeScript + Vite + Tailwind + shadcn/ui. **This is the product.** Path alias `@/` → `primary-ui/src/`.
- `nfl-prediction/` — FastAPI + scikit-learn logistic regression. Generates predictions; not needed at runtime.
- The frontend reads a **static `primary-ui/public/predictions.json`** by default (285 games, 2024 season, weeks 1–22 incl. 4 playoff rounds). If `VITE_API_BASE_URL` is set it calls a live FastAPI `/predictions` instead; unset in production. **You do not need the backend running** to build or verify this redesign — everything runs off the static JSON.
- Run frontend dev server: it's defined in `.claude/launch.json` as **`primary-ui-dev`** on port **8080**. Use the preview/browser tooling to start it (`preview_start` with name `primary-ui-dev`), then verify visually. Never use raw `npm run dev` in a blocking shell.
- Typecheck: `cd primary-ui && npx tsc --noEmit --pretty false` (must be clean before finishing any phase).
- Tests: `cd primary-ui && npm test` (Vitest). Existing suite lives beside `game-report/` components and `competition/scoring.test.ts`.

---

## 2. Design system — PRESERVE exactly

Tokens in `primary-ui/src/styles/tokens.css`, imported by `index.css`. Documented direction: *"Ruckus (editorial bold structure) × SecureDeep (data intelligence panels). Dark, no gradients, intentional hierarchy."* Style everything via inline `style={{ ... }}` referencing these CSS variables (the codebase does NOT use the shadcn HSL Tailwind color tokens for real UI — those are vestigial). Key tokens:

- Surfaces: `--bg #090909`, `--surface #111113`, `--surface-raised #1a1a1d`, `--surface-overlay #222226`
- Borders: `--border-subtle` / `--border-default` / `--border-emphasis` (white-alpha)
- Text: `--text-primary #f0f0f0`, `--text-secondary`, `--text-tertiary`, `--text-muted` (descending alpha)
- Accent: `--accent-gold #c8a96e` (emphasis only, never decoration)
- Fonts: `--font-display` Fraunces (serif; headlines/big numbers), `--font-data` Inter (body/UI), `--font-mono` JetBrains Mono (tabular data)
- Stake semantics already defined: `--stake-positive` (green), `--stake-negative #f87171`, plus `-dim` variants — **use these for points gained/lost.**

Rules: no gradients; reduce dashboard-style boxes and repetitive raw percentages; short editorial copy over long text; compositor-friendly motion only (`transform`/`opacity`); design is dark-only (do not add a light theme — the old `theme-provider` was dead and removed).

**KNOWN GOTCHA:** For Clark's win probability, use `getPredictedProbability(game)` from `@/types/prediction` (returns 0–1). Do NOT use `game.confidence_score` for a probability bar — it's a 0–100 edge magnitude and renders nonsense like "1940%". A prior instance shipped this bug; it's fixed now, don't reintroduce it.

---

## 3. Current state of the code (what exists after Phases 1–6)

### Built this session (reuse these — do not rebuild):
- `src/lib/threeWaySignal.ts` — `gameKey(game)`, `getVegasPick(game)` (real, from `market_context` moneylines, no-vig normalized → `{team, prob}` or null), `getFanPick(game)` (**PROVISIONAL** deterministic placeholder seeded by game id, ~65% biased to agree with Clark; clearly labeled), `getCardInsight`, `getPrePickTeaser` (numbers-free hook shown before a pick), `computeSignal(games)` (picks the most interesting disagreement), plus seeded-RNG helpers.
- `src/lib/viralInsights.ts` — `computeViralInsights(games, excludeKey)` (Most Controversial, Clark vs Vegas, Most Divided Fanbase), `interleaveFeed(games, viral, every=5)`.
- `src/hooks/useUserPicks.ts` — session-only `useSyncExternalStore` store of `{team, confidence}` keyed by `gameKey`. **Currently stores confidence but no stake/points.**
- `src/hooks/useFanIdentity.ts` — favorite team in `localStorage` (device-only), `{team, setTeam, clearTeam}`.
- `src/components/SignalCard.tsx` — homepage "The Signal" hero.
- `src/components/ViralInsightCard.tsx` — dashed-border insight card interleaved into the feed.
- `src/components/FanIdentityPicker.tsx` — team `<select>` in the header.
- `src/components/game-report/ThreeWayCompare.tsx` — the You/Clark/Vegas/Fans bar comparison (`rows`, `size: 'compact'|'large'`; `isProvisional` renders a `†`).

### Modified this session:
- `GameCard.tsx` — blind "Who do you have?" → team buttons → **three tap-chips (Lean/Confident/Lock it in)** → reveal (You/Clark/Vegas/Fans + insight). **⚠️ The tap-chips REPLACED the original conviction slider and dropped the points system. Restoring that is Phase 7 below.**
- `GameReport.tsx` — opens with header + ThreeWayCompare + insight, then Clark Report behind a **"View the evidence"** toggle (report content fully preserved).
- `AppLayout.tsx` — renders SignalCard, then week hero/KPIs, WeekStrip, filter, and the interleaved game+viral feed. Contains a legend line for the `†` provisional fan tag.
- `Header.tsx` — nav is now just **Games / About**; FanIdentityPicker on the right.
- `App.tsx` — routes: `/`, `/game/:season/:week/:away/:home`, `/about`, `*`. `/compete` and `/leaderboard` removed.
- `NotFound.tsx`, `Footer.tsx` — restyled onto real tokens; Footer gradient removed.

### Deleted this session (do not resurrect): `HeroSection.tsx`, `ModelAccuracy.tsx`, `theme-provider.tsx`, `ui/sonner.tsx`, `pages/MakeYourCasePage.tsx`, `pages/LeaderboardPage.tsx`, `competition/ConfidenceSlider.tsx`, `competition/WeeklyRecapCard.tsx`, and the dead `GLOSSARY_ITEMS` array. (`ClarkReport.tsx`/`GameDetailModal.tsx` were deleted before this session.)

### Still present & IMPORTANT to reuse:
- `src/competition/scoring.ts` — **the trust mechanism; pure, tested. Reuse verbatim.** API:
  - `GAME_CREDIT_CAP = 50`, `MIN_CONFIDENCE = 0.5`, `MAX_CONFIDENCE = 1.0`
  - `stakeFromConfidence(conf)` → `50*(2*conf−1)`, in `[0,50]`
  - `resolvePick(pick, actualWinner)` → `+stake` if backed team won, `−stake` if lost, `0` if conf 0.5 or no winner
  - `weeklyNet`, `clarkScore`, `clarkDifferential`, `biggestCorrectStake`, `creditsAtRisk`, `meanConfidence`
  - `indexConfidenceFromScore(confidenceScore)` → maps model's `confidence_score` into slider-space `[0.5,1.0]` (use for the "Index/Clark" position so it's derived from real model output, not invented)
  - `stakePreview(pick)` → e.g. `"+35 if BUF wins · −35 if not"`
- `src/competition/types.ts` — `Pick {team, confidence}`, `EntityKind`, `CompetitionGame`, `FactorChallenge`, etc.
- `src/hooks/useCompetitionData.ts` + `src/mocks/competitionFixtures.ts` — still used ONLY by `competition/ChallengeFactor.tsx` (the "Challenge this factor" threads inside `FactorList`). Leave intact; don't wire new features to the mock leaderboard users.

### Data shape (`predictions.json`, per game — key fields):
`game_id, season, week, week_label, game_date, weekday, gametime, game_type, home_team, away_team, predicted_winner, home_win_prob, away_win_prob, confidence_label (High/Medium/Low), confidence_score (0–100 edge), factor_cards[] (coefficient-aligned: name, advantage_team, raw_edge, contribution_strength, status, reason, why_it_matters, football_translation), football_story, risk_factor, market_note, market_context {market_used, home_moneyline, away_moneyline, spread_line, ...}, home_players/away_players (QB/RB), weather, home_season_record, away_season_record, home_last3_record, ...`

Helpers in `src/types/prediction.ts`: `getPredictedProbability`, `getWinnerProb`, `getConfidenceScore`, `getTopFactors`, `toPercent`. Team colors: `getTeamColors(abbr)` from `@/data/nflData` → `{primary, secondary, text}`.

---

## 4. ⚠️ Blocker to resolve WITH THE USER before My Season / resolution

`predictions.json` contains **predictions only — no actual game outcome field.** So "after games finish, resolve You/Clark/Vegas/Fans correct/incorrect and award/remove points" and the "My Season" W/L history **cannot be computed from current data.**

Two options — **ask the user which before building anything resolution-dependent:**
- **(A) Export real 2024 results.** Add an `actual_winner` (and final scores) field to each game via the `nfl-prediction` backend (nflverse schedules have 2024 outcomes) and re-run the static export to `primary-ui/public/predictions.json`. This makes My Season real. Requires a small backend task + regen.
- **(B) Pending-only.** Build My Season and resolution around **potential/at-risk points only**, clearly marking every pick "pending — result not yet in," no fabricated W/L. Honest and consistent with the transparency value; ships with zero backend work.

Default recommendation if the user is unsure: **(A)** — resolution is core to the point of "who ends up being right," and the data is historical so real outcomes exist. But do not assume; confirm.

---

## 5. THE REDESIGN SPEC (target state — implement this)

Redesign The Clark Index as one cohesive, visual-first experience centered on live football belief, user conviction, transparency, and season-long competition.

**Homepage** — must feel active, not a schedule. Open with a compact set of **large editorial modules generated from the week's data**: the game where Clark/Vegas/Fans disagree most; the prediction gaining or losing the most support; the most divided fanbase; the boldest public call. Present these as **visual stories** using movement, contrast, team identity, and short conclusions — NOT plain percentages or generic labels. Below, the selected week's matchups in a clean feed.

**Game card** — teams + one meaningful story about the matchup; user chooses a winner and **drags a center-anchored conviction slider toward that team; greater conviction = larger possible point gain/loss under the existing Clark Competition scoring** (`scoring.ts`). After the pick locks, immediately reveal the user's position beside Clark, Vegas, and the fan consensus, with a **personalized interpretation** (followed the crowd / sided with Clark / opposed Vegas / bold minority call). The card then opens the full game page.

**Game page** — begins with a polished visual comparison of **You, Clark, Vegas, Fans**; the user's locked pick + potential points; **changing fan sentiment over time**; team and fanbase splits; and one concise takeaway explaining the central conflict. A prominent **View Evidence** button expands the existing **Clark Report** without removing depth — retain: Clark's win %, factor cards tied to model coefficients, why each factor matters, risk/upset paths, player comparisons, weather, stadium, market context, records, methodology, factor challenges.

**Competition system** — NOT a disconnected mode. Picks, sliders, points, results embedded in every matchup. A **small persistent user summary in the header/account menu** shows weekly points, season score, Clark Differential, record, current streak. After games finish, each matchup resolves You/Clark/Vegas/Fans correct/incorrect, awards/removes points by conviction, and flags notable outcomes (successful minority pick, overconfident miss). *(Gated by the §4 decision.)*

**My Season page** — replaces the old standalone competition/leaderboard. A simple **visual history** of weekly scores, performance vs Clark and Vegas, strongest calls, biggest misses, streaks, prediction tendencies, and a **compact weekly result card designed for sharing.** Fanbase comparisons + an optional lightweight rankings section may appear here without dominating.

**Fan identity** — user selects a favorite team, attached to their picks, enabling comparisons: which fanbases are most accurate, overconfident, divided, or consistently opposed to Clark. (`useFanIdentity` already stores the team; extend to attach team to each submitted pick and drive the comparisons.)

**Navigation** — minimal: **Home, My Season, About.** All detailed interaction stays inside the matchup flow.

**Preserve:** dark editorial design, typography, gold accent, transparency, mathematically grounded model explanations. **Reduce:** dashboard-like boxes, repetitive percentages, long homepage text, disconnected routes.

**About page:** leave empty for now.

---

## 6. Recommended execution order (phase-by-phase, stop after each)

Highest-attention gap first. Confirm the §4 decision before Phase 9.

**Phase 7 — Conviction slider + points on the game card (the priority).**
Replace the three tap-chips in `GameCard.tsx` with a **center-anchored conviction slider** (drag toward a team). Extend `useUserPicks` to store `{team, confidence}` where `confidence ∈ [0.5,1.0]` and expose potential points via `stakeFromConfidence`. Show a live stake preview ("+35 / −35") as they drag. On lock, reveal You/Clark/Vegas/Fans (Clark's confidence via `indexConfidenceFromScore(game.confidence_score)`) plus a **personalized interpretation** string (crowd / Clark / anti-Vegas / bold minority — write a small pure helper for this, e.g. in `threeWaySignal.ts` or a new `lib/pickReading.ts`). Build the slider as an accessible `<input type="range">` styled to the design system (a transparent range over a custom track, same approach the deleted `ConfidenceSlider` used — reconstruct it). Keep the blind-before-reveal sequencing: no Clark/Vegas/Fan numbers visible until the pick is locked.

**Phase 8 — Header season summary + persistent identity.**
Add a compact summary in the header (or an account menu): weekly points, season score, Clark Differential, record, streak — derived from `useUserPicks` across all locked picks via `scoring.ts`. Wire `useFanIdentity` so each pick carries the user's team. (Season score/record/streak that depend on resolution are gated by §4 — if (B), show weekly *potential* points + pick count instead of W/L.)

**Phase 9 — My Season page + nav.**
New route `/my-season` and nav becomes **Home / My Season / About**. Visual season history (weekly scores, vs Clark/Vegas, strongest calls, biggest misses, streaks, tendencies) + a shareable weekly result card + optional lightweight fanbase rankings. Respects the §4 decision (real results vs pending-only).

**Phase 10 — Game page upgrades.**
Add locked pick + potential points, a **fan-sentiment-over-time** visual (this needs a time series — if none exists, generate a clearly-labeled provisional seeded series in `threeWaySignal.ts`, same honesty pattern as `getFanPick`), team/fanbase splits, and the one-line takeaway. Keep the View Evidence toggle and the full report intact.

**Phase 11 — Homepage editorial modules.**
Elevate the top of the homepage from the single SignalCard to a **compact set of large editorial story modules** (disagreement / biggest support swing / most divided fanbase / boldest public call), visual and team-colored, short conclusions. Reuse/extend `computeViralInsights`. "Support swing over time" again needs a provisional time series (label it). Keep the matchup feed below.

**Phase 12 — Resolution + polish.**
If §4 = (A): resolve each matchup (You/Clark/Vegas/Fans correct/incorrect), award/remove points, flag notable outcomes. Final screenshot-test pass on every screen; remove any now-dead code; run typecheck + tests.

---

## 7. Working rules

- Reuse before rebuilding; prefer refactor over replace; keep components modular and reasonably small.
- Every color/type decision flows from the tokens in §2. No gradients. No light theme.
- All new provisional/placeholder data (fan sentiment, time series) must be **deterministic (seeded by game id)** and **clearly labeled in UI and comments** as provisional — never presented as real community data. The real-persistence backend is explicitly out of scope.
- If any step needs something outside the repo (database, auth, Vercel, env vars, DNS, API keys, hosting), **STOP** and output a `⛔ Manual Step Required` section (why, exactly where to go, what to click/enter), then wait for the user to reply "done." Do not assume it's done.
- After each phase: typecheck clean, verify the change live in the `primary-ui-dev` preview (screenshot the relevant screen, check console for errors, exercise the interaction), then summarize what changed / why / risks / next phase and **wait for approval.**
- Commit only if the user asks; if so, branch off `main` first, conventional-commit messages.

---

## 8. Definition of done (whole redesign)

Homepage reads as "this week's NFL conversation," not a schedule, understandable in under 5 seconds. One cohesive experience, no disconnected routes. Conviction slider + points embedded in every matchup, with immediate personalized reveal. Header shows a live season summary. My Season replaces the old competition/leaderboard with a shareable visual history. Fan identity drives fanbase comparisons. Clark Report fully preserved behind View Evidence. Every major screen has at least one genuinely screenshot-worthy element. Nav = Home / My Season / About. Typecheck clean, tests green, no console errors.
