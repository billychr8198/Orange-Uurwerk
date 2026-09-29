/* ==========================================================================
   Oranje Uurwerk — views: routing, map, collections, Nederland, start-up
   ========================================================================== */
(() => {
  'use strict';
  const U = window.__UU;
  const { $, $$, clamp, esc, fmtDur, HOUR, MIN, GOAL_H, LEVELS, STATS, GIFTS } = U;
  const D = window.UURWERK_DATA;
  const VIEWS = ['timer', 'map', 'icons', 'innovations', 'nederland', 'guide'];
  let currentView = 'timer';
  let selectedProv = null;

  /* ---------------------------------------------------------------- counts & nav dots */
  const counts = () => {
    const c = U.S.progress.celebrated;
    return { map: clamp(c, 0, 12), icons: clamp(c - 12, 0, 12), innovations: clamp(c - 24, 0, 12), nederland: c };
  };
  function paintNav() {
    const cn = counts(), seen = U.S.progress.seen;
    Object.keys(cn).forEach((k) => {
      const a = $(`.nav-btn[data-nav="${k}"]`);
      if (a) a.classList.toggle('has-new', cn[k] > (seen[k] || 0) && currentView !== k);
    });
  }
  U.paintNav = paintNav;
  function markSeen(v) {
    const cn = counts();
    if (v in cn && (U.S.progress.seen[v] || 0) < cn[v]) { U.S.progress.seen[v] = cn[v]; U.save(); }
    paintNav();
  }

  /* ---------------------------------------------------------------- routing */
  function route() {
    const raw = decodeURIComponent((location.hash || '#timer').slice(1));
    let [v, sub] = raw.split('/');
    if (!VIEWS.includes(v)) v = 'timer';
    showView(v);
    if (v === 'map') selectProvince(sub || selectedProv, { scroll: !!sub });
  }
  function showView(v) {
    const changed = v !== currentView;
    currentView = v;
    $$('.view').forEach((el) => el.classList.toggle('active', el.dataset.view === v));
    $$('.nav-btn[data-nav]').forEach((a) => { if (a.dataset.nav === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('#miniTimer').classList.toggle('show', v !== 'timer');
    if (v === 'guide') { const f = $('#ytFrame'); if (f && !f.src) f.src = f.dataset.src; }
    if (v === 'map') paintMap();
    if (v === 'icons') renderCollection('icons');
    if (v === 'innovations') renderCollection('innovations');
    if (v === 'nederland') renderNederland();
    markSeen(v);
    if (changed) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  U.onRender = () => {
    if (currentView === 'map') paintMap();
    if (currentView === 'icons') renderCollection('icons');
    if (currentView === 'innovations') renderCollection('innovations');
    if (currentView === 'nederland') renderNederland();
    if (currentView !== 'timer') markSeen(currentView);
  };

  /* ---------------------------------------------------------------- map */
  const provHour = (i) => i + 1;
  const provUnlocked = (i) => U.S.progress.celebrated >= provHour(i);
  const LABEL_FIX = { 'north-holland': [398, 262], zeeland: [150, 600], 'south-holland': [318, 440], flevoland: [536, 316], utrecht: [458, 414], limburg: [626, 648] };

  function buildMap() {
    const provs = D.provinces;
    const paths = provs.map((p, i) => `<path class="prov" id="prov-${p.id}" data-i="${i}" d="${p.path}" tabindex="0" role="button" aria-label="${esc(p.name)}"></path>`).join('');
    const labels = provs.map((p) => { const [x, y] = LABEL_FIX[p.id] || p.label; return `<text class="prov-label" id="lab-${p.id}" x="${x}" y="${y}">${esc(p.name)}</text>`; }).join('');
    $('#mapSvgHolder').innerHTML = `<svg viewBox="68 8 824 782" aria-label="Map of the 12 provinces of the Netherlands" role="group">
      <defs><pattern id="lockedHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#E6ECF2"/><rect width="2.6" height="7" fill="#CFD8E2"/></pattern></defs>
      <rect x="68" y="8" width="824" height="782" fill="#D8E7F3"/>
      <text class="sea-label" x="150" y="330">Noordzee</text>
      <text class="sea-label" x="482" y="222" style="font-size:12px;letter-spacing:.06em">IJsselmeer</text>
      <g id="provGroup">${paths}</g>
      <g id="labelGroup">${labels}</g>
      <g id="locatorGroup"></g>
    </svg>`;
    $('#provGroup').addEventListener('click', (e) => { const p = e.target.closest('.prov'); if (p) pickProvince(+p.dataset.i); });
    $('#provGroup').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const p = e.target.closest('.prov'); if (!p) return;
      e.preventDefault(); pickProvince(+p.dataset.i);
    });
  }
  function pickProvince(i) {
    const p = D.provinces[i];
    history.replaceState(null, '', `#map/${p.id}`);
    selectProvince(p.id, { scroll: window.innerWidth <= 980 });
    U.clickSound();
  }
  function paintMap() {
    const c = U.S.progress.celebrated;
    D.provinces.forEach((p, i) => {
      const el = $(`#prov-${p.id}`); if (!el) return;
      const un = provUnlocked(i);
      el.classList.toggle('locked', !un);
      el.style.fill = un ? p.color : '';
      el.setAttribute('aria-label', un ? `${p.name}, unlocked` : `${p.name}, locked until hour ${provHour(i)}`);
      $(`#lab-${p.id}`).classList.toggle('locked', !un);
    });
    const n = Math.min(12, c);
    $('#mapBadge').innerHTML = `<span class="count-pill">${n} / 12</span> unlocked`;
    $('#mapBadge').classList.toggle('open', n === 12);
    if (!selectedProv) renderProvIntro();
    else if ($('#provDetail').dataset.state !== `${selectedProv}:${provUnlocked(D.provinces.findIndex((p) => p.id === selectedProv))}`) selectProvince(selectedProv, { scroll: false });
  }
  function locate(id) {
    const p = D.provinces.find((x) => x.id === id); if (!p) return;
    const [x, y] = p.centroid;
    $('#locatorGroup').innerHTML = `<circle class="locator" cx="${x}" cy="${y}" r="26"/><circle class="locator" cx="${x}" cy="${y}" r="26" style="animation-delay:.5s"/>`;
  }
  let newMapFlash = null;
  U.markNewMap = (from, to) => { if (from <= 12) newMapFlash = D.provinces[Math.min(12, to) - 1]?.id || null; };

  function renderProvIntro() {
    const box = $('#provDetail');
    box.dataset.state = 'intro';
    const c = U.S.progress.celebrated;
    const next = c < 12 ? D.provinces[c] : null;
    const chips = D.provinces.map((p, i) => `<button class="prov-chip${provUnlocked(i) ? '' : ' locked'}" type="button" data-id="${p.id}"><i style="${provUnlocked(i) ? `background:${p.color}` : ''}"></i>${esc(p.name)}</button>`).join('');
    box.innerHTML = `<h2 style="margin-top:0">Tap a province to explore</h2>
      <p>${c === 0 ? 'Your map is still asleep. Finish your first hour of focus and <b>Drenthe</b> wakes up, full of colour.' : c >= 12 ? 'You have unlocked every province. Pick one to read its story and see its places again.' : `You have unlocked <b>${c}</b> of 12 provinces. Next up is <b>${esc(next.name)}</b>.`}</p>
      <p style="color:var(--ink-soft)">Each province has its own story and five photos. The journey goes from Drenthe in the north-east to Zeeland by the sea.</p>
      <div class="prov-chips">${chips}</div>`;
  }
  $('#provDetail').addEventListener('click', (e) => {
    const chip = e.target.closest('.prov-chip');
    if (chip) { pickProvince(D.provinces.findIndex((p) => p.id === chip.dataset.id)); return; }
    const th = e.target.closest('[data-ph]');
    if (th) { showPhoto(+th.dataset.ph); return; }
    if (e.target.closest('.detail-hero:not(.locked-teaser)')) { openLightbox(currentPhotos, currentPhoto); return; }
    if (e.target.closest('[data-back]')) { selectedProv = null; history.replaceState(null, '', '#map'); $$('.prov.selected').forEach((x) => x.classList.remove('selected')); renderProvIntro(); }
  });

  let currentPhotos = [], currentPhoto = 0;
  function showPhoto(i) {
    currentPhoto = i;
    const ph = currentPhotos[i];
    const hero = $('#provDetail .detail-hero');
    if (!hero || !ph) return;
    $('img', hero).src = ph.src; $('img', hero).alt = ph.caption;
    $('figcaption', hero).textContent = ph.caption;
    $$('#provDetail .thumbs button').forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
  }
  function selectProvince(id, { scroll = false } = {}) {
    const i = D.provinces.findIndex((p) => p.id === id);
    if (i < 0) { selectedProv = null; renderProvIntro(); return; }
    selectedProv = id;
    const p = D.provinces[i];
    $$('.prov.selected').forEach((x) => x.classList.remove('selected'));
    const el = $(`#prov-${p.id}`);
    if (el) { el.classList.add('selected'); el.parentNode.appendChild(el); }
    const un = provUnlocked(i);
    const box = $('#provDetail');
    box.dataset.state = `${id}:${un}`;
    currentPhotos = p.photos; currentPhoto = 0;
    if (un) {
      box.innerHTML = `<figure class="detail-hero" style="margin:0"><img src="${p.photos[0].src}" alt="${esc(p.photos[0].caption)}"><figcaption>${esc(p.photos[0].caption)}</figcaption></figure>
        <div class="thumbs">${p.photos.map((ph, k) => `<button type="button" data-ph="${k}" aria-label="${esc(ph.caption)}" aria-current="${k === 0}"><img src="${ph.thumb}" alt="" loading="lazy"></button>`).join('')}</div>
        <div class="detail-title"><h2>${esc(p.name)}</h2>${p.dutch !== p.name ? `<span class="dutch">${esc(p.dutch)}</span>` : ''}</div>
        <div class="detail-tag">${esc(p.tag)}</div>
        <div class="facts"><span class="fact">Capital: <b>${esc(p.capital)}</b></span><span class="fact">Stop <b>${i + 1}</b> of 12</span><span class="fact">Unlocked in hour <b>${provHour(i)}</b></span></div>
        <div class="story">${p.story.map((s) => `<p>${s}</p>`).join('')}</div>
        <p style="margin-top:18px"><button class="btn" type="button" data-back>Back to all provinces</button></p>`;
    } else {
      const toGo = provHour(i) * HOUR - U.liveFocusMs();
      box.innerHTML = `<figure class="detail-hero locked-teaser" style="margin:0"><img src="${p.photos[0].thumb}" alt=""><div class="lock-over"><div><svg width="34" height="34" style="display:block;margin:0 auto 6px"><use href="#i-lock"/></svg>Unlocks in hour ${provHour(i)}</div></div></figure>
        <div class="detail-title"><h2>${esc(p.name)}</h2>${p.dutch !== p.name ? `<span class="dutch">${esc(p.dutch)}</span>` : ''}</div>
        <div class="detail-tag">${esc(p.tag)}</div>
        <div class="facts"><span class="fact">Capital: <b>${esc(p.capital)}</b></span><span class="fact">Stop <b>${i + 1}</b> of 12</span></div>
        <p>This province is still locked. Keep focusing for about <b>${esc(fmtDur(Math.max(MIN, toGo), true))}</b> more to unlock ${esc(p.name)}, its story and its five photos.</p>
        <p style="color:var(--ink-soft)">Every minute of focus counts, even short rounds.</p>
        <p style="margin-top:18px"><a class="btn btn-dark" href="#timer">Go to the timer</a> <button class="btn" type="button" data-back>Back to all provinces</button></p>`;
    }
    if (newMapFlash === id || (un && scroll)) { locate(id); if (newMapFlash === id) newMapFlash = null; }
    if (scroll) setTimeout(() => box.scrollIntoView({ behavior: U.reduceMotion() ? 'auto' : 'smooth', block: 'start' }), 30);
  }

  /* ---------------------------------------------------------------- lightbox */
  let lbList = [], lbIdx = 0;
  function openLightbox(list, i) { lbList = list; lbIdx = i; paintLightbox(); U.openDlg($('#lightbox')); }
  function paintLightbox() {
    const ph = lbList[lbIdx]; if (!ph) return;
    $('#lbImg').innerHTML = `<img src="${ph.src}" alt="${esc(ph.caption)}">`;
    $('#lbCap').textContent = ph.caption;
    $('#lbCount').textContent = `${lbIdx + 1} / ${lbList.length}`;
  }
  $('#lbPrev').addEventListener('click', () => { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; paintLightbox(); });
  $('#lbNext').addEventListener('click', () => { lbIdx = (lbIdx + 1) % lbList.length; paintLightbox(); });
  $('#lightbox').addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') $('#lbPrev').click(); if (e.key === 'ArrowRight') $('#lbNext').click(); });

  /* ---------------------------------------------------------------- collections (icons / innovations) */
  const COLL = {
    icons: { lv: 2, grid: '#iconsGrid', lock: '#iconsLock', badge: '#iconsBadge', wide: false, label: 'Dutch icon' },
    innovations: { lv: 3, grid: '#innovGrid', lock: '#innovLock', badge: '#innovBadge', wide: true, label: 'Dutch innovation' },
  };
  const collState = {};
  function renderCollection(key) {
    const C = COLL[key], L = LEVELS[C.lv - 1];
    const c = U.S.progress.celebrated;
    const base = (C.lv - 1) * 12;
    const n = clamp(c - base, 0, 12);
    const sig = `${n}`;
    $(C.badge).innerHTML = `<span class="count-pill">${n} / 12</span> collected`;
    $(C.badge).classList.toggle('open', n === 12);
    const live = U.liveFocusMs();
    if (!U.levelUnlocked(C.lv)) {
      $(C.lock).innerHTML = `<div class="level-lock"><svg><use href="#i-lock"/></svg><p>Level ${C.lv} opens after <b>${base} hours</b> of focus (${C.lv === 2 ? 'all 12 provinces' : 'all 12 Dutch icons'}). You have about <b>${esc(fmtDur(Math.max(MIN, base * HOUR - live), true))}</b> to go. Here is a sneak peek!</p></div>`;
    } else $(C.lock).innerHTML = '';
    if (collState[key] === sig) return;
    collState[key] = sig;
    $(C.grid).innerHTML = L.items.map((it, i) => {
      const hr = base + i + 1, un = c >= hr;
      const meta = key === 'icons' ? `${esc(it.years)}` : esc(it.year);
      return `<button class="card${un ? '' : ' locked'}" type="button" data-i="${i}" aria-label="${un ? esc(it.name) : `Locked, unlocks in hour ${hr}`}">
        <div class="card-img${C.wide ? ' wide' : ''}"><img src="${it.thumb}" alt="" loading="lazy" class="${it.fit === 'contain' ? 'contain' : ''}" style="object-position:${it.pos || '50% 50%'}">
          <span class="card-no">Hour ${hr}</span>${un ? '' : `<span class="lock-chip">🔒 Unlocks in hour ${hr}</span>`}</div>
        <div class="card-body"><div class="card-name">${un ? esc(it.name) : 'Still a secret'}</div><div class="card-meta">${un ? meta : `${C.label} #${i + 1}`}</div>${un ? `<div class="card-sub">${esc(it.subtitle)}</div>` : ''}</div>
      </button>`;
    }).join('');
  }
  Object.entries(COLL).forEach(([key, C]) => {
    $(C.grid).addEventListener('click', (e) => {
      const card = e.target.closest('.card'); if (!card) return;
      const i = +card.dataset.i;
      if (card.classList.contains('locked')) { U.toast('🔒', `This one unlocks in hour ${(C.lv - 1) * 12 + i + 1}. Keep going!`); return; }
      openItem(key, i);
    });
  });

  let itemCtx = null;
  function openItem(key, i) {
    const C = COLL[key], L = LEVELS[C.lv - 1], it = L.items[i];
    const base = (C.lv - 1) * 12;
    if (U.S.progress.celebrated < base + i + 1) return;
    itemCtx = { key, i };
    $('#itemKicker').textContent = `${C.label} ${i + 1} of 12, unlocked in hour ${base + i + 1}`;
    $('#itemImg').innerHTML = `<img src="${it.img}" alt="${esc(it.name)}" class="${it.fit === 'contain' ? 'contain' : ''}">`;
    $('#itemTitle').textContent = it.name;
    $('#itemSub').textContent = it.subtitle;
    $('#itemFacts').innerHTML = key === 'icons'
      ? `<span class="fact">Lived: <b>${esc(it.years)}</b></span><span class="fact">Known for: <b>${esc(it.field)}</b></span>`
      : `<span class="fact">Year: <b>${esc(it.year)}</b></span>`;
    $('#itemStory').innerHTML = it.story.map((s) => `<p>${s}</p>`).join('');
    const unlockedIdx = L.items.map((_, k) => k).filter((k) => U.S.progress.celebrated >= base + k + 1);
    const pos = unlockedIdx.indexOf(i);
    $('#itemPrev').disabled = pos <= 0; $('#itemNext').disabled = pos >= unlockedIdx.length - 1;
    $('#itemPrev').style.visibility = unlockedIdx.length > 1 ? 'visible' : 'hidden';
    $('#itemNext').style.visibility = unlockedIdx.length > 1 ? 'visible' : 'hidden';
    const d = $('#itemDlg');
    U.openDlg(d);
    d.querySelector('.dlg-body').scrollTop = 0;
  }
  U.openItem = openItem;
  function stepItem(dir) {
    if (!itemCtx) return;
    const C = COLL[itemCtx.key], base = (C.lv - 1) * 12;
    let k = itemCtx.i + dir;
    while (k >= 0 && k < 12 && U.S.progress.celebrated < base + k + 1) k += dir;
    if (k >= 0 && k < 12) openItem(itemCtx.key, k);
  }
  $('#itemPrev').addEventListener('click', () => stepItem(-1));
  $('#itemNext').addEventListener('click', () => stepItem(1));

  /* ---------------------------------------------------------------- Nederland */
  (function petals() {
    const g = $('#rosettePetals'); if (!g) return;
    let h = '';
    for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2; h += `<circle cx="${(64 + Math.cos(a) * 40).toFixed(1)}" cy="${(56 + Math.sin(a) * 40).toFixed(1)}" r="10"/>`; }
    g.innerHTML = h;
  })();
  $('#statGrid').innerHTML = STATS.map((s) => `<div class="stat-card" data-s="${s.id}">
    <div class="sc-top"><div class="sc-ico" aria-hidden="true">${s.ico}</div><div><div class="sc-name">${esc(s.name)}</div><div class="sc-hint">${esc(s.hint)}</div></div></div>
    <div class="sc-val">–</div><div class="sc-bar"><div></div></div>
    <div class="sc-range"><span>Start ${esc(s.fmtEnd(s.from))}</span><span>Goal ${esc(s.fmtEnd(s.to))}</span></div></div>`).join('');
  const statEls = STATS.map((s) => { const el = $(`.stat-card[data-s="${s.id}"]`); return { s, val: $('.sc-val', el), bar: $('.sc-bar > div', el) }; });

  function renderNederland() {
    const P = U.S.progress, c = P.celebrated;
    $('#giftGrid').innerHTML = GIFTS.map((g, i) => {
      const un = c >= i + 1;
      return un
        ? `<button class="tile" type="button" data-g="${i}" aria-label="${esc(g.name)}"><span class="t-emo" aria-hidden="true">${g.emo}</span><span class="t-name">${esc(g.name)}</span></button>`
        : `<div class="tile locked" aria-label="Locked gift for hour ${i + 1}"><span class="t-num">${i + 1}</span><span class="t-name">hour ${i + 1}</span></div>`;
    }).join('');
    paintReport();
    paintNederland();
  }
  function streak() {
    const days = U.S.progress.days;
    let n = 0; const d = new Date();
    const has = (dt) => (days[U.dayKey(dt.getTime())]?.ms || 0) >= MIN;
    if (!has(d) && !(U.S.timer.mode === 'focus' && U.elapsed() >= MIN)) d.setDate(d.getDate() - 1);
    else if (!has(d)) return 1;
    while (has(d)) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function paintReport(now = Date.now()) {
    const P = U.S.progress;
    const live = U.liveFocusMs(now);
    const active = Object.values(P.days).filter((x) => x.ms >= MIN).length;
    $('#reportBoxes').innerHTML = [
      [fmtDur(live), 'focused in total'], [P.sessions, 'focus rounds finished'], [active, active === 1 ? 'day with focus' : 'days with focus'], [`${streak()} 🔥`, 'day streak'],
    ].map(([v, l]) => `<div class="report-box"><div class="rb-val">${esc(v)}</div><div class="rb-lab">${esc(l)}</div></div>`).join('');
    const days = [];
    for (let k = 6; k >= 0; k--) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - k); days.push(d); }
    const curExtra = U.S.timer.mode === 'focus' ? U.elapsed(U.S.timer, now) : 0;
    const vals = days.map((d, k) => (P.days[U.dayKey(d.getTime())]?.ms || 0) + (k === 6 ? curExtra : 0));
    const max = Math.max(HOUR, ...vals);
    $('#weekBars').innerHTML = vals.map((v, k) => `<div class="day"><span class="bv">${v >= MIN ? fmtDur(v).replace(/^0h /, '') : ''}</span><div class="bar${k === 6 ? ' today' : ''}" style="height:${Math.max(1.5, (v / max) * 110)}px"></div></div>`).join('');
    $('#weekLabels').innerHTML = days.map((d, k) => `<span>${k === 6 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>`).join('');
  }
  let lastReportPaint = 0;
  function paintNederland(now = Date.now()) {
    if (currentView !== 'nederland') return;
    const h = U.liveHours(now);
    for (const m of statEls) {
      const t = m.s.fmt(U.statAt(m.s, h));
      if (m.val.textContent !== t) m.val.textContent = t;
      m.bar.style.width = `${U.curve(h) * 100}%`;
    }
    const r = U.rankAt(h);
    $('#bigRank').textContent = `#${r}`;
    $('#rankTitle').textContent = r === 1 ? 'The best country in the world to live in!' : `Best country to live in: #${r}`;
    $('#rankText').textContent = r === 1
      ? 'You did it. 36 hours of focus turned the Netherlands into number one. Gefeliciteerd!'
      : `Focus for ${fmtDur(Math.max(MIN, GOAL_H * HOUR - U.liveFocusMs(now)), true)} more and the Netherlands climbs to number one in the world.`;
    if (now - lastReportPaint > 15000) { lastReportPaint = now; paintReport(now); }
  }
  U.paintNederland = paintNederland;
  $('#giftGrid').addEventListener('click', (e) => {
    const t = e.target.closest('.tile[data-g]'); if (!t) return;
    const g = GIFTS[+t.dataset.g];
    $('#giftEmo').textContent = g.emo; $('#giftTitle').textContent = g.name; $('#giftText').textContent = g.text;
    $('#giftHour').textContent = `Your gift for hour ${+t.dataset.g + 1}`;
    U.openDlg($('#giftDlg'));
  });

  /* ---------------------------------------------------------------- lifecycle */
  function resync() {
    U.tick();
    if (U.Store.kind === 'cloud') {
      U.Store.get(U.KEY).then((raw) => {
        const other = U.parse(raw);
        if (other) { U.S = U.merge(U.S, other); afterStateChange(); }
      });
    }
  }
  function afterStateChange() {
    U.keepAwake(U.S.timer.running); U.heartbeat();
    collState.icons = collState.innovations = null;
    U.render();
  }
  U.afterReset = () => { selectedProv = null; collState.icons = collState.innovations = null; afterStateChange(); if (currentView === 'map') renderProvIntro(); };

  document.addEventListener('visibilitychange', () => { if (!document.hidden) resync(); else U.flush(); });
  window.addEventListener('focus', resync);
  window.addEventListener('pageshow', resync);
  window.addEventListener('pagehide', () => U.flushSync());
  document.addEventListener('freeze', () => U.flushSync());
  document.addEventListener('resume', resync);
  window.addEventListener('storage', (e) => {
    if (e.key !== U.KEY || !e.newValue) return;
    const other = U.parse(e.newValue);
    if (!other) return;
    U.S = U.merge(U.S, other);
    afterStateChange();
  });
  // unlock audio on the first interaction (needed for the alarm in background tabs)
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => U.primeAudio(), { once: true, capture: true }));

  async function init() {
    buildMap();
    try {
      const saved = U.parse(await U.Store.get(U.KEY));
      if (saved) U.S = saved;
    } catch (e) { /* start fresh */ }
    // a round that ended while the page was closed
    const t = U.S.timer;
    if (t.running && t.elapsedBefore + (Date.now() - t.startedAt) >= t.durationMs) {
      U.complete(t.startedAt + (t.durationMs - t.elapsedBefore));
    }
    if (U.S.timer.running) { U.keepAwake(true); U.heartbeat(); }
    route();
    U.render();
    U.checkUnlocks();
    U.save();
    if (!location.hash) history.replaceState(null, '', '#timer');
  }
  init();
})();
