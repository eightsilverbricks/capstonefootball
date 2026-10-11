# The Clark Index Production UI Implementation Plan

## Implementation status

Implemented in sequence on 2026-09-02. The production scope now includes the
data-contract fixes, 2026 kickoff metadata, the Crimson/Roboto/Spicy Rice design
system, concise landing and About routes, team-first Games browsing, the
full-width always-expanded report, supplied Clark Index branding, favorite-team
profile settings, route-level resilience, code splitting, accessibility basics,
and production dependency hardening.

Release verification completed:

- Backend: 50 tests passing.
- Frontend: 308 tests passing across 37 files.
- ESLint: zero errors and zero warnings.
- Production build: successful; initial JavaScript is 445.68 kB minified.
- Production dependency audit: zero known vulnerabilities.
- Browser QA: Home, Games, My Season, About, Settings, and Game Report pass at
  desktop and 390 px mobile widths with no horizontal overflow or console errors.
- Static export: 272 live-season games and 285 completed demo games validated.

## Product direction

This is a redesign-overhaul of a consumer NFL analytics product for fans and a potential media buyer. The target is a dark, broadcast-scoreboard interface with StatMuse-inspired modular widgets, Crimson Red brand emphasis, and controlled playful character art.

Design dials:

- Design variance: 5/10. Structured, with occasional asymmetry for feature content.
- Motion intensity: 3/10. Hover, focus, active, and simple state transitions only.
- Visual density: 7/10. Score-first and data-rich, without turning every item into a card.

The reference images should guide hierarchy, contrast, compact score presentation, and modular report widgets. They should not be copied literally. The current product only has four primary destinations, so a large permanent side rail would waste space. The production shell should keep a compact top navigation and give the game and report content the full viewport width.

## Audit summary

### What is working

- The main app is clearly isolated in `primary-ui`; `nfl-frontend` is legacy.
- The data model already carries team identity, predictions, final scores, weather, players, pregame records, date, weekday, and kickoff-time fields.
- Supabase profile updates already support `favorite_team`.
- Loading, empty, and error states exist on the core game surfaces.
- The responsive layouts do collapse to one column without obvious horizontal page overflow.
- Baseline validation is healthy: 34 test files and 303 tests pass; the production build completes.
- The bobblehead/founder art is distinctive and should remain part of the brand.

### Critical production blockers found outside the requested visual list

1. **Market explanation integrity:** the 2024 LA at DET report says “The market leans Even,” also says Detroit is a 5-point favorite, and assigns the favorite a 35% implied probability. The factor explanation is using the factor contribution’s `advantage_team` when it should use the actual market favorite and that team’s moneyline.
2. **Live schedule completeness:** all 272 records in `primary-ui/public/predictions.json` have `game_date`, `gametime`, `stadium`, and team records set to `null`. The UI cannot add trustworthy date/time or team browsing until the 2026 export is enriched.
3. **Kickoff countdown:** `LIVE_SEASON_KICKOFF` is midnight UTC on September 9, not the actual kickoff timestamp. Countdown copy can therefore be almost a day early.
4. **Silent development dependency:** `primary-ui/.env.local` points the UI at FastAPI even though repository documentation says the static JSON is the default. The entire games page fails with “Failed to fetch” when the optional API is not running.
5. **Scroll restoration:** React Router navigation can open a game report at the previous page’s scroll position.
6. **Production authentication fallback:** if Supabase variables are absent, production silently uses a device-local account system. A real deployment should fail closed or disable account actions instead of pretending signup succeeded.
7. **Admin exposure:** `/admin` and its passphrase are shipped in the client bundle. It is explicitly not a security boundary and must not ship as a production administration surface.
8. **Missing social asset:** `index.html` references `/og.jpg`, but that file is absent.
9. **Performance:** the main JavaScript bundle is 688.64 kB minified (195.94 kB gzip) and Vite reports the chunk-size warning. Routes are not code-split.
10. **Quality warnings:** lint has 10 warnings, including missing hook dependencies in `GamesView` and `usePredictions`.

## Design system specification

### Color

Use one brand accent across the product:

