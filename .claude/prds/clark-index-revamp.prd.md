# The Clark Index — Full Revamp

## Problem

The Clark Index surfaces NFL game predictions but reads like ESPN-lite: generic stat templates, factor cards that sometimes point opposite to the predicted winner, and a homepage that buries analysis under "how the model works" copy. Bettors need to quickly scan a matchup and extract a credible, specific reason to back or fade a team — the current site cannot deliver that in under two minutes.

## Evidence

- **Product owner observation**: Factor cards regularly show advantages for the losing-team pick, undermining credibility with anyone who cross-references the win probability.
- **Observed pattern**: `football_story` and factor `reason` fields are generated from shallow rule templates in `api.py` — they do not use game-by-game granularity (e.g., pressure rate per opponent per week), only season averages.
- **UX observation**: "How the model works" on the homepage causes first-time visitors to disengage before reaching game content.
- Assumption: bettor retention and trust correlate with factor–prediction alignment — needs validation post-launch via qualitative feedback.

## Users

- **Primary**: NFL bettors — arrive pre-game, want to understand *why* a team is favored, compare the model's read against the Vegas line, and leave with a clear rationale in under 2 minutes.
- **Secondary**: Engaged NFL fans who want analysis beyond box scores and want to learn what the stats mean in context.
- **Not for**: Casual score-checkers, fantasy managers (different data need), stat researchers (no raw data export).

## Hypothesis

We believe **matchup-specific game reports backed by game-by-game backend data and presented in a visually credible editorial layout** will make The Clark Index a trusted pre-game analysis tool for bettors. We'll know we're right when:
- Factor direction aligns with predicted winner in ≥90% of reports
- A bettor can read a game report and extract a clear rationale in <2 minutes (qualitative test)
- "Feels like ESPN" is not mentioned in any user feedback session

## Success Metrics

| Metric | Target | How measured |
|---|---|---|
| Factor–prediction alignment | ≥90% of games | Automated check: factor advantage team = predicted winner for top 2 factors |
| Report scan time | <2 min to extract rationale | Manual user test (3–5 bettors) |
| Backend data coverage | 100% of 2024 games have game-by-game pressure + wind stats | Script validation at export |

## Scope

### MVP — ship together as one release

**Backend data pipeline**
- Integrate nflverse / nflfastR data sources (GitHub: `nflverse/nflreadr`, `nflverse/nflfastR`) for game-by-game granularity
- Compute per-game pressure rate (`qb_hit`, `was_pressure`, `sack` per dropback) for each team × each opponent week
- Compute wind impact score: correlate pass EPA delta with wind speed buckets (calm / moderate / high / severe) across historical games — output as a labelled tier, not a raw number
- Fix factor–prediction alignment: factor `advantage_team` must be derived from the same direction as the logistic regression coefficient, not independently normalized
- Elevate player context: last-3-game EPA trend per QB, top RB carry trend, pressure rate *faced* vs. *generated* as a matchup pair
- Methodology content moves to static export (powers `/about` page) — not regenerated per game

**Game report page redesign**
- Horizontal layout — use full viewport width; no single-column prose walls
- Hybrid bullet + visual structure per factor: one sharp headline sentence + supporting bullet(s) + inline mini-chart or stat bar where the data justifies it
- Weather panel: visual treatment (wind speed arc, temperature chip, precipitation icon) + computed consequence label ("High wind: passing efficiency historically drops 18% in games above 20 mph")
- Stadium panel: static stadium image + city / surface / roof type — sourced from a curated static asset set
- Player breakdown: QB vs. opposing pass-rush matchup card, RB vs. box-density card — rule-generated analysis sentence per card
- Factors must visually connect to the win probability number (shared color language, not independent display)

**Home page**
- Game index only: week picker strip + game cards
- No "how the model works" content on home
- Game cards: team logos, win probability, top factor headline, confidence label — click navigates to game report
- No hero featured-game section — let the game index lead

**About page (`/about`)**
- Methodology: expanding-window backtesting explained, feature list, accuracy table
- Glossary: stat definitions currently in AppLayout

**Visual direction**
- Reference A (Ruckus): editorial bones — bold left-aligned type, full-bleed player imagery, black/white structure, strong typographic hierarchy
- Reference B (SecureDeep): data intelligence interior — dense metric panels, micro-charts, purposeful status labeling
- Target: Ruckus shell, SecureDeep interior — editorial home, intelligence game report
- No gradients
- No centered hero patterns
- CSS: targeted refactor — reduce generic utility-soup, introduce intentional CSS custom properties for new design tokens; not a full Tailwind removal
- Brand identity: open to evolution from "The Clark Index" based on visual direction

**Out of scope**

- Walkthrough / guided mode — deferred; available as optional future toggle
- Live 2025 season data — 2024 static dataset only for this release
- LLM-generated prose — rule-based generation only for MVP
- Full Tailwind removal — targeted refactor only
- Mobile-first optimization — desktop-first given bettor use case; responsive but not mobile-lead

## Delivery Milestones

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Backend data pipeline | nflverse integration, game-by-game pressure + wind impact, factor-alignment fix, regenerated predictions.json | in-progress | `.claude/plans/clark-index-revamp.plan.md` |
| 2 | Game report redesign | Horizontal layout, weather panel, stadium panel, player matchup cards, factor display aligned to prediction | in-progress | `.claude/plans/clark-index-revamp.plan.md` |
| 3 | Home + About pages | Clean game index home, /about with methodology + glossary | in-progress | `.claude/plans/clark-index-revamp.plan.md` |
| 4 | Visual system | Design tokens, typography, no-gradient color system applied consistently | in-progress | `.claude/plans/clark-index-revamp.plan.md` |

## Open Questions

- [ ] Does `nflfastR` PBP include a reliable `was_pressure` boolean or does pressure need to be proxied from `qb_hit + sack`? (verify column availability before pipeline build)
- [ ] Stadium image source: static curated set in `public/stadiums/` vs. third-party API? Licensing constraints?
- [ ] LLM player analysis: rule-based sentences are MVP — flag for Phase 2 upgrade path?
- [ ] Wind impact score: static at export time (correct for 2024 historical data) — note this needs rethinking for live 2025 use
- [ ] Factor–prediction alignment root cause: is it that `build_factor_cards()` normalizes independently of logistic regression weights, or that the feature set diverges? Needs code audit before pipeline work starts.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| nflverse pressure data not game-by-game for all seasons | Medium | High — core narrative feature breaks | Fall back to down-and-distance proxy; flag in report |
| Factor alignment fix requires model retraining | Low | High | Audit `api.py` coefficient direction before touching model |
| Stadium image licensing | Medium | Low | Use CC-licensed sources or generate schematic SVGs |
| All-together scope causes timeline slip | Medium | Medium | Backend pipeline (Milestone 1) can ship to static JSON independently; frontend follows |

---
*Status: DRAFT — requirements only. Implementation planning pending via /plan.*
