# The Clark Index — Overhaul Spec (v2, decision-driven)

**Drafted:** 2026-10-01 · **Replaces:** v1 of this file
**Built from:** Zane's answers (§1), the "Clark Fixes" doc (Takuo), and a live audit of clarkindex.com.
**Hard constraint:** $0/month. Every piece below uses a free tier. The risks of relying on free tiers are listed in §11.

---

## 1. Decisions log (what you chose)

| Topic | Decision |
|---|---|
| Live games | **Full play-by-play view** on every game |
| AI | **Free only.** AI notes on **big plays** only, using a free tier, with templates as a fallback |
| Live data delivery | **One server fetches for everyone** → built on Supabase Cron + an Edge Function (free) |
| Chat | **Live chat on each game** + **one comment thread per game** under the report |
| Chat rules | **Must be signed in to post** · **plays appear inside the chat** |
| Pick formats | **Keep confidence picks** only |
| Signed-in home | **Personal feed** with the Clark Report as the centerpiece, big plays, pick status, top chat, injuries/news, and stats |
| Games page | Clean schedule + **a few** personal stats and story hooks, nothing cluttered |
| Game page | **Tabs**, with all the existing Clark Index features placed in the right tab |
| Learn | **Team pages, roster on a field, player pages** (no glossary) |
| Stats | **You vs Clark vs the crowd · your record by team and division · Clark vs the line · fanbase rankings** |
| Hooks | **Weekly streak + freeze · leaderboards · shareable result cards** |
| Email | Not now |
| Landing | **Short, simple pitch + the real product.** Most things require an account |
| Gating | **Team and player pages are public** (for Google search); the key content on them requires an account (§7) |
| Visual style | **Based on ESPN + Real Sports.** No odd badges, subtexts, or clever titles: every label says what the thing is (§13, §14) |
| Private leagues | **Not now** |

---

## 2. P0 — Fix first (from the Clark Fixes doc and the audit)

These ship before any redesign. Nothing else matters if the reports contradict themselves.

- **Report consistency checker** (`nfl-prediction/src/validate_predictions.py`, runs in the export and in CI). It fails the build if:
  - Clark's pick goes one way but most "Key edge" factors favor the other team (ATL @ NO today: picks NO, 4 of 5 factors favor ATL).
  - A factor's team isn't one of the two teams ("Vegas gives **Even** the slight nod").
  - The betting-line win % sits on the wrong side of 50% for the favorite ("NO a 2.5-point favorite — about 47%").
  - The copy says Clark disagrees with the line when they actually agree.
  - The market note names a factor that isn't in the report.
  - Any text contains `undefined`, `NaN`, double negatives like "-0.20 … more", or a sentence starting in lowercase.
