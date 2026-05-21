import { useState, useEffect, useMemo } from "react";
import "./App.css";

// ===========================================================================
// NFL Team Registry — colors + full names for every franchise
// ===========================================================================

const NFL_TEAMS = {
  ARI: { primary: "#97233F", secondary: "#FFB612", name: "Arizona Cardinals" },
  ATL: { primary: "#A71930", secondary: "#000000", name: "Atlanta Falcons" },
  BAL: { primary: "#241773", secondary: "#9E7C0C", name: "Baltimore Ravens" },
  BUF: { primary: "#00338D", secondary: "#C60C30", name: "Buffalo Bills" },
  CAR: { primary: "#0085CA", secondary: "#101820", name: "Carolina Panthers" },
  CHI: { primary: "#0B162A", secondary: "#C83803", name: "Chicago Bears" },
  CIN: { primary: "#FB4F14", secondary: "#000000", name: "Cincinnati Bengals" },
  CLE: { primary: "#311D00", secondary: "#FF3C00", name: "Cleveland Browns" },
  DAL: { primary: "#003594", secondary: "#869397", name: "Dallas Cowboys" },
  DEN: { primary: "#FB4F14", secondary: "#002244", name: "Denver Broncos" },
  DET: { primary: "#0076B6", secondary: "#B0B7BC", name: "Detroit Lions" },
  GB:  { primary: "#203731", secondary: "#FFB612", name: "Green Bay Packers" },
  HOU: { primary: "#03202F", secondary: "#A71930", name: "Houston Texans" },
  IND: { primary: "#002C5F", secondary: "#A2AAAD", name: "Indianapolis Colts" },
  JAX: { primary: "#101820", secondary: "#D7A22A", name: "Jacksonville Jaguars" },
  KC:  { primary: "#E31837", secondary: "#FFB81C", name: "Kansas City Chiefs" },
  LA:  { primary: "#003594", secondary: "#FFA300", name: "Los Angeles Rams" },
  LAC: { primary: "#0080C6", secondary: "#FFC20E", name: "Los Angeles Chargers" },
  LV:  { primary: "#000000", secondary: "#A5ACAF", name: "Las Vegas Raiders" },
  MIA: { primary: "#008E97", secondary: "#FC4C02", name: "Miami Dolphins" },
  MIN: { primary: "#4F2683", secondary: "#FFC62F", name: "Minnesota Vikings" },
  NE:  { primary: "#002244", secondary: "#C60C30", name: "New England Patriots" },
  NO:  { primary: "#9F8958", secondary: "#101820", name: "New Orleans Saints" },
  NYG: { primary: "#0B2265", secondary: "#A71930", name: "New York Giants" },
  NYJ: { primary: "#125740", secondary: "#000000", name: "New York Jets" },
  PHI: { primary: "#004C54", secondary: "#A5ACAF", name: "Philadelphia Eagles" },
  PIT: { primary: "#101820", secondary: "#FFB612", name: "Pittsburgh Steelers" },
  SEA: { primary: "#002244", secondary: "#69BE28", name: "Seattle Seahawks" },
  SF:  { primary: "#AA0000", secondary: "#B3995D", name: "San Francisco 49ers" },
  TB:  { primary: "#D50A0A", secondary: "#FF7900", name: "Tampa Bay Buccaneers" },
  TEN: { primary: "#0C2340", secondary: "#4B92DB", name: "Tennessee Titans" },
  WAS: { primary: "#5A1414", secondary: "#FFB612", name: "Washington Commanders" },
};

function teamColor(abbr, fallback = "#1a2236") {
  return NFL_TEAMS[abbr]?.primary || fallback;
}
function teamSecondary(abbr, fallback = "#374151") {
  return NFL_TEAMS[abbr]?.secondary || fallback;
}
function colorLuminance(hex) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function readableTeamColor(abbr, fallback = "#B89B5E") {
  const primary = teamColor(abbr, fallback);
  if (colorLuminance(primary) >= 0.14) return primary;

  const secondary = teamSecondary(abbr, fallback);
  if (colorLuminance(secondary) >= 0.14) return secondary;

  return fallback;
}
function teamName(abbr) {
  return NFL_TEAMS[abbr]?.name || abbr;
}

