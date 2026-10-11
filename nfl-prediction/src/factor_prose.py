"""
factor_prose.py - plain-English reasoning layer for factor cards
=================================================================
Pure, template-driven text generation. There is NO model math here: this module
consumes values that api.py has already computed (edges, records, baselines) and
turns them into prose that reads like a smart friend explaining the game.

Every explanation follows one shape:  claim  ->  evidence  ->  implication
    - headline      : <= ~8 words, plain claim, no jargon
    - explanation   : 2-4 sentences (cause -> evidence w/ baseline -> what it
                      means for THIS matchup)
    - baseline_note : one concise, self-contained stat line for compact contexts

Guardrails (mirrors CLARK_REPORT_AND_VIRALITY_PLAN.md):
    - Template-driven only; degrade gracefully. A missing value narrows the
      sentence - it never emits "None"/"undefined"/an empty string.
    - No fabricated specifics beyond the numbers passed in.
    - All prose is written from the *advantage team's* perspective.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from src.odds import market_view


# ---------------------------------------------------------------------------
# Context object - everything a template might need, all optional/defaulted
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class FactorContext:
    name: str
    home: str
    away: str
    adv: str                       # advantage-team abbr
    opp: str                       # opponent abbr
    adv_is_home: bool

    contribution_strength: float = 0.0
    status: str = "NEUTRAL"

    # Market
    spread: float = 0.0            # convention: positive = home favored
    home_ml: int = 0
    away_ml: int = 0
    predicted_winner: str = ""

    # Recent-form differentials (home-minus-away sign convention)
    season_epa: float = 0.0
    last3_epa: float = 0.0
    season_epa_allowed: float = 0.0
    last3_epa_allowed: float = 0.0
    season_sr: float = 0.0
    last3_sr: float = 0.0
    last3_winpct: float = 0.0
    last3_ptdiff: float = 0.0

    # Absolute team last-3 values (from game_context), already adv/opp-resolved
    adv_last3_epa: float | None = None
    opp_last3_epa: float | None = None
    adv_pts_for: float | None = None
    adv_pts_ag: float | None = None
    opp_pts_for: float | None = None
    opp_pts_ag: float | None = None

    # Records (raw game_context strings, may carry a " last 3" suffix)
    adv_last3_rec: str = ""
    opp_last3_rec: str = ""
    adv_season_rec: str = ""

    # Players
    adv_qb: str = ""
    opp_qb: str = ""

    # Pressure rates (0-1), already adv/opp-resolved
    adv_pressure_gen: float | None = None      # rate adv DEFENSE gets pressure
    adv_pressure_faced: float | None = None    # rate adv OFFENSE faces pressure
    opp_pressure_faced: float | None = None    # rate opp OFFENSE faces pressure

    # Game context
    rest_diff: float = 0.0         # positive = home more rested
    div_game: bool = False
    wind_mph: float = 0.0
    temp_f: float | None = None
    wind_tier: str = "calm"
    wind_consequence: str = ""
    roof: str = ""
    stadium: str = ""

    # Home field: the model intercept, i.e. the home team's edge before any
    # matchup data. Expressed as win-probability points (e.g. 6.5).
    home_field_pts: float = 0.0
    neutral_site: bool = False

    # Per-season league baselines, e.g. {"epa_mean": .., "epa_std": ..}
    league: dict = field(default_factory=dict)


@dataclass(frozen=True)
class FactorProse:
    headline: str
    explanation: str
    baseline_note: str
    # True only when the prose makes a genuinely supportive claim (the raw
    # evidence backs the advantage). Hedged / "close to even" branches set this
    # False so the synthesis lede won't elevate or cite them as a real edge.
    confident: bool = True


# ---------------------------------------------------------------------------
# Small formatting / language helpers (all None-safe)
# ---------------------------------------------------------------------------

def _perspective(diff: float, adv_is_home: bool) -> float:
    """Flip a home-minus-away differential into the advantage team's POV."""
    return diff if adv_is_home else -diff


