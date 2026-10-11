/* Clark Index mockups — shared sample data, masthead, ticker, tab bar.
   Sample data only: week 5 matchups and Clark's % are real; scores are invented. */

const ESPN = { LA: 'lar', WAS: 'wsh' };
const logo = (t) => `https://a.espncdn.com/i/teamlogos/nfl/500/${(ESPN[t] || t).toLowerCase()}.png`;

const TEAM = {
  ARI: ['Arizona', 'Cardinals', '#97233F', '1-3'], ATL: ['Atlanta', 'Falcons', '#A71930', '2-2'],
  BAL: ['Baltimore', 'Ravens', '#241773', '3-1'], BUF: ['Buffalo', 'Bills', '#00338D', '3-1'],
  CHI: ['Chicago', 'Bears', '#0B162A', '2-2'], CIN: ['Cincinnati', 'Bengals', '#FB4F14', '3-1'],
  CLE: ['Cleveland', 'Browns', '#311D00', '1-3'], DAL: ['Dallas', 'Cowboys', '#003594', '2-2'],
  DEN: ['Denver', 'Broncos', '#FB4F14', '2-2'], DET: ['Detroit', 'Lions', '#0076B6', '4-0'],
  GB: ['Green Bay', 'Packers', '#203731', '3-1'], HOU: ['Houston', 'Texans', '#03202F', '2-2'],
  IND: ['Indianapolis', 'Colts', '#002C5F', '1-3'], JAX: ['Jacksonville', 'Jaguars', '#006778', '1-3'],
  LA: ['Los Angeles', 'Rams', '#003594', '3-1'], LAC: ['Los Angeles', 'Chargers', '#0080C6', '3-1'],
  LV: ['Las Vegas', 'Raiders', '#000000', '0-4'], MIA: ['Miami', 'Dolphins', '#008E97', '1-3'],
  MIN: ['Minnesota', 'Vikings', '#4F2683', '3-1'], NE: ['New England', 'Patriots', '#002244', '2-2'],
  NO: ['New Orleans', 'Saints', '#D3BC8D', '1-3'], NYG: ['New York', 'Giants', '#0B2265', '1-3'],
  NYJ: ['New York', 'Jets', '#125740', '2-2'], PHI: ['Philadelphia', 'Eagles', '#004C54', '4-0'],
  PIT: ['Pittsburgh', 'Steelers', '#FFB612', '2-2'], SEA: ['Seattle', 'Seahawks', '#002244', '3-1'],
  SF: ['San Francisco', '49ers', '#AA0000', '3-1'], TB: ['Tampa Bay', 'Buccaneers', '#D50A0A', '3-1'],
  TEN: ['Tennessee', 'Titans', '#0C2340', '0-4'], WAS: ['Washington', 'Commanders', '#5A1414', '2-2'],
};
const name = (t) => TEAM[t][1];
const full = (t) => `${TEAM[t][0]} ${TEAM[t][1]}`;
const color = (t) => TEAM[t][2];
const rec = (t) => TEAM[t][3];

