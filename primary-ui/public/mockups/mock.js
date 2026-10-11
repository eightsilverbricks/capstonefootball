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
  let pick = `Clark: ${g.clark[0]} ${g.clark[1]}%`;
  let pickCls = '';
  if (g.you) {
    pick = `You: ${g.you[0]} ${g.you[1]}%`;
    if (g.st !== 'pre') pickCls = winnerOf(g) === g.you[0] ? 'win' : 'loss';
    if (g.st === 'final') pick += pickCls === 'win' ? ' ✓' : ' ✗';
  }
  return `<a class="tk" href="${gameUrl(g)}">
    <div class="tk-status ${g.st === 'live' ? 'live' : ''}">${statusText(g)}${g.st === 'pre' ? ' · ' + g.tv : ''}</div>
    ${row(g.a, g.as)}${row(g.h, g.hs)}
    <div class="tk-pick ${pickCls}">${pick}</div></a>`;
}

/* Community stats for the bar under the ticker (sample numbers). */
function communityItems(signedIn) {
  const items = [
    `<span><span class="dot"></span><b>12,480</b> fans active now</span>`,
    signedIn ? `<span><img src="${logo('BUF')}" alt="">Bills fans: <b>67%</b> right this week · <b>3rd</b> of 32 <span class="up">▲2</span></span>` : '',
    `<span><img src="${logo('DET')}" alt="">Best fanbase this week: <b>Lions fans 71%</b></span>`,
    `<span>Fans <b>61%</b> vs Clark <b>80%</b> this week</span>`,
    `<span><img src="${logo('DET')}" alt="">Most picked: <b>Lions over Cardinals, 88%</b></span>`,
    `<span>Closest split: <b>49ers @ Seahawks, 54–46</b></span>`,
    `<span><img src="${logo('SEA')}" alt="">Busiest chat: <b>49ers @ Seahawks · 7.1k</b></span>`,
  ].filter(Boolean).join('');
  // Doubled so the phone marquee loops seamlessly.
  return items + `<span aria-hidden="true" style="display:contents">${items}</span>`;
}

function renderMasthead(active, signedIn) {
  const live = GAMES.filter((g) => g.st === 'live');
  const order = [...live, ...GAMES.filter((g) => g.st === 'pre'), ...GAMES.filter((g) => g.st === 'final')];
  const themeBtn = `<button class="theme-btn" id="theme-btn" aria-label="Switch light or dark mode">${currentTheme() === 'dark' ? '☀️' : '🌙'}</button>`;
  const right = themeBtn + (signedIn
    ? `<span class="streak">Streak <b>6 weeks</b></span><span class="streak">Week <b>8–2</b></span><a href="my-season.html" class="avatar" title="Zane Wolf">ZW</a>`
    : `<a href="#" class="btn btn-sm hide-sm">Sign in</a><a href="landing.html#signup" class="btn btn-sm btn-red">Create account</a>`);
  const nav = NAV.map(([k, label, href]) => `<a href="${href}" class="${k === active ? 'on' : ''} ${k === 'live' ? 'live-dot' : ''}">${label}</a>`).join('');
  const tabs = NAV.filter(([k]) => k !== 'leaderboard').map(([k, label, href]) =>
    `<a href="${href}" class="${k === active ? 'on' : ''}">${svg(k)}${k === 'season' ? 'Me' : label}</a>`).join('');

  document.getElementById('masthead').innerHTML = `
    <div class="ticker"><div class="ticker-inner">
      <div class="ticker-league">NFL<small>Week 5</small></div>
      <div class="ticker-track"><div class="ticker-rail">${order.map(tickerCell).join('')}</div></div>
      <div class="ticker-arrows"><button aria-label="Previous games" data-dir="-1">‹</button><button aria-label="More games" data-dir="1">›</button></div>
    </div></div>
    <div class="community" aria-label="Community right now"><div class="community-inner"><div class="community-rail">${communityItems(signedIn)}</div></div></div>
    <header class="masthead"><div class="wrap">
      <div class="mast-top">
        <div class="mast-left"><span>Sunday, October 11, 2026</span></div>
        <a href="home.html" class="wordmark" aria-label="Clark Index home"><img src="/brand/clark-logo.jpg" alt=""><span class="wordmark-text">CLARK <b>INDEX</b></span></a>
        <div class="mast-right">${right}</div>
      </div>
      <nav class="secnav" aria-label="Main">${nav}</nav>
    </div></header>
    <nav class="tabbar" aria-label="Main">${tabs}</nav>`;
  startTicker();
  document.querySelectorAll('[data-count]').forEach(countUp);
  document.getElementById('theme-btn').addEventListener('click', (e) => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    e.currentTarget.textContent = next === 'dark' ? '☀️' : '🌙';
  });
  revealAll();
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