def _pct(x: float | None, signed: bool = False) -> str | None:
    if x is None:
        return None
    return f"{x:+.0%}" if signed else f"{x:.0%}"


def _epa(x: float | None, signed: bool = True) -> str | None:
    if x is None:
        return None
    return f"{x:+.2f}" if signed else f"{x:.2f}"


def _clean_record(rec: str) -> str:
    """'0-3 last 3' -> '0-3'."""
    return (rec or "").replace(" last 3", "").strip()


def _join(parts: list[str]) -> str:
    """Join non-empty sentence fragments with single spaces."""
    return " ".join(p.strip() for p in parts if p and p.strip())


def _trend_word(season_diff: float, last3_diff: float, adv_is_home: bool,
                eps: float) -> str:
    """
    Is the advantage team's edge widening or shrinking recently?
    Compares the season differential to the last-3 differential, both flipped
    to the advantage team's perspective. Honest: it describes the *edge*, not a
    single team's absolute change.
    """
    s = _perspective(season_diff, adv_is_home)
    l = _perspective(last3_diff, adv_is_home)
    delta = l - s
    if delta > eps:
        return "widening"
    if delta < -eps:
        return "narrowing"
    return "steady"


def _legibility(value: float | None, mean: float | None, std: float | None) -> str:
    """Plain adjective for an offensive EPA value vs the league distribution."""
    if value is None or mean is None or not std:
        return ""
    z = (value - mean) / std
    if z >= 1.0:
        return "elite"
    if z >= 0.4:
        return "above-average"
    if z > -0.4:
        return "middle-of-the-pack"
    if z > -1.0:
        return "below-average"
    return "bottom-tier"


def _implied_prob(ml: int | float | None) -> float | None:
    """American moneyline -> implied win probability (no vig removal)."""
    if not ml:
        return None
    ml = float(ml)
    if ml < 0:
        return (-ml) / ((-ml) + 100.0)
    return 100.0 / (ml + 100.0)


def _parse_record(rec: str) -> tuple[int, int] | None:
    """'2-1 last 3' -> (2, 1); returns None if it can't be parsed."""
    core = _clean_record(rec)
    if "-" not in core:
        return None
    parts = core.split("-")
    if len(parts) < 2:
        return None
    try:
        return int(parts[0]), int(parts[1])
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Per-family builders
# ---------------------------------------------------------------------------

def _how_much(edge: float, small: float, big: float) -> str:
    """Plain-English size of an edge: 'slightly', 'noticeably' or 'much'."""
    if edge >= big:
        return "much"
    if edge >= small:
        return "noticeably"
    return "slightly"


def _market_prose(c: FactorContext) -> FactorProse:
    view = market_view(c.home, c.away, c.spread, c.home_ml, c.away_ml)
    if view is None:
        return FactorProse(
            "No betting line yet.",
            "Sportsbooks haven't posted a line for this game yet.",
            "Betting line: not posted.",
            confident=False,
        )

    fav = view["favorite"]
    model_pick = c.predicted_winner
    if fav is None:
        agree = f" Clark picks {model_pick}." if model_pick else ""
        return FactorProse(
            "The betting line sees a toss-up.",
            f"Sportsbooks have this game as a pick'em.{agree}",
            "Betting line: pick'em.",
            confident=False,
        )

    prob = view["favorite_prob"]
    points = view["spread"]
    if points >= 7:
        headline = f"The betting line strongly favors {fav}."
    else:
        headline = f"The betting line favors {fav}."

    price = (f"a {points:.1f}-point favorite" if points >= 0.5
             else "a slight favorite")
    if not model_pick:
        verdict = ""
    elif model_pick == fav:
        verdict = f" Clark also picks {fav}."
    else:
        verdict = f" Clark disagrees and picks {model_pick}."
    explanation = (f"Sportsbooks have {fav} as {price}, which works out to about"
                   f" {_a_pct(round(prob * 100))} chance to win.{verdict}")
    baseline = f"Betting line: {fav} by {points:.1f} ({prob:.0%} implied)."
    return FactorProse(headline, explanation, baseline, confident=True)


