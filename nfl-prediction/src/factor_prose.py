"""
factor_prose.py — plain-English reasoning layer for factor cards
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
      sentence — it never emits "None"/"undefined"/an empty string.
    - No fabricated specifics beyond the numbers passed in.
    - All prose is written from the *advantage team's* perspective.
"""
from __future__ import annotations

from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Context object — everything a template might need, all optional/defaulted
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

def _market_prose(c: FactorContext) -> FactorProse:
    adv, opp = c.adv, c.opp
    abs_spread = abs(c.spread)
    market_fav = c.home if c.spread > 0 else (c.away if c.spread < 0 else "Even")
    adv_ml = c.home_ml if c.adv_is_home else c.away_ml
    implied = _implied_prob(adv_ml)

    # Spread descriptor
    if abs_spread < 0.5:
        spread_desc = "a pick'em line"
    else:
        spread_desc = f"a {abs_spread:.1f}-point favorite"

    # Headline scales with how firm the market is
    if abs_spread >= 7:
        headline = f"Vegas is firmly behind {adv}."
    elif abs_spread >= 3:
        headline = f"The market leans {adv}."
    elif abs_spread >= 0.5:
        headline = f"Vegas gives {adv} the slight nod."
    else:
        headline = "The market sees a near coin-flip."

    implied_clause = ""
    if implied is not None:
        implied_clause = f" — about a {implied:.0%} implied win probability"

    if market_fav == adv or market_fav == "Even":
        # Model + market agree (the common, reassuring case)
        explanation = _join([
            f"The betting market lands on {adv} too:"
            f" Vegas made them {spread_desc}{implied_clause}.",
            "Lines quietly fold in injury news, weather, and where the sharp"
            " money is going — things a box score can't see.",
            f"When Clark and Vegas independently arrive at {adv}, it's usually"
            " the steadiest kind of agreement.",
        ])
    else:
        explanation = _join([
            f"Here Clark is taking the other side of the market — Vegas actually"
            f" made {market_fav} {spread_desc}{implied_clause}.",
            "That disagreement is the interesting part: the model sees something"
            " in the football matchup the line is underrating.",
        ])

    if implied is not None and market_fav == adv:
        baseline_note = (
            f"Vegas priced {adv} as {spread_desc} — roughly a {implied:.0%}"
            " implied win probability."
        )
    elif abs_spread >= 0.5:
        baseline_note = f"Market line: {market_fav} {spread_desc}."
    else:
        baseline_note = "Market line: a near pick'em."

    return FactorProse(headline, explanation, baseline_note)


# Below this the raw per-play edge is treated as "essentially even", so the
# prose won't assert one side is more efficient (avoids fabricated superiority
# when the model's factor lean comes from the coefficient blend, not this metric).
_EPA_SUPPORT_EPS = 0.01


def _offense_baseline(c: FactorContext, epa_adv: float, legible: str) -> str:
    """Honest baseline line for Recent Offense, whichever branch we took.

    Only leads with the absolute value when it's genuinely good; a below-average
    offense that merely out-rates a worse opponent is reported as a *relative*
    edge, so the claim and the evidence never disagree.
    """
    if c.adv_last3_epa is not None and legible in ("elite", "above-average"):
        return (f"{c.adv}'s offense is producing {_epa(c.adv_last3_epa)} EPA/play"
                f" over its last three — {legible} vs the rest of the league.")
    if epa_adv >= _EPA_SUPPORT_EPS:
        return (f"{c.adv} hold a {_epa(epa_adv)} EPA/play edge over {c.opp}"
                " across the last three games.")
    if c.adv_last3_epa is not None:
        tail = f" — {legible} vs the rest of the league" if legible else ""
        return (f"{c.adv}'s offense is producing {_epa(c.adv_last3_epa)} EPA/play"
                f" over its last three{tail}.")
    return f"Recent per-play offense grades out close between {c.adv} and {c.opp}."


