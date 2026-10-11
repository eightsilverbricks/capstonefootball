/* Per-game Clark Report snippets for the game-page mockup (sample copy in Clark's voice). */
const REPORTS = {
  'SF-SEA': {
    quote: "I'm on Seattle, 63%. Their offense is just hotter right now, and the 49ers have to travel.",
    dek: "The line agrees with me here, Seattle by 3.5. If Bosa wrecks the right side early though, I'm in trouble.",
    forPick: [['Seattle is at home.', 'Worth about 6.5 points of win chance before anything else. San Francisco is 1–2 on the road.', 100],
      ["Seattle's offense has been better lately.", '5.8 yards per play over the last three games, 6th in the league. San Francisco is 22nd.', 74]],
    against: [['A top-five pass rush.', "Nick Bosa and the line have 14 sacks; Seattle's line has allowed the 8th most.", 46]],
    players: [['Sam Darnold', 'QB · SEA', 'Played through a sore wrist. Questionable.'], ['Nick Bosa', 'DE · SF', '4.5 sacks, most on the team.']],
  },
  'TB-DAL': {
    quote: "Okay, this one's fun. Everyone's on Tampa, but I keep landing on Dallas, 64%. It's all about the pass rush.",
    dek: 'Baker completes 71% from a clean pocket and 48% under pressure. Dallas pressures more than anyone. Not a lock though!',
    forPick: [['Dallas brings the most pressure in football.', '41% pressure rate, 1st. Micah Parsons has 22 pressures in four games.', 100],
      ['Baker struggles when hurried.', '48% completions under pressure, 29th. Tampa\'s right tackle is questionable.', 82]],
    against: [["Dallas can't run the ball.", '3.9 yards per carry, 25th. If this becomes a slog, Tampa\'s defense is solid.', 52]],
    players: [['Micah Parsons', 'EDGE · DAL', '22 pressures. The whole case for Dallas.'], ['Luke Goedeke', 'RT · TB', 'Questionable (knee). Out = I go to 67%.']],
  },
};

function genericReport(g) {
  const pick = g.clark[0], other = pick === g.h ? g.a : g.h;
  return {
    quote: `I'm on ${TEAM[pick][0]}, ${g.clark[1]}%. ${g.clark[1] >= 65 ? "Honestly, this one's not that close." : "But I'll be real, this one could go either way."}`,
    dek: `The ${name(other)} have a path though, and I'll walk you through it in the full report.`,
    forPick: [[`${TEAM[pick][0]} has been better lately.`, 'More yards per play and a better third-down rate over the last three games.', 100]],
    against: [[`What favors the ${name(other)}.`, 'A healthier roster and a better turnover margin this season.', 48]],
    players: [],
  };
}

function renderReport(g) {
  const r = REPORTS[`${g.a}-${g.h}`] || genericReport(g);
  const pick = g.clark[0], other = pick === g.h ? g.a : g.h;
  const factor = ([t, d, w], c) => `<div class="factor"><b>${t}</b><p>${d}</p><div class="fbar" style="width:${w}%;background:${c}"></div></div>`;
  document.getElementById('report-card').innerHTML = `<div class="pb" style="padding-top:18px">
    <div class="clark-says"><img src="/brand/clark-logo.jpg" alt=""><div><div class="kicker">The Clark Report</div>
      <h2 class="call">"${r.quote}"</h2><p class="dek">${r.dek}</p></div></div>
    <a href="report.html" class="btn btn-red btn-sm" style="margin-top:14px">Read the full Clark Report →</a>
    <h3 class="fh">Why I like the ${name(pick)}</h3>${r.forPick.map((f) => factor(f, color(pick))).join('')}
    <h3 class="fh">What the ${name(other)} have going for them</h3>${r.against.map((f) => factor(f, color(other))).join('')}
    ${r.players.length ? `<h3 class="fh">Players I'm watching</h3><div class="players">${r.players.map(([n, pos, d]) => `<div class="pl"><span class="hs"></span><span><b>${n}</b> · ${pos}<br><span class="muted">${d}</span></span></div>`).join('')}</div>` : ''}
  </div>`;
}

/* Win-probability chart in the two teams' colors; draws itself in. */
function renderWinProb(g) {
  const pts = [[0, 66], [40, 70], [70, 95], [100, 104], [130, 88], [160, 80], [200, 72], [240, 110], [270, 118], [300, 96], [330, 84], [360, 70], [390, 62], [420, 58], [445, 60]];
  const pre = 180 - (g.clark[0] === g.h ? g.clark[1] : 100 - g.clark[1]) * 1.8 + 0;
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const last = pts[pts.length - 1];
  const live = g.st === 'pre' ? `<p style="font-size:14px">The chart fills in once the game starts. Dashed line is my pregame number.</p>`
    : `<p style="font-size:14px">${TEAM[g.h][0]} <b>67%</b> to win now, up from 41% early in the 2nd quarter.</p>`;
  document.getElementById('wp').innerHTML = `<svg viewBox="0 0 600 190" width="100%" role="img" aria-label="${name(g.h)} win probability over the game">
    <defs><linearGradient id="wpfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color(g.h)}" stop-opacity=".28"/><stop offset=".5" stop-color="${color(g.h)}" stop-opacity="0"/><stop offset=".5" stop-color="${color(g.a)}" stop-opacity="0"/><stop offset="1" stop-color="${color(g.a)}" stop-opacity=".28"/></linearGradient></defs>
    <rect x="0" y="0" width="600" height="90" fill="${color(g.h)}" opacity=".05"/><rect x="0" y="90" width="600" height="90" fill="${color(g.a)}" opacity=".05"/>
    <line x1="0" y1="90" x2="600" y2="90" stroke="var(--rule)"/>
    <line x1="0" y1="${pre}" x2="600" y2="${pre}" stroke="var(--clark-solid)" stroke-dasharray="6 5" stroke-width="2"/>
    <text x="596" y="${pre - 6}" text-anchor="end" font-size="11" font-weight="700" fill="var(--clark-solid)">Clark: ${g.clark[0]} ${g.clark[1]}%</text>
    ${g.st === 'pre' ? '' : `<polygon points="0,90 ${line} ${last[0]},90" fill="url(#wpfill)" class="wp-area"/>
    <polyline class="wp-line" fill="none" stroke="${color(g.h)}" stroke-width="3" stroke-linejoin="round" points="${line}"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="6" fill="${color(g.h)}" class="wp-dot"/>`}
    <text x="4" y="14" font-size="11" fill="var(--ink-3)">${g.h} 100%</text><text x="4" y="176" font-size="11" fill="var(--ink-3)">${g.a} 100%</text>
    <g font-size="11" fill="var(--ink-3)"><text x="150" y="188">Q2</text><text x="300" y="188">Q3</text><text x="450" y="188">Q4</text></g>
  </svg>${live}`;
}

/* Before kickoff the Live tab only shows the empty chart, not another game's plays. */
function trimLiveForPregame(g) {
  if (g.st !== 'pre') return;
  const panels = document.querySelectorAll('[data-panel="live"] > .panel');
  panels.forEach((p, i) => { if (i > 0) p.remove(); });
}