// ESPN CDN abbreviations (only teams that differ from the app's internal key)
const ESPN_ABBR_MAP = { LA: "lar", WAS: "wsh" };
function logoUrl(abbr) {
  const espn = ESPN_ABBR_MAP[abbr] || abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${espn}.png`;
}

// ===========================================================================
// Factor config
// ===========================================================================

const FACTOR_NOTES = {
  "QB Efficiency":
    "Efficient quarterback play increases drive consistency and explosive-play chances. EPA (Expected Points Added) per dropback is the single strongest per-play predictor of offensive output.",
  "Turnover Edge":
    "Turnovers flip field position instantly — a fumble recovery at midfield is worth ~3 expected points before a play is run. Teams that win the turnover battle win at a dramatically higher rate.",
  "Offensive Efficiency":
    "Efficient offenses convert on early downs and stay ahead of the chains. EPA per play captures both big plays and consistent short gains better than yardage alone.",
  "Defensive Resistance":
    "A defense that limits EPA per play forces punts and three-and-outs, giving its offense more possessions and shorter fields. Sustained defensive efficiency is one of the best win predictors.",
  "Pressure Matchup":
    "When a pass rush consistently beats the opposing offensive line, it collapses timing routes, forces hurried throws, and reduces the QB's EPA dramatically — even without recording a sack.",
};

const TIER_COLOR = { strong: "#10b981", medium: "#f59e0b", weak: "#4b5563" };
const CONF_COLOR = { High: "#10b981", Medium: "#f59e0b", Low: "#6b7280" };

// ===========================================================================
// Utility — flip scenarios
// ===========================================================================

function getFlipScenarios(game) {
  const { football_factors = [], predicted_winner, home_team, away_team, confidence_label } = game;
  const loser = predicted_winner === home_team ? away_team : home_team;
  const scenarios = [];

  const loserEdges = [...football_factors]
    .filter((f) => f.advantage_team === loser && f.tier !== "weak")
    .sort((a, b) => b.score - a.score);

  if (loserEdges.length > 0) {
    const top = loserEdges[0];
    scenarios.push(
      `${loser} holds a ${top.tier} edge in ${top.name} (${top.score.toFixed(1)}/10). ` +
      `If that advantage shows up on game day, they have a credible path to the upset.`
    );
  }

  const to = football_factors.find((f) => f.name === "Turnover Edge");
  if (to && to.score < 3) {
    scenarios.push(
      `The turnover battle is nearly even. A single fumble or interception could swing field position and flip this game decisively.`
    );
  }

  if (confidence_label === "Low") {
    scenarios.push(
      `This is a near coin-flip — the model sees very little separation. Any situational factor (weather, scheme adjustment, key injury) could change the result.`
    );
  } else if (confidence_label === "Medium") {
    scenarios.push(
      `Medium confidence means real uncertainty. ${loser} isn't out of this — they just need their best factors to show up while neutralizing ${predicted_winner}'s edge.`
    );
  } else {
    scenarios.push(
      `Even high-confidence picks get upset in the NFL. One bad quarter — turnovers, special teams, or explosive plays — can erase a model edge entirely.`
    );
  }

  return scenarios.slice(0, 3);
}

// ===========================================================================
// FactorBar — tier-aware, with learning note in detail mode
// ===========================================================================

function FactorBar({ factor, detailed = false }) {
  const color = TIER_COLOR[factor.tier] || "#4b5563";
  const isWeak = factor.tier === "weak";
  const note = FACTOR_NOTES[factor.name];

  return (
    <div className={`factor-bar ${isWeak ? "factor-bar-weak" : ""}`}>
      <div className="factor-bar-header">
        <div className="factor-bar-left">
          <span className="factor-name">{factor.name}</span>
          {isWeak ? (
            <span className="factor-minor-chip">Minor Factor</span>
          ) : (
            <span
              className="factor-team-chip"
              style={{ background: `${color}20`, color, borderColor: `${color}50` }}
            >
              {factor.advantage_team}
            </span>
          )}
        </div>
        <span
          className="factor-score"
          style={{ color: isWeak ? "#4b5563" : color }}
        >
          {factor.score.toFixed(1)}
          <span className="factor-score-denom">/10</span>
        </span>
      </div>

      <div className="factor-track">
        <div
          className="factor-fill"
          style={{
            width: `${(factor.score / 10) * 100}%`,
            background: color,
            opacity: isWeak ? 0.4 : 1,
          }}
        />
      </div>

      {!isWeak && <p className="factor-reason">{factor.reason}</p>}
      {isWeak && (
        <p className="factor-reason factor-reason-weak">
          This factor shows minimal separation between the two teams — not a deciding signal.
        </p>
      )}

      {detailed && !isWeak && note && (
        <p className="factor-note">
          <span className="factor-note-label">Why this matters: </span>
          {note}
        </p>
      )}
    </div>
  );
}

// ===========================================================================
// FactorBadges — top 1–2 strong/medium factor chips for cards
// ===========================================================================

function FactorBadges({ factors }) {
  const decisive = [...factors]
    .filter((f) => f.tier !== "weak")
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  if (decisive.length === 0) return null;

  return (
    <div className="factor-badges">
      {decisive.map((f) => (
        <span
          key={f.name}
          className="factor-badge"
          style={{
            background: `${TIER_COLOR[f.tier]}18`,
            color: TIER_COLOR[f.tier],
            borderColor: `${TIER_COLOR[f.tier]}40`,
          }}
        >
          {f.name} · {f.advantage_team}
        </span>
      ))}
    </div>
  );
}

// ===========================================================================
// TeamLogo — ESPN CDN logo with text fallback
// ===========================================================================

function TeamLogo({ abbr, size = 48, className = "" }) {
  const [failed, setFailed] = useState(false);
  const color   = readableTeamColor(abbr);
  const initial = abbr.slice(0, 2);

  if (failed) {
    return (
      <div
        className={`team-logo-fallback ${className}`}
        style={{
          width: size, height: size,
          background: `${color}22`,
          border: `2px solid ${color}55`,
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: Math.round(size * 0.34), fontWeight: 900,
          color, flexShrink: 0, letterSpacing: "-0.03em",
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={logoUrl(abbr)}
      alt={teamName(abbr)}
      width={size}
      height={size}
      className={`team-logo ${className}`}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

// ===========================================================================
// ModelSummary — transparent model card
// ===========================================================================

function ModelSummary({ meta }) {
  if (!meta) return null;
  return (
    <div className="model-summary-card">
      <div className="model-summary-header">
        <span className="model-summary-icon">🧠</span>
        <h3 className="model-summary-title">Model Summary</h3>
        <span className="model-accuracy-chip">{meta.accuracy} accurate</span>
      </div>

      <div className="model-summary-grid">
        <div className="model-stat">
          <span className="model-stat-label">Model type</span>
          <span className="model-stat-value">{meta.model_type}</span>
        </div>
        <div className="model-stat">
          <span className="model-stat-label">Evaluation</span>
          <span className="model-stat-value">Expanding-window weekly backtest</span>
        </div>
        <div className="model-stat">
          <span className="model-stat-label">Trained on</span>
          <span className="model-stat-value">
            {meta.n_train_games?.toLocaleString()} games · {meta.train_seasons?.[0]}–
            {meta.train_seasons?.[meta.train_seasons.length - 1]}
          </span>
        </div>
        <div className="model-stat">
          <span className="model-stat-label">Tested on</span>
          <span className="model-stat-value">
            {meta.n_test_games} games · {meta.test_season} season
          </span>
        </div>
      </div>

      <div className="model-inputs-section">
        <p className="model-inputs-label">What the model sees</p>
        <div className="model-inputs-list">
          {(meta.feature_categories || []).map((feat, i) => (
            <span key={i} className="model-input-chip">{feat}</span>
          ))}
        </div>
      </div>

      {meta.market_note && (
        <p className="model-market-note">
          <span className="model-market-note-label">⚖️ On market data: </span>
          {meta.market_note}
        </p>
      )}
    </div>
  );
}

// ===========================================================================
// FieldGraphic — SVG mini football field with key battle banner
// ===========================================================================

function FieldGraphic({ game }) {
  const awayColor  = teamColor(game.away_team, "#1a5276");
  const homeColor  = teamColor(game.home_team, "#1a3a1a");
  const awaySecond = teamSecondary(game.away_team, "#888");
  const homeSecond = teamSecondary(game.home_team, "#888");

  // Extract just the factor name for the banner
  const keyName = game.key_battle
    ? game.key_battle.split(":")[0]
    : "Key Battle";
  const keyTeam = game.key_battle
    ? game.key_battle.split(": ")[1]?.split(" has")[0]
    : "";

  return (
    <div className="field-graphic-wrap">
      <svg
        viewBox="0 0 480 180"
        xmlns="http://www.w3.org/2000/svg"
        className="field-svg"
        role="img"
        aria-label={`Field graphic showing ${game.away_team} vs ${game.home_team}`}
      >
        {/* Grass background */}
        <defs>
          <linearGradient id={`awayGrad-${game.away_team}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={awayColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1a3a1a" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`homeGrad-${game.home_team}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1a3a1a" stopOpacity="0.9" />
            <stop offset="100%" stopColor={homeColor} stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Main field — dark green */}
        <rect width="480" height="180" fill="#1a3a1a" rx="10" />

        {/* Alternating grass stripes */}
        {[0,1,2,3,4,5,6,7].map((i) => (
          <rect
            key={i}
            x={60 + i * 45}
            y="0"
            width="45"
            height="180"
            fill={i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent"}
          />
        ))}

        {/* Yard lines */}
        {[105, 150, 195, 240, 285, 330, 375].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="180"
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        ))}

        {/* End zone — away (left) */}
        <rect x="0" y="0" width="60" height="180"
          fill={`url(#awayGrad-${game.away_team})`} rx="10" />
        <rect x="50" y="0" width="10" height="180" fill="#1a3a1a" />

        {/* End zone — home (right) */}
        <rect x="420" y="0" width="60" height="180"
          fill={`url(#homeGrad-${game.home_team})`} rx="10" />
        <rect x="420" y="0" width="10" height="180" fill="#1a3a1a" />

        {/* Away team end zone label */}
        <text
          x="30" y="95" textAnchor="middle" dominantBaseline="middle"
          fill={awaySecond} fontSize="13" fontWeight="900"
          letterSpacing="1"
          style={{ textTransform: "uppercase" }}
        >
          {game.away_team}
        </text>

        {/* Home team end zone label */}
        <text
          x="450" y="95" textAnchor="middle" dominantBaseline="middle"
          fill={homeSecond} fontSize="13" fontWeight="900"
          letterSpacing="1"
        >
          {game.home_team}
        </text>

        {/* 50-yard line marker */}
        <line x1="240" y1="10" x2="240" y2="170"
          stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <text x="240" y="174" textAnchor="middle"
          fill="rgba(255,255,255,0.35)" fontSize="9">50</text>

        {/* Key battle banner — centred on field */}
        <rect x="120" y="60" width="240" height="60" rx="8"
          fill="rgba(5,8,20,0.85)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

        <text x="240" y="84" textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.5)" fontSize="9" fontWeight="700"
          letterSpacing="2" style={{ textTransform: "uppercase" }}>
          KEY BATTLE
        </text>

        <text x="240" y="104" textAnchor="middle" dominantBaseline="middle"
          fill="#ffffff" fontSize="14" fontWeight="800">
          {keyName}
        </text>

        {keyTeam && (
          <text x="240" y="118" textAnchor="middle" dominantBaseline="middle"
            fill="#10b981" fontSize="11" fontWeight="700">
            {keyTeam} edge
          </text>
        )}
      </svg>
    </div>
  );
}