# Below this the raw per-play edge is treated as "essentially even", so the
# prose won't assert one side is more efficient (avoids fabricated superiority
# when the model's factor lean comes from the coefficient blend, not this metric).
_EPA_SUPPORT_EPS = 0.01


def _league_phrase(legible: str) -> str:
    return {
        "elite": "one of the best in the league right now",
        "above-average": "better than most of the league",
        "middle-of-the-pack": "about league average",
        "below-average": "below league average",
        "bottom-tier": "one of the worst in the league right now",
    }.get(legible, "")


def _offense_baseline(c: FactorContext, epa_adv: float, legible: str) -> str:
    """Numbers line for Recent Offense (shown under 'Show the numbers')."""
    bits = [f"Last 3 games, EPA/play edge: {c.adv} {_epa(epa_adv)}"]
    if c.adv_last3_epa is not None:
        tail = f" ({legible})" if legible else ""
        bits.append(f"{c.adv} offense {_epa(c.adv_last3_epa)} EPA/play{tail}")
    return "; ".join(bits) + "."


def _recent_offense_prose(c: FactorContext) -> FactorProse:
    adv, opp = c.adv, c.opp
    epa_adv = _perspective(c.last3_epa, c.adv_is_home)
    trend = _trend_word(c.season_epa, c.last3_epa, c.adv_is_home, eps=0.02)
    legible = _legibility(c.adv_last3_epa,
                          c.league.get("epa_mean"), c.league.get("epa_std"))
    baseline = _offense_baseline(c, epa_adv, legible)

    if epa_adv < _EPA_SUPPORT_EPS:
        return FactorProse(
            "The offenses have been about even.",
            (f"Over the last three games, {adv} and {opp} have gained about the"
             " same on a typical play, so offense isn't where this game gets"
             " decided."),
            baseline,
            confident=False,
        )

    headline = (f"{adv}'s offense is heating up." if trend == "widening"
                else f"{adv}'s offense has been more productive.")

    points = ""
    if (c.adv_pts_for is not None and c.opp_pts_for is not None
            and c.adv_pts_for > c.opp_pts_for):
        points = (f", scoring {c.adv_pts_for:.0f} points a game to {opp}'s"
                  f" {c.opp_pts_for:.0f}")
    league = _league_phrase(legible) if legible in ("elite", "above-average") else ""

    explanation = _join([
        f"Over the last three games, {adv} have gained {_how_much(epa_adv, 0.04, 0.10)}"
        f" more on a typical play than {opp}{points}.",
        f"That offense has been {league}." if league else "",
        (f"{opp}'s quarterback has also been under pressure on"
         f" {_pct(c.opp_pressure_faced)} of dropbacks."
         if c.opp_pressure_faced is not None and c.opp_pressure_faced >= 0.30 else ""),
        f"Expect {adv} to move the ball more consistently.",
    ])
    return FactorProse(headline, explanation, baseline)