/* status: final | live | pre. clark = Clark's pick and %, you = your pick or null. */
const GAMES = [
  { a: 'BAL', h: 'ATL', day: 'Thursday, October 8', time: '8:15 PM', tv: 'Prime Video', st: 'final', as: 27, hs: 20, clark: ['BAL', 62], you: ['BAL', 70], chat: '1.2k' },
  { a: 'PHI', h: 'JAX', day: 'Sunday, October 11', time: '9:30 AM', tv: 'NFL Network', st: 'final', as: 24, hs: 17, clark: ['PHI', 53], you: ['PHI', 60], chat: '640' },
  { a: 'CHI', h: 'GB', day: 'Sunday, October 11', time: '1:00 PM', tv: 'FOX', st: 'final', as: 17, hs: 23, clark: ['GB', 58], you: ['CHI', 55], chat: '2.4k' },
  { a: 'CIN', h: 'MIA', day: 'Sunday, October 11', time: '1:00 PM', tv: 'CBS', st: 'final', as: 31, hs: 21, clark: ['CIN', 68], you: ['CIN', 80], chat: '480' },
  { a: 'CLE', h: 'NYJ', day: 'Sunday, October 11', time: '1:00 PM', tv: 'CBS', st: 'final', as: 16, hs: 13, clark: ['NYJ', 53], you: ['CLE', 65], chat: '310' },
  { a: 'HOU', h: 'TEN', day: 'Sunday, October 11', time: '1:00 PM', tv: 'CBS', st: 'final', as: 20, hs: 10, clark: ['HOU', 66], you: null, chat: '220' },
  { a: 'IND', h: 'PIT', day: 'Sunday, October 11', time: '1:00 PM', tv: 'CBS', st: 'final', as: 24, hs: 21, clark: ['PIT', 60], you: ['PIT', 60], chat: '890' },
  { a: 'LV', h: 'NE', day: 'Sunday, October 11', time: '1:00 PM', tv: 'CBS', st: 'final', as: 10, hs: 27, clark: ['NE', 79], you: ['NE', 90], chat: '350' },
  { a: 'MIN', h: 'NO', day: 'Sunday, October 11', time: '1:00 PM', tv: 'FOX', st: 'final', as: 28, hs: 17, clark: ['MIN', 56], you: ['MIN', 60], chat: '410' },
  { a: 'NYG', h: 'WAS', day: 'Sunday, October 11', time: '1:00 PM', tv: 'FOX', st: 'final', as: 19, hs: 23, clark: ['WAS', 55], you: ['NYG', 55], chat: '700' },
  { a: 'DEN', h: 'LAC', day: 'Sunday, October 11', time: '4:05 PM', tv: 'CBS', st: 'live', clock: 'Q3 4:12', as: 14, hs: 17, clark: ['LAC', 52], you: ['DEN', 60], chat: '1.9k' },
  { a: 'DET', h: 'ARI', day: 'Sunday, October 11', time: '4:25 PM', tv: 'FOX', st: 'live', clock: 'Q3 7:40', as: 21, hs: 10, clark: ['DET', 75], you: ['DET', 85], chat: '2.2k' },
  { a: 'SF', h: 'SEA', day: 'Sunday, October 11', time: '4:25 PM', tv: 'FOX', st: 'live', clock: 'Q3 2:05', as: 13, hs: 17, clark: ['SEA', 63], you: ['SF', 70], chat: '7.1k' },
  { a: 'TB', h: 'DAL', day: 'Sunday, October 11', time: '8:20 PM', tv: 'NBC', st: 'pre', clark: ['DAL', 64], you: null, chat: '3.4k' },
  { a: 'BUF', h: 'LA', day: 'Monday, October 12', time: '8:15 PM', tv: 'ESPN', st: 'pre', clark: ['LA', 60], you: ['BUF', 75], chat: '2.0k' },
];

const winnerOf = (g) => (g.st === 'pre' ? null : g.as > g.hs ? g.a : g.h);
const statusText = (g) => (g.st === 'final' ? 'Final' : g.st === 'live' ? g.clock : g.time);
const gameUrl = (g) => `game.html?g=${g.a}-${g.h}`;

/* ── Masthead ─────────────────────────────────────────────────────────── */
const NAV = [
  ['home', 'Home', 'home.html'], ['games', 'Games', 'games.html'], ['live', 'Live', 'game.html?g=SF-SEA'],
  ['teams', 'Teams', 'team.html'], ['leaderboard', 'Leaderboard', 'leaderboard.html'], ['season', 'My season', 'my-season.html'],
];

const ICON = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  games: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  live: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>',
  teams: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  season: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

function tickerCell(g) {
  const w = winnerOf(g);
  const row = (t, s) => `<div class="tk-row ${g.st === 'final' && w !== t ? 'lost' : ''}"><img src="${logo(t)}" alt=""><b>${t}</b>${g.st === 'pre' ? '' : `<span class="s">${s}</span>`}</div>`;
  const pick = g.you ? `You: ${g.you[0]}` : `Clark: ${g.clark[0]} ${g.clark[1]}%`;
  return `<a class="tk" href="${gameUrl(g)}">
    <div class="tk-status ${g.st === 'live' ? 'live' : ''}">${statusText(g)}${g.st === 'pre' ? ' · ' + g.tv : ''}</div>
    ${row(g.a, g.as)}${row(g.h, g.hs)}
    <div class="tk-pick">${pick}</div></a>`;
}

