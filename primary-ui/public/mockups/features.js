/* Clark Index mockups — small features: chat extras, play-by-play extras, Fade Clark,
   Ask Clark, head-to-head, confession, Wrapped, reminders. Runs after each page's own script. */

(function features() {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const key = new URLSearchParams(location.search).get('g') || 'SF-SEA';
  const g = typeof GAMES !== 'undefined' ? (GAMES.find((x) => `${x.a}-${x.h}` === key) || GAMES[12]) : null;
  const clarkAv = '<img class="fx-clark-av" src="/brand/clark-logo.jpg" alt="">';

  /* ── Game chat ─────────────────────────────────────────────────────── */
  function enhanceChat(box) {
    const head = $('.chat-head', box);
    if (!head || box.dataset.fx) return;
    box.dataset.fx = '1';
    head.insertAdjacentHTML('afterend', `
      <div class="fx-chatbar">
        <div class="fx-rooms" role="tablist" aria-label="Chat room">
          <button class="on" role="tab">Everyone</button><button role="tab">${name(g.a)} fans</button><button role="tab">${name(g.h)} fans</button>
        </div>
        <label class="fx-delay">🛡️ Spoiler shield <select aria-label="How far behind live you are"><option value="0">Off</option><option value="15">15s behind</option><option value="30">30s behind</option><option value="60">60s behind</option></select></label>
      </div>
      <div class="fx-mood" aria-label="Fan mood">
        <span><img src="${logo(g.a)}" alt="">${g.st === 'live' && winnerOf(g) !== g.a ? '😬' : '😤'} <b>${name(g.a)} fans</b></span>
        <div class="fx-mood-bar"><i style="width:38%;background:${color(g.a)}"></i><i style="width:62%;background:${color(g.h)}"></i></div>
        <span><b>${name(g.h)} fans</b> ${g.st === 'live' && winnerOf(g) === g.h ? '🥳' : '🤞'}<img src="${logo(g.h)}" alt=""></span>
      </div>`);
    const msgs = $('.msgs', box);
    if (g.st === 'live') {
      msgs.insertAdjacentHTML('afterbegin', `
        <div class="fx-poll" data-poll><div class="k">4TH &amp; 2 · ${g.a} 38 · Q3 5:10</div><b>Go for it or punt?</b>
          <div class="fx-poll-opts"><button data-v="go">Go for it</button><button data-v="punt">Punt</button></div>
          <div class="fx-poll-res" hidden><div><span>Go for it</span><div class="fx-bar"><i style="width:71%"></i></div><b>71%</b></div><div><span>Punt</span><div class="fx-bar"><i style="width:29%"></i></div><b>29%</b></div>
          <p>They went for it: <b>converted ✓</b>. 71% of you called it.</p></div></div>`);
      msgs.insertAdjacentHTML('beforeend', `
        <div class="msg fx-calledit"><span class="av" style="background:${color(g.h)}">KT</span><div><div class="who">12thman_kate <span>${g.h} · 80%</span> <span class="fx-stamp">✓ Called it</span></div>"Walker punches one in this drive" <small>· 6 min ago</small></div></div>
        <div class="msg fx-clarkmsg">${clarkAv}<div><div class="who">Clark <span>the model</span></div>Okay, I did NOT have the 49ers up at half. ${name(g.h)} back to 67% though. Breathing again. 😮‍💨</div></div>
        <div class="fx-held" hidden>🛡️ <b>2 plays held back</b> to match your delay · <button>Show anyway</button></div>`);
    } else {
      msgs.insertAdjacentHTML('beforeend', `<div class="msg fx-clarkmsg">${clarkAv}<div><div class="who">Clark <span>the model</span></div>Reminder: picks lock at kickoff. I'm on ${name(g.clark[0])}. Prove me wrong 👀</div></div>`);
    }
    box.addEventListener('click', (e) => {
      const room = e.target.closest('.fx-rooms button');
      if (room) $$('.fx-rooms button', box).forEach((b) => b.classList.toggle('on', b === room));
      const vote = e.target.closest('.fx-poll-opts button');
      if (vote) { const p = vote.closest('[data-poll]'); $('.fx-poll-opts', p).hidden = true; $('.fx-poll-res', p).hidden = false; toast(`Voted: ${vote.textContent}. Results in 👇`); }
      if (e.target.closest('.fx-held button')) { $('.fx-held', box).hidden = true; $$('.fx-spoiler', box).forEach((el) => el.classList.remove('fx-spoiler')); }
    });
    $('.fx-delay select', box).addEventListener('change', (e) => {
      const on = e.target.value !== '0';
      const held = $('.fx-held', box);
      if (held) held.hidden = !on;
      $$('.playcard', box).slice(0, 1).forEach((el) => el.classList.toggle('fx-spoiler', on));
      toast(on ? `Spoiler shield on: chat runs ${e.target.value}s behind live` : 'Spoiler shield off');
    });
  }

  /* ── Play-by-play ──────────────────────────────────────────────────── */
  const EXPLAIN = {
    td: "A touchdown is 6 points: the ball crossed the goal line. The kick after is worth 1 more, or teams can try a 2-point play from the 2-yard line.",
    third: 'Third down: the offense has one more try to gain the remaining yards. Convert and they get a fresh set of 4 downs; fail and they usually punt.',
    catch: 'A catch counts when the receiver controls the ball with both feet (or a knee) in bounds. Yards after the catch count too.',
    hold: "Holding: a blocker grabbed a defender to stop him. It's 10 yards back for the offense and the down is replayed. It's the most common penalty in football.",
  };
  function enhancePlays() {
    const live = $('[data-panel="live"]');
    if (!live || !g || g.st !== 'live') return;
    // Next-play guess
    live.insertAdjacentHTML('afterbegin', `<section class="panel fx-guess"><div class="ph">Next play: run or pass? <span class="fx-pts">🎯 Your guesses: 7 of 11 · <b>+35</b></span></div>
      <div class="pb"><div class="fx-guess-opts"><button data-v="Run">🏃 Run</button><button data-v="Pass">🎯 Pass</button></div><p class="muted fx-guess-msg">${g.h} ball, 1st &amp; 10 at the ${g.a} 34. Locks at the snap.</p></div></section>`);
    $('.fx-guess').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('.fx-guess-opts button').forEach((x) => { x.disabled = true; x.classList.toggle('on', x === b); });
      setTimeout(() => {
        const right = b.dataset.v === 'Pass';
        $('.fx-guess-msg').innerHTML = right ? '<b style="color:var(--win)">Pass! +5 🎯</b> Darnold to Smith-Njigba for 14.' : '<b style="color:var(--loss)">It was a pass.</b> Darnold to Smith-Njigba for 14.';
        if (right) { const r = b.getBoundingClientRect(); confetti([color(g.h), '#fff'], r.left + r.width / 2, r.top); }
      }, 900);
    });
    // Explain buttons + swing chips
    const kinds = ['td', 'catch', 'third', 'catch'];
    $$('.play', live).forEach((p, i) => {
      const k = kinds[i] || 'catch';
      const swing = p.querySelector('.wp');
      if (swing && /1[0-9]%/.test(swing.textContent)) swing.innerHTML = `🔥 ${swing.textContent}`;
      p.insertAdjacentHTML('beforeend', `<button class="fx-explain" aria-expanded="false" aria-label="Explain this play">?</button><div class="fx-explain-body" hidden>${EXPLAIN[k]}</div>`);
    });
    // A penalty play to show "explain" on a confusing one
    const fgDrive = $$('.drive', live)[1];
    if (fgDrive) fgDrive.insertAdjacentHTML('beforeend', `<div class="play"><span class="t">Q3 8:02</span><span><b>Penalty:</b> Holding, offense (#71), 10 yards. Replay 2nd down.</span><span class="wp">−2%</span><button class="fx-explain" aria-expanded="false" aria-label="Explain this play">?</button><div class="fx-explain-body" hidden>${EXPLAIN.hold}</div></div>`);
    live.addEventListener('click', (e) => {
      const b = e.target.closest('.fx-explain'); if (!b) return;
      e.preventDefault();
      const body = b.nextElementSibling; body.hidden = !body.hidden; b.setAttribute('aria-expanded', String(!body.hidden));
    });
    // Drive maps
    const drives = [[25, 100, g.h], [62, 21, g.a], [22, 26, g.h]];
    $$('.drive summary', live).forEach((s, i) => {
      const [from, to, team] = drives[i] || [30, 40, g.h];
      s.insertAdjacentHTML('beforeend', `<svg class="fx-drivemap" viewBox="0 0 120 24" aria-label="Drive from the ${from} to the ${to}">
        <rect x="0" y="2" width="120" height="20" rx="3" fill="#2E7D32"/><rect x="0" y="2" width="10" height="20" fill="${color(g.a)}"/><rect x="110" y="2" width="10" height="20" fill="${color(g.h)}"/>
        ${[30, 50, 70, 90].map((x) => `<line x1="${x}" y1="2" x2="${x}" y2="22" stroke="rgba(255,255,255,.35)"/>`).join('')}
        <line x1="${10 + from}" y1="12" x2="${10 + Math.min(to, 100)}" y2="12" stroke="#fff" stroke-width="3" stroke-linecap="round" marker-end="url(#fxa)"/>
        <defs><marker id="fxa" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#fff"/></marker></defs></svg>`);
    });
  }

  /* ── Recap: replay the game ────────────────────────────────────────── */
  function enhanceRecap() {
    const recap = $('[data-panel="recap"] .pb');
    if (!recap || !g) return;
    const frames = [['Kickoff', '0–0', 63], ['Q1 6:12', '0–7', 48], ['Q2 0:40', '13–7', 41], ['Q3 6:36', '13–10', 52], ['Q3 2:05', '13–17', 67], ['Final', '20–24', 100]];
    recap.insertAdjacentHTML('beforeend', `<div class="fx-replay"><h3 class="fh">Replay the game</h3>
      <div class="fx-replay-read"><b data-r="t">Kickoff</b><span data-r="s">${g.a} 0–0 ${g.h}</span><span data-r="p">${name(g.h)} 63%</span></div>
      <input type="range" min="0" max="${frames.length - 1}" value="0" aria-label="Scrub through the game"></div>`);
    $('.fx-replay input').addEventListener('input', (e) => {
      const [t, sc, p] = frames[Number(e.target.value)];
      $('[data-r="t"]').textContent = t; $('[data-r="s"]').textContent = `${g.a} ${sc} ${g.h}`; $('[data-r="p"]').textContent = `${name(g.h)} ${p}%`;
    });
  }

  /* ── Preview: Fade Clark + Ask Clark ───────────────────────────────── */
  function enhancePreview() {
    const slider = $('#slider');
    if (!slider || !g) return;
    const other = g.clark[0] === g.h ? g.a : g.h;
    slider.insertAdjacentHTML('afterend', `<div class="fx-fade"><div><b>Fade Clark</b><span>Pick ${name(other)} against Clark. Double points if you're right, double loss if not.</span></div><button class="btn btn-red btn-sm">Fade Clark · 2×</button></div>`);
    $('.fx-fade button').addEventListener('click', (e) => { const r = e.target.getBoundingClientRect(); confetti([color(other), '#F05A34', '#fff'], r.left + r.width / 2, r.top); toast(`Fading Clark: ${name(other)} at 2×. Bold. 😈`, logo(other)); });
    const report = $('#report-card');
    if (!report) return;
    report.insertAdjacentHTML('afterend', `<section class="panel fx-ask"><div class="ph">Ask Clark</div><div class="pb">
      <div class="fx-ask-sugg"><button>Why not ${name(other)}?</button><button>Who's the X-factor?</button><button>What happens if it rains?</button></div>
      <div class="fx-ask-row"><input placeholder="Ask anything about this game…" aria-label="Ask Clark a question"><button class="btn btn-ink btn-sm">Ask</button></div>
      <div class="fx-ask-ans" hidden>${clarkAv}<p></p></div></div></section>`);
    const ANSWERS = {
      0: `Honestly? ${name(other)} have a real shot. But the matchup I keep coming back to favors ${name(g.clark[0])}. If that flips early, so do I.`,
      1: `The player who moves my number most is on the ${name(other)} line. If he sits, I go up about 3 points.`,
      2: "Indoors, so rain does nothing here. If it were outside, I'd shave a couple points off both offenses and lean toward the defense.",
    };
    const ask = (q, i) => {
      const box = $('.fx-ask-ans'); box.hidden = false;
      const text = ANSWERS[i] ?? `Good question! In the real app I'd answer "${q}" from this game's numbers. For now: I'm still on ${name(g.clark[0])}, ${g.clark[1]}%.`;
      const p = $('p', box); p.textContent = '';
      let n = 0; const id = setInterval(() => { p.textContent = text.slice(0, ++n); if (n >= text.length) clearInterval(id); }, REDUCED ? 0 : 14);
    };
    $$('.fx-ask-sugg button').forEach((b, i) => b.addEventListener('click', () => ask(b.textContent, i)));
    $('.fx-ask-row button').addEventListener('click', () => { const v = $('.fx-ask-row input').value.trim(); if (v) ask(v, -1); });
  }

  /* ── Games page: head-to-head + Fade Clark chip ────────────────────── */
  function enhanceGames() {
    const side = $('.side');
    if (!side || !$('#slate')) return;
    side.insertAdjacentHTML('beforeend', `<section class="fx-h2h"><h2>Head-to-head</h2>
      <p>Send a friend a link. You both pick this week's games and the winner gets bragging rights. No league needed.</p>
      <button class="btn btn-red btn-sm">Copy challenge link</button></section>`);
    $('.fx-h2h button').addEventListener('click', () => toast('Challenge link copied. Send it to someone who thinks they know ball 🏈'));
    $$('.row').forEach((row) => {
      const you = $('.you', row);
      if (you && you.querySelector('.pk')) you.insertAdjacentHTML('beforeend', '<button class="fx-fade-chip" title="Pick against Clark for double points">Fade Clark 2×</button>');
    });
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.fx-fade-chip'); if (!chip) return;
      e.preventDefault(); e.stopPropagation(); chip.classList.add('on'); chip.textContent = 'Fading Clark 😈';
      const r = chip.getBoundingClientRect(); confetti(['#F05A34', '#E23B3B', '#fff'], r.left + r.width / 2, r.top);
    }, true);
  }

  /* ── Home: confession + reminder ───────────────────────────────────── */
  function enhanceHome() {
    const more = $$('.lead .h-sec')[0];
    if (!more || !$('.lead')) return;
    more.insertAdjacentHTML('afterend', `<a class="item fx-confess" href="#"><div class="kicker">Clark's confession · Week 4</div>
      <h3>"I had the Jets. We don't talk about the Jets." Clark grades his own week: 10–6, and the two picks he'd take back.</h3><p>Every Tuesday, in his own words.</p></a>`);
    setTimeout(() => toast('⏰ 3 of your picks lock in 1 hour. Streak on the line!'), 1200);
  }

  /* ── My season: Clark Wrapped + reminders setting ──────────────────── */
  function enhanceSeason() {
    const kpis = $('.kpis');
    if (!kpis) return;
    const slides = [['Your 2026 so far', 'You picked <b>64 games</b> and beat Clark in <b>2 of 5</b> weeks.'], ['Your best call', '<b>Cardinals over Seahawks at 90%</b>. Only 18% of fans had it.'], ['Your blind spot', 'The <b>AFC West</b>. You\'re 2–7. Clark is 6–3. Just saying.'], ['Fan type', 'You\'re a <b>Bold Contrarian</b> 😈: you fade Clark more than 91% of fans.']];
    kpis.insertAdjacentHTML('afterend', `<section class="fx-wrapped"><div class="fx-wr-top"><span>${clarkAv} Clark Wrapped · preview</span><span class="fx-wr-dots">${slides.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</span></div>
      <div class="fx-wr-slide"><small>${slides[0][0]}</small><p>${slides[0][1]}</p></div><button class="fx-wr-next" aria-label="Next">›</button></section>`);
    let i = 0;
    $('.fx-wr-next').addEventListener('click', () => {
      i = (i + 1) % slides.length;
      $('.fx-wr-slide').innerHTML = `<small>${slides[i][0]}</small><p>${slides[i][1]}</p>`;
      $('.fx-wr-slide').classList.remove('fx-in'); void $('.fx-wr-slide').offsetWidth; $('.fx-wr-slide').classList.add('fx-in');
      $$('.fx-wr-dots i').forEach((d, j) => d.classList.toggle('on', j === i));
    });
    const privacy = $$('[data-panel="settings"] .card')[2];
    if (privacy) $('.cb', privacy).insertAdjacentHTML('beforeend', `<div class="form-row"><label>Pick reminders<small>A nudge 1 hour before your unpicked games lock</small></label><span class="switch" role="switch" aria-checked="true"></span></div>
      <div class="form-row"><label>Spoiler shield default<small>Hold chat and plays back to match your TV delay</small></label><div class="seg"><button class="on">Off</button><button>15s</button><button>30s</button><button>60s</button></div></div>`);
  }

  if (g && $('#chat-side')) { enhanceChat($('#chat-side')); enhanceChat($('#chat-tab-body')); enhancePlays(); enhanceRecap(); enhancePreview(); }
  enhanceGames(); enhanceHome(); enhanceSeason();
})();