| Token | Value | Use |
|---|---:|---|
| `--bg` | `#0E0E10` | Page background |
| `--surface-1` | `#17171A` | Primary widgets |
| `--surface-2` | `#202024` | Selected/raised states |
| `--surface-3` | `#29292E` | Menus and active controls |
| `--text-1` | `#F5F5F3` | Primary text |
| `--text-2` | `#B9B9BE` | Supporting text |
| `--text-3` | `#85858C` | Metadata that still passes contrast |
| `--brand-crimson` | `#C8102E` | Active navigation, CTAs, focus, selected states |
| `--brand-crimson-soft` | `rgba(200,16,46,.16)` | Selected background only |
| `--positive` | `#4BC27A` | Correct/win semantics only |
| `--warning` | `#E0A83C` | Warnings only |
| `--negative` | `#E45C63` | Errors/losses only |

Team colors may appear inside team logos and a 3 px team identity rule. They must not become page backgrounds, gradients, or competing CTA colors.

### Typography

- Roboto: body copy, navigation, buttons, forms, labels, and data.
- Spicy Rice: the Clark Index wordmark and a small number of display moments only. Never use it for scores, long headlines, or explanatory text.
- Numeric content: Roboto with tabular numerals (`font-variant-numeric: tabular-nums`). A third font is not needed.
- Self-host WOFF2 assets with `font-display: swap`; remove the production Google Fonts `@import`.
- Default body size is 16 px, metadata never below 12 px, and key scores/probabilities use a compact 28-44 px range depending on viewport.

### Shape and spacing

- Widget radius: 14 px.
- Controls and inputs: 8 px.
- Pills only for short semantic status such as `Final`, `Live`, or `TBD`.
- Page gutter: 16 px mobile, 24 px tablet, 32 px desktop.
- Product pages use the full available width up to 1728 px. The game report should not use the current narrow `max-w-5xl` treatment.
- Use cards only for real widget boundaries. Use spacing and dividers within a widget.

### Motion

- No ambient animation, floating artwork, shimmer decoration, parallax, or scroll hijacking.
- Use 120-180 ms transitions for hover, press, focus, selection, and disclosure state.
- Respect `prefers-reduced-motion`.
- Route changes scroll to the top and move focus to the page heading.

## Implementation sequence

### Phase 0: production data and trust prerequisite

This phase must merge before the visual work because the new UI will surface these claims more prominently.

#### Backend and export work

- Fix market-factor prose so the displayed market favorite, spread sign, moneyline, and implied probability all describe the same team.
- Treat a neutral model contribution as neutral contribution, not a pick'em betting line.
- Add invariant tests:
  - A negative moneyline always produces implied probability above 50%.
  - The favorite named in prose matches `market_context.market_favorite`.
  - A 5-point favorite can never be described as `Even`.
  - Model/market disagreement copy only appears when the predicted winner and market favorite differ.
- Enrich the 2026 schedule from the current nflverse/NFL schedule before export. `game_date`, `weekday`, `gametime`, `stadium`, and location must be present when announced.
- Add `kickoff_at` as an RFC 3339 timestamp and `kickoff_timezone: "America/New_York"`; preserve current date/time fields for backward compatibility.
- Define a typed response model in FastAPI and a matching TypeScript contract. Avoid maintaining an unvalidated dictionary response.
- Make the export fail if a regular-season game has a known official schedule but is missing date/time, or if duplicate team/week matchups exist.
- Add a machine-readable `/health` endpoint with dataset season, generated timestamp, game count, and schedule completeness.
- Correct stale top-level API documentation that still describes the older 2024/71.2% configuration.

#### Frontend resilience

- Remove `VITE_API_BASE_URL` from the default local environment. Use static JSON unless a developer deliberately opts into API mode.
- In API mode, fall back to the matching static season file after a network failure and label the data source in development logs.
- Replace the end-user message “Make sure the prediction API is running” with a neutral retry state.
- Add `ScrollToTopAndFocus` under the router.
- Make Supabase configuration mandatory for production builds that enable accounts.
- Gate `/admin` behind `import.meta.env.DEV`, lazy-load it, and remove the passphrase and local account table from production bundles.

Acceptance criteria:

- LA at DET market prose is internally consistent and tested.
- The live 2026 file contains dates and kickoff times for every scheduled game.
- Games still render if the optional local API is stopped.
- Direct and in-app report navigation both start at the report header.
- A production build cannot silently create local-only accounts.

### Phase 1: replace the vibe-coded visual system

Files centered in this phase:

- `src/styles/tokens.css`
- `src/index.css`
- `tailwind.config.ts`
- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- shared button, badge, input, tabs, and skeleton primitives

Work:

- Replace gold, blue, and serif-first tokens with the neutral/Crimson system above.
- Remove Fraunces and JetBrains Mono from visible consumer UI.
- Standardize Roboto weights, tabular numerals, line-height, and heading scale.
- Keep Lucide because the app already depends on it, but standardize size and stroke width.
- Build one compact application header: logo, Home, Games, My Season when signed in, About, account action.
- Keep navigation on one desktop line. Use the existing mobile menu, with larger 44 px targets and clear active state.
- Remove the unsigned favorite-team dropdown from the global header; favorite-team selection belongs in onboarding and Settings.
- Rebuild the footer as one compact legal/methodology row. Move long model statistics to About/Methodology.
- Add a skip link, visible focus rings, and consistent `:active` feedback.

Acceptance criteria:

- Crimson is the only decorative accent on every route.
- No page uses gold as a brand color or a blue probability bar.
- Fonts are local and do not block first render.
- WCAG AA contrast passes for text, forms, buttons, focus, and disabled states.

### Phase 2: remove unnecessary and repetitive copy

Create a visible-copy inventory and assign every string one job: identify, explain, instruct, confirm, or disclose.

Immediate removals/replacements:

- Remove “Not another wall of stats.”
- Remove “No card, no odds, no risk - just bragging rights” and its variants from hero, auth, and closing CTA.
- Remove founder joke captions from the primary hero. Keep names and teams on About.
- Remove “Clark noticed” where the surrounding widget title already establishes that context.
- Remove repetitive “make your call,” “drag toward your pick,” “pick a side,” and helper prose from the same interaction. One clear instruction is enough.
- Shorten report factor prose to claim, supporting number, and impact. Put methodology detail behind a Methodology link, not behind a data disclosure.
- Replace all decorative dash separators with layout, columns, or plain punctuation.
- Replace forced voice lines such as “This fanbase can't agree with itself” when sample size is too small. Use `Fans split, 18 picks` only when the count supports the claim.
- Remove duplicate CTAs with the same intent on one screen.

Target landing copy shape:

- Headline: `Know why the matchup tilts.`
- Supporting line: `Clear NFL game analysis, team context, and picks you can track all season.`
- Primary CTA: `View games`
- Secondary CTA: `How it works`

Acceptance criteria:

- Hero contains no more than four text elements.
- Default game cards contain matchup, record, date/time, status, prediction, and one action.
- No visible string is vague, self-congratulatory, or repeated elsewhere on the same screen.

### Phase 3: simplify information architecture and flow

- Preserve all current routes and slugs.
- Signed out `/`: concise product introduction with bobblehead art and a preview of one real matchup.
- Signed in `/`: personalized team/game dashboard with a direct path to Games and My Season.
- `/games`: primary browsing and picking surface.
- `/game/...`: complete report, no hidden evidence.
- `/my-season`: personal performance only.
- `/settings`: profile and season/demo preferences.
- `/about`: founders, methodology summary, data source, and disclaimers.
- `/welcome`: redirect to `/` or remain as a campaign alias with a canonical URL. Do not maintain two competing landing compositions.

Home page order:

1. Compact header.
2. One-screen hero with short copy and existing bobbleheads.
3. `Your team` / `Featured game` / `Model record` widget row, based on real data.
4. Three-step explanation using short rows, not three marketing cards.
5. Intro reel and founders link.
6. Compact CTA and footer.

Acceptance criteria:

- A new visitor can reach a game report in two actions.
- A returning user can reach their team schedule in one action.
- The first mobile viewport shows the product value, one CTA, and meaningful artwork without a second banner.

### Phase 4: make the game report full-width and permanently expanded

Current issue: the strongest content is hidden behind an evidence disclosure, while the visible area repeats several probability widgets and uses heavy side margins.

Target desktop layout:

1. Full-width score header widget.
   - Away and home logos, abbreviations, pregame/current records.
   - Game status, full date, kickoff time, venue, and broadcast when available.
   - Final score for completed games.
   - Clark pick and probability as a secondary line, not the center of the scoreboard.
2. Compact comparison strip.
   - Clark, market, community, and the user's pick.
   - Use numbers and a 3 px inline measure without background progress tracks.
3. Two-column report grid at `lg` and above.
   - Main column: summary, key factors, upset path.
   - Context column: weather, venue, player matchup, market context.
4. Full-width methodology/provenance footer.

Implementation:

- Remove `evidenceOpen`, the disclosure button, and conditional report rendering from `GameReport.tsx`.
- Render the evidence grid as part of the initial report.
- Replace `max-w-5xl`/narrow report constraints with `width: 100%`, a 1728 px safety cap, and 16/24/32 px gutters.
- Convert factor cards into one Factors widget with divided rows. Keep challenge interactions inline per factor.
- Remove the large stadium-photo hero treatment. Use the venue image as a contained supporting widget so the scoreboard remains legible.
- Keep player headshots/bobblehead-style visuals where they add identity, but never behind text.
- Add a compact sticky in-report anchor bar only if the final page exceeds four major sections: Summary, Factors, Players, Venue. This is navigation, not a dropdown.
- On mobile, stack widgets in decision order and keep scores, date/time, and the primary pick action in the first viewport.

Acceptance criteria:

- No report content is hidden by default.
- The report uses at least 90% of available desktop width.
- All report sections work at 390 px without clipped scores or 10 px body copy.
- The scoreboard is understandable without reading the model explanation.

### Phase 5: eliminate gradients and decorative hero banners

- Delete `field-texture`, `stadium-bloom`, gold-shine, and decorative grid effects from `landing.css`.
- Remove team-color linear gradients from `LeadGame`, `FeaturedGame`, and `AccountPanel`.
- Replace with flat neutral surfaces, a Crimson active rule, and optional team-color identity rules.
- Remove the textured About and Settings hero bands. Use a normal page title row.
- Replace the oversized Week masthead with a compact page header.
- Keep photographic stadium assets only inside venue/report widgets.

Acceptance criteria:

- `rg "gradient" src` only finds chart/library code that is genuinely required, not product backgrounds.
- No route starts with a decorative banner that delays the primary task.

### Phase 6: preserve and reposition the bobbleheads

- Keep the existing three-founder bobblehead image in the signed-out home hero.
- On desktop, place it in the right 40-45% of the hero with no captions layered over the art.
- On mobile, place it directly below the primary CTA with a reserved aspect ratio to prevent layout shift.
- Keep individual founder/team information on About, not repeated in the hero.
- Reuse player headshots in report and performance widgets where data is tied to a player.
- Do not animate the bobbleheads by default. A subtle hover lift is acceptable on linked founder cards.

Acceptance criteria:

- The bobblehead art remains prominent on Home and present on About.
- Images have explicit width/height, responsive sources, useful alt text, and no text baked into an unreadable mobile crop.

### Phase 7: redesign Games around teams while retaining week access

Replace the WeekStrip-only model with a two-mode browser:

- Default: `By team`
- Secondary: `By week`

`By team` desktop layout:

1. Team selector row with all 32 logos, searchable by name/abbreviation. The user's favorite team is pinned first.
2. Selected-team summary widget with logo, team name, current record, streak, division record if available, last result, and next game.
3. Schedule list grouped into `Next`, `Upcoming`, and `Final`.
4. Compact game rows showing opponent, home/away, week, full date/time, result/status, Clark pick, and user-pick state.

`By week` layout:

- Keep week access, but replace the 22-button sticky strip with previous/next controls plus a compact week select or scrollable week tabs.
- Use compact two-team widgets. Do not render a conviction slider on every card.
- Selecting a team in a game expands the pick controls inline for that game only. The report remains the richer analysis surface.

State and URL behavior:

- `/games?view=team&team=BUF`
- `/games?view=week&week=1`
- Browser Back restores view, team/week, filters, and scroll.

Data implementation:

- Add a pure `teamSeason.ts` selector that derives each team's schedule, wins, losses, ties, streak, next game, and last game from the prediction/result feed.
- Prefer derivation from the shared feed so static production and API mode behave identically.
- If division standings are desired, add division metadata and explicitly label the statistic. Do not infer division rank from incomplete data.

Acceptance criteria:

- Every team can be selected with mouse, keyboard, and touch.
- Team record agrees with final-score data for every completed week.
- The favorite team opens by default for signed-in users.
- Week browsing remains available and deep-linkable.
- A mobile game row is under 180 px tall before optional pick controls expand.

### Phase 8: add the supplied red Clark Index logo

The supplied JPEG is 528 x 529 and includes the intended red circular mark, white helmet/index graphic, and `CLARK INDEX` wordmark.

Asset work:

- Preserve this exact mark as the brand source; do not continue using the current gold bar/football mark.
- Produce a clean transparent master from the supplied artwork. Preferred deliverable is SVG from the original designer; if no vector exists, produce a carefully cleaned 1024 px transparent PNG and retain the JPEG as reference.
- Create:
  - full horizontal/stacked logo for header and footer,
  - mark-only asset for compact header/avatar,
  - 32 px and 16 px favicons,
  - 180 px Apple touch icon,
  - 512 px PWA/social-safe mark,
  - 1200 x 630 Open Graph image.
- Update `ClarkLogo`, `public/logo.svg`, `public/favicon.svg`, `index.html`, theme color, and social metadata.
- Verify the white graphic has enough clear space on the dark UI and that the logo is never shown on a competing team-color background.

Acceptance criteria:

- The supplied red logo appears in header, footer, favicon, auth, and share/social assets.
- No old gold Clark mark remains in production.
- The logo is crisp at 24 px and has a text alternative.

### Phase 9: add full game date and kickoff time

- Standard display: `Sun, Sep 13 · 1:00 PM ET`.
- Completed display: `Final · Sun, Sep 13` plus score.
- Live display: quarter/clock when that feed becomes available; do not fake live state.
- Flexible schedule display: `Date TBD` or `Time TBD`, never an empty label.
- Put date/time on every Games row/card, the report scoreboard, featured game, My Season pick history, and share cards.
- Use `kickoff_at` for formatting and sorting. Keep ET visible for consistency with the official NFL schedule.
- Correct the preseason countdown to the actual first kickoff timestamp and add a boundary test around kickoff.

Acceptance criteria:

- No scheduled 2026 game renders without date and time.
- Sorting is chronological across international, holiday, Saturday, Sunday, and Monday games.
- The same game displays the same kickoff everywhere.

### Phase 10: allow favorite-team changes in Settings

Current backend support already exists through `updateProfile({ favoriteTeam })`.

Settings structure:

1. `Profile`
   - Display name.
   - Handle if editable policy remains supported.
   - Favorite team using the existing logo grid.
   - Save button, loading state, inline error, and success confirmation.
2. `Season data`
   - Live season and demo season choice.
   - Short explanation, without a decorative page banner.
3. `Account`
   - Sign out.
   - Future account deletion can be added only with a real server flow and confirmation.

Behavior:

- Signed-in updates persist to Supabase and immediately update local personalization.
- Signed-out visitors may choose a device-local favorite team, clearly labeled as local.
- Clear the previous local mirror when an account changes its team to null.
- Remove the favorite-team selector from the global header after this ships.

Acceptance criteria:

- A signed-in user can change teams, reload, and see the new team selected.
- Games opens on the new favorite team.
- Header avatar, team highlights, and fanbase views update without a second reload.

### Phase 11: whole-site issues not explicitly requested

#### Home and landing

- Consolidate `/` and `/welcome` presentation to prevent duplicate marketing systems.
- Remove the long founders letter from the primary conversion path; keep the full story on About.
- Show one real current matchup preview, not a historical game described as “last season” when the data is from 2024.

#### My Season

- Reduce the oversized `MY SEASON` heading.
- Use a scoreboard strip for record, score, streak, and comparison.
- Replace green/red section headings with semantic icons plus accessible text.
- Show game date/time and opponent on every pick history item.

#### About

- Keep founders and bobbleheads.
- Shorten the model section and link to a dedicated Methodology section.
- State evaluation season and demo season explicitly so 2024 and 2025 accuracy claims cannot be confused.