def _defensive_prose(c: FactorContext) -> FactorProse:
    adv, opp = c.adv, c.opp
    opp_qb = c.opp_qb or f"{opp}'s quarterback"
    has_pressure = c.adv_pressure_gen is not None and c.adv_pressure_gen > 0
    pressure_pct = _pct(c.adv_pressure_gen) if has_pressure else None

    # diff_*_epa_per_play_allowed is home-minus-away; lower allowed is better.
    # Flip so a positive number = adv allows that much LESS per play than opp.
    def_last3 = -c.last3_epa_allowed if c.adv_is_home else c.last3_epa_allowed
    def_season = -c.season_epa_allowed if c.adv_is_home else c.season_epa_allowed

    if def_last3 >= _EPA_SUPPORT_EPS:
        edge, window = def_last3, "over the last three games"
    elif def_season >= _EPA_SUPPORT_EPS:
        edge, window = def_season, "this season"
    else:
        edge, window = None, ""

    baseline_bits = [f"EPA/play allowed edge, last 3: {adv} {_epa(def_last3)}",
                     f"season: {_epa(def_season)}"]
    if pressure_pct:
        baseline_bits.append(f"{adv} pressure rate {pressure_pct}")
    baseline = "; ".join(baseline_bits) + "."

    pressure = (f"{adv} have pressured the quarterback on {pressure_pct} of"
                " dropbacks." if has_pressure else "")

    if edge is not None:
        points = ""
        if (c.adv_pts_ag is not None and c.opp_pts_ag is not None
                and c.adv_pts_ag < c.opp_pts_ag and window.startswith("over")):
            points = (f", giving up {c.adv_pts_ag:.0f} points a game to {opp}'s"
                      f" {c.opp_pts_ag:.0f}")
        explanation = _join([
            f"{adv} have allowed {_how_much(edge, 0.04, 0.10)} less on a typical"
            f" play than {opp} {window}{points}.",
            pressure,
            f"That makes it harder for {opp_qb} to put together scoring drives.",
        ])
        return FactorProse(f"{adv}'s defense has been tougher.", explanation, baseline)

    if has_pressure:
        return FactorProse(
            f"{adv}'s pass rush is the difference.",
            _join([
                f"The two defenses have allowed about the same per play, but {pressure}",
                f"Pressure like that disrupts {opp_qb} and stalls drives.",
            ]),
            baseline,
        )

    if def_last3 <= -_EPA_SUPPORT_EPS:
        explanation = (f"{opp}'s defense has actually allowed less per play over the"
                       f" last three games, so defense isn't a real edge for {adv}"
                       " in this game.")
    else:
        explanation = (f"{adv} and {opp} have allowed about the same per play"
                       " lately, so defense isn't where this game gets decided.")
    return FactorProse("The defenses have been about even.", explanation, baseline,
                       confident=False)


def _home_field_prose(c: FactorContext) -> FactorProse:
    pts = c.home_field_pts
    where = f" at {c.stadium}" if c.stadium else ""
    if c.neutral_site:
        return FactorProse(
            "Neutral site.",
            (f"The game is{where}, a neutral site, but Clark's model still gives"
             f" {c.home} the standard home-team bump of about {pts:.1f} points of"
             " win chance."),
            f"Home-team bump: +{pts:.1f} win-chance points (neutral site).",
            confident=False,
        )
    return FactorProse(
        f"{c.home} are at home.",
        (f"The game is{where}. Before any matchup data, playing at home is worth"
         f" about {pts:.1f} points of win chance in Clark's model."),
        f"Home field: +{pts:.1f} win-chance points.",
        confident=True,
    )