def _recent_offense_prose(c: FactorContext) -> FactorProse:
    adv, opp = c.adv, c.opp
    epa_adv = _perspective(c.last3_epa, c.adv_is_home)
    sr_adv = _perspective(c.last3_sr, c.adv_is_home)
    trend = _trend_word(c.season_epa, c.last3_epa, c.adv_is_home, eps=0.02)
    legible = _legibility(c.adv_last3_epa,
                          c.league.get("epa_mean"), c.league.get("epa_std"))

    supportive = epa_adv >= _EPA_SUPPORT_EPS

    if not supportive:
        # The raw last-3 per-play edge does NOT clearly favor the advantage team,
        # so we do not claim it does. State the honest, close picture instead.
        headline = "Recent offense is close to even."
        legible_clause = ""
        if legible in ("elite", "above-average") and c.adv_last3_epa is not None:
            legible_clause = (f" {adv}'s offense has still been {legible} in"
                              " absolute terms, so this isn't a weakness —")
            tail = " it's just not where the edge in this matchup comes from."
        else:
            tail = (" so treat this as a near-wash rather than a difference-maker"
                    " in the matchup.")
        explanation = _join([
            f"This is the model's thinnest read: on a per-play basis {adv} and"
            f" {opp} have been about even on offense over the last three weeks.",
            legible_clause + tail,
        ])
        return FactorProse(headline, explanation,
                           _offense_baseline(c, epa_adv, legible),
                           confident=False)

    if trend == "widening":
        headline = f"{adv}'s offense is heating up."
    else:
        headline = f"{adv} own the better recent offense."

    evidence_bits = [f"averaging {_epa(epa_adv)} EPA/play more than {opp}"]
    if sr_adv >= 0.01:
        evidence_bits.append(f"staying on schedule {_pct(sr_adv, signed=True)}"
                             " more often")
    evidence = " and ".join(evidence_bits)

    legible_clause = ""
    if legible:
        legible_clause = (f" That production is {legible} by league standards"
                          " this season.")

    trend_clause = ""
    if trend == "widening":
        trend_clause = " And the gap has grown over the last few weeks, not shrunk."
    elif trend == "narrowing":
        trend_clause = f" The edge has tightened lately, but it still favors {adv}."

    pressure_clause = ""
    if c.opp_pressure_faced is not None and c.opp_pressure_faced >= 0.30:
        pressure_clause = (f" It helps that {opp} have been leakier up front,"
                           f" facing pressure on {_pct(c.opp_pressure_faced)} of"
                           " dropbacks.")

    explanation = _join([
        f"Over the last three weeks {adv} have been the more efficient"
        f" offense — {evidence}.",
        legible_clause,
        trend_clause,
        pressure_clause,
        f"Against {opp}, expect {adv} to move the ball more consistently and"
        " lean on that efficiency on early downs.",
    ])

    return FactorProse(headline, explanation,
                       _offense_baseline(c, epa_adv, legible))


