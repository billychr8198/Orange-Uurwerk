/* ==========================================================================
   Oranje Uurwerk — UI: timer page, tasks, settings, dialogs, unlocks
   ========================================================================== */
(() => {
  'use strict';
  const U = window.__UU;
  const { $, $$, clamp, esc, fmtClock, fmtDur, HOUR, MIN, GOAL_H, LEVELS, STATS, GIFTS, MODE_TEXT, MODE_NAME, LIMITS, DEFAULTS } = U;

  /* ---------------------------------------------------------------- toasts */
  function toast(emo, msg, action = null, ttl = 5000) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="t-emo" aria-hidden="true">${emo}</span><span class="t-msg">${esc(msg)}</span>`;
    if (action) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = action.label;
      b.addEventListener('click', () => { action.fn(); el.remove(); });
      el.appendChild(b);
    }
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    if (ttl) setTimeout(() => el.remove(), ttl);
    return el;
  }
  U.toast = toast;

  /* ---------------------------------------------------------------- dialogs */
  const anyOpen = () => !!document.querySelector('dialog[open]');
  function openDlg(d) {
    if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
  }
  function closeDlg(d) { if (d.open) d.close(); }
  U.openDlg = openDlg; U.closeDlg = closeDlg;
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { closeDlg(d); return; }
      if (e.target === d && d.id !== 'confirmDlg') { // click on backdrop
        const r = d.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDlg(d);
      }
    });
    d.addEventListener('close', () => setTimeout(pump, 280));
  });

  let confirmResolve = null;
  function confirmBox(title, text, okLabel = 'OK', cancelLabel = 'Cancel') {
    const d = $('#confirmDlg');
    $('#confirmTitle').textContent = title;
    $('#confirmText').textContent = text;
    $('#confirmYes').textContent = okLabel;
    $('#confirmNo').textContent = cancelLabel;
    if (confirmResolve) confirmResolve(false);
    return new Promise((res) => {
      confirmResolve = res;
      openDlg(d);
      $('#confirmYes').focus();
    });
  }
  U.confirmBox = confirmBox;
  $('#confirmYes').addEventListener('click', () => { const r = confirmResolve; confirmResolve = null; closeDlg($('#confirmDlg')); r && r(true); });
  $('#confirmNo').addEventListener('click', () => { const r = confirmResolve; confirmResolve = null; closeDlg($('#confirmDlg')); r && r(false); });
  $('#confirmDlg').addEventListener('close', () => { if (confirmResolve) { const r = confirmResolve; confirmResolve = null; r(false); } });

  /* ---------------------------------------------------------------- confetti */
  const cvs = $('#confetti');
  let confettiParts = [], confettiRaf = 0;
  function confetti(amount = 120) {
    if (U.reduceMotion() || document.hidden) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = innerWidth * dpr; cvs.height = innerHeight * dpr;
    const cols = ['#E0662A', '#FF8C42', '#AE1C28', '#FFFFFF', '#21468B', '#F2C14E'];
    for (let i = 0; i < amount; i++) {
      confettiParts.push({
        x: innerWidth / 2 + (Math.random() - .5) * innerWidth * .5, y: innerHeight * .32,
        vx: (Math.random() - .5) * 13, vy: -Math.random() * 12 - 4,
        s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .35,
        c: cols[i % cols.length], life: 0, tulip: Math.random() < .18,
      });
    }
    try { if (cvs.showPopover) { if (cvs.matches(':popover-open')) cvs.hidePopover(); cvs.showPopover(); } } catch (e) { /* older browsers: plain fixed canvas */ }
    if (!confettiRaf) confettiRaf = requestAnimationFrame(drawConfetti);
  }
  function drawConfetti() {
    const ctx = cvs.getContext('2d');
    const dpr = cvs.width / innerWidth;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    confettiParts.forEach((p) => {
      p.life++; p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.c === '#FFFFFF') { ctx.strokeStyle = 'rgba(0,0,0,.15)'; }
      if (p.tulip) { ctx.font = `${p.s * 2.2}px serif`; ctx.fillText('🌷', -p.s, p.s); }
      else { ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); if (p.c === '#FFFFFF') ctx.strokeRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
      ctx.restore();
    });
    confettiParts = confettiParts.filter((p) => p.y < innerHeight + 40 && p.life < 400);
    if (confettiParts.length) confettiRaf = requestAnimationFrame(drawConfetti);
    else { confettiRaf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); try { if (cvs.hidePopover && cvs.matches(':popover-open')) cvs.hidePopover(); } catch (e) { /* ignore */ } }
  }
  U.confetti = confetti;

  /* ---------------------------------------------------------------- canal houses */
  const GABLES = [
    'M4 66V26h4v-6h4v-6h4V8h8v6h4v6h4v6h4v40Z',                                   // step gable
    'M6 66V31c0-4 4-4 6-6V11q8-7 16 0v14c2 2 6 2 6 6v35Z',                         // neck gable
    'M4 66V31q0-8 6-10 4-2 4-8 6-9 12 0 0 6 4 8 6 2 6 10v35Z',                     // bell gable
    'M4 66V27L20 7l16 20v39Z',                                                     // spout gable
  ];
  let housesLevel = -1;
  function currentLevel() { return Math.min(3, Math.floor(U.S.progress.celebrated / 12) + 1); }
  function buildHouses() {
    const lv = currentLevel();
    if (lv === housesLevel) return;
    housesLevel = lv;
    const L = LEVELS[lv - 1];
    const wrap = $('#houses');
    wrap.innerHTML = L.items.map((it, i) => {
      const g = GABLES[(i * 3 + lv) % 4];
      const col = L.n === 1 ? it.color : ['#B8521E', '#2F5E8C', '#2D6A4F', '#AE1C28'][i % 4];
      return `<button class="house" type="button" data-i="${i}" style="--c:${col}" aria-label="${esc(it.name)}">
        <svg viewBox="0 0 40 66" aria-hidden="true"><defs><clipPath id="hc${i}"><path d="${g}"/></clipPath></defs>
          <path class="h-body" d="${g}"/>
          <rect class="h-fill" clip-path="url(#hc${i})" x="0" y="66" width="40" height="66"/>
          <circle class="h-win" cx="20" cy="${g === GABLES[3] ? 24 : 21}" r="2.6"/>
          <rect class="h-win" x="10" y="33" width="7.5" height="8" rx="1"/><rect class="h-win" x="22.5" y="33" width="7.5" height="8" rx="1"/>
          <rect class="h-win" x="10" y="45" width="7.5" height="8" rx="1"/><rect class="h-win" x="22.5" y="45" width="7.5" height="8" rx="1"/>
          <rect class="h-door" x="16" y="56" width="8" height="10" rx="3"/>
        </svg><title>${esc(it.name)}</title></button>`;
    }).join('');
    $('#levelLabel').textContent = `Level ${lv} of 3`;
    $('#levelName').textContent = L.name;
  }
  function paintHouses() {
    buildHouses();
    const c = U.S.progress.celebrated;
    const base = (housesLevel - 1) * 12;
    $$('.house').forEach((b, i) => {
      const hourN = base + i + 1;
      const done = c >= hourN, cur = !done && c === hourN - 1;
      b.classList.toggle('done', done); b.classList.toggle('current', cur); b.classList.toggle('locked', !done && !cur);
      const it = LEVELS[housesLevel - 1].items[i];
      b.setAttribute('aria-label', done ? `${it.name}, unlocked. Open.` : cur ? `${it.name}, unlocking now` : `Locked, hour ${hourN}`);
      b.title = done ? it.name : cur ? `${it.name}: unlocking now` : `Hour ${hourN}`;
      if (!cur) b.querySelector('.h-fill').setAttribute('y', done ? 0 : 66);
    });
  }
  $('#houses').addEventListener('click', (e) => {
    const b = e.target.closest('.house.done'); if (!b) return;
    const i = +b.dataset.i;
    const L = LEVELS[housesLevel - 1];
    if (L.n === 1) location.hash = `#map/${L.items[i].id}`;
    else U.openItem(L.key, i);
  });

  /* ---------------------------------------------------------------- mini stats */
  $('#miniStats').innerHTML = STATS.map((s) => `<div class="mini-stat" data-s="${s.id}" title="${esc(s.name)}"><div class="ms-name">${s.ico} ${esc(s.mini)}</div><div class="ms-val">–</div><div class="ms-bar"><div></div></div></div>`).join('');
  const miniEls = STATS.map((s) => { const el = $(`.mini-stat[data-s="${s.id}"]`); return { s, val: $('.ms-val', el), bar: $('.ms-bar > div', el) }; });

  /* ---------------------------------------------------------------- render + live paint */
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const MODE_COLOR = { focus: '#B8521E', short: '#2F5E8C', long: '#2D6A4F' };

  function render() {
    const S = U.S, t = S.timer;
    const b = document.body;
    b.classList.remove('mode-focus', 'mode-short', 'mode-long');
    b.classList.add(`mode-${t.mode}`);
    b.classList.toggle('is-running', t.running);
    if (themeMeta) themeMeta.content = MODE_COLOR[t.mode];
    $$('.mode-btn').forEach((m) => m.setAttribute('aria-selected', String(m.dataset.mode === t.mode)));
    const sb = $('#startBtn');
    sb.textContent = t.running ? 'PAUSE' : (U.elapsed() > 0 ? 'RESUME' : 'START');
    sb.classList.toggle('running', t.running);
    $('#clock').classList.toggle('editable', !t.running);
    const active = S.tasks.find((x) => x.id === S.activeTaskId);
    $('#roundNo').textContent = `#${U.todayRounds() + (t.mode === 'focus' ? 1 : 0) || 1}`;
    $('#roundMsg').textContent = t.mode === 'focus' && active && !active.done ? active.title : MODE_TEXT[t.mode];
    const mt = $('#miniToggle');
    mt.innerHTML = `<svg><use href="#${t.running ? 'i-pause' : 'i-play'}"/></svg>`;
    mt.setAttribute('aria-label', t.running ? 'Pause' : 'Start');
    $('#miniMode').textContent = MODE_NAME[t.mode];
    paintHouses();
    renderTasks();
    U.paintNav && U.paintNav();
    U.onRender && U.onRender();
    paintLive();
  }
  U.render = render;

  function paintLive(now = Date.now()) {
    const S = U.S, t = S.timer;
    const rem = U.remaining(now);
    const txt = fmtClock(rem);
    const clock = $('#clock');
    if (clock.textContent !== txt) clock.textContent = txt;
    const title = `${txt} - ${S.timer.mode === 'focus' ? 'Time to focus!' : 'Time for a break!'}`;
    if (document.title !== title) document.title = title;
    $('#sessionBar').style.width = `${(U.elapsed(t, now) / t.durationMs) * 100}%`;
    $('#miniTime').textContent = txt;

    const live = U.liveFocusMs(now);
    const h = live / HOUR;
    $('#journeyTotal').textContent = `${fmtDur(live)} of ${GOAL_H}h`;
    $('#journeyBar').style.width = `${Math.min(100, (h / GOAL_H) * 100)}%`;
    const c = S.progress.celebrated;
    if (c >= GOAL_H) {
      $('#journeyNext').innerHTML = 'Journey complete! The Netherlands is the <b>best country to live in</b>. Keep going for fun.';
    } else {
      const nextN = c + 1;
      const info = U.hourInfo(nextN);
      const toNext = nextN * HOUR - live;
      $('#journeyNext').innerHTML = `Next up: <b>${esc(info.item.name)}</b> in ${esc(fmtDur(Math.max(MIN, toNext), true))} of focus`;
      const cur = $('.house.current .h-fill');
      if (cur) cur.setAttribute('y', (66 - 66 * clamp(h - c, 0, 1)).toFixed(2));
    }
    for (const m of miniEls) {
      const v = U.statAt(m.s, h);
      const tv = m.s.fmtMini(v);
      if (m.val.textContent !== tv) m.val.textContent = tv;
      m.bar.style.width = `${U.curve(h) * 100}%`;
    }
    $('#liveRank').textContent = `#${U.rankAt(h)}`;
    U.paintNederland && U.paintNederland(now);
  }
  U.paintLive = paintLive;

  /* ---------------------------------------------------------------- timer controls */
  $('#startBtn').addEventListener('click', () => U.toggle());
  $('#skipBtn').addEventListener('click', () => { U.clickSound(); U.skip(); });
  $('#resetBtn').addEventListener('click', () => { U.clickSound(); U.resetRound(); });
  $$('.mode-btn').forEach((b) => b.addEventListener('click', () => U.chooseMode(b.dataset.mode)));
  $('#clock').addEventListener('click', () => { if (!U.S.timer.running) openSettings(U.S.timer.mode); });
  $('#miniToggle').addEventListener('click', () => U.toggle());
  $('#miniTime').addEventListener('click', () => { location.hash = '#timer'; });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select', 'button', 'a', 'summary'].includes(tag) || e.target.isContentEditable || anyOpen()) return;
    e.preventDefault(); U.toggle();
  });

  /* ---------------------------------------------------------------- tasks */
  let editing = null; // null | 'new' | task id
  function renderTasks() {
    const S = U.S;
    const list = $('#taskList');
    list.innerHTML = S.tasks.map((t) => {
      if (t.id === editing) return '';
      return `<li class="task${t.id === S.activeTaskId ? ' active' : ''}${t.done ? ' done' : ''}" data-id="${t.id}">
        <button class="task-check" type="button" data-act="done" aria-label="${t.done ? 'Mark as not done' : 'Mark as done'}"><svg><use href="#i-check"/></svg></button>
        <div class="task-main"><div class="task-title">${esc(t.title)}</div>${t.note ? `<div class="task-note">${esc(t.note)}</div>` : ''}</div>
        <div class="task-count" title="Focus rounds done / planned"><b>${t.act}</b>/${t.est}</div>
        <button class="task-edit" type="button" data-act="edit" aria-label="Edit task"><svg width="16" height="16"><use href="#i-dots"/></svg></button>
      </li>`;
    }).join('');
    $('#addTaskBtn').hidden = editing === 'new';
    paintSummary();
  }
  function paintSummary() {
    const S = U.S, el = $('#taskSummary');
    if (!S.tasks.length) { el.hidden = true; return; }
    const st = S.settings;
    let act = 0, est = 0, left = 0;
    S.tasks.forEach((t) => { act += t.act; est += t.est; if (!t.done) left += Math.max(0, t.est - t.act); });
    let mins = 0;
    for (let k = 0; k < left; k++) {
      mins += st.focus;
      if (k < left - 1) mins += ((S.progress.cycle + k + 1) % st.interval === 0) ? st.long : st.short;
    }
    const t = S.timer;
    if (left > 0) {
      if (t.mode === 'focus') mins -= U.elapsed() / MIN;
      else mins += U.remaining() / MIN;
    }
    const fin = new Date(Date.now() + Math.max(0, mins) * MIN);
    el.hidden = false;
    el.innerHTML = `Rounds: <b>${act}</b>/<b>${est}</b><span class="sep"></span>Finish at <b>${U.pad(fin.getHours())}:${U.pad(fin.getMinutes())}</b> (${(Math.max(0, mins) / 60).toFixed(1)}h)`;
  }
  $('#taskList').addEventListener('click', (e) => {
    const li = e.target.closest('.task'); if (!li) return;
    const S = U.S, t = S.tasks.find((x) => x.id === li.dataset.id); if (!t) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'done') { t.done = !t.done; if (t.done) U.clickSound(); }
    else if (act === 'edit') { openEditor(t.id); return; }
    else { S.activeTaskId = t.id; }
    U.touchTasks(); U.save(); render();
  });
  $('#addTaskBtn').addEventListener('click', () => openEditor('new'));

  function openEditor(id) {
    editing = id;
    const S = U.S;
    const t = id === 'new' ? { title: '', est: 1, act: 0, note: '' } : S.tasks.find((x) => x.id === id);
    if (!t) { editing = null; return; }
    const slot = $('#taskEditorSlot');
    slot.innerHTML = `<div class="task-editor" role="group" aria-label="${id === 'new' ? 'New task' : 'Edit task'}">
      <div class="te-body">
        <input type="text" id="teTitle" maxlength="200" placeholder="What are you working on?" value="${esc(t.title)}" aria-label="Task name">
        <div class="te-label">${id === 'new' ? 'How many focus rounds will it take?' : 'Rounds done / planned'}</div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          ${id === 'new' ? '' : `<div class="stepper" data-te="act"><button type="button" data-step="-1" aria-label="Fewer done">−</button><input type="number" id="teAct" min="0" max="999" value="${t.act}" aria-label="Rounds done"><button type="button" data-step="1" aria-label="More done">+</button></div><span style="font-weight:800;color:#999">/</span>`}
          <div class="stepper" data-te="est"><button type="button" data-step="-1" aria-label="Fewer rounds">−</button><input type="number" id="teEst" min="1" max="50" value="${t.est}" aria-label="Planned rounds"><button type="button" data-step="1" aria-label="More rounds">+</button></div>
        </div>
        <div style="margin-top:14px">${t.note ? '' : '<button type="button" class="link-btn" id="teNoteBtn">+ Add a note</button>'}
          <textarea class="te-note" id="teNote" placeholder="Some notes…" ${t.note ? '' : 'hidden'} aria-label="Note">${esc(t.note)}</textarea></div>
      </div>
      <div class="te-foot">
        ${id === 'new' ? '' : '<button type="button" class="btn btn-ghost" id="teDelete"><svg><use href="#i-trash"/></svg>Delete</button>'}
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" id="teCancel">Cancel</button>
        <button type="button" class="btn btn-dark" id="teSave">Save</button>
      </div></div>`;
    renderTasks();
    const title = $('#teTitle'); title.focus();
    title.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveEditor(); if (e.key === 'Escape') closeEditor(); });
    $$('.stepper', slot).forEach((st) => bindStepper(st, () => {}, st.dataset.te === 'act' ? [0, 999] : [1, 50]));
    $('#teNoteBtn')?.addEventListener('click', (e) => { e.target.remove(); $('#teNote').hidden = false; $('#teNote').focus(); });
    $('#teCancel').addEventListener('click', closeEditor);
    $('#teSave').addEventListener('click', saveEditor);
    $('#teDelete')?.addEventListener('click', () => {
      S.tasks = S.tasks.filter((x) => x.id !== id);
      if (S.activeTaskId === id) S.activeTaskId = S.tasks.find((x) => !x.done)?.id || null;
      U.touchTasks(); U.save(); closeEditor();
    });
  }
  function closeEditor() { editing = null; $('#taskEditorSlot').innerHTML = ''; render(); }
  function saveEditor() {
    const S = U.S;
    const title = $('#teTitle').value.trim();
    if (!title) { $('#teTitle').focus(); $('#teTitle').placeholder = 'Please type a task name first'; return; }
    const est = clamp(parseInt($('#teEst').value, 10) || 1, 1, 50);
    const note = $('#teNote').value.trim();
    if (editing === 'new') {
      const t = { id: U.uid(), title, est, act: 0, note, done: false };
      S.tasks.push(t);
      if (!S.activeTaskId || !S.tasks.find((x) => x.id === S.activeTaskId && !x.done)) S.activeTaskId = t.id;
    } else {
      const t = S.tasks.find((x) => x.id === editing);
      if (t) { t.title = title; t.est = est; t.note = note; t.act = clamp(parseInt($('#teAct').value, 10) || 0, 0, 999); }
    }
    U.touchTasks(); U.save();
    closeEditor();
  }
  const menu = $('#taskMenu'), menuBtn = $('#taskMenuBtn');
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; menuBtn.setAttribute('aria-expanded', String(!menu.hidden)); });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } });
  menu.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
    menu.hidden = true;
    const S = U.S;
    if (act === 'clear-done') S.tasks = S.tasks.filter((t) => !t.done);
    if (act === 'clear-act') S.tasks.forEach((t) => { t.act = 0; });
    if (act === 'clear-all') {
      if (!S.tasks.length) return;
      if (!(await confirmBox('Clear all tasks?', 'This removes every task in the list. Your hours and unlocks stay safe.', 'Clear all'))) return;
      S.tasks = [];
    }
    if (!S.tasks.find((t) => t.id === S.activeTaskId)) S.activeTaskId = S.tasks.find((t) => !t.done)?.id || null;
    U.touchTasks(); U.save(); render();
  });

  /* ---------------------------------------------------------------- steppers */
  function bindStepper(el, onChange, range) {
    const input = $('input', el);
    const [lo, hi] = range;
    const setVal = (v) => { const n = clamp(Math.round(+v || 0), lo, hi); input.value = n; onChange(n); syncDisabled(); };
    const syncDisabled = () => { const v = +input.value; $$('button', el).forEach((b) => { b.disabled = (+b.dataset.step < 0 && v <= lo) || (+b.dataset.step > 0 && v >= hi); }); };
    let hold = 0, rep = 0;
    const stop = () => { clearTimeout(hold); clearInterval(rep); };
    $$('button', el).forEach((b) => {
      const step = +b.dataset.step;
      b.addEventListener('pointerdown', (e) => {
        if (b.disabled) return;
        e.preventDefault();
        setVal((+input.value || 0) + step);
        stop();
        hold = setTimeout(() => { rep = setInterval(() => setVal((+input.value || 0) + step), 70); }, 420);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVal((+input.value || 0) + step); } });
    });
    input.addEventListener('change', () => setVal(input.value));
    input.addEventListener('blur', () => setVal(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); setVal(input.value); input.blur(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setVal((+input.value || 0) + 1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setVal((+input.value || 0) - 1); }
    });
    syncDisabled();
    return { setVal, sync: () => syncDisabled() };
  }
  U.bindStepper = bindStepper;

  /* ---------------------------------------------------------------- settings */
  const SET_INPUTS = { focus: '#setFocus', short: '#setShort', long: '#setLong', interval: '#setInterval', alarmSecs: '#setAlarm' };
  const steppers = {};
  function applySetting(key, val) {
    const S = U.S;
    if (S.settings[key] === val) return;
    S.settings[key] = val;
    U.touchSettings();
    const t = S.timer;
    if (['focus', 'short', 'long'].includes(key) && t.mode === key && !t.running && U.elapsed() === 0) {
      t.durationMs = val * MIN; U.touchTimer();
    }
    U.save();
    paintSettingsNotes();
    render();
  }
  $$('#settingsDlg .stepper').forEach((el) => {
    const key = el.dataset.key;
    steppers[key] = bindStepper(el, (v) => applySetting(key, v), LIMITS[key]);
  });
  $('#presets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    const [f, s, l] = b.dataset.preset.split(',').map(Number);
    [['focus', f], ['short', s], ['long', l]].forEach(([k, v]) => { $(SET_INPUTS[k]).value = v; applySetting(k, v); steppers[k].sync(); });
    U.clickSound();
  });
  const toggles = { autoBreaks: '#setAutoBreaks', autoFocus: '#setAutoFocus', chimes: '#setChimes', keepAwake: '#setKeepAwake' };
  Object.entries(toggles).forEach(([k, sel]) => $(sel).addEventListener('change', (e) => {
    applySetting(k, e.target.checked);
    if (k === 'keepAwake') U.keepAwake(U.S.timer.running);
  }));
  $('#setVolume').addEventListener('input', (e) => {
    const v = +e.target.value;
    $('#volOut').textContent = `${v}%`;
    U.S.settings.volume = v; U.touchSettings(); U.save();
    const a = $('#alarm'); if (a && !U.alarmPlaying) a.volume = v / 100;
  });
  $('#testSound').addEventListener('click', () => { U.primeAudio(); if (U.alarmPlaying) U.stopAlarm(); else U.playAlarm(true); });
  $('#setNotify').addEventListener('change', async (e) => {
    const hint = $('#notifyHint');
    if (!e.target.checked) { applySetting('notify', false); return; }
    if (!('Notification' in window)) { e.target.checked = false; hint.textContent = 'Your browser does not support notifications.'; return; }
    let p = Notification.permission;
    if (p === 'default') { try { p = await Notification.requestPermission(); } catch (err) { p = 'denied'; } }
    if (p !== 'granted') { e.target.checked = false; applySetting('notify', false); hint.textContent = 'Notifications are blocked. Allow them in your browser’s site settings.'; return; }
    hint.textContent = 'You will get a message when a round ends (while this tab is in the background).';
    applySetting('notify', true);
  });
  function paintSettingsNotes() {
    const t = U.S.timer;
    $('#setRunningNote').hidden = !(t.running || U.elapsed() > 0);
    const st = U.S.settings;
    $$('#presets .preset').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === `${st.focus},${st.short},${st.long}`)));
    $('#alarmLenHint').textContent = st.alarmSecs >= 48 ? 'seconds: the full anthem' : 'seconds (48 = the full anthem)';
  }
  function openSettings(focusKey) {
    const st = U.S.settings;
    Object.entries(SET_INPUTS).forEach(([k, sel]) => { $(sel).value = st[k]; steppers[k].sync(); });
    Object.entries(toggles).forEach(([k, sel]) => { $(sel).checked = !!st[k]; });
    $('#setVolume').value = st.volume; $('#volOut').textContent = `${st.volume}%`;
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    $('#setNotify').checked = st.notify && perm === 'granted';
    $('#storageNote').textContent = U.Store.kind === 'cloud' ? 'Your progress is saved with this artifact’s storage (and a copy in this browser).'
      : U.Store.kind === 'local' ? 'Your progress is saved in this browser on this device (localStorage).'
        : 'This browser is blocking storage, so progress lasts only until you close the tab. Use “Save backup” to keep it.';
    paintSettingsNotes();
    openDlg($('#settingsDlg'));
    if (focusKey && SET_INPUTS[focusKey]) setTimeout(() => { $(SET_INPUTS[focusKey]).focus(); $(SET_INPUTS[focusKey]).select(); }, 60);
  }
  U.openSettings = openSettings;
  $('#openSettings').addEventListener('click', () => openSettings());

  // data
  $('#exportBtn').addEventListener('click', async () => {
    await U.flush();
    const blob = new Blob([JSON.stringify({ app: 'oranje-uurwerk', savedAt: new Date().toISOString(), state: U.S }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `oranje-uurwerk-backup-${U.dayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('💾', 'Backup saved to your downloads.');
  });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      const st = U.sanitize(obj.state || obj);
      const hours = (st.progress.focusMs / HOUR).toFixed(1);
      if (!(await confirmBox('Load this backup?', `It has ${hours} hours of focus and ${st.progress.celebrated} unlocks. It will replace what is in this browser now.`, 'Load backup'))) return;
      st.progress.epoch = Date.now(); st.timer.at = Date.now(); st.settingsAt = Date.now(); st.tasksAt = Date.now();
      U.S = st;
      await U.Store.set(U.KEY, JSON.stringify(st));
      closeDlg($('#settingsDlg'));
      U.afterReset && U.afterReset();
      toast('✅', 'Backup loaded. Welcome back!');
    } catch (err) {
      toast('⚠️', 'That file is not an Oranje Uurwerk backup. Pick the .json file you saved before.');
    }
  });
  $('#resetAllBtn').addEventListener('click', async () => {
    if (!(await confirmBox('Start a new journey?', 'This sets your hours, unlocks, gifts and report back to zero. Your tasks and settings stay. Tip: save a backup first.', 'Start over'))) return;
    const S = U.S;
    U.stopAlarm();
    S.progress = U.freshProgress();
    S.timer = U.freshTimer('focus', S.settings);
    U.keepAwake(false); U.heartbeat();
    await U.save(true);
    closeDlg($('#settingsDlg'));
    U.afterReset && U.afterReset();
    toast('🌱', 'A fresh start. Your first province is one hour away!');
  });

  /* ---------------------------------------------------------------- unlocks */
  const queue = [];
  function checkUnlocks(now = Date.now()) {
    const P = U.S.progress;
    const h = Math.min(GOAL_H, Math.floor(U.liveFocusMs(now) / HOUR));
    if (h <= P.celebrated) return;
    const from = P.celebrated + 1;
    if (h - P.celebrated > 3) {
      queue.push({ t: 'bulk', from, to: h });
    } else {
      for (let n = from; n <= h; n++) {
        queue.push({ t: 'unlock', n });
        if (n === 12 || n === 24) queue.push({ t: 'level', lv: n / 12 + 1 });
      }
    }
    if (h >= GOAL_H && !P.finaleShown) { queue.push({ t: 'finale' }); P.finaleShown = true; }
    P.celebrated = h;
    U.save(true);
    U.chime();
    render();
    U.markNewMap && U.markNewMap(from, h);
    pump();
  }
  U.checkUnlocks = checkUnlocks;

  function pump() {
    if (anyOpen() || !queue.length) return;
    const it = queue.shift();
    if (it.t === 'unlock') showUnlock(it.n);
    else if (it.t === 'level') showLevel(it.lv);
    else if (it.t === 'bulk') showBulk(it.from, it.to);
    else if (it.t === 'finale') showFinale();
  }
  U.pump = pump;

  const DELTA = {
    hdi: (d) => `+${d.toFixed(3)}`, qol: (d) => `+${d.toFixed(1)}`, health: (d) => `+${d.toFixed(1)}`, safety: (d) => `+${d.toFixed(1)}`,
    edu: (d) => `+${d.toFixed(1)}`, tourism: (d) => `+${d.toFixed(2)}M`, pop: (d) => `+${d.toFixed(2)}M`, gdp: (d) => `+€${d.toFixed(1)}B`,
  };
  function imgFor(L, item) {
    if (L.n === 1) return { src: item.photos[0].src, alt: item.photos[0].caption, fit: 'cover' };
    return { src: item.img, alt: item.name, fit: item.fit || 'cover' };
  }
  function unlockShell({ bg, kicker, title, sub, imgHtml, bodyHtml, footHtml }) {
    const d = $('#unlockDlg');
    $('#unlockTop').style.setProperty('--u-bg', bg);
    $('#unlockKicker').textContent = kicker;
    $('#unlockTitle').textContent = title;
    $('#unlockSub').textContent = sub;
    $('#unlockImg').innerHTML = imgHtml;
    $('#unlockImg').hidden = !imgHtml;
    $('#unlockBody').innerHTML = bodyHtml;
    $('#unlockFoot').innerHTML = footHtml;
    openDlg(d);
    confetti();
    const primary = $('#unlockFoot .btn-dark'); if (primary) primary.focus();
  }
  function showUnlock(n) {
    const { L, idx, item, gift } = U.hourInfo(n);
    const im = imgFor(L, item);
    const deltas = STATS.map((s) => `<div><span>${s.ico} ${esc(s.mini)}</span><b>${DELTA[s.id](U.statAt(s, n) - U.statAt(s, n - 1))}</b></div>`).join('');
    unlockShell({
      bg: L.n === 1 ? item.color : L.color,
      kicker: `Hour ${n} of ${GOAL_H} complete!`,
      title: item.name,
      sub: L.n === 1 ? `Province ${idx + 1} of 12 unlocked` : `${L.noun[0].toUpperCase() + L.noun.slice(1)} ${idx + 1} of 12 unlocked`,
      imgHtml: `<img src="${im.src}" alt="${esc(im.alt)}" class="${im.fit === 'contain' ? 'contain' : ''}">`,
      bodyHtml: `<p style="margin:0 0 12px;font-weight:700;color:var(--delft)">${esc(L.n === 1 ? item.tag : item.subtitle)}</p>
        <div class="gift-line"><span class="g-emo" aria-hidden="true">${gift.emo}</span><div><b>Your gift: ${esc(gift.name)}</b><span>${esc(gift.text)}</span></div></div>
        <div class="deltas">${deltas}</div>
        <p style="margin:6px 0 10px;font-size:14px;color:var(--ink-soft);font-weight:700">The Netherlands is now #${U.rankAt(n)} best country to live in.</p>`,
      footHtml: `<button class="btn btn-ghost" type="button" data-go="${L.key}:${idx}">${L.n === 1 ? 'Explore on the map' : 'Read the story'}</button><button class="btn btn-dark" type="button" data-close>Keep going</button>`,
    });
  }
  function showLevel(lv) {
    const L = LEVELS[lv - 1];
    const mosaic = L.items.slice(0, 4).map((it) => `<img src="${it.thumb}" alt="" style="filter:blur(6px) grayscale(.3);transform:scale(1.1)">`).join('');
    unlockShell({
      bg: L.color,
      kicker: `Level ${lv} unlocked!`,
      title: lv === 2 ? 'Meet the Dutch icons' : 'Discover Dutch innovations',
      sub: lv === 2 ? 'All 12 provinces are yours.' : 'All 12 Dutch icons are in your collection.',
      imgHtml: `<div style="display:grid;grid-template-columns:repeat(4,1fr);height:100%;overflow:hidden">${mosaic}</div>`,
      bodyHtml: `<p style="margin:0 0 12px">${lv === 2
        ? 'Amazing work! For the next 12 hours, every hour of focus brings you a famous Dutch person: painters, scientists, sports heroes and more.'
        : 'You are in the final level! For the last 12 hours, every hour unlocks a Dutch invention that changed the world.'}</p>
        <p style="margin:0 0 10px;font-weight:800;color:var(--delft)">Hours ${lv === 2 ? '13 to 24' : '25 to 36'}. You can do this.</p>`,
      footHtml: `<button class="btn btn-ghost" type="button" data-go="view:${L.view}">See the collection</button><button class="btn btn-dark" type="button" data-close>Let’s go</button>`,
    });
  }
  function showBulk(from, to) {
    const gifts = GIFTS.slice(from - 1, to).map((g) => g.emo).join(' ');
    unlockShell({
      bg: '#B8521E',
      kicker: `Hours ${from} to ${to} complete!`,
      title: `${to - from + 1} new unlocks`,
      sub: 'Your journey has moved forward.',
      imgHtml: '',
      bodyHtml: `<p style="margin:0 0 10px">You unlocked everything from hour ${from} to hour ${to}. Explore them on the map and in the collections.</p>
        <div class="gift-line"><span class="g-emo" aria-hidden="true">🎁</span><div><b>Your gifts</b><span style="font-size:22px">${gifts}</span></div></div>
        <p style="margin:12px 0 10px;font-weight:800;color:var(--delft)">The Netherlands is now #${U.rankAt(to)} best country to live in.</p>`,
      footHtml: '<button class="btn btn-ghost" type="button" data-go="view:nederland">See my gifts</button><button class="btn btn-dark" type="button" data-close>Keep going</button>',
    });
  }
  function showFinale() {
    $('#finaleList').innerHTML = `<div><span>🏆 World ranking</span><b>#1</b></div>` + STATS.map((s) => `<div><span>${s.ico} ${esc(s.mini)}</span><b>${esc(s.fmtEnd(s.to))}</b></div>`).join('');
    openDlg($('#finaleDlg'));
    confetti(260);
    setTimeout(() => confetti(200), 900);
  }
  U.showFinale = showFinale;
  $('#unlockFoot').addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    const [k, v] = b.dataset.go.split(':');
    closeDlg($('#unlockDlg'));
    if (k === 'view') { location.hash = `#${v}`; return; }
    if (k === 'provinces') location.hash = `#map/${LEVELS[0].items[+v].id}`;
    else { location.hash = `#${k}`; setTimeout(() => U.openItem(k, +v), 320); }
  });
  $('#finaleNew').addEventListener('click', () => { closeDlg($('#finaleDlg')); $('#resetAllBtn').click(); });
})();