def _momentum_prose(c: FactorContext) -> FactorProse:
    adv, opp = c.adv, c.opp
    wpc_adv = _perspective(c.last3_winpct, c.adv_is_home)
    pt_adv = _perspective(c.last3_ptdiff, c.adv_is_home)
    adv_rec = _clean_record(c.adv_last3_rec)
    opp_rec = _clean_record(c.opp_last3_rec)
    adv_wl = _parse_record(c.adv_last3_rec)
    opp_wl = _parse_record(c.opp_last3_rec)

    pts = abs(pt_adv)
    pt_word = "point" if round(pts) == 1 else "points"
    has_swing = pts >= 1
    pt_sep = f"about {pts:.0f} more {pt_word} of scoring margin per game"
    carries = ""

    # Case 1: both records known and the advantage team is genuinely hotter.
    if adv_wl and opp_wl and adv_wl[0] > opp_wl[0]:
        headline = f"{adv} have been playing better lately."
        swing_sentence = (f"They also have {pt_sep}."
                          if has_swing else "")
        explanation = _join([
            f"{adv} are {adv_rec} over their last three games; {opp} are {opp_rec}.",
            swing_sentence, carries,
        ])
        tail = f" ({pts:.0f} pt/gm margin swing)." if has_swing else "."
        return FactorProse(headline, explanation,
                           f"Last three: {adv} {adv_rec}, {opp} {opp_rec}{tail}")

    # Case 2: records level - lean on scoring margin if it exists, else even.
    if adv_wl and opp_wl and adv_wl[0] == opp_wl[0]:
        if has_swing:
            headline = f"{adv} have the better scoring margin."
            explanation = _join([
                f"Both teams are {adv_rec} over their last three, so the"
                " records are even.",
                f"The difference is scoring margin: {adv} have {pt_sep}.",
                carries,
            ])
            return FactorProse(headline, explanation,
                               f"Last three: both {adv_rec}; {adv} +"
                               f"{pts:.0f} pt/gm scoring margin.")
        headline = "Recent form is about even."
        explanation = (f"{adv} and {opp} are both {adv_rec} over their last three"
                       " with similar scoring margins, so recent form barely matters"
                       " here.")
        return FactorProse(headline, explanation,
                           f"Last three: both {adv_rec}, scoring margins even.",
                           confident=False)

    # Case 3: advantage team's record is not better - do not claim it is.
    if adv_wl and opp_wl:  # adv_wl[0] < opp_wl[0]
        if has_swing:
            headline = f"{adv}'s scoring margin is better than their record."
            explanation = _join([
                f"{opp} own the better recent record ({opp_rec} vs {adv_rec}),"
                f" but {adv} have {pt_sep}.",
                "Scoring margin is usually a better guide to how good a team is than"
                " its record.",
            ])
            return FactorProse(headline, explanation,
                               f"Last three: {adv} {adv_rec} but +"
                               f"{pts:.0f} pt/gm margin vs {opp} {opp_rec}.")
        headline = "Recent form favors the other side."
        explanation = (f"{opp} have the better recent record ({opp_rec} vs"
                       f" {adv_rec}), so recent form isn't a real edge for {adv}.")
        return FactorProse(headline, explanation,
                           f"Last three: {adv} {adv_rec}, {opp} {opp_rec}.",
                           confident=False)

    # Case 4: records missing - fall back to win-rate / margin differentials.
    if wpc_adv >= 0.01:
        headline = f"{adv} have been playing better lately."
        margin = (f", and their scoring margin is about {pts:.0f} {pt_word} a game"
                  " better" if has_swing else "")
        explanation = (f"Over the last three games, {adv} have won more often than"
                       f" {opp}{margin}.")
        return FactorProse(headline, explanation,
                           f"Last 3 games: {adv} win rate {_pct(wpc_adv, signed=True)}"
                           f" vs {opp}; margin {pt_adv:+.0f} pts/game.")

    headline = "Recent form is about even."
    explanation = (f"{adv} and {opp} have played about as well as each other"
                   " lately, so recent form barely matters here.")
    return FactorProse(headline, explanation,
                       f"Last 3 games: win rate and margin about even.",
                       confident=False)