/* ── Theme ─────────────────────────────────────────────────────────────── */
function currentTheme() {
  try { return localStorage.getItem('clark-mock-theme') || 'light'; } catch { return 'light'; }
}
function setTheme(t) {
  try { localStorage.setItem('clark-mock-theme', t); } catch { /* private mode */ }
  document.documentElement.dataset.theme = t;
}
document.documentElement.dataset.theme = currentTheme();

/* ── Motion helpers ────────────────────────────────────────────────────── */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Stagger-in the main blocks of every page. */
function revealAll() {
  const blocks = document.querySelectorAll('main section, main .panel, main .card, main .kpi, main .row, main .item, main article, .hero > *, .three > div, .pages a');
  if (REDUCED || document.visibilityState === 'hidden') return;
  blocks.forEach((el, i) => { el.classList.add('reveal'); el.style.animationDelay = `${Math.min(i, 14) * 45}ms`; });
  // Never leave content invisible if animations are paused or skipped.
  setTimeout(() => blocks.forEach((el) => el.classList.remove('reveal')), 1600);
}
/* Count a number up from 0, keeping any text around it (e.g. "38–26" counts both). */
function countUp(el) {
  const target = el.textContent;
  if (REDUCED) return;
  const nums = target.match(/\d+/g);
  if (!nums) return;
  const start = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - start) / 900);
    const ease = 1 - Math.pow(1 - k, 3);
    let i = 0;
    el.textContent = target.replace(/\d+/g, () => Math.round(Number(nums[i++]) * ease).toLocaleString());
    if (k < 1) requestAnimationFrame(tick); else el.textContent = target;
  };
  requestAnimationFrame(tick);
}