function renderMasthead(active, signedIn) {
  const live = GAMES.filter((g) => g.st === 'live');
  const order = [...live, ...GAMES.filter((g) => g.st === 'pre'), ...GAMES.filter((g) => g.st === 'final')];
  const right = signedIn
    ? `<span class="streak">Streak <b>6 weeks</b></span><span class="streak">Week <b>8–2</b></span><a href="my-season.html" class="avatar" title="Zane Wolf">ZW</a>`
    : `<a href="#" class="btn btn-sm hide-sm">Sign in</a><a href="landing.html#signup" class="btn btn-sm btn-ink">Create account</a>`;
  const nav = NAV.map(([k, label, href]) => `<a href="${href}" class="${k === active ? 'on' : ''} ${k === 'live' ? 'live-dot' : ''}">${label}</a>`).join('');
  const tabs = NAV.filter(([k]) => k !== 'leaderboard').map(([k, label, href]) =>
    `<a href="${href}" class="${k === active ? 'on' : ''}">${svg(k)}${k === 'season' ? 'Me' : label}</a>`).join('');

  document.getElementById('masthead').innerHTML = `
    <div class="ticker"><div class="ticker-inner">
      <div class="ticker-league">NFL<small>Week 5</small></div>
      <div class="ticker-track"><div class="ticker-rail">${order.map(tickerCell).join('')}</div></div>
      <div class="ticker-arrows"><button aria-label="Previous games" data-dir="-1">‹</button><button aria-label="More games" data-dir="1">›</button></div>
    </div></div>
    <header class="masthead"><div class="wrap">
      <div class="mast-top">
        <div class="mast-left"><span>Sunday, October 11, 2026</span></div>
        <a href="home.html" class="wordmark">The Clark Index<i>.</i></a>
        <div class="mast-right">${right}</div>
      </div>
      <nav class="secnav" aria-label="Main">${nav}</nav>
    </div></header>
    <nav class="tabbar" aria-label="Main">${tabs}</nav>`;
  startTicker();
}

/* Ticker advances one game every 5s; arrows page by four; hover pauses. */
function startTicker() {
  const rail = document.querySelector('.ticker-rail');
  const track = document.querySelector('.ticker-track');
  if (!rail) return;
  let i = 0;
  const step = () => rail.firstElementChild.getBoundingClientRect().width;
  const max = () => Math.max(0, rail.children.length - Math.floor(track.clientWidth / step()));
  const go = (n) => { i = Math.min(max(), Math.max(0, n)); rail.style.transform = `translateX(${-i * step()}px)`; };
  let paused = false;
  track.addEventListener('mouseenter', () => (paused = true));
  track.addEventListener('mouseleave', () => (paused = false));
  document.querySelectorAll('.ticker-arrows button').forEach((b) => b.addEventListener('click', () => go(i + 4 * Number(b.dataset.dir))));
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => { if (!paused) go(i >= max() ? 0 : i + 1); }, 5000);
  }
}

function renderFooter() {
  document.getElementById('footer').innerHTML = `<footer class="footer"><div class="wrap">
    <nav><a href="games.html">Games</a><a href="team.html">Teams</a><a href="leaderboard.html">Leaderboard</a><a href="my-season.html">My season</a><a href="#">About</a><a href="#">Settings</a></nav>
    <span>Data from nflverse and ESPN. Not affiliated with the NFL. No betting.</span></div></footer>
    <div class="mock-note">Mockup · sample scores · <a href="index.html">all pages</a></div>`;
}

/* Simple tab switcher: [data-tabs] buttons with data-tab, panels with data-panel. */
function wireTabs(root = document) {
  root.querySelectorAll('[data-tabs]').forEach((bar) => {
    const group = bar.dataset.tabs;
    bar.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => {
      bar.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b === btn));
      document.querySelectorAll(`[data-panel-group="${group}"]`).forEach((p) => (p.hidden = p.dataset.panel !== btn.dataset.tab));
    }));
  });
}