def _game_context_prose(c: FactorContext) -> FactorProse:
    rested = c.home if c.rest_diff > 0 else c.away
    short = c.away if c.rest_diff > 0 else c.home
    big_rest = abs(c.rest_diff) >= 3
    notable_wind = c.wind_tier not in ("calm", "dome") and bool(c.wind_consequence)

    # Headline picks the dominant element
    if big_rest:
        headline = f"Rest tilts toward {rested}."
    elif notable_wind:
        headline = "Weather could matter."
    elif c.div_game:
        headline = "Division game."
    else:
        headline = "Rest and weather are about even."

    parts: list[str] = []
    if big_rest:
        parts.append(f"{rested} get {abs(c.rest_diff):.0f} more days of rest than"
                     f" {short}, which helps in a close game.")
    if c.div_game:
        parts.append("It's a division game. These teams play twice a year, and"
                     " those games tend to be closer than expected.")
    if notable_wind:
        wlabel = f"{c.wind_mph:.0f} mph wind" if c.wind_mph else c.wind_tier.title()
        parts.append(f"{wlabel}: {c.wind_consequence}")
    elif c.wind_tier == "dome":
        parts.append("It's indoors, so weather won't matter.")
    if c.temp_f is not None and c.wind_tier != "dome":
        parts.append(f"Game-time temperature is around {c.temp_f:.0f}°F.")

    if not parts:
        parts.append("Rest, travel and weather are about even for both teams.")

    explanation = _join(parts)

    # Compact baseline line. Rest differential is always included (even when
    # ~0) so this line always carries a real number grounding the claim,
    # matching every other factor family - never a purely qualitative fallback.
    bl: list[str] = [f"{rested} {'+' if big_rest else ''}{abs(c.rest_diff):.0f}d rest"]
    if c.div_game:
        bl.append("divisional")
    if c.temp_f is not None and c.wind_tier != "dome":
        bl.append(f"{c.temp_f:.0f}°F")
    if c.wind_mph and c.wind_tier not in ("calm", "dome"):
        bl.append(f"{c.wind_mph:.0f} mph wind")
    elif c.wind_tier == "dome":
        bl.append("indoors")
    baseline_note = " · ".join(bl)

    # Only a genuine situational swing (real rest edge or notable weather) counts
    # as a confident edge worth elevating; divisional/temperature alone do not.
    return FactorProse(headline, explanation, baseline_note,
                       confident=big_rest or notable_wind)


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

_BUILDERS = {
    "Market Edge":    _market_prose,
    "Recent Offense": _recent_offense_prose,
    "Defensive Edge": _defensive_prose,
    "Momentum":       _momentum_prose,
    "Game Context":   _game_context_prose,
    "Home Field":     _home_field_prose,
}


def build_factor_prose(ctx: FactorContext) -> FactorProse:
    """Return (headline, explanation, baseline_note) for a factor card.

    Falls back to a generic-but-valid paragraph for unknown factor names so the
    caller can always rely on non-empty fields.
    """
    builder = _BUILDERS.get(ctx.name)
    if builder is None:
        adv, opp = ctx.adv, ctx.opp
        return FactorProse(
            headline=f"{adv} hold the {ctx.name.lower()} edge.",
            explanation=(f"{adv} carry the advantage in {ctx.name.lower()} over"
                         f" {opp} in this matchup."),
            baseline_note=f"{adv} lead {opp} in {ctx.name.lower()}.",
            confident=False,
        )
    return builder(ctx)


# ---------------------------------------------------------------------------
# Synthesis lede (A3) + player-form narrative (A4)
# ---------------------------------------------------------------------------
# The lede weaves the top factors into ONE narrative with tension: name the
# pick, give the main reason, add one reinforcing reason, then the single thing
# that could go wrong. It composes the already-built factor headlines and
# baseline_notes (self-contained sentences) rather than re-deriving numbers, so
# it inherits the same honesty guarantees.

@dataclass(frozen=True)
class LedeContext:
    winner: str
    opponent: str
    probability: float                 # winner's win probability, 0-1
    primary: dict | None = None        # top decisive factor for the winner
    football_lead: dict | None = None  # top NON-market football factor for winner
    secondary: dict | None = None      # next reinforcing factor for the winner
    risk: dict | None = None           # top factor favoring the opponent
    winner_qb: str = ""
    winner_qb_epa: float = 0.0
    qb_league: dict = field(default_factory=dict)   # {"epa_mean":.., "epa_std":..}
    spread_desc: str = ""              # e.g. "a 6.5-point favorite" ("" if none)
    market_sentence: str = ""          # e.g. "The betting line agrees."
    # Confident factors favoring the winner, strongest first (market excluded
    # from the lead because it is summarised separately).
    backing: tuple = ()
    home_field_pts: float = 0.0