/* ── Stadium photos (Wikimedia Commons) ────────────────────────────────── */
const STADIUM = {
  DAL: 'Arlington_June_2020_4_(AT&T_Stadium).jpg', SEA: '2026_FIFA_World_Cup_-_Belgium_v._Egypt_in_Seattle_-_04.jpg',
  LAC: 'SoFi_Stadium_2023.jpg', LA: 'SoFi_Stadium_2023.jpg', ARI: 'State_Farm_Stadium_2022.jpg',
  GB: 'Lambeau_Field_-_Green_Bay_Packers_Football_Stadium_-_Wisconsin.jpg',
  ATL: 'Mercedes_Benz_Stadium_time_lapse_capture_2017-08-13.jpg',
};
const stadium = (t, w = 1400) => STADIUM[t] ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(STADIUM[t])}?width=${w}` : '';

/* ── The crew ──────────────────────────────────────────────────────────── */
const CREW = [
  { id: 'takuo', name: 'Takuo', team: 'SEA' },
  { id: 'nick', name: 'Nick', team: 'NYG' },
  { id: 'zane', name: 'Zane', team: 'BUF' },
];
/* picks: [[pick, pct, line], …] in CREW order */
function crewPicks(picks) {
  return `<div class="crew">${CREW.map((c, i) => `<div class="crew-row"><span class="crew-av ${c.id}" role="img" aria-label="${c.name}"></span>
    <div class="bubble"><b>${c.name}</b> · <span class="pk">${picks[i][0]} ${picks[i][1]}%</span><br>${picks[i][2]}</div></div>`).join('')}</div>`;
}

/* ── Fun confidence slider ─────────────────────────────────────────────── */
/* value: 0 = 100% away … 50 = no pick … 100 = 100% home. Sparks fly in the team's color while dragging. */
function mountSlider(root, away, home, initial = 50) {
  root.classList.add('fslider');
  root.innerHTML = `<div class="fs-labels"><span data-side="a">${name(away)}</span><span data-side="h">${name(home)}</span></div>
    <div class="fs-track"><span class="fs-fill"></span><span class="fs-mid"></span><span class="fs-thumb" role="slider" tabindex="0" aria-label="Your pick and confidence" aria-valuemin="0" aria-valuemax="100"><img alt="" draggable="false"></span></div>
    <div class="fs-read"></div><canvas class="fs-canvas"></canvas>`;
  const track = root.querySelector('.fs-track'), fill = root.querySelector('.fs-fill'), thumb = root.querySelector('.fs-thumb');
  const img = thumb.querySelector('img'), read = root.querySelector('.fs-read'), canvas = root.querySelector('.fs-canvas');
  const ctx = canvas.getContext('2d');
  let value = initial, sparks = [], raf = null, shownLogo = '', pending = null, dragging = false;

  const side = () => (value === 50 ? null : value > 50 ? home : away);
  const conf = () => 50 + Math.abs(value - 50);
  function render() {
    const t = side();
    const tc = t ? color(t) : 'var(--ink-3)';
    thumb.style.left = `${value}%`;
    thumb.style.setProperty('--tc', tc);
    const want = t ? logo(t) : '/brand/clark-logo.jpg';
    if (want !== shownLogo) { img.src = want; shownLogo = want; }
    fill.style.background = tc;
    fill.style.left = value >= 50 ? '50%' : `${value}%`;
    fill.style.width = `${Math.abs(value - 50)}%`;
    root.querySelectorAll('.fs-labels span').forEach((s) => {
      const on = (s.dataset.side === 'h' && value > 50) || (s.dataset.side === 'a' && value < 50);
      s.classList.toggle('on', on); s.style.color = on ? tc : '';
    });
    read.innerHTML = t ? `${name(t)} · ${conf()}%<small>${conf() >= 90 ? 'Lock it in 🔒' : conf() >= 75 ? 'Feeling good' : conf() >= 60 ? 'Leaning' : 'Coin flip-ish'}</small>` : `Drag toward a team<small>Further = more confident</small>`;
    thumb.setAttribute('aria-valuenow', String(value));
  }
  function burst(x, y, c, n) {
    if (REDUCED) return;
    const room = Math.max(0, 90 - sparks.length);
    for (let i = 0; i < Math.min(n, room); i++) {
      const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 3.5;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, c, r: 1.5 + Math.random() * 2.5 });
    }
    if (!raf) raf = requestAnimationFrame(step);
  }
  function step() {
    canvas.width = canvas.clientWidth * devicePixelRatio; canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    sparks = sparks.filter((p) => p.life > 0);
    sparks.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 0.03;
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c;
      ctx.shadowColor = p.c; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life + 0.5, 0, Math.PI * 2); ctx.fill();
    });
    raf = sparks.length ? requestAnimationFrame(step) : null;
  }
  function setFrom(clientX, spark) {
    const r = track.getBoundingClientRect();
    const prev = value;
    value = Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
    if (Math.abs(value - 50) < 3) value = 50;
    render();
    const t = side();
    if (spark && t && value !== prev) {
      const cr = canvas.getBoundingClientRect();
      burst(r.left + (value / 100) * r.width - cr.left, r.top + r.height / 2 - cr.top, color(t), 3 + Math.round(Math.abs(value - 50) / 10));
    }
  }
  // Pointer capture keeps the drag alive even if the pointer leaves the track or the window.
  const onMove = (e) => {
    if (!dragging) return;
    pending = e.clientX;
    if (!onMove.queued) { onMove.queued = true; requestAnimationFrame(() => { onMove.queued = false; if (pending != null) setFrom(pending, true); }); }
  };
  const end = (e) => {
    if (!dragging) return;
    dragging = false; root.classList.remove('drag');
    try { if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    const t = side();
    if (e.type === 'pointerup' && t) { const r = thumb.getBoundingClientRect(); lockPick(t, conf(), r.left + r.width / 2, r.top); }
  };
  track.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true; root.classList.add('drag');
    try { track.setPointerCapture(e.pointerId); } catch { /* synthetic events have no capturable pointer */ }
    setFrom(e.clientX, true);
  });
  track.addEventListener('pointermove', onMove);
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);
  track.addEventListener('lostpointercapture', end);
  thumb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { value = Math.min(100, Math.max(0, value + (e.key === 'ArrowRight' ? 5 : -5))); render(); e.preventDefault(); }
  });
  render();
}

/* ── Celebration: confetti in team colors + toast ─────────────────────── */
function confetti(colors, x = innerWidth / 2, y = innerHeight / 2) {
  if (REDUCED) return;
  let cv = document.getElementById('confetti');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'confetti'; document.body.appendChild(cv); }
  const c = cv.getContext('2d');
  cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
  c.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  const bits = Array.from({ length: 90 }, () => ({
    x, y, vx: (Math.random() - .5) * 14, vy: -Math.random() * 12 - 4, r: Math.random() * Math.PI,
    vr: (Math.random() - .5) * .4, w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, c: colors[Math.floor(Math.random() * colors.length)], life: 1,
  }));
  const tick = () => {
    c.clearRect(0, 0, innerWidth, innerHeight);
    bits.forEach((b) => { b.x += b.vx; b.y += b.vy; b.vy += .38; b.vx *= .99; b.r += b.vr; b.life -= .011;
      c.save(); c.globalAlpha = Math.max(0, b.life); c.translate(b.x, b.y); c.rotate(b.r); c.fillStyle = b.c; c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); c.restore(); });
    if (bits.some((b) => b.life > 0)) requestAnimationFrame(tick); else c.clearRect(0, 0, innerWidth, innerHeight);
  };
  requestAnimationFrame(tick);
}
function toast(html, img = '/brand/clark-logo.jpg') {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = `<img src="${img}" alt="">${html}`;
  t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400);
}
function lockPick(team, pct, x, y) {
  confetti([color(team), '#ffffff', TEAM[team] ? '#FFB612' : '#C8272D'], x, y);
  toast(`Locked: ${name(team)}${pct ? ` · ${pct}%` : ''}. Let's see if you beat Clark 😤`, logo(team));
}