- **One spread-to-win% function**, used everywhere. Fixes Takuo's "Vegas odds were wrong" on SEA/ARI.
- **Password reset:** "Forgot password?" in the sign-in box → Supabase reset email → new `/reset-password` page. Uses Supabase's free built-in auth emails, which are limited to a few per hour. That's enough for resets.
- **The whole game card is clickable**, not just the "Read the evidence" link.
- **Cut filler and repeats:** "What Clark keeps coming back to", "The one thing that could turn it:", the Upset Path repeating "Clark Noticed" word for word, and the same tagline on 7 cards.
- **Plain English in reports** (Takuo's example): name players, mention injuries, compare to the rest of the league ("one of the 5 stingiest defenses") instead of "0.08 EPA/play". Raw stats move into one "Show the numbers" drawer per report.
  - Injury data already exists in `build_availability.py` but never reaches the site. Expose it as `injury_notes[]`.
  - Key players come from `home_players` / `away_players` → `key_players[]`.
- **Opponent strength (Takuo's SEA/ARI point):** add opponent-adjusted EPA as a model experiment in the existing backtest. Only keep it if accuracy improves. Either way, the report text can say "…and they did it against good offenses."

---

## 3. Live system (free architecture)

```
Supabase Cron (every 15s, only during game windows)
   └─► Edge Function `live-sync`
         1. GET ESPN scoreboard + game summary (plays, score, clock, win %)
         2. New plays → insert into `live_plays`
         3. Flag big plays → write a short note (free AI or template)
         4. Update `live_games` (score, clock, win %, status)
   └─► Supabase Realtime pushes new rows to everyone watching
Browser: subscribes only while a Live tab or the feed is open
```

- **Schedule:** a cron job every 15 seconds that exits right away unless a game is between kickoff −10 min and final +10 min. That's roughly 20 hours of polling a week, about 5k calls/week. The free plan includes 500k Edge Function calls a month.
- **Data source:** ESPN's public scoreboard and game-summary endpoints. They're unofficial, so all ESPN-specific code goes in one file (`espnAdapter.ts`) so it can be swapped out (see §11).
- **What counts as a big play (no AI needed to decide):** touchdown, turnover, sack on 3rd or 4th down, 4th-down attempt, a gain of 25+ yards, field goal in the last 5 minutes, or a win % swing of 8 points or more.
- **Big-play notes:**
  - Every play gets a template line, e.g. "3rd & 8 → converted. Keeps the drive alive."
  - Big plays also get one free AI sentence (Gemini Flash-Lite free tier) explaining what it means for the game in plain English. Expected volume is about 20 per game, around 250 on a Sunday.
  - If the AI fails, hits a limit, or the free tier goes away, the template line is used and nothing visibly breaks.
  - The prompt includes only the play and the game situation. It's told to use no outside facts, and output is capped at 25 words.
- **New tables:**
  - `live_games (game_key, status, quarter, clock, home_score, away_score, possession, win_prob_home, updated_at)`
  - `live_plays (id, game_key, seq, quarter, clock, text, yards, play_type, is_big, note, win_prob_home, created_at)`
  - Both are readable by everyone. Only the service role (the server) can write.
- **After the game:** the final score is written to a `results` table and picks are graded on the server. This also replaces the manual `add_actual_results.py` step.
- **Limits to watch:** Supabase's free plan allows **200 people connected at once**. Pages only hold a connection while a Live tab or the Sunday feed is open, and drop it when the tab is hidden. Past 200 at once, Pro costs $25/mo. That's the first cost that comes with real success.

---

## 4. Game page (`/game/...`) — four tabs

The tab it opens on depends on the moment: **Preview** before kickoff, **Live** during the game, **Recap** after. Chat is always one tap away. On desktop, a chat column sits beside the Live tab.

**Header (same on every tab):** a full-width stadium banner in both teams' colors with the weather drawn in, replacing the gray box Takuo flagged. Below it, a scorebug with teams, records, kickoff time or live score, and a bar comparing Clark's win %, the betting line, and the crowd's picks.

### Tab 1 — Preview (the Clark Report, the centerpiece)
1. **Make your pick:** tap a team, then the confidence slider appears.
2. **Clark's call:** the pick and one sentence on why, in plain English.
3. **Why Clark likes [team]:** the top factors that favor the pick. **What [other team] has going for it** goes in a separate group, so the report never looks like it contradicts itself.
4. **Key players and injuries:** up to 4 player cards (headshot, role, why they matter, injury status). Each links to the player page.
5. **How [other team] wins:** the path to an upset. Must be different from the rest of the report.
6. **Conditions:** weather and stadium combined into one panel.
7. **Show the numbers:** a single drawer with the raw stats and league comparisons.
8. **Comments:** one thread per game, sorted by upvotes, with each poster's pick next to their name ("SEA · 80%"). Replaces the per-factor "Challenge this factor" threads.

### Tab 2 — Live (play-by-play)
- **Win % chart** across the game, with **Clark's pregame number drawn as a dashed line**, so you can watch the game swing against or toward the prediction.
- **Live factor tracker (new idea):** the 3 factors Clark weighted most before the game get scored as the game happens, using the play data. For example: "Clark said Seattle's pass rush would decide it → 4 sacks so far ✅", "ATL's running game → 2.1 yards per carry ❌". This connects the prediction to what's actually happening, and nobody else does it.
- **Play feed:** newest at the top. Big plays are highlighted with their AI or template note. Routine plays are collapsed per drive ("Drive: 8 plays, 45 yds, FG").
- **Your pick:** a sticky bar such as "SEA 80% · winning ●", turning green or red as the lead changes.

### Tab 3 — Chat (live game chat)
- Anyone can read; posting requires an account. Every name shows that person's pick, e.g. "SEA · 80%".
- **Big plays appear as cards inside the chat** with reactions (🔥 😭 🤡), so everyone reacts to the same moment.
- **Automatic keyword moderation** (no paid AI):
  - A blocklist (`supabase/moderation/blocklist.txt`) is checked on the server by a database trigger before a message is saved. The check normalizes text first: lowercase, letters substituted with look-alike numbers or symbols turned back into letters (`@`→a, `1`→i, `3`→e, `$`→s), and repeated letters collapsed.
  - **Severe words** (slurs, threats): the message is blocked and the user gets a strike.
  - **Mild words** (profanity): the message is saved with the word masked (`f***`).
  - **Spam rules:** links blocked for accounts younger than 7 days; the same message posted twice in 60 seconds is blocked; at most 1 message every 3 seconds; 280-character limit.
  - **Strikes:** 3 strikes in 24 hours mutes the user for 24 hours; 5 strikes in total is a ban. All automatic.
  - **Backstop:** a report button (3 reports hides a message) and admin delete/ban.
- Built on Supabase Realtime: new chat messages are saved to `chat_messages` and pushed live to everyone watching.
- Open from 1 hour before kickoff until 1 hour after the final whistle. After that, the chat is read-only and saved as "Game-day chat".

### Tab 4 — Recap (after the game)
- Final score. A **report card** grading Clark's pregame factors against what actually happened, built from the factor tracker. **The 5 plays that decided it**: the 5 biggest win % swings, each with its note. Your result and points. Share buttons (see §8).

---

## 5. Home page for signed-in users (personal feed)

The page layout changes with the day of the week. The Clark Report is always the thing at the top.

**Tuesday to Saturday:**
1. **Your week bar:** "7 of 16 picked · locks Thu 8:15 PM", "Streak: 6 weeks", and your rank this week.
2. **Clark Report of the week:** the featured game (your team's game if you set one, otherwise Clark's biggest disagreement with the betting line). Shows the full Clark's call block and an inline pick button.
3. **Stats strip:** 2 rotating cards, e.g. "You 38–26 · Clark 41–23 · Crowd 36–28" and a team or division split like "You're 2–7 on AFC West games".
4. **Clark vs the line:** the 3 games where Clark and the line disagree most, and Clark's record in games like that.
5. **Injuries and news:** at most 3 items, only about your team or your picks. Each says whether it affects Clark's prediction.
6. **Top comments:** the 3 most-upvoted comments across this week's reports.
7. **Fanbase standing:** "Bills fans are 3rd of 32 this week."

**Sunday / Monday / Thursday nights while games are live:**
1. **Live strip:** a horizontal row of score bugs for every live game, with your picks marked ✓/✗ in real time.
2. **Big plays feed:** big-play cards from every game. Your team's game and the games you picked are pinned at the top. Tap one to open that game's Live tab.
3. **Busiest chats:** "GB @ TB · 84 people chatting". Tap to jump in.

**Monday after the games:** a results card ("You 11–5 · Clark 10–6 · Crowd 9–7"), your updated blind-spot stats, the weekly share card, and leaderboard changes.

---

## 6. Games page (`/games`)

- **Layout: a scoreboard-style list**, grouped by day and kickoff time.
  - Each row shows the teams, kickoff time or live score, Clark's pick and %, your pick, a chat count, and an upset tag if it applies.
  - Tap a team on a row to pick; the slider opens inside that row.
  - Tap anywhere else on the row to open the game page.
- **Top section (deliberately small):**
  - **Your week:** picked X/16, streak, and this week's record so far.
  - **2 personal stats** that rotate weekly (your record vs Clark, one team or division split).
  - **2 story cards**, no more. Chosen automatically: the biggest upset-meter game, plus the injury that moved Clark's number the most.
- **Weeks bar:** past weeks show your record on the week's button (e.g. "Wk 3 · 10–6").
- **Removed:** the confidence-count strip ("High conf 6…"), the 16 always-open sliders, and the repeated taglines.

---

## 7. Other pages

### Landing (signed out) — short pitch, most content gated
- **Hero:** one line ("Every NFL game explained in plain English. Pick against Clark.") + a "Create free account" button + "Sign in".
- **Product preview below the hero:** this week's featured Clark Report, showing Clark's call and the top reason. The rest is blurred behind "Create an account to read the full report".
  - On Sundays this becomes a live score strip plus one big-play card, with "84 fans chatting — join them" leading to sign-up.
- **3 short sections:** what the Clark Report is (with a screenshot), live play-by-play and chat, beating Clark and climbing the leaderboard.
- **Founders:** a small section at the bottom using the cleaned-up illustration (§9).
- **What's public vs gated:**

  | Page | Public (no account) | Requires an account |
  |---|---|---|
  | Landing | Everything | — |
  | Games page | Schedule, scores, Clark's pick and % | Making picks, your stats |
  | Game: Preview | Clark's pick, % and the first factor | Full Clark Report, key players and injuries, the numbers, comments |
  | Game: Live | Score, clock, win % chart, scoring plays | Full play feed with notes, factor tracker, chat |
  | Game: Recap | Final score, top 5 plays | Clark's report card, your result |
  | Team pages | Record, schedule and results, roster on the field, injuries | Clark's ranking and outlook, matchup notes |
  | Player pages | Bio, position explainer, season stats, last 5 games | Rank at his position, how he affects this week's Clark Report |
  | Leaderboard | Top 10 | Full board, your rank |

  - Gated sections are shown blurred with one button: **"Create a free account to see the full report"**. No other teaser copy.
  - Public team and player pages get proper titles and descriptions ("Buffalo Bills Roster 2026 — The Clark Index"), structured data, and a sitemap so Google indexes them.

### My Season (`/my-season`)
- **Header:** record, points, streak and freezes left, and leaderboard rank (overall and within your fanbase).
- **You vs Clark vs Crowd:** a week-by-week chart of who's ahead.
- **Your record by team and division:** best and worst divisions, teams and confidence ranges. Your record when you go against Clark. Your record picking your own team.
- **Week-by-week grid:** a ✓/✗ square for every pick, which is also the source of the share card.
- **Highlights:** best call and worst call, each shareable.

### Leaderboards (`/leaderboard`, new)
- Tabs for **This week**, **Season**, **By fanbase** (32 teams ranked) and **Beat Clark** (users with the most weeks beating Clark).
- No profile badges.

### Learn: Teams, Roster, Players (new)
- **`/team/:abbr`:** a page in team colors with record, schedule and results, Clark's power ranking, injuries, the last 5 games, and the roster button.
- **`/team/:abbr/roster`:** starters drawn on a field diagram with Offense and Defense toggles. Tap a player to get:
  - What his position does (2 plain sentences, fixed text for each position).
  - A rank at his position ("Top 5 WR this season", from free nflverse stats).
  - Injury status, and a link to his player page.
- **`/player/:id`:** headshot, position explained, rank at position, last 5 games, injury status, next game.
- **Data:** a new `export_rosters.py` writes rosters, depth charts and stats from nflverse (free) to JSON once a week.
- **Links in:** every player name and team logo anywhere on the site links to these pages.

### Settings, About, sign-in, 404
- **Settings:** display name, handle, favorite team, change password, delete account, hide me from leaderboards.
- **About:** the story, how Clark works (data → factors → probability → report, with a diagram), and **Clark's public record**: every pick he's made, including the misses.
- **Sign-in:** adds "Forgot password?". Favorite team is chosen at sign-up.
- **404:** Clark illustration, plus links to this week's games.

### Global design changes
- **Navigation:**
  - Desktop: Home · Games · Teams · Leaderboard, plus a streak count and the account menu.
  - Phones: a bottom tab bar (Home, Games, Live, Teams, Me).
- **Visual style and wording:** see §13 (ESPN/Real-based design) and §14 (copy cleanup).

---

## 8. Hooks

- **Weekly streak:** one or more picks in a week keeps it going. **One streak freeze every 4 weeks** is used automatically. The header shows "Streak: 6 weeks". From Friday on, the header warns you if your streak is at risk.
- **Leaderboards:** see §7.
- **Share cards** (generated free with `@vercel/og`, so links show a preview image in iMessage, Instagram DMs and Discord):
  - **Weekly results card:** "The Clark Index · Week 4 · 11–5 · Clark 10–6" plus the ✓/✗ grid.
  - **Correct pick card:** you were right at 75%+ confidence while Clark or the line was wrong. "ARI over SEA · 90% · Clark had SEA".
  - **Pick card:** at lock time. "My pick: ARI 90% · Clark: SEA 64%".
  - Phones get the built-in share menu; desktop gets copy-link and download.
- **Stats:** see §5 and §7. They're computed on the fly from the `picks` and `results` tables.

---

## 9. Illustration

- **Keep the existing illustrated founders portrait** (`public/founders/`, `FoundersPortrait.tsx`), cleaned up:
  - Remove the "GET READY FOR THE 2026 SEASON" sticker and the tagline under each founder.
  - Each founder gets name and favorite team only, on a plain card with no glow.
  - Use the same crop and size on Landing and About.
- No new character art and no Instagram content engine (both dropped).

---

## 10. Build order

| Phase | Contents | Done when |
|---|---|---|
| **P0** | Copy cleanup (§14), consistency checker + CI, odds math, password reset, clickable cards, filler removal, plain-English report rewrite with injuries and key players | Checker passes on every game; 10 random reports read cleanly to a non-fan |
| **P1** | Live system (§3): tables, Edge Function, cron, ESPN adapter, big-play detection, free AI notes with template fallback, grading results on the server | A real Sunday game runs end to end with notes and live updates; nothing on the page breaks when the AI is turned off |
| **P2** | Game page tabs (§4), including the factor tracker, live chat, and comments | All 4 tabs work for pre-game, live and final games, on phone and desktop |
| **P3** | Home feed (§5), Games page (§6), landing + gating, navigation and design system | Every route redesigned, with screenshots at 375 / 768 / 1440 |
| **P4** | Stats, streaks, leaderboards, share cards, My Season | Streak and freeze logic unit-tested; share links show preview images |
| **P5** | Team / roster / player pages + rosters export | Every starter reachable from any game page in 2 taps |

Each phase is shown to all three of you before the next one starts.

---

## 11. Risks of staying free (read before approving)

- **ESPN's API is unofficial.** It can change or block traffic without notice, and using it commercially is a gray area. Mitigation: all ESPN code lives in one adapter file; post-game data has a free backup in nflverse; check the terms before any monetization.
- **The Gemini free tier changes often**, and Google may use free-tier inputs to train its models. We only send public play data, so that's acceptable. The template fallback means nothing breaks if it goes away.
- **Supabase free plan limits:** 200 people connected at once, 500 MB database, and **projects pause after 1 week with no activity** (a risk in the offseason). The first paid step is Pro at $25/mo.
- **Vercel Hobby** (the free plan) is for non-commercial use only. Fine for now; it needs to change if you add ads or payments.
- **Keyword moderation catches obvious abuse only.** Misspelled slurs and harassment that avoids the listed words will get through. The report button and admin delete are the backstop.

---

## 12. Resolved

- Illustration: keep the founders illustration, cleaned up (§9).
- Instagram: dropped.
- Chat moderation: automatic, keyword-based (§4, Tab 3).

---

## 13. Visual design: modeled on ESPN and Real Sports

**Why it looks vibe-coded today:** cinematic dark cards everywhere; small uppercase gold "eyebrow" labels over every section; a serif display font; clever section titles; every block in its own bordered box; decorative badges ("GET READY FOR THE 2026 SEASON"); repeated taglines. Real sports products are the opposite: dense, neutral, scannable, with team logos and team colors carrying the visual interest.

### What we take from ESPN (studied: NFL scoreboard + Gamecast, Week 3–4 2026)
- **Scoreboard rows:** kickoff time and network on the left; logo + team name + record (e.g. "Steelers 2-1, 0-1 Away") stacked; venue and weather in the middle; spread/total in a small gray box; one action button ("Gamecast") on the right. Grouped under plain date headers ("Sunday, October 4, 2026").
- **Game header:** both logos large at the edges, score in very large numerals, a small quarter-by-quarter line score in the center, "Final" above it. A faint team-color wash behind each logo. The header stays pinned while scrolling.
- **Tabs directly under the header:** Gamecast · Box Score · Play-by-Play · Team Stats. Plain nouns only.
- **Scoring plays list:** grouped by quarter. Each play: team logo, bold play type ("Touchdown", "Field Goal"), clock + quarter, running score on the right, one line of detail, and a gray drive summary ("9 plays, 87 yards, 4:53"). A toggle switches between **Scoring Plays** and **All Plays**.
- **Game leaders:** headshot on each side, the stat in large numbers, the category in the middle ("Passing Yards").
- **Right sidebar on desktop:** standings and news next to the game.
- **Light theme, white cards on light gray**, thin dividers, almost no shadows, a single red brand accent.

### What we take from Real Sports (studied: realapp.com, App Store listing, UI breakdowns)
- **Every play is a social object:** each play in the feed has its own reaction count and comment thread. We do this in the Live tab: big plays get reactions and a "12 comments" link that opens the game chat filtered to that play.
- **Comment counts as the main signal of activity** on game rows ("7.1k" next to a game). We show the chat count on every Games-page row.
- **Plain data-first copy:** "Social sports data." / "PIT by 2.5" / "Tied 1-1". No slogans.
- **Light and dark themes** with one user-chosen accent. We let users pick their favorite team's color as the accent.

### The new look (specific rules)
- **Light theme is the default** (like ESPN); dark theme available in Settings and follows the system setting. Both get tested.
- **Colors:**
  - Background `#F2F3F5`, cards `#FFFFFF`, text `#121417`, secondary text `#5F6670`, dividers `#E3E5E8`.
  - One brand accent, used only for buttons and active tabs.
  - Team colors are used only for logos, the header wash, and win-probability bars.
  - Status colors: green (correct/winning), red (wrong/losing/live dot), gray (pending).
- **Type:** **Inter** for everything; numbers use tabular figures. Sizes:
  - Scores: 40/56px.
  - Page titles: 28px.
  - Section titles: 18px semibold, sentence case.
  - Body: 15px.
  - Meta text: 13px.
  - No uppercase letter-spaced eyebrows, no serif, no monospace.
- **Layout:** desktop is a 12-column grid with the main content (8 columns) and a sidebar (4 columns). The sidebar holds standings, your season, and news. On phones the sidebar drops below.
- **Cards:** 8px radius, 1px divider border, no glow, no gradient. Lists inside cards use dividers, not nested cards.
- **Logos and headshots do the visual work:** team logos on every row; player headshots on key players, leaders and roster.
- **Section titles are plain nouns:** "Games", "Scoring plays", "Key players", "Injuries", "Standings", "Comments".
- **Buttons say what they do:** "Make pick", "Change pick", "Open game", "Sign in", "Create account".
- **Numbers always have units or context:** "64% win chance", "7-point favorite", "3-1".
- **No decorative badges.** The only allowed chips are factual status: Live, Final, Q3 4:12, Out, Questionable, Correct, Wrong.

---

## 14. Copy cleanup: every label that changes

From the current code (`primary-ui/src`) and the live site. **Remove** = delete with nothing in its place.

### Landing (`components/landing/*`)
| Current | New |
|---|---|
| "Not another wall of stats" (eyebrow) | Remove |
| "Learn football alongside us." | "NFL predictions, explained in plain English." |
| "No card, no odds, no risk — just bragging rights." | "Free. No betting." |
| "GET READY FOR THE 2026 SEASON" badge | Remove |
| Founder taglines ("Loud on Sundays. Louder about the numbers." etc.) | Name + favorite team only |
| "THE DIFFERENCE" / "Everyone hands you the number. We hand you the reason." | Remove the section (replaced by the product preview) |
| "All true. None of it tells you what's actually going on." / "Same game. Now you could explain it to someone else." | Remove |
| "HOW IT WORKS" / "Read it. Call it. Live with it." / "Three steps" / "Step one/two/three" | Title "How it works", 3 numbered items with no extra labels |
| "Read the matchup, not the spread" | "Read the Clark Report for every game" |
| "Pick a side — and say how sure you are" | "Pick a winner and set your confidence" |
| "Beat the model. Then beat your friends." | "Track your record against Clark and other fans" |
| "Peek inside a real report" | "See an example" |
| "WATCH THE INTRO" / "Sixty seconds with the three of us" / "TAP TO PLAY" | "Intro video" |
| "LIVE RIGHT NOW" / "Go read one yourself." | "This week's games" |
| Founders letter ("Welcome to The Clark Index!", "Thank you for joining our community!") | Remove from landing; shortened version on About |

### Games page (`components/games/*`, `lib/slate.ts`, `lib/pickReading.ts`)
| Current | New |
|---|---|
| "SEASON 2026 · THE SLATE" | Remove (title is "Week 4") |
| "Games 16 · High conf 6 · Medium 3 · Low 7" strip | Remove |
| "THE CLOSEST CALL ON THE BOARD" | Remove (no featured card on this page) |
| "CLARK NOTICED" | Remove (the key factor shows on the game page) |
| Taglines: "Nothing unusual here — steady favorite", "A clean read this week", "Clark sees this as a near-lock", "This one's close to a coin flip", "A genuine toss-up, per Clark" | Remove. The row shows "Clark: CHI 77%" only |
| "DRAG TOWARD YOUR PICK" / "No position — 50/50" | Team buttons; after picking, the slider label is "Confidence: 80%" |
| "PICK A SIDE" | "Make pick" |
| "READ THE EVIDENCE FIRST →" / "Read the Clark Report" | Whole row opens the game; no extra link |
| "You haven't made a pick yet — start with this week's games." | "0 of 16 picked" |

### Game page (`components/game-report/*`, `nfl-prediction/src/api.py`)
| Current | New |
|---|---|
| "LOW / MEDIUM / HIGH CONFIDENCE" chip | Remove (the % already says it) |
| "Close game — only a slight edge. Either outcome is plausible." | Remove |
| "MAKE YOUR CALL" / "Pick as if it hasn't kicked off" | "Your pick" |
| "A near coin-flip — Clark gives NO only the slightest edge." | Remove (duplicates the %) |
| "No one has staked a call on this game yet. Yours would be the first." | Remove (show crowd % only after 25+ picks) |
| "Where the community stands" | "Fan picks" |
| "Clark noticed" box | Remove (becomes the first factor) |
| "FACTORS TO VICTORY" | "Why Clark picks [team]" and "What favors [other team]" |
| "Key edge / Notable / Slight" chips | Bar length only, no words |
| "Challenge this factor" | Remove (one comments section per game) |
| "UPSET PATH" | "How [other team] wins" |
| "Market" panel | "Betting line" row in the header comparison |
| "Photo · Wikimedia Commons" | Moves to the image's alt text and credits page |
| "Logistic regression · expanding-window backtest · 2025 holdout · 65.6% model accuracy" | Footer line: "Clark's record this season: 38–26 (59%)", linking to About |
| Filler in report text: "No single factor dominates — the lean rides on the overall blend…", "The one thing that could turn it:", "What Clark keeps coming back to" | Remove (checked automatically by the validator in §2) |

### Home, My Season, About, other pages
| Current | New |
|---|---|
| "The week at a glance" / "Around the league" / "Rest of the board" | "This week" / "News" / "All games" |
| "Model write-ups" (meta) | Remove |
| "Your account and season" | "Your season" |
| "Weekly net · You vs the field" | "Points by week" |
| "Your record against Clark, Vegas & the crowd" | "You vs Clark vs fans" |
| "You haven't staked a single call yet." | "No picks yet." |
| "Strongest calls" / "Biggest misses" / "How you pick" | "Best picks" / "Worst picks" / "Your record by team and division" |
| "No misses — flawless so far." | "No wrong picks yet." |
| About: "Who's behind this", "Three fans, one very long spreadsheet.", "And who they yell at on Sundays", "The Clark Competition" | "About us", "How Clark works", "Clark's record". Founders get name, team, one sentence |
| 404: "That play isn't in the book." | "Page not found." |
| Header "Pick your team" dropdown | Remove from header (favorite team lives in Settings) |
| "Vegas" anywhere in the UI | "Betting line" |
| "Picks closed" | "Game started" / "Final" |
| Demo/preseason banners | One line: "Showing 2024 data (demo)" only when demo mode is on |

**Rule for all future copy:** if a label could be replaced by a plain noun or a number without losing meaning, use the noun or number.