#### Admin and security

- Do not ship the local admin route or hardcoded passphrase.
- Create real administration later as a server-authorized tool using Supabase roles; do not implement it in the public SPA.
- Add a deployment check for required Supabase variables and forbid service-role keys in `VITE_*` variables.

#### SEO and social

- Add the missing Open Graph image.
- Set route-specific titles and descriptions for Home, Games, team view, game report, My Season, and About.
- Add canonical URL handling, `sitemap.xml`, and structured `SportsEvent` data for scheduled games where fields are authoritative.
- Keep game/report URLs stable.

#### Accessibility

- Add skip navigation and route focus management.
- Replace the 32 independently tabbable team buttons with roving focus or an accessible listbox/grid pattern.
- Ensure all interactive rows expose a clear accessible name and do not nest buttons inside button-like cards.
- Verify keyboard operation of pick controls, dialogs, menus, and filters.
- Test at 200% zoom and with reduced motion.

#### Performance and reliability

- Lazy-load route components and heavy chart/report modules.
- Preload only the current route's data and hero image.
- Reserve image dimensions to keep CLS under 0.1.
- Replace generic spinners with layout-matched skeletons.
- Add a route error boundary and a top-level data error boundary.
- Clear all lint warnings, including hook dependency warnings.
- Update Browserslist data during the implementation PR, with lockfile review.

## Suggested pull request structure

1. `data-trust-and-contract`: Phase 0 backend/export fixes and tests.
2. `design-system-and-shell`: tokens, fonts, logo primitives, header/footer, accessibility foundation.
3. `copy-and-landing`: concise Home/About content and bobblehead placement.
4. `games-by-team`: team selectors, summaries, schedule derivation, compact week view.
5. `full-width-report`: permanent report content, scoreboard, report widgets, responsive layout.
6. `settings-profile`: favorite-team editing and production auth behavior.
7. `production-hardening`: code splitting, SEO/social, admin removal, error boundaries, Lighthouse/accessibility fixes.

Each PR should preserve route slugs, Supabase field names, analytics identifiers, and existing user picks.

## Test and release matrix

### Automated

- Existing 303 tests remain green.
- Add backend unit tests for spread/favorite/moneyline consistency.
- Add export contract tests for required schedule fields and duplicate games.
- Add `teamSeason` selector tests for 0-0, ties, byes, postponed games, playoffs, and incomplete seasons.
- Add component tests for team/week URL state, Settings persistence, report always-open behavior, and date formatting.
- Add route tests for scroll restoration and production-only admin exclusion.
- Build with production Supabase variables and with intentionally missing variables to verify the fail-closed path.

### Visual and interaction

Test every public route at:

- 390 x 844 mobile.
- 768 x 1024 tablet.
- 1024 x 768 small laptop.
- 1440 x 1000 desktop.
- 1920 x 1080 wide desktop.

Required states:

- Signed out, signed in, favorite team set, favorite team absent.
- Live season, demo season.
- Loading, static fallback, API failure, empty filter, scheduled, final, and TBD kickoff.
- Keyboard only, 200% zoom, reduced motion, and screen-reader landmark pass.

### Release gates

- No known incorrect football/market explanation.
- Static production data generated within the agreed freshness window.
- 100% of scheduled live games have date/time.
- All tests pass and lint reports zero warnings.
- No missing runtime asset or 404 in the console/network log.
- Main route bundles are code-split; no initial JavaScript chunk exceeds the agreed 500 kB minified warning threshold.
- Lighthouse targets on Home, Games, and one report: Performance at least 90, Accessibility at least 95, Best Practices at least 95, SEO at least 95.
- Core Web Vitals targets: LCP under 2.5 s, INP under 200 ms, CLS under 0.1 on a mid-tier mobile profile.
- Product owner signs off on the red logo treatment, team browser, and always-expanded report at desktop and mobile sizes.

## Definition of done

The redesign is done when a fan can open the site, identify the brand, choose or change a team, see that team's record and schedule, understand the exact date/time of a game, open a full-width report with all evidence already visible, and make or review a pick without encountering filler copy, hidden analysis, inconsistent market claims, decorative gradients, or a broken backend dependency.