// ===========================================================================
// TeamComparisonPanel — side-by-side factor comparison
// ===========================================================================

function TeamComparisonPanel({ game }) {
  const { football_factors = [], home_team, away_team } = game;
  const awayColor = readableTeamColor(away_team);
  const homeColor = readableTeamColor(home_team);

  return (
    <div className="comparison-panel">
      {/* Header row */}
      <div className="comparison-header">
        <span
          className="comparison-team-label"
          style={{ color: awayColor, borderColor: `${awayColor}50`, background: `${awayColor}15` }}
        >
          {away_team}
        </span>
        <span className="comparison-center-label">Factor</span>
        <span
          className="comparison-team-label"
          style={{ color: homeColor, borderColor: `${homeColor}50`, background: `${homeColor}15` }}
        >
          {home_team}
        </span>
      </div>

      {/* Factor rows */}
      {football_factors.map((factor) => {
        const awayLeads = factor.advantage_team === away_team;
        const homeLeads = factor.advantage_team === home_team;
        const color = TIER_COLOR[factor.tier];
        const pct = (factor.score / 10) * 100;

        return (
          <div key={factor.name} className="comparison-row">
            {/* Away side */}
            <div className="comparison-side comparison-side-away">
              {awayLeads && !factor.tier === "weak" && (
                <div
                  className="comparison-bar-away"
                  style={{ width: `${pct}%`, background: color }}
                />
              )}
              {awayLeads && (
                <span
                  className="comparison-edge-chip"
                  style={{ color, borderColor: `${color}40`, background: `${color}18` }}
                >
                  {factor.tier !== "weak" ? `${factor.score.toFixed(1)}/10` : "slight"}
                </span>
              )}
            </div>

            {/* Center — factor name */}
            <div className="comparison-center">
              <span className="comparison-factor-name">{factor.name}</span>
              {factor.tier === "weak" && (
                <span className="comparison-even-note">~Even</span>
              )}
            </div>

            {/* Home side */}
            <div className="comparison-side comparison-side-home">
              {homeLeads && (
                <span
                  className="comparison-edge-chip"
                  style={{ color, borderColor: `${color}40`, background: `${color}18` }}
                >
                  {factor.tier !== "weak" ? `${factor.score.toFixed(1)}/10` : "slight"}
                </span>
              )}
              {homeLeads && (
                <div
                  className="comparison-bar-home"
                  style={{ width: `${pct}%`, background: color }}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="comparison-legend">
        <span className="legend-dot" style={{ background: TIER_COLOR.strong }} />
        <span>Strong edge</span>
        <span className="legend-dot" style={{ background: TIER_COLOR.medium }} />
        <span>Medium edge</span>
        <span className="legend-dot" style={{ background: TIER_COLOR.weak }} />
        <span>Minor factor</span>
      </div>
    </div>
  );
}

// ===========================================================================
// CurrentSeasonSection — educational readiness panel
// ===========================================================================

function CurrentSeasonSection({ note }) {
  return (
    <div className="current-season-section">
      <div className="current-season-header">
        <span className="current-season-icon">📡</span>
        <h3 className="current-season-title">Current Season Ready</h3>
        <span className="current-season-badge">Architecture in place</span>
      </div>
      <p className="current-season-note">{note}</p>
      <div className="current-season-steps">
        {[
          { icon: "🔄", title: "Weekly refresh", desc: "nflfastR data updates after every game day" },
          { icon: "✅", title: "Pre-game only", desc: "Only completed games are used to build features — no future data leaks" },
          { icon: "🎯", title: "Predict upcoming", desc: "Matchup rows built for games with no final score yet" },
          { icon: "📊", title: "Post-game autopsy", desc: "Model picks compared to actual results every week" },
        ].map((step, i) => (
          <div key={i} className="current-season-step">
            <span className="step-icon">{step.icon}</span>
            <div>
              <p className="step-title">{step.title}</p>
              <p className="step-desc">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// Platform Home — editorial analytics surface
// ===========================================================================

const FACTOR_LIBRARY = [
  {
    name: "QB Efficiency",
    stat: "QB EPA/play",
    summary: "Separates quarterbacks who create value snap after snap from quarterbacks living on isolated highlights.",
    explanation: "Efficient quarterback play keeps the offense on schedule, survives third down, and creates explosive plays without needing perfect field position.",
  },
  {
    name: "Turnovers",
    stat: "Margin",
    summary: "Tracks the possession swings that erase clean statistical edges in one or two plays.",
    explanation: "Turnovers change win probability because they combine lost possessions with short fields. A two-turnover swing can overwhelm a better EPA profile.",
  },
  {
    name: "Pressure",
    stat: "Sack pressure",
    summary: "Measures whether pass rush and protection are likely to break the rhythm of a game.",
    explanation: "Pressure forces checkdowns, rushed throws, negative plays, and stalled drives even when the defense does not finish with a sack.",
  },
  {
    name: "EPA",
    stat: "EPA/play",
    summary: "The cleanest down-to-down measure of whether a team is creating real football value.",
    explanation: "Expected Points Added values every snap by game situation. Teams winning EPA/play are usually sustaining offense, preventing empty yards, and avoiding fragile scripts.",
  },
  {
    name: "Success Rate",
    stat: "On-schedule rate",
    summary: "Shows which team is repeatedly staying ahead of the chains instead of relying on one-off explosives.",
    explanation: "Success rate is predictive because manageable second and third downs create repeatable drives. It catches boring efficiency before the scoreboard does.",
  },
];

const PIPELINE_STEPS = ["NFL Data", "Rolling Features", "Prediction", "Autopsy", "Improvement"];

function winnerProb(game) {
  return game.predicted_winner === game.home_team ? game.home_win_prob : game.away_win_prob;
}

function strongestFactor(game) {
  const diagnosisCards = game.factor_cards || game.game_diagnosis?.factor_cards || [];
  const cards = diagnosisCards.length ? diagnosisCards : game.football_factors || [];
  return [...cards].sort((a, b) =>
    (b.contribution_strength ?? b.score ?? 0) - (a.contribution_strength ?? a.score ?? 0)
  )[0];
}

function diagnosisFor(game) {
  return game.game_diagnosis || {
    headline: game.headline,
    football_story: game.football_story || game.explanation_summary || game.explanation,
    primary_reason: game.primary_reason,
    secondary_reason: game.secondary_reason,
    risk_factor: game.risk_factor,
    flip_scenarios: game.flip_scenarios,
    market_context: game.market_context,
    factor_cards: game.factor_cards,
    trust_metadata: game.trust_metadata,
    learning_module: game.learning_module,
  };
}

function factorCardsFor(game) {
  const diagnosis = diagnosisFor(game);
  if (diagnosis?.factor_cards?.length) return diagnosis.factor_cards;
  return (game.football_factors || []).map((factor) => ({
    name: factor.name,
    advantage_team: factor.advantage_team,
    status: factor.tier === "weak" ? "MINOR" : factor.tier === "medium" ? "MODERATE" : "DECISIVE",
    football_translation: factor.reason,
    why_it_matters: FACTOR_NOTES[factor.name] || factor.reason,
    contribution_strength: Math.max(factor.score || 0, 0) / 10,
  }));
}

function contributionPercent(card, cards) {
  const total = cards.reduce((sum, item) => sum + Math.max(item.contribution_strength || 0, 0), 0);
  if (!total) return 0;
  return Math.round((Math.max(card.contribution_strength || 0, 0) / total) * 100);
}

function topMeaningfulFactors(game, limit = 3) {
  const cards = factorCardsFor(game);
  const meaningful = cards.filter((card) => card.status === "DECISIVE" || card.status === "MODERATE");
  return (meaningful.length ? meaningful : cards)
    .sort((a, b) => (b.contribution_strength || 0) - (a.contribution_strength || 0))
    .slice(0, limit);
}

function marketContextFor(game) {
  return diagnosisFor(game)?.market_context || {};
}

function spreadText(game) {
  const market = marketContextFor(game);
  const spread = market.spread_line ?? game.spread_line;
  if (spread === undefined || spread === null) return "Unavailable";
  if (Number(spread) === 0) return "Pick'em";
  const favorite = Number(spread) > 0 ? game.home_team : game.away_team;
  return `${favorite} ${Math.abs(Number(spread)).toFixed(1)}`;
}

function weekLabel(week) {
  return Number(week) === 22 ? "Super Bowl" : `Week ${week}`;
}

function formatGameDate(game, options = {}) {
  if (!game?.game_date) return "Date TBA";
  const date = new Date(`${game.game_date}T12:00:00`);
  const dateText = new Intl.DateTimeFormat("en-US", {
    weekday: options.short ? "short" : "long",
    month: "short",
    day: "numeric",
    year: options.year ? "numeric" : undefined,
  }).format(date);
  return game.gametime ? `${dateText} · ${game.gametime}` : dateText;
}

function matchupLabel(game) {
  return `${game.away_team} at ${game.home_team}`;
}

function EditorialNav() {
  return (
    <nav className="platform-nav">
      <a href="#top" className="platform-brand">NFL Matchup Lab</a>
      <div className="platform-links">
        {["Predictions", "Methodology", "Current Season", "Learn Football Analytics", "Leaderboard", "Community"].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase().replaceAll(" ", "-")}`}
          >
            {item}
          </a>
        ))}
      </div>
    </nav>
  );
}

function StadiumGraphic({ compact = false }) {
  return (
    <div className={`stadium-graphic ${compact ? "stadium-graphic-compact" : ""}`} aria-hidden="true">
      <div className="stadium-light-bank left">
        <span /><span /><span /><span />
      </div>
      <div className="stadium-light-bank right">
        <span /><span /><span /><span />
      </div>
      <div className="stadium-scoreboard">
        <span>WIN PROBABILITY</span>
        <strong>LIVE MODEL</strong>
      </div>
      <div className="stadium-bowl tier-one" />
      <div className="stadium-bowl tier-two" />
      <div className="stadium-bowl tier-three" />
      <div className="stadium-turf" />
    </div>
  );
}

function SectionBroadcastBanner({ label, title }) {
  return (
    <div className="section-broadcast-banner" aria-hidden="true">
      <StadiumGraphic compact />
      <div className="broadcast-copy">
        <span>{label}</span>
        <strong>{title}</strong>
      </div>
    </div>
  );
}

function EditorialHero({ firstWeek }) {
  return (
    <section id="top" className="platform-hero">
      <div className="field-grid" />
      <div className="crimson-bloom" />
      <StadiumGraphic />
      <div className="platform-hero-copy">
        <p className="edition-label">Football intelligence platform</p>
        <h1>NFL MATCHUP LAB</h1>
        <p className="platform-subheadline">Understand WHY teams win.</p>
        <div className="hero-actions">
          <a href="#current-season" className="hero-cta primary">Explore Week {firstWeek || 1}</a>
          <a href="#methodology" className="hero-cta secondary">How Model Works</a>
        </div>
      </div>
      <div className="hero-market-panel" aria-label="Model signal board">
        <span>Signal Board</span>
        <strong>EPA + QB + Pressure</strong>
        <p>Football diagnosis separated from market context.</p>
      </div>
    </section>
  );
}

function TransparencyTiles({ meta }) {
  const tiles = [
    ["Model", "Logistic Regression"],
    ["Accuracy", meta?.accuracy || "71% Historical Accuracy"],
    ["Signals", "52 Football Signals"],
    ["Market", "Vegas Context Only"],
    ["Validation", "Historical Backtest"],
  ];

  return (
    <section id="methodology" className="platform-section transparency-section">
      <div className="section-kicker">Model Transparency</div>
      <div className="transparency-grid">
        {tiles.map(([label, value]) => (
          <div className="transparency-tile" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function FactorLibrary() {
  const [active, setActive] = useState(FACTOR_LIBRARY[0]);

  return (
    <section id="learn-football-analytics" className="platform-section factor-library-section">
      <div className="section-kicker">Football Factor Library</div>
      <div className="factor-library">
        <div className="factor-library-list">
          {FACTOR_LIBRARY.map((factor) => (
            <button
              key={factor.name}
              className={`library-card ${active.name === factor.name ? "library-card-active" : ""}`}
              onClick={() => setActive(factor)}
            >
              <span>{factor.stat}</span>
              <strong>{factor.name}</strong>
              <p>{factor.summary}</p>
            </button>
          ))}
        </div>
        <aside className="library-explainer">
          <span>Selected factor</span>
          <h3>{active.name}</h3>
          <p>{active.explanation}</p>
        </aside>
      </div>
    </section>
  );
}

function WeeklyHub({ weeks, selectedWeek, onWeekChange, games, onOpen }) {
  const largestFavorite = [...games].sort((a, b) => winnerProb(b) - winnerProb(a))[0];
  const closest = [...games].sort((a, b) =>
    Math.abs(a.home_win_prob - 0.5) - Math.abs(b.home_win_prob - 0.5)
  )[0];
  const upsetRisk = [...games].sort((a, b) => a.confidence_score - b.confidence_score)[0];
  const factorCounts = games.reduce((acc, game) => {
    const factor = strongestFactor(game)?.name || "Balanced profile";
    acc[factor] = (acc[factor] || 0) + 1;
    return acc;
  }, {});
  const weeklyFactor = Object.entries(factorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Balanced profile";

  const hubItems = [
    ["Largest Favorite", largestFavorite, largestFavorite && `${largestFavorite.predicted_winner} ${(winnerProb(largestFavorite) * 100).toFixed(1)}%`],
    ["Closest Matchup", closest, closest && matchupLabel(closest)],
    ["Highest Upset Risk", upsetRisk, upsetRisk && matchupLabel(upsetRisk)],
    ["Most Important Factor This Week", null, weeklyFactor],
  ];

  return (
    <section id="current-season" className="platform-section weekly-hub-section">
      <SectionBroadcastBanner label="Broadcast view" title="Weekly command center" />
      <div className="weekly-hub-head">
        <div>
          <div className="section-kicker">Weekly Hub</div>
          <h2>{weekLabel(selectedWeek)} command center</h2>
        </div>
        <div className="week-selector" role="tablist" aria-label="Week selector">
          {weeks.map((week) => (
            <button
              key={week}
              className={week === selectedWeek ? "week-active" : ""}
              onClick={() => onWeekChange(week)}
            >
              {weekLabel(week)}
            </button>
          ))}
        </div>
      </div>

      <div className="weekly-metrics">
        {hubItems.map(([label, game, value]) => (
          <button
            key={label}
            className="weekly-metric"
            onClick={() => game && onOpen(game)}
            disabled={!game}
          >
            <span>{label}</span>
            <strong>{value || "Unavailable"}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function MatchupStrip({ game, onOpen }) {
  const homeIsWinner = game.predicted_winner === game.home_team;
  const pickColor = homeIsWinner ? readableTeamColor(game.home_team) : readableTeamColor(game.away_team);
  const factor = strongestFactor(game);
  const story = game.football_story || game.explanation_summary || game.explanation || game.key_battle;

  return (
    <article className="matchup-strip">
      <div className="strip-teams">
        <div className="strip-team">
          <TeamLogo abbr={game.away_team} size={42} />
          <span>{game.away_team}</span>
          <small>{(game.away_win_prob * 100).toFixed(1)}%</small>
        </div>
        <span className="strip-at">at</span>
        <div className="strip-team">
          <TeamLogo abbr={game.home_team} size={42} />
          <span>{game.home_team}</span>
          <small>{(game.home_win_prob * 100).toFixed(1)}%</small>
        </div>
      </div>
      <div className="strip-diagnosis">
        <span className="strip-label">{weekLabel(game.week)} · {formatGameDate(game, { short: true })}</span>
        <h3 style={{ color: pickColor }}>{game.predicted_winner} {(winnerProb(game) * 100).toFixed(1)}%</h3>
        <p>{story}</p>
      </div>
      <div className="strip-factor">
        <span>Primary signal</span>
        <strong>{factor?.name || "Balanced"}</strong>
        <small>{factor?.advantage_team || "No edge"}</small>
      </div>
      <button className="strip-open" onClick={() => onOpen(game)}>Open Lab</button>
    </article>
  );
}

function FilmStripCard({ game, onOpen }) {
  const homeIsWinner = game.predicted_winner === game.home_team;
  const pickColor = homeIsWinner ? readableTeamColor(game.home_team) : readableTeamColor(game.away_team);
  const factors = topMeaningfulFactors(game, 2);

  return (
    <button className="film-card" onClick={() => onOpen(game)}>
      <div className="film-card-week">{weekLabel(game.week)} · {formatGameDate(game, { short: true })}</div>
      <div className="film-card-teams">
        <div>
          <TeamLogo abbr={game.away_team} size={68} />
          <span>{game.away_team}</span>
        </div>
        <strong>at</strong>
        <div>
          <TeamLogo abbr={game.home_team} size={68} />
          <span>{game.home_team}</span>
        </div>
      </div>
      <div className="film-card-pick">
        <span>Model edge</span>
        <strong style={{ color: pickColor }}>{game.predicted_winner} {(winnerProb(game) * 100).toFixed(1)}%</strong>
      </div>
      <div className="film-card-factors">
        {factors.map((factor) => (
          <span key={factor.name}>{factor.name}</span>
        ))}
      </div>
    </button>
  );
}

function TopModelFilmStrip({ games, onOpen }) {
  const topGames = [...games].sort((a, b) => winnerProb(b) - winnerProb(a)).slice(0, 3);
  const topFactorNames = [
    ...new Set(topGames.flatMap((game) => topMeaningfulFactors(game, 1).map((factor) => factor.name))),
  ];

  return (
    <section className="platform-section film-strip-section">
      <SectionBroadcastBanner label="Film room" title="Top confidence tape" />
      <div className="film-strip-head">
        <div>
          <div className="section-kicker">Top model picks</div>
          <p className="film-strip-note">
            AI read: these are the three strongest model edges this week because their win probabilities
            separate furthest from 50/50 and the diagnosis shows clear football leverage
            {topFactorNames.length ? ` through ${topFactorNames.join(", ")}.` : "."}
          </p>
        </div>
        <h2>{topGames[0] ? weekLabel(topGames[0].week) : ""} film strip</h2>
      </div>
      <div className="film-strip">
        {topGames.map((game) => (
          <FilmStripCard key={`${game.season}-${game.week}-${game.away_team}-${game.home_team}`} game={game} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function PredictionFeed({ games, onOpen }) {
  return (
    <section id="predictions" className="platform-section prediction-feed-section">
      <SectionBroadcastBanner label="Terminal feed" title="Data to football meaning" />
      <div className="section-kicker">Prediction Feed</div>
      <div className="magazine-feed">
        {games.map((game) => (
          <MatchupStrip key={`${game.season}-${game.week}-${game.away_team}-${game.home_team}`} game={game} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function LiveSeasonPipeline() {
  return (
    <section className="platform-section pipeline-section">
      <SectionBroadcastBanner label="Operations" title="Live season pipeline" />
      <div className="section-kicker">Live Season Pipeline</div>
      <div className="pipeline-track">
        {PIPELINE_STEPS.map((step, index) => (
          <div className="pipeline-step" key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommunitySection() {
  return (
    <section id="community" className="platform-section community-platform-section">
      <div>
        <div className="section-kicker">Community</div>
        <h2>Coming Soon</h2>
      </div>
      <div className="community-preview-grid">
        <div>Prediction competition</div>
        <div>Discussion</div>
        <div>Model challenge</div>
      </div>
    </section>
  );
}

function DetailHeroPremium({ game }) {
  const homeIsWinner = game.predicted_winner === game.home_team;
  const awayColor = readableTeamColor(game.away_team);
  const homeColor = readableTeamColor(game.home_team);
  const confColor = CONF_COLOR[game.confidence_label] || "#9ca3af";

  return (
    <section className="premium-hero">
      <div className="premium-matchup-row">
        <div className="premium-team">
          <TeamLogo abbr={game.away_team} size={110} />
          <strong style={{ color: !homeIsWinner ? awayColor : "#8b95a8" }}>{game.away_team}</strong>
          <span>{teamName(game.away_team)}</span>
        </div>
        <div className="premium-pick-core">
          <span>{weekLabel(game.week)} · {formatGameDate(game, { short: true, year: true })}</span>
          <h1>{game.predicted_winner} {(winnerProb(game) * 100).toFixed(1)}%</h1>
          <p>Model edge</p>
        </div>
        <div className="premium-team">
          <TeamLogo abbr={game.home_team} size={110} />
          <strong style={{ color: homeIsWinner ? homeColor : "#8b95a8" }}>{game.home_team}</strong>
          <span>{teamName(game.home_team)}</span>
        </div>
      </div>
      <div className="premium-prob-split">
        <div style={{ width: `${game.away_win_prob * 100}%`, background: awayColor }} />
        <div style={{ width: `${game.home_win_prob * 100}%`, background: homeColor }} />
      </div>
      <div className="premium-game-meta">
        <div><span>Confidence</span><strong style={{ color: confColor }}>{game.confidence_label}</strong></div>
        <div><span>Date</span><strong>{formatGameDate(game, { short: true })}</strong></div>
        <div><span>Spread</span><strong>{spreadText(game)}</strong></div>
        <div><span>Venue</span><strong>{game.location === "Neutral" ? "Neutral site" : game.stadium || `${game.home_team} home field`}</strong></div>
      </div>
    </section>
  );
}

function GameDiagnosisPanel({ game }) {
  const diagnosis = diagnosisFor(game);
  const sentences = [
    diagnosis?.primary_reason,
    diagnosis?.secondary_reason,
    diagnosis?.risk_factor,
  ].filter(Boolean).slice(0, 3);

  return (
    <section className="premium-section diagnosis-panel">
      <span className="section-kicker">Game diagnosis</span>
      <h2>WHY {game.predicted_winner} HAS EDGE</h2>
      <div className="diagnosis-sentences">
        {sentences.map((sentence, index) => (
          <p key={index}>{sentence}</p>
        ))}
      </div>
    </section>
  );
}

function DecidingFactors({ game }) {
  const cards = factorCardsFor(game);
  const top = topMeaningfulFactors(game, 3);
  const minor = cards.filter((card) => !top.includes(card));

  return (
    <section className="premium-section deciding-panel">
      <span className="section-kicker">3 deciding factors</span>
      <div className="deciding-grid">
        {top.map((factor) => (
          <article className="deciding-card" key={factor.name}>
            <span>{factor.status}</span>
            <h3>{factor.name}</h3>
            <p>{factor.football_translation}</p>
          </article>
        ))}
      </div>
      {minor.length > 0 && (
        <div className="minor-collapse">
          <strong>Not separating teams</strong>
          <span>{minor.map((factor) => factor.name).join(" / ")}</span>
        </div>
      )}
    </section>
  );
}

function FactorLab({ game }) {
  const cards = factorCardsFor(game);
  return (
    <section className="premium-section factor-lab-panel">
      <span className="section-kicker">Factor lab</span>
      <h2>Contribution importance</h2>
      <div className="contribution-list">
        {cards.map((factor) => {
          const pct = contributionPercent(factor, cards);
          return (
            <div className="contribution-row" key={factor.name}>
              <div>
                <strong>{factor.name}</strong>
                <span>{factor.advantage_team === "Even" ? "No clear edge" : `${factor.advantage_team} edge`}</span>
              </div>
              <div className="contribution-track">
                <div style={{ width: `${pct}%` }} />
              </div>
              <b>+{pct}%</b>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FootballFieldLab() {
  const [zone, setZone] = useState("QB zone");
  const zones = {
    "QB zone": "Quarterback efficiency decides whether the offense creates value without perfect field position.",
    "Pressure zone": "Pass rush changes timing and can turn normal downs into stalled drives.",
    "Turnover swing zone": "One short-field turnover can flip the entire probability shape.",
    "Red zone": "EPA edges matter most when drives become touchdown-or-field-goal decisions.",
  };

  return (
    <section className="premium-section field-lab-panel">
      <span className="section-kicker">Football field graphic</span>
      <div className="field-lab">
        <div className="interactive-field">
          {Object.keys(zones).map((name) => (
            <button
              key={name}
              className={`field-zone ${zone === name ? "field-zone-active" : ""} ${name.toLowerCase().replaceAll(" ", "-")}`}
              onClick={() => setZone(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <aside>
          <h3>{zone}</h3>
          <p>{zones[zone]}</p>
        </aside>
      </div>
    </section>
  );
}

function TeamContributionMirror({ game }) {
  const cards = factorCardsFor(game);
  return (
    <section className="premium-section mirror-panel">
      <span className="section-kicker">Team comparison</span>
      <h2>Mirrored contribution chart</h2>
      <div className="mirror-chart">
        {cards.map((factor) => {
          const pct = contributionPercent(factor, cards);
          const awayLeads = factor.advantage_team === game.away_team;
          const homeLeads = factor.advantage_team === game.home_team;
          return (
            <div className="mirror-row" key={factor.name}>
              <div className="mirror-side away">
                {awayLeads && <span style={{ width: `${pct}%` }} />}
              </div>
              <strong>{factor.name}</strong>
              <div className="mirror-side home">
                {homeLeads && <span style={{ width: `${pct}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mirror-labels">
        <span>{game.away_team}</span>
        <span>{game.home_team}</span>
      </div>
    </section>
  );
}

function MarketContextPanel({ game }) {
  const market = marketContextFor(game);
  return (
    <section className="premium-section market-context-panel">
      <span className="section-kicker">Market context</span>
      <div className="market-context-grid">
        <div><span>Spread</span><strong>{spreadText(game)}</strong></div>
        <div><span>Market favorite</span><strong>{market.market_favorite || "Unavailable"}</strong></div>
        <div><span>Role</span><strong>{market.market_role || "context_only"}</strong></div>
      </div>
      <p>{market.interpretation || game.market_note}</p>
    </section>
  );
}

function FlipScenarioCards({ game }) {
  const scenarios = diagnosisFor(game)?.flip_scenarios || getFlipScenarios(game);
  return (
    <section className="premium-section flip-card-panel">
      <span className="section-kicker">What flips game</span>
      <div className="flip-card-grid">
        {scenarios.slice(0, 3).map((scenario, index) => (
          <article className="flip-card" key={scenario}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{scenario}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FootballLesson({ game }) {
  const lesson = diagnosisFor(game)?.learning_module || {
    concept: "EPA/play",
    simple_explanation: "Measures how much value a team creates every snap.",
    why_predictive: "Teams generating positive EPA sustain offense better.",
  };
  return (
    <section className="premium-section lesson-panel">
      <span className="section-kicker">Football lesson</span>
      <div className="lesson-layout">
        <div className="lesson-graphic">
          <span>Snap</span>
          <strong>EPA</strong>
          <span>Drive value</span>
        </div>
        <div>
          <h2>{lesson.concept}</h2>
          <p>{lesson.simple_explanation}</p>
          <p>{lesson.why_predictive}</p>
        </div>
      </div>
    </section>
  );
}

function ModelTransparencyPremium({ game }) {
  const meta = game.model_meta || {};
  const trust = diagnosisFor(game)?.trust_metadata || {};
  const importance = (game.explanation_factors || []).slice(0, 4);
  return (
    <section className="premium-section transparency-premium-panel">
      <span className="section-kicker">Model transparency</span>
      <div className="transparency-premium-grid">
        <div><span>Inputs used</span><strong>{meta.feature_categories?.length || 52} signals</strong></div>
        <div><span>Training seasons</span><strong>{meta.train_seasons?.[0]}-{meta.train_seasons?.at?.(-1) || meta.train_seasons?.[meta.train_seasons.length - 1]}</strong></div>
        <div><span>Accuracy</span><strong>{meta.accuracy || trust.backtest_accuracy}</strong></div>
        <div><span>Market dependency</span><strong>{trust.market_role || "context_only"}</strong></div>
        <div><span>Data freshness</span><strong>{trust.feature_timestamp || "Pregame"}</strong></div>
      </div>
      {importance.length > 0 && (
        <div className="feature-importance-list">
          {importance.map((item) => (
            <span key={item.feature}>{item.label || item.feature}</span>
          ))}
        </div>
      )}
    </section>
  );
}

// ===========================================================================
// RailCard
// ===========================================================================

function RailCard({ game, onOpen }) {
  const confColor  = CONF_COLOR[game.confidence_label] || "#6b7280";
  const winnerProb = game.predicted_winner === game.home_team
    ? game.home_win_prob : game.away_win_prob;
  const awayColor  = readableTeamColor(game.away_team);
  const homeColor  = readableTeamColor(game.home_team);

  return (
    <div
      className="rail-card"
      onClick={() => onOpen(game)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(game)}
      style={{
        borderColor: game.predicted_winner === game.home_team
          ? `${homeColor}40` : `${awayColor}40`,
        borderTopColor: game.predicted_winner === game.home_team ? homeColor : awayColor,
        borderTopWidth: "3px",
      }}
    >
      <div className="rail-card-top">
        <span className="rail-week">Wk {game.week}</span>
        <span className="conf-badge"
          style={{ background: `${confColor}20`, color: confColor, borderColor: `${confColor}50` }}>
          {game.confidence_label}
        </span>
      </div>

      <div className="rail-matchup">
        <div className="rail-team-side">
          <TeamLogo abbr={game.away_team} size={40} />
          <span
            className={`rail-team ${game.predicted_winner === game.away_team ? "rail-team-win" : ""}`}
            style={game.predicted_winner === game.away_team ? { color: awayColor } : {}}
          >
            {game.away_team}
          </span>
        </div>
        <span className="rail-at">@</span>
        <div className="rail-team-side">
          <TeamLogo abbr={game.home_team} size={40} />
          <span
            className={`rail-team ${game.predicted_winner === game.home_team ? "rail-team-win" : ""}`}
            style={game.predicted_winner === game.home_team ? { color: homeColor } : {}}
          >
            {game.home_team}
          </span>
        </div>
      </div>

      <div className="rail-prob" style={{ color: game.predicted_winner === game.home_team ? homeColor : awayColor }}>
        {(winnerProb * 100).toFixed(1)}%
      </div>

      <div className="rail-winner">▲ {game.predicted_winner}</div>

      <FactorBadges factors={game.football_factors || []} />
    </div>
  );
}

// ===========================================================================
// AllGamesCard
// ===========================================================================

function AllGamesCard({ game, onOpen }) {
  const confColor    = CONF_COLOR[game.confidence_label] || "#6b7280";
  const homeIsWinner = game.predicted_winner === game.home_team;
  const winnerProb   = homeIsWinner ? game.home_win_prob : game.away_win_prob;
  const winnerColor  = homeIsWinner ? readableTeamColor(game.home_team) : readableTeamColor(game.away_team);

  const topFactors = [...(game.football_factors || [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div
      className="game-card"
      style={{
        borderColor: `${winnerColor}30`,
        borderTopColor: winnerColor,
        borderTopWidth: "3px",
      }}
    >
      {/* Header */}
      <div className="game-card-header">
        <div className="game-meta">
          <span className="game-week">Week {game.week}</span>
          <span className="game-season">{game.season}</span>
        </div>
        <span className="conf-badge"
          style={{ background: `${confColor}20`, color: confColor, borderColor: `${confColor}50` }}>
          {game.confidence_label}
        </span>
      </div>

      {/* Matchup */}
      <div className="game-matchup">
        <div className="matchup-team-block">
          <TeamLogo abbr={game.away_team} size={52} />
          <span
            className="team-abbr"
            style={{ color: !homeIsWinner ? readableTeamColor(game.away_team) : "#64748b" }}
          >
            {game.away_team}
          </span>
        </div>
        <span className="matchup-sep">@</span>
        <div className="matchup-team-block">
          <TeamLogo abbr={game.home_team} size={52} />
          <span
            className="team-abbr"
            style={{ color: homeIsWinner ? readableTeamColor(game.home_team) : "#64748b" }}
          >
            {game.home_team}
          </span>
        </div>
      </div>

      {/* Probability split bar */}
      <div className="prob-split-bar">
        <div style={{
          width: `${game.away_win_prob * 100}%`, height: "100%",
          background: !homeIsWinner ? readableTeamColor(game.away_team) : "#2d3748",
          borderRadius: "6px 0 0 6px",
        }} />
        <div style={{
          width: `${game.home_win_prob * 100}%`, height: "100%",
          background: homeIsWinner ? readableTeamColor(game.home_team) : "#2d3748",
          borderRadius: "0 6px 6px 0",
        }} />
      </div>
      <div className="prob-split-labels">
        <span style={{ color: !homeIsWinner ? readableTeamColor(game.away_team) : "#64748b", fontSize: 12 }}>
          {game.away_team} {(game.away_win_prob * 100).toFixed(1)}%
        </span>
        <span style={{ color: homeIsWinner ? readableTeamColor(game.home_team) : "#64748b", fontSize: 12 }}>
          {game.home_team} {(game.home_win_prob * 100).toFixed(1)}%
        </span>
      </div>

      {/* Pick */}
      <div className="game-pick">
        <span className="pick-label">Model Pick</span>
        <span className="pick-winner" style={{ color: winnerColor }}>{game.predicted_winner}</span>
        <span className="pick-prob">{(winnerProb * 100).toFixed(1)}%</span>
      </div>

      {/* Key battle */}
      {game.key_battle && (
        <div className="key-battle-row">🔑 {game.key_battle}</div>
      )}

      {/* Top factors */}
      <div className="card-factors">
        {topFactors.map((f) => <FactorBar key={f.name} factor={f} />)}
      </div>

      <button className="open-lab-btn" style={{ borderColor: `${winnerColor}30` }}
        onClick={() => onOpen(game)}>
        Open Matchup Lab →
      </button>
    </div>
  );
}

// ===========================================================================
// MatchupDetail — full-screen overlay, reordered per spec
// ===========================================================================

function MatchupDetail({ game, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="detail-panel premium-detail-panel">
        <div className="detail-nav premium-detail-nav">
          <button className="detail-back" onClick={onClose}>Back to Predictions</button>
          <div className="detail-nav-badges">
            <span className="mode-chip">Film Room</span>
            <span className="mode-chip">Data to football meaning</span>
          </div>
        </div>

        <DetailHeroPremium game={game} />
        <GameDiagnosisPanel game={game} />
        <DecidingFactors game={game} />
        <FactorLab game={game} />
        <FootballFieldLab game={game} />
        <TeamContributionMirror game={game} />
        <MarketContextPanel game={game} />
        <FlipScenarioCards game={game} />
        <FootballLesson game={game} />
        <ModelTransparencyPremium game={game} />
      </div>
    </div>
  );
}

// ===========================================================================
// App
// ===========================================================================

export default function App() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading]          = useState(true);
  const [error, setError]              = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    // Dev: Vite proxies /predictions.json → http://127.0.0.1:8000/predictions (live backend)
    // Prod: Vite serves public/predictions.json as a static file
    fetch("/predictions.json")
      .then((r) => { if (!r.ok) throw new Error(`Server error ${r.status}`); return r.json(); })
      .then((data) => {
        setPredictions(data);
        const firstWeek = [...new Set(data.map((game) => game.week))].sort((a, b) => a - b)[0];
        if (firstWeek) setSelectedWeek(firstWeek);
      })
      .catch((e) => setError(e.message || "Could not reach the prediction server."))
      .finally(() => setLoading(false));
  }, []);

  const weeks = useMemo(
    () => [...new Set(predictions.map((game) => game.week))].sort((a, b) => a - b),
    [predictions]
  );

  const selectedWeekGames = useMemo(
    () => predictions
      .filter((game) => game.week === selectedWeek)
      .sort((a, b) => winnerProb(b) - winnerProb(a)),
    [predictions, selectedWeek]
  );

  const feedGames = useMemo(
    () => [...selectedWeekGames].sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      return winnerProb(b) - winnerProb(a);
    }),
    [selectedWeekGames]
  );

  const modelMeta = predictions[0]?.model_meta;

  if (selectedGame) {
    return <MatchupDetail game={selectedGame} onClose={() => setSelectedGame(null)} />;
  }

  return (
    <div className="app">
      <EditorialNav />
      <EditorialHero firstWeek={weeks[0]} />

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="state-box">
          <div className="spinner" />
          <p className="state-text">Loading game predictions…</p>
        </div>
      )}
      {error && (
        <div className="state-box error-box">
          <p className="state-text">{error}</p>
          <p className="error-hint">
            Make sure the backend is running:{" "}
            <code>python3 -m uvicorn src.api:app --reload</code>
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="platform-main">
          <WeeklyHub
            weeks={weeks}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
            games={selectedWeekGames}
            onOpen={setSelectedGame}
          />
          <TopModelFilmStrip games={selectedWeekGames} onOpen={setSelectedGame} />
          <PredictionFeed games={feedGames} onOpen={setSelectedGame} />
          <TransparencyTiles meta={modelMeta} />
          <FactorLibrary />
          <LiveSeasonPipeline />
          <section id="leaderboard" className="platform-section leaderboard-section">
            <div className="section-kicker">Leaderboard</div>
            <h2>Public pick tracking is warming up</h2>
            <p>Weekly scoreboards will rank model challengers by accuracy, upset calls, and calibration.</p>
          </section>
          <CommunitySection />
        </div>
      )}
    </div>
  );
}