def _conviction(prob: float) -> str:
    if prob >= 0.68:
        return "is confident in"
    if prob >= 0.60:
        return "likes"
    if prob >= 0.55:
        return "leans"
    return "gives the slight edge to"


def _sent(text: str) -> str:
    """Ensure a fragment ends as a sentence."""
    text = (text or "").strip()
    if not text:
        return ""
    return text if text[-1] in ".!?" else text + "."


def _factor_subject(card: dict | None) -> str:
    """Short noun phrase naming what a factor is about (advantage-team POV)."""
    if not card:
        return "the overall matchup"
    adv = card.get("advantage_team", "")
    name = card.get("name", "")
    if name == "Recent Offense":
        return f"{adv}'s recent offense"
    if name == "Defensive Edge":
        return f"{adv}'s defense"
    if name == "Momentum":
        return f"how {adv} have been playing"
    if name == "Market Edge":
        return "the betting market"
    if name == "Game Context":
        return "the situational edges"
    return f"{adv}'s {name.lower()}" if adv and name else "the matchup"


def qb_form_note(ctx: LedeContext) -> str:
    """One plain sentence about the winner's QB, only when he is clearly above
    league average. Never manufactures a storyline for an average passer."""
    name, epa = ctx.winner_qb, ctx.winner_qb_epa
    if not name or name == ctx.winner or not epa:
        return ""
    adj = _legibility(epa, ctx.qb_league.get("epa_mean"),
                      ctx.qb_league.get("epa_std"))
    if adj == "elite":
        return f"{name} has been one of the league's most efficient passers this season."
    if adj == "above-average":
        return f"{name} has been an above-average passer this season."
    return ""


def _a_pct(pct: int) -> str:
    """'a 52%' / 'an 80%' / 'an 11%' - the article follows how it's spoken."""
    spoken_vowel = str(pct).startswith("8") or pct in (11, 18)
    return f"{'an' if spoken_vowel else 'a'} {pct}%"


def _first_sentence(text: str) -> str:
    text = (text or "").strip()
    for i, ch in enumerate(text):
        if ch in ".!?" and (i + 1 == len(text) or text[i + 1] == " "):
            return text[: i + 1]
    return _sent(text)


def build_synthesis_lede(ctx: LedeContext) -> str:
    """The short summary at the top of the Clark Report.

    Pick and chance -> the main reason -> one supporting reason -> what the
    betting line says. The upset path lives in its own section, so it is not
    repeated here.
    """
    parts: list[str] = [f"Clark picks {ctx.winner} with"
                        f" {_a_pct(round(ctx.probability * 100))} chance to win."]

    backing = ctx.backing
    lead = backing[0] if backing else (ctx.football_lead or ctx.primary)
    if lead and lead.get("name") == "Home Field":
        parts.append(f"The biggest reason is home field, worth about"
                     f" {ctx.home_field_pts:.1f} points of win chance on its own.")
        support = next((c for c in backing[1:] if c.get("name") != "Market Edge"), None)
    elif lead:
        parts.append(_first_sentence(lead.get("explanation", "")))
        support = next((c for c in backing[1:] if c.get("name") != "Market Edge"), None)
    else:
        parts.append(f"No single factor decides this; the pick comes from several"
                     f" small edges for {ctx.winner}.")
        support = None
    if support:
        parts.append(_sent(support.get("headline", "")))

    parts.append(qb_form_note(ctx))
    # When the lead itself was the betting line, don't summarise it twice.
    if not (lead and lead.get("name") == "Market Edge"):
        parts.append(ctx.market_sentence)
    return _join(parts)