def _defensive_prose(c: FactorContext) -> FactorProse:
    adv, opp = c.adv, c.opp
    opp_qb = c.opp_qb or f"{opp}'s offense"
    has_pressure = c.adv_pressure_gen is not None and c.adv_pressure_gen > 0
    pressure_pct = _pct(c.adv_pressure_gen) if has_pressure else None

    # diff_*_epa_per_play_allowed is home-minus-away; lower allowed is better.
    # Flip so a positive number = adv allows that many FEWER EPA/play than opp.
    def_last3 = -c.last3_epa_allowed if c.adv_is_home else c.last3_epa_allowed
    def_season = -c.season_epa_allowed if c.adv_is_home else c.season_epa_allowed

    # Cite the window that genuinely supports "allows fewer"; never a negative.
    if def_last3 >= _EPA_SUPPORT_EPS:
        edge, window = def_last3, "over the last three weeks"
    elif def_season >= _EPA_SUPPORT_EPS:
        edge, window = def_season, "on the season"
    else:
        edge, window = None, ""

    pressure_clause = ""
    if has_pressure:
        lead = "A lot of it is pressure" if edge is not None else (
            f"{adv}'s defensive edge here is more about disruption than raw"
            " yardage")
        pressure_clause = (
            f" {lead} — {adv} are getting to the quarterback on {pressure_pct} of"
            f" dropbacks, the kind of heat that rattles {opp_qb}.")
    implication = (f"If they keep {opp_qb} uncomfortable, {opp}'s scoring drives"
                   " are the ones that stall out.")

    if edge is not None:
        trend = _trend_word(-c.season_epa_allowed, -c.last3_epa_allowed,
                            c.adv_is_home, eps=0.02)
        headline = (f"{adv}'s defense is tightening up." if trend == "widening"
                    else f"{adv}'s defense has been the tougher unit.")
        trend_clause = (" And they've been trending sharper over the last month."
                        if trend == "widening" and window.startswith("over") else "")
        explanation = _join([
            f"{adv}'s defense has been the sturdier of the two, giving up"
            f" {_epa(edge, signed=False)} fewer EPA/play than {opp} {window}.",
            pressure_clause, trend_clause, implication,
        ])
        baseline_bits = [f"{adv} allow {_epa(edge, signed=False)} fewer EPA/play"
                         f" than {opp} {window}"]
        if pressure_pct:
            baseline_bits.append(f"pressure on {pressure_pct} of dropbacks")
        return FactorProse(headline, explanation, ", ".join(baseline_bits) + ".")

    if has_pressure:
        # No clean per-play allowed edge, but a real pressure edge to stand on.
        headline = f"{adv} bring the pass rush that matters here."
        explanation = _join([
            f"The two defenses have been close on a per-play basis, so {adv}'s"
            " edge is about disruption:"
            f" they're getting to the quarterback on {pressure_pct} of dropbacks.",
            f"That pressure is what tilts the matchup — keeping {opp_qb}"
            f" uncomfortable is how {opp}'s scoring drives stall out.",
        ])
        return FactorProse(headline, explanation,
                           f"{adv} pressure the quarterback on {pressure_pct} of"
                           " dropbacks; per-play EPA allowed is otherwise close.")

    # Nothing concrete supports a confident claim — keep it honest and modest,
    # but still ground it with the real (near-zero) differential rather than a
    # purely qualitative "close" claim.
    headline = f"{adv} grade out as the slightly better defense."
    explanation = (f"Neither defense has clearly separated on a per-play basis"
                   f" lately — {adv} allow {_epa(def_last3, signed=True)} EPA/play"
                   f" more than {opp} recently, essentially a wash. The model gives"
                   f" {adv} a slight edge in the overall blend rather than in any"
                   f" one number. {implication}")
    return FactorProse(headline, explanation,
                       f"EPA/play allowed differential: {_epa(def_last3, signed=True)}"
                       f" ({adv} vs {opp}, essentially even).", confident=False)


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
    pt_sep = f"roughly {pts:.0f} {pt_word} per game of margin separation"
    carries = ("Form like that tends to carry: healthier rotations, cleaner"
               " execution, and more belief in the tight moments.")

    # Case 1: both records known and the advantage team is genuinely hotter.
    if adv_wl and opp_wl and adv_wl[0] > opp_wl[0]:
        headline = f"{adv} are the team trending up."
        swing_sentence = (f"On top of that, {adv} hold {pt_sep} their way."
                          if has_swing else "")
        explanation = _join([
            f"{adv} come in playing the better football — they're {adv_rec} over"
            f" their last three while {opp} are {opp_rec}.",
            swing_sentence, carries,
        ])
        tail = f" ({pts:.0f} pt/gm margin swing)." if has_swing else "."
        return FactorProse(headline, explanation,
                           f"Last three: {adv} {adv_rec}, {opp} {opp_rec}{tail}")

    # Case 2: records level — lean on scoring margin if it exists, else even.
    if adv_wl and opp_wl and adv_wl[0] == opp_wl[0]:
        if has_swing:
            headline = f"Records level, but {adv} hit harder."
            explanation = _join([
                f"Both teams are {adv_rec} over their last three, so the"
                " win-loss trend is a wash.",
                f"The tiebreaker is scoring margin — {adv} hold {pt_sep}"
                " their way.",
                carries,
            ])
            return FactorProse(headline, explanation,
                               f"Last three: both {adv_rec}; {adv} +"
                               f"{pts:.0f} pt/gm scoring margin.")
        headline = "Recent form is a near-wash."
        explanation = (f"{adv} and {opp} are both {adv_rec} over their last three"
                       " with little separating them, so momentum barely tips this"
                       " matchup either way.")
        return FactorProse(headline, explanation,
                           f"Last three: both {adv_rec}, scoring margins even.",
                           confident=False)

    # Case 3: advantage team's record is not better — do not claim it is.
    if adv_wl and opp_wl:  # adv_wl[0] < opp_wl[0]
        if has_swing:
            headline = f"{adv} hide better numbers than their record."
            explanation = _join([
                f"{opp} own the better recent record ({opp_rec} vs {adv_rec}),"
                f" but {adv} have the stronger scoring margin — {pt_sep}"
                " their way.",
                "That gap between record and margin is often the truer signal of"
                " where a team is headed.",
            ])
            return FactorProse(headline, explanation,
                               f"Last three: {adv} {adv_rec} but +"
                               f"{pts:.0f} pt/gm margin vs {opp} {opp_rec}.")
        headline = "Recent form slightly favors the other side."
        explanation = (f"{opp} have the better recent record ({opp_rec} vs"
                       f" {adv_rec}); the model's lean on {adv} is coming from the"
                       " other factors, not momentum.")
        return FactorProse(headline, explanation,
                           f"Last three: {adv} {adv_rec}, {opp} {opp_rec}.",
                           confident=False)

    # Case 4: records missing — fall back to win-rate / margin differentials.
    if wpc_adv >= 0.01:
        headline = f"{adv} carry the hotter form."
        swing_sentence = (f"They also hold {pt_sep} their way." if has_swing
                          else "")
        explanation = _join([
            f"{adv} have been the hotter team, with a {_pct(wpc_adv, signed=True)}"
            " win-rate edge over the last three games.",
            swing_sentence, carries,
        ])
        return FactorProse(headline, explanation,
                           f"{adv} hold a {_pct(wpc_adv, signed=True)} win-rate"
                           " edge over the last three games.")

    headline = "Recent form is close to even."
    explanation = (f"There's little between {adv} and {opp} in recent form; this"
                   " factor barely moves the matchup either way.")
    return FactorProse(headline, explanation,
                       f"Recent form grades out close between {adv} and {opp}.",
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
        headline = "Weather is a real factor here."
    elif c.div_game:
        headline = "Divisional familiarity keeps this tight."
    else:
        headline = "The setting is close to neutral."

    parts: list[str] = []
    if big_rest:
        parts.append(f"{rested} get {abs(c.rest_diff):.0f} extra days to rest and"
                     f" game-plan over {short} — a small but real edge in a close"
                     " game.")
    if c.div_game:
        parts.append("It's a division game, so both staffs know each other cold;"
                     " expect a grindier, tighter margin than the raw numbers"
                     " suggest.")
    if notable_wind:
        wlabel = f"{c.wind_mph:.0f} mph wind" if c.wind_mph else c.wind_tier.title()
        parts.append(f"{wlabel}: {c.wind_consequence}")
    elif c.wind_tier == "dome":
        parts.append("Indoors, so weather is off the table and passing games can"
                     " play at full speed.")
    if c.temp_f is not None and c.wind_tier != "dome":
        parts.append(f"Game-time temperature is around {c.temp_f:.0f}°F.")

    if not parts:
        parts.append("Rest, venue, and weather all come out close to even here,"
                     " so this factor barely moves the needle.")

    explanation = _join(parts)

    # Compact baseline line. Rest differential is always included (even when
    # ~0) so this line always carries a real number grounding the claim,
    # matching every other factor family — never a purely qualitative fallback.
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
    """A4: an honest, season-labeled QB-efficiency sentence when data supports it.

    Only fires when the winner's QB is clearly above the league baseline — we
    never manufacture a storyline for an average or below-average passer.
    """
    name, epa = ctx.winner_qb, ctx.winner_qb_epa
    if not name or name == ctx.winner or not epa:
        return ""
    adj = _legibility(epa, ctx.qb_league.get("epa_mean"),
                      ctx.qb_league.get("epa_std"))
    if adj == "elite":
        phrase = "one of the league's most efficient passers"
    elif adj == "above-average":
        phrase = "an above-average passer"
    else:
        return ""
    return f"{name} has been {phrase} this season ({epa:.2f} EPA/att)."


def build_synthesis_lede(ctx: LedeContext) -> str:
    """A3: the editorial football_story — a single connected narrative."""
    pct = f"{ctx.probability * 100:.0f}%"
    parts: list[str] = [f"Clark {_conviction(ctx.probability)} {ctx.winner}"
                        f" at {pct}."]

    lead = ctx.football_lead
    market_is_primary = bool(ctx.primary and ctx.primary.get("name") == "Market Edge")

    if lead:
        # Elevate the non-obvious football factor over the market signal.
        if market_is_primary:
            market_bit = (f"Vegas leans the same way — {ctx.winner} are"
                          f" {ctx.spread_desc}" if ctx.spread_desc
                          else "The market leans the same way")
            parts.append(f"{market_bit}, but the signal Clark keeps coming back"
                         f" to is {_factor_subject(lead)}.")
        parts.append(_sent(lead.get("baseline_note", "")))
    elif ctx.primary:
        parts.append(f"The case starts with {_factor_subject(ctx.primary)}:"
                     f" {_sent(ctx.primary.get('baseline_note', ''))}")
    else:
        parts.append("No single factor dominates — the lean rides on the overall"
                     " blend more than any one number.")

    # One reinforcing reason (distinct from the lead / primary, and only if its
    # own prose is a confident claim — never reinforce with a "near-wash").
    secondary = ctx.secondary
    if (secondary and secondary is not lead and secondary is not ctx.primary
            and secondary.get("confident", True)):
        parts.append(f"It's not the only thing pointing {ctx.winner}'s way:"
                     f" {_sent(secondary.get('headline', ''))}")

    # A4 player-form narrative (season-labeled, only when supported).
    note = qb_form_note(ctx)
    if note:
        parts.append(note)

    # The single thing that could go wrong (ties to risk_factor).
    if ctx.risk:
        parts.append(f"The one thing that could turn it:"
                     f" {_sent(ctx.risk.get('headline', ''))}"
                     f" {_sent(ctx.risk.get('baseline_note', ''))}")
    else:
        parts.append("The main risk is plain variance — a turnover or a"
                     " special-teams swing can compress the edge fast.")

    return _join(parts)