/* Reactions float up and count; quick-pick buttons lock with confetti. */
document.addEventListener('click', (e) => {
  const react = e.target.closest('.reacts button');
  if (react) {
    const emoji = react.textContent.trim().split(' ')[0];
    const n = react.textContent.match(/\d+/);
    if (n && !react.classList.contains('on')) react.innerHTML = `${emoji} ${Number(n[0]) + 1}`;
    react.classList.add('on');
    if (!REDUCED) for (let i = 0; i < 5; i++) {
      const f = document.createElement('span'); f.className = 'float-emoji'; f.textContent = emoji;
      f.style.left = `${e.clientX}px`; f.style.top = `${e.clientY - 10}px`;
      f.style.setProperty('--dx', `${(Math.random() - .5) * 80}px`); f.style.setProperty('--rot', `${(Math.random() - .5) * 60}deg`);
      f.style.animationDelay = `${i * 70}ms`; document.body.appendChild(f); setTimeout(() => f.remove(), 1400);
    }
    return;
  }
  const pk = e.target.closest('button.pk');
  if (pk) {
    e.preventDefault(); e.stopPropagation();
    const team = pk.textContent.trim().split(/\s+/).pop();
    const abbr = TEAM[team] ? team : Object.keys(TEAM).find((k) => name(k) === team);
    pk.parentElement.querySelectorAll('.pk').forEach((b) => b.classList.toggle('picked', b === pk));
    if (abbr) { pk.style.setProperty('--tc', color(abbr)); lockPick(abbr, null, e.clientX, e.clientY); }
  }
}, true);
