/* ==========================================================================
   Oranje Uurwerk — app logic
   - Wall-clock timer (Date.now maths) + Web Worker heartbeat + optional
     near-silent audio keep-alive, so it stays accurate in background tabs.
   - Storage: window.storage when available (Claude artifacts), otherwise
     localStorage (running locally / GitHub Pages), otherwise memory.
   ========================================================================== */
(() => {
  'use strict';

  const D = window.UURWERK_DATA;
  const HOUR = 3600000;
  const MIN = 60000;
  const GOAL_H = 36;
  const KEY = 'oranje-uurwerk-v1';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fmtClock(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  }
  function fmtDur(ms, long = false) {
    const m = Math.max(0, Math.floor(ms / MIN));
    const h = Math.floor(m / 60), mm = m % 60;
    if (long) {
      if (h && mm) return `${h} h ${mm} min`;
      if (h) return `${h} h`;
      return `${Math.max(1, mm)} min`;
    }
    return `${h}h ${mm}m`;
  }

  /* ---------------------------------------------------------------- content */
  const LEVELS = [
    { n: 1, key: 'provinces', name: 'The 12 provinces', short: 'Provinces', items: D.provinces, noun: 'province', view: 'map', color: '#B8521E' },
    { n: 2, key: 'icons', name: 'The 12 Dutch icons', short: 'Dutch icons', items: D.icons, noun: 'Dutch icon', view: 'icons', color: '#2F5E8C' },
    { n: 3, key: 'innovations', name: 'The 12 Dutch innovations', short: 'Innovations', items: D.innovations, noun: 'innovation', view: 'innovations', color: '#2D6A4F' },
  ];
  function hourInfo(n) { // n = 1..36
    const L = LEVELS[Math.floor((n - 1) / 12)];
    const idx = (n - 1) % 12;
    return { L, idx, item: L.items[idx], gift: GIFTS[n - 1] };
  }

  const GIFTS = [
    ['🧇', 'Stroopwafel', 'Two thin waffles glued together with caramel syrup. Put one on top of your hot drink so it gets soft and gooey.'],
    ['🌷', 'A bunch of tulips', 'Tulips first came from Central Asia and Turkey, but the Dutch made them famous. In the 1630s some rare bulbs cost more than a house!'],
    ['🧀', 'Gouda cheese', 'Named after the city of Gouda, where farmers have brought their cheese to market for centuries.'],
    ['🚲', 'An omafiets', 'The Netherlands has more bicycles than people. The classic upright “grandma bike” is built to last for decades.'],
    ['👞', 'Klompen', 'Wooden shoes kept farmers’ feet dry and safe in wet fields. Some people still wear them in the garden.'],
    ['🍫', 'Hagelslag', 'Chocolate sprinkles on buttered bread. For many Dutch children this is a normal breakfast!'],
    ['🥞', 'Poffertjes', 'Tiny, fluffy pancakes with butter and powdered sugar, often sold at markets and fairs.'],
    ['🐟', 'Hollandse Nieuwe', 'Young herring with chopped onion. Brave locals hold it by the tail and take a bite from below.'],
    ['🧆', 'Bitterballen', 'Crispy little balls with a soft, hot filling, dipped in mustard. Be patient: they are very hot inside!'],
    ['🍬', 'Drop', 'Dutch liquorice comes sweet, salty and even double-salty. The Dutch eat more of it than almost anyone.'],
    ['🏺', 'A Delft Blue vase', 'In the 1600s, potters in Delft copied Chinese porcelain and created their own famous blue-and-white style.'],
    ['👑', 'A King’s Day crown', 'On King’s Day (27 April) the whole country wears orange and the streets turn into one giant flea market.'],
    ['🧣', 'An orange scarf', 'Orange is the colour of the Dutch royal family, the House of Orange-Nassau. Wear it to cheer for Oranje!'],
    ['⛸️', 'Ice skates', 'When the canals freeze, everyone skates. The Elfstedentocht is a famous 200 km skating tour past eleven Frisian cities.'],
    ['🍩', 'Oliebollen', 'Deep-fried dough balls covered in powdered sugar, eaten on New Year’s Eve.'],
    ['🍪', 'Speculaas', 'Crunchy biscuits full of cinnamon, nutmeg and cloves, loved around Sinterklaas time.'],
    ['🎁', 'A Sinterklaas surprise', 'On 5 December, Dutch families hide gifts inside funny homemade wrappings, called “surprises”, each with a poem.'],
    ['🥔', 'Stamppot', 'Mashed potatoes mixed with vegetables like kale. Winter comfort food at its best.'],
    ['🍲', 'Erwtensoep', 'Thick Dutch pea soup. People say a spoon should be able to stand up in it.'],
    ['🍟', 'Patatje met', 'Dutch fries “with”, which means with mayonnaise, served in a paper cone.'],
    ['🥪', 'Broodje kroket', 'A crispy croquette in a soft bun. You can even buy one from a wall of little windows.'],
    ['🥧', 'Appeltaart', 'Dutch apple pie is tall, full of apples and cinnamon, and best “met slagroom”, with whipped cream.'],
    ['🍰', 'Tompouce', 'A pink-iced cream pastry. Around King’s Day the icing turns orange!'],
    ['🐄', 'A Frisian cow', 'The black-and-white Holstein-Friesian cow has Dutch roots in Friesland and North Holland and now lives all over the world.'],
    ['⛵', 'A sailing boat', 'The Frisian lakes are perfect for sailing. The Dutch have been great sailors for centuries.'],
    ['🪁', 'A beach kite', 'The wide, windy beaches of the Dutch coast are perfect for flying kites.'],
    ['🌊', 'A Delta Works model', 'After the flood of 1953, the Dutch built the Delta Works: dams and storm barriers that protect the southwest from the sea.'],
    ['🎨', 'A Golden Age paintbrush', 'In the 1600s, Dutch painters like Rembrandt and Vermeer made some of the most famous paintings in the world.'],
    ['🚆', 'A train ticket', 'Dutch trains link almost every city, and Utrecht station has one of the largest bicycle parkings in the world.'],
    ['☂️', 'An umbrella', 'Dutch weather loves surprises: sun, rain and wind can all happen in one afternoon.'],
    ['🕯️', 'A gezellig candle', '“Gezellig” is the Dutch word for cosy, warm and friendly. It is a feeling more than a place.'],
    ['🎟️', 'A Keukenhof ticket', 'Keukenhof, near Lisse, is one of the biggest flower gardens in the world, with millions of bulbs every spring.'],
    ['🥛', 'Karnemelk', 'Buttermilk is a classic Dutch lunch drink. Many people also drink a glass of milk with their sandwiches.'],
    ['🌭', 'Rookworst', 'A smoked sausage, perfect on top of a plate of stamppot.'],
    ['🏘️', 'A canal house', 'Many Amsterdam canal houses have a hook at the top, used to lift furniture in through the big windows.'],
    ['🏆', 'The Golden Tulip', 'Your final prize for 36 hours of focus. The Netherlands is the best country to live in, thanks to you!'],
  ].map(([emo, name, text]) => ({ emo, name, text }));

  /* ---------------------------------------------------------------- the country model */
  const nf = (d) => new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const nf0 = nf(0), nf1 = nf(1), nf2 = nf(2);
  const STATS = [
    { id: 'hdi', name: 'Human Development Index', mini: 'HDI', ico: '🌐', hint: 'Health, schooling and income together', from: 0.720, to: 0.985,
      fmt: (v) => v.toFixed(3), fmtMini: (v) => v.toFixed(3), fmtEnd: (v) => v.toFixed(3) },
    { id: 'qol', name: 'Quality of life', mini: 'Quality of life', ico: '😊', hint: 'How good everyday life feels', from: 52, to: 99.0,
      fmt: (v) => `${v.toFixed(2)} / 100`, fmtMini: (v) => v.toFixed(1), fmtEnd: (v) => v.toFixed(0) },
    { id: 'health', name: 'Healthcare', mini: 'Healthcare', ico: '🏥', hint: 'Doctors, hospitals and care for all', from: 50, to: 98.6,
      fmt: (v) => `${v.toFixed(2)} / 100`, fmtMini: (v) => v.toFixed(1), fmtEnd: (v) => v.toFixed(0) },
    { id: 'safety', name: 'Safety', mini: 'Safety', ico: '🛡️', hint: 'Safe streets, safe from floods', from: 55, to: 97.8,
      fmt: (v) => `${v.toFixed(2)} / 100`, fmtMini: (v) => v.toFixed(1), fmtEnd: (v) => v.toFixed(0) },
    { id: 'edu', name: 'Education', mini: 'Education', ico: '🎓', hint: 'Schools and universities', from: 58, to: 99.2,
      fmt: (v) => `${v.toFixed(2)} / 100`, fmtMini: (v) => v.toFixed(1), fmtEnd: (v) => v.toFixed(0) },
    { id: 'tourism', name: 'Tourism', mini: 'Tourism', ico: '🧳', hint: 'International visitors per year', from: 0.8, to: 26,
      fmt: (v) => nf0.format(v * 1e6), fmtMini: (v) => `${nf1.format(v)}M`, fmtEnd: (v) => `${nf0.format(v)}M` },
    { id: 'pop', name: 'Population', mini: 'Population', ico: '👨‍👩‍👧', hint: 'People living in the Netherlands', from: 10.0, to: 18.4,
      fmt: (v) => nf0.format(v * 1e6), fmtMini: (v) => `${nf2.format(v)}M`, fmtEnd: (v) => `${nf1.format(v)}M` },
    { id: 'gdp', name: 'GDP', mini: 'GDP', ico: '💶', hint: 'Everything the country makes in a year', from: 95, to: 1450,
      fmt: (v) => `€${nf1.format(v)} billion`, fmtMini: (v) => (v >= 1000 ? `€${nf2.format(v / 1000)}T` : `€${nf0.format(v)}B`), fmtEnd: (v) => (v >= 1000 ? `€${nf2.format(v / 1000)} trillion` : `€${nf0.format(v)} billion`) },
  ];
  const curve = (h) => { const t = clamp(h / GOAL_H, 0, 1); return t >= 1 ? 1 : 0.6 * t + 0.4 * (1 - (1 - t) * (1 - t)); };
  const statAt = (s, h) => s.from + (s.to - s.from) * curve(h);
  const rankAt = (h) => (h >= GOAL_H ? 1 : Math.max(2, Math.round(40 - 39 * curve(h))));

  /* ---------------------------------------------------------------- storage adapter */
  const Store = (() => {
    const cloud = !!(window.storage && typeof window.storage.get === 'function' && typeof window.storage.set === 'function');
    let local = null;
    try { const k = '__uurwerk_probe__'; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); local = window.localStorage; } catch (e) { local = null; }
    const mem = {};
    const kind = cloud ? 'cloud' : local ? 'local' : 'memory';
    return {
      kind,
      getSync(key) { if (local) { try { return local.getItem(key); } catch (e) { /* fall through */ } } return mem[key] ?? null; },
      setSync(key, val) { if (local) { try { local.setItem(key, val); return true; } catch (e) { /* fall through */ } } mem[key] = val; return false; },
      async get(key) {
        if (cloud) {
          try { const r = await window.storage.get(key, false); return r && typeof r.value === 'string' ? r.value : null; }
          catch (e) { return this.getSync(key); } // missing key throws — try local copy
        }
        return this.getSync(key);
      },
      async set(key, val) {
        if (cloud) {
          try { await window.storage.set(key, val, false); } catch (e) { /* ignore, keep local copy */ }
          this.setSync(key, val);
          return;
        }
        this.setSync(key, val);
      },
    };
  })();

  /* ---------------------------------------------------------------- state */
  const DEFAULTS = { focus: 60, short: 10, long: 40, interval: 4, autoBreaks: false, autoFocus: false, volume: 80, alarmSecs: 20, chimes: true, keepAwake: true, notify: false };
  const LIMITS = { focus: [1, 180], short: [1, 60], long: [1, 120], interval: [1, 12], alarmSecs: [3, 48], volume: [0, 100] };

  function freshProgress() {
    return { epoch: Date.now(), focusMs: 0, sessions: 0, cycle: 0, celebrated: 0, finaleShown: false, days: {}, seen: { map: 0, icons: 0, innovations: 0, nederland: 0 } };
  }
  function freshTimer(mode = 'focus', settings = DEFAULTS) {
    return { id: uid(), mode, durationMs: settings[mode] * MIN, running: false, startedAt: 0, elapsedBefore: 0, at: Date.now() };
  }
  function freshState() {
    return { v: 1, settings: { ...DEFAULTS }, settingsAt: 0, progress: freshProgress(), timer: freshTimer(), tasks: [], activeTaskId: null, tasksAt: 0 };
  }
  function sanitize(o) {
    const s = freshState();
    if (!o || typeof o !== 'object') return s;
    if (o.settings) for (const k of Object.keys(DEFAULTS)) if (k in o.settings) s.settings[k] = typeof DEFAULTS[k] === 'boolean' ? !!o.settings[k] : clamp(Math.round(+o.settings[k] || DEFAULTS[k]), ...LIMITS[k]);
    s.settingsAt = +o.settingsAt || 0;
    if (o.progress) {
      const p = o.progress, q = s.progress;
      q.epoch = +p.epoch || q.epoch; q.focusMs = Math.max(0, +p.focusMs || 0); q.sessions = Math.max(0, +p.sessions || 0);
      q.cycle = Math.max(0, +p.cycle || 0); q.celebrated = clamp(+p.celebrated || 0, 0, GOAL_H); q.finaleShown = !!p.finaleShown;
      if (p.days && typeof p.days === 'object') for (const [k, v] of Object.entries(p.days)) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) q.days[k] = { ms: Math.max(0, +v.ms || 0), n: Math.max(0, +v.n || 0) };
      if (p.seen) for (const k of Object.keys(q.seen)) q.seen[k] = clamp(+p.seen[k] || 0, 0, 36);
    }
    if (o.timer && ['focus', 'short', 'long'].includes(o.timer.mode)) {
      const t = o.timer;
      s.timer = { id: t.id || uid(), mode: t.mode, durationMs: clamp(+t.durationMs || s.settings[t.mode] * MIN, MIN, 180 * MIN), running: !!t.running,
        startedAt: +t.startedAt || 0, elapsedBefore: Math.max(0, +t.elapsedBefore || 0), at: +t.at || 0 };
      if (s.timer.running && !s.timer.startedAt) s.timer.running = false;
    } else s.timer = freshTimer('focus', s.settings);
    if (Array.isArray(o.tasks)) s.tasks = o.tasks.filter((t) => t && t.title).slice(0, 200).map((t) => ({ id: t.id || uid(), title: String(t.title).slice(0, 200), note: String(t.note || '').slice(0, 2000), est: clamp(+t.est || 1, 1, 50), act: clamp(+t.act || 0, 0, 999), done: !!t.done }));
    s.activeTaskId = o.activeTaskId || null;
    s.tasksAt = +o.tasksAt || 0;
    return s;
  }
  /** Monotonic merge so a stale tab never rolls progress backwards. */
  function merge(mine, other) {
    if (!other) return mine;
    const out = JSON.parse(JSON.stringify(mine));
    const a = out.progress, b = other.progress;
    if (b.epoch > a.epoch) {
      out.progress = JSON.parse(JSON.stringify(b));
      out.timer = JSON.parse(JSON.stringify(other.timer));
    } else if (b.epoch === a.epoch) {
      a.focusMs = Math.max(a.focusMs, b.focusMs); a.sessions = Math.max(a.sessions, b.sessions); a.cycle = Math.max(a.cycle, b.cycle);
      a.celebrated = Math.max(a.celebrated, b.celebrated); a.finaleShown = a.finaleShown || b.finaleShown;
      for (const [k, v] of Object.entries(b.days)) { const m = a.days[k] || { ms: 0, n: 0 }; a.days[k] = { ms: Math.max(m.ms, v.ms), n: Math.max(m.n, v.n) }; }
      for (const k of Object.keys(a.seen)) a.seen[k] = Math.max(a.seen[k] || 0, b.seen[k] || 0);
      if ((other.timer.at || 0) > (out.timer.at || 0)) out.timer = JSON.parse(JSON.stringify(other.timer));
    }
    if ((other.settingsAt || 0) > (out.settingsAt || 0)) { out.settings = { ...other.settings }; out.settingsAt = other.settingsAt; }
    if ((other.tasksAt || 0) > (out.tasksAt || 0)) { out.tasks = JSON.parse(JSON.stringify(other.tasks)); out.activeTaskId = other.activeTaskId; out.tasksAt = other.tasksAt; }
    return out;
  }
  const parse = (raw) => { try { return raw ? sanitize(JSON.parse(raw)) : null; } catch (e) { return null; } };

  let S = freshState();
  let saveTimer = 0;
  function save(now = false) {
    clearTimeout(saveTimer);
    if (now) return flush();
    saveTimer = setTimeout(flush, 120);
  }
  async function flush() {
    clearTimeout(saveTimer);
    try {
      const other = parse(await Store.get(KEY));
      if (other) S = merge(S, other);
      await Store.set(KEY, JSON.stringify(S));
    } catch (e) { /* storage is best-effort */ }
  }
  function flushSync() { // used on pagehide; localStorage only
    try { const other = parse(Store.getSync(KEY)); if (other) S = merge(S, other); Store.setSync(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
    if (Store.kind === 'cloud') { try { window.storage.set(KEY, JSON.stringify(S), false); } catch (e) { /* ignore */ } }
  }
  const touchTimer = () => { S.timer.at = Date.now(); };
  const touchTasks = () => { S.tasksAt = Date.now(); };
  const touchSettings = () => { S.settingsAt = Date.now(); };

  /* ---------------------------------------------------------------- time maths */
  function elapsed(t = S.timer, now = Date.now()) {
    const run = t.running ? Math.max(0, now - t.startedAt) : 0;
    return Math.min(t.durationMs, t.elapsedBefore + run);
  }
  const remaining = (now = Date.now()) => Math.max(0, S.timer.durationMs - elapsed(S.timer, now));
  const liveFocusMs = (now = Date.now()) => S.progress.focusMs + (S.timer.mode === 'focus' ? elapsed(S.timer, now) : 0);
  const liveHours = (now) => liveFocusMs(now) / HOUR;
  const unlockedCount = () => S.progress.celebrated;
  const levelUnlocked = (lv) => lv === 1 || S.progress.celebrated >= (lv - 1) * 12;
  function todayRounds() { const d = S.progress.days[dayKey()]; return d ? d.n : 0; }

  function bankFocus(ms, when = Date.now()) {
    if (ms <= 0) return;
    S.progress.focusMs += ms;
    const k = dayKey(when);
    const d = S.progress.days[k] || (S.progress.days[k] = { ms: 0, n: 0 });
    d.ms += ms;
  }

  /* ---------------------------------------------------------------- audio */
  const alarmEl = $('#alarm');
  let actx = null, keepNode = null, alarmUntil = 0, alarmPrimed = false, soundToast = null;
  function audioCtx() {
    if (!actx) { try { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }
  function primeAudio() {
    audioCtx();
    if (alarmPrimed || !alarmEl) return;
    alarmPrimed = true;
    try {
      alarmEl.muted = true;
      const p = alarmEl.play();
      const done = () => { if (!alarmUntil) { alarmEl.pause(); try { alarmEl.currentTime = 0; } catch (e) { /* ignore */ } } alarmEl.muted = false; };
      if (p && p.then) p.then(done, () => { alarmEl.muted = false; alarmPrimed = false; }); else done();
    } catch (e) { alarmEl.muted = false; }
  }
  function blip(freq = 660, dur = 0.07, vol = 0.08, type = 'sine', when = 0) {
    const c = audioCtx(); if (!c) return;
    const t0 = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const clickSound = () => blip(880, 0.05, 0.05, 'triangle');
  function chime() {
    if (!S.settings.chimes || alarmUntil) return;
    const v = 0.09 * (S.settings.volume / 100);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, 0.55, v, 'triangle', i * 0.11));
    blip(1567.98, 0.8, v * 0.6, 'sine', 0.46);
  }
  function keepAwake(on) {
    const want = on && S.settings.keepAwake;
    if (want && !keepNode) {
      const c = audioCtx(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 20; g.gain.value = 0.0012; // effectively silent; marks the tab as "playing audio"
      o.connect(g).connect(c.destination); o.start();
      keepNode = { o, g };
    } else if (!want && keepNode) {
      try { keepNode.o.stop(); keepNode.o.disconnect(); keepNode.g.disconnect(); } catch (e) { /* ignore */ }
      keepNode = null;
    }
  }
  function playAlarm(test = false) {
    if (!alarmEl) return;
    try { alarmEl.pause(); alarmEl.currentTime = 0; } catch (e) { /* ignore */ }
    alarmEl.muted = false;
    alarmEl.volume = S.settings.volume / 100;
    const secs = test ? Math.min(8, S.settings.alarmSecs) : S.settings.alarmSecs;
    alarmUntil = Date.now() + secs * 1000;
    const p = alarmEl.play();
    if (p && p.catch) p.catch(() => { alarmUntil = 0; if (!test) toast('🔔', 'Round finished! (Your browser blocked the sound. Tap anywhere once to allow sounds.)'); });
    if (!test) showSoundToast();
    heartbeat();
  }
  function stopAlarm() {
    alarmUntil = 0;
    if (alarmEl) { alarmEl.pause(); try { alarmEl.currentTime = 0; } catch (e) { /* ignore */ } alarmEl.volume = S.settings.volume / 100; }
    if (soundToast) { soundToast.remove(); soundToast = null; }
    heartbeat();
  }
  function alarmTick(now) {
    if (!alarmUntil) return;
    const left = alarmUntil - now;
    if (left <= 0 || (alarmEl && alarmEl.ended)) { stopAlarm(); return; }
    if (left < 1800 && alarmEl) alarmEl.volume = (S.settings.volume / 100) * clamp(left / 1800, 0, 1);
  }
  if (alarmEl) alarmEl.addEventListener('ended', () => { if (alarmUntil) stopAlarm(); });
  function showSoundToast() {
    if (soundToast) soundToast.remove();
    soundToast = toast('🎺', 'The Wilhelmus is playing.', { label: 'Stop sound', fn: stopAlarm }, 0);
  }

  /* ---------------------------------------------------------------- notifications */
  function notify(title, body) {
    if (!S.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    if (!document.hidden) return;
    try {
      const n = new Notification(title, { body, icon: 'assets/logo/flag-of-the-netherlands.svg', tag: 'oranje-uurwerk' });
      n.onclick = () => { window.focus(); n.close(); };
    } catch (e) { /* some browsers need a service worker; ignore */ }
  }

  /* ---------------------------------------------------------------- heartbeat (worker + fallback) */
  let worker = null, workerRate = 0;
  function makeWorker() {
    try {
      const src = 'var t=null;onmessage=function(e){clearInterval(t);t=null;if(e.data>0){t=setInterval(function(){postMessage(Date.now())},e.data)}}';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const w = new Worker(url);
      w.onmessage = () => tick();
      w.onerror = () => { worker = null; };
      return w;
    } catch (e) { return null; }
  }
  function heartbeat() {
    const want = S.timer.running || alarmUntil ? 250 : 0;
    if (!worker && want) worker = makeWorker();
    if (worker && want !== workerRate) { worker.postMessage(want); workerRate = want; }
  }
  setInterval(() => tick(), 1000); // main-thread fallback

  /* ---------------------------------------------------------------- timer actions */
  const MODE_TEXT = { focus: 'Time to focus!', short: 'Time for a short break!', long: 'Time for a long break!' };
  const MODE_NAME = { focus: 'Focus', short: 'Short break', long: 'Long break' };

  function start() {
    const t = S.timer;
    if (t.running) return;
    stopAlarm();
    if (remaining() <= 0) { t.elapsedBefore = 0; }
    t.running = true; t.startedAt = Date.now(); touchTimer();
    keepAwake(true); heartbeat(); save(); render();
  }
  function pause() {
    const t = S.timer;
    if (!t.running) return;
    t.elapsedBefore = elapsed(t); t.running = false; t.startedAt = 0; touchTimer();
    keepAwake(false); heartbeat(); save(); render();
  }
  function toggle() { primeAudio(); clickSound(); S.timer.running ? pause() : start(); }

  /** Bank focus done so far (if any) and set up a brand-new idle round in `mode`. */
  function switchTo(mode, { autostart = false } = {}) {
    const t = S.timer;
    if (t.mode === 'focus') bankFocus(elapsed(t));
    S.timer = freshTimer(mode, S.settings);
    touchTimer();
    document.body.classList.toggle('is-running', false);
    if (autostart) start(); else { keepAwake(false); heartbeat(); save(); render(); }
    checkUnlocks();
  }

  function complete(atTime) {
    const t = S.timer;
    const mode = t.mode;
    const finishedAt = atTime || Date.now();
    const overdue = Date.now() - finishedAt;
    if (mode === 'focus') {
      bankFocus(t.durationMs, finishedAt);
      S.progress.sessions += 1;
      S.progress.cycle += 1;
      const d = S.progress.days[dayKey(finishedAt)] || (S.progress.days[dayKey(finishedAt)] = { ms: 0, n: 0 });
      d.n += 1;
      const task = S.tasks.find((x) => x.id === S.activeTaskId && !x.done);
      if (task) { task.act += 1; touchTasks(); }
    }
    const next = mode === 'focus' ? (S.progress.cycle % S.settings.interval === 0 ? 'long' : 'short') : 'focus';
    S.timer = freshTimer(next, S.settings); touchTimer();
    const fresh = overdue < 60 * 1000;
    const auto = fresh && (mode === 'focus' ? S.settings.autoBreaks : S.settings.autoFocus);
    if (fresh) playAlarm();
    const msg = mode === 'focus'
      ? `Focus round done! Time for a ${next === 'long' ? `${S.settings.long}-minute long` : `${S.settings.short}-minute short`} break.`
      : 'Break is over. Ready for the next focus round?';
    if (fresh) {
      notify(mode === 'focus' ? 'Focus round done! 🌷' : 'Break is over ⏱️', msg);
      toast(mode === 'focus' ? '🌷' : '⏱️', msg);
    } else {
      toast('🕰️', mode === 'focus' ? 'Your focus round finished while you were away. It has been counted!' : 'Your break finished while you were away.');
    }
    if (auto) start(); else { keepAwake(false); heartbeat(); save(true); render(); }
    checkUnlocks();
  }

  async function skip() {
    primeAudio();
    const t = S.timer;
    const e = elapsed(t);
    if (t.mode === 'focus' && e > 0) {
      const ok = await confirmBox('Finish this round early?', `You focused for ${fmtDur(e, true)}. That time still counts towards your journey.`, 'Finish round');
      if (!ok) return;
      S.progress.cycle += 1;
      const next = S.progress.cycle % S.settings.interval === 0 ? 'long' : 'short';
      switchTo(next);
    } else {
      switchTo(t.mode === 'focus' ? 'short' : 'focus');
    }
  }
  async function resetRound() {
    primeAudio();
    const t = S.timer;
    const e = elapsed(t);
    if (e > 30 * 1000) {
      const ok = await confirmBox('Restart this round?', t.mode === 'focus' ? `The clock goes back to ${S.settings.focus}:00. The ${fmtDur(e, true)} you already focused still counts.` : 'The clock goes back to the start of this break.', 'Restart');
      if (!ok) return;
    }
    switchTo(t.mode);
  }
  async function chooseMode(mode) {
    if (mode === S.timer.mode && elapsed() === 0) return;
    if (S.timer.running || elapsed() > 0) {
      const ok = await confirmBox(`Switch to ${MODE_NAME[mode].toLowerCase()}?`, S.timer.mode === 'focus' ? 'The current round will stop. Minutes you already focused still count.' : 'The current break will stop.', 'Switch');
      if (!ok) return;
    }
    switchTo(mode);
  }

  /* ---------------------------------------------------------------- tick */
  let lastSec = -1;
  function tick() {
    const now = Date.now();
    alarmTick(now);
    const t = S.timer;
    if (t.running && t.elapsedBefore + (now - t.startedAt) >= t.durationMs) {
      complete(t.startedAt + (t.durationMs - t.elapsedBefore));
      return;
    }
    checkUnlocks(now);
    const sec = Math.ceil(remaining(now) / 1000);
    if (sec !== lastSec || t.running) { lastSec = sec; paintLive(now); }
  }

  /* expose for the other part */
  window.__UU = {
    get S() { return S; }, set S(v) { S = v; },
    $, $$, clamp, esc, fmtClock, fmtDur, dayKey, pad, uid, reduceMotion,
    LEVELS, GIFTS, STATS, GOAL_H, HOUR, MIN, KEY, DEFAULTS, LIMITS, MODE_TEXT, MODE_NAME,
    hourInfo, statAt, rankAt, curve, Store, sanitize, merge, parse, freshState, freshProgress, freshTimer,
    save, flush, flushSync, touchTimer, touchTasks, touchSettings,
    elapsed, remaining, liveFocusMs, liveHours, unlockedCount, levelUnlocked, todayRounds,
    start, pause, toggle, skip, resetRound, chooseMode, switchTo, complete, tick,
    primeAudio, playAlarm, stopAlarm, chime, clickSound, keepAwake, heartbeat,
    get alarmPlaying() { return !!alarmUntil; },
  };
  // hooks defined in ui.js
  function render() { window.__UU.render && window.__UU.render(); }
  function paintLive(now) { window.__UU.paintLive && window.__UU.paintLive(now); }
  function checkUnlocks(now) { window.__UU.checkUnlocks && window.__UU.checkUnlocks(now); }
  function toast(...a) { return window.__UU.toast ? window.__UU.toast(...a) : null; }
  function confirmBox(...a) { return window.__UU.confirmBox ? window.__UU.confirmBox(...a) : Promise.resolve(true); }
})();
