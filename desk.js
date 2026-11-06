/* Incident Desk extras: settings, quick search, wait timers, alerts, board nav, print, QR, hotspot map, tour. */
(function () {
  'use strict';
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; };
  const q1 = (s, r) => (r || document).querySelector(s);
  const here = location.pathname.split('/').pop() || 'index.html';
  const ic = () => { if (typeof refreshIcons === 'function') refreshIcons(); };
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const all = () => records.toArray();
  const dur = m => m < 60 ? m + ' min' : m < 1440 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : Math.floor(m / 1440) + 'd ' + Math.floor(m % 1440 / 60) + 'h';

  /* ---------- preferences: accent color and density ---------- */
  const ACC = { Default: null, Blue: ['#1d4ed8', '#1e40af'], Teal: ['#0f8a8a', '#0b6e6e'], Green: ['#1f7a52', '#17603f'], Violet: ['#6a4fb0', '#563f93'], Rust: ['#b4532a', '#92421f'], Pink: ['#b83b78', '#962d60'] };
  if (ls('dk-accent') && !ACC[ls('dk-accent')]) ls('dk-accent', null);
  function applyPrefs() {
    const r = document.documentElement, a = ACC[ls('dk-accent')];
    if (a) { r.dataset.accent = ls('dk-accent'); r.style.setProperty('--dk-acc', a[0]); r.style.setProperty('--dk-acc-dk', a[1]); r.style.setProperty('--primary', a[0]); r.style.setProperty('--primary-dk', a[1]); }
    else { delete r.dataset.accent; ['--dk-acc', '--dk-acc-dk', '--primary', '--primary-dk'].forEach(v => r.style.removeProperty(v)); }
    r.dataset.density = ls('dk-density') === 'compact' ? 'compact' : 'comfortable';
  }
  applyPrefs();

  /* ---------- modal helper ---------- */
  function modal(html, cls, onClose) {
    const o = document.createElement('div');
    o.className = 'dk-over';
    o.innerHTML = '<div class="dk-modal ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(o);
    const onKey = e => { if (e.key === 'Escape') close(); };
    const close = () => { o.remove(); document.removeEventListener('keydown', onKey); if (onClose) onClose(); };
    document.addEventListener('keydown', onKey);
    o.addEventListener('mousedown', e => { if (e.target === o) close(); });
    ic();
    return { el: o.firstChild, close };
  }
  window.dkAsk = function (o) {
    o = o || {};
    return new Promise(res => {
      let done = false; const fin = v => { if (!done) { done = true; res(v); } };
      const tone = o.tone || 'info', icon = tone === 'info' ? (o.input ? 'user' : 'info') : 'alert-triangle';
      const msg = E(o.message || '').replace(/\n/g, '<br>');
      const m = modal('<div class="dk-dlg" data-tone="' + tone + '"><span class="dk-dic"><i data-lucide="' + icon + '"></i></span><div class="dk-dbody"><h2>' + E(o.title || 'Please confirm') + '</h2>' + (msg ? '<p>' + msg + '</p>' : '') +
        (o.input ? '<label class="dk-fld"><span>' + E(o.input.label || '') + '</span><input id="dkIn" maxlength="60" value="' + E(o.input.value || '') + '" placeholder="' + E(o.input.placeholder || '') + '"></label>' : '') + '</div></div>' +
        '<div class="dk-dfoot">' + (o.cancel === null ? '' : '<button type="button" data-c>' + E(o.cancel || 'Cancel') + '</button>') + '<button type="button" class="dk-dok" data-o>' + E(o.ok || 'OK') + '</button></div>',
        'dk-dialog', () => fin(o.input ? null : o.cancel === null));
      const inp = q1('#dkIn', m.el), okb = q1('[data-o]', m.el), cb = q1('[data-c]', m.el);
      okb.addEventListener('click', () => { fin(inp ? inp.value : true); m.close(); });
      if (cb) cb.addEventListener('click', () => m.close());
      m.el.addEventListener('keydown', e => { if (e.key === 'Enter' && document.activeElement !== cb) { e.preventDefault(); okb.click(); } });
      (inp || (tone === 'danger' && cb ? cb : okb)).focus(); if (inp) inp.select();
    });
  };
  const pick = (box, btn) => { box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn)); };

  /* ---------- settings (name, accent, density, alerts) ---------- */
  function openSettings() {
    const me = ls('incident-desk-me') || '', acc = ls('dk-accent') || 'Default', den = ls('dk-density') || 'comfortable';
    const names = []; all().forEach(r => { const n = cleanName(r.assignee); if (n && !names.includes(n)) names.push(n); });
    const m = modal(
      '<div class="dk-head"><h2>Settings</h2><button type="button" class="dk-x" data-x aria-label="Close"><i data-lucide="x"></i></button></div>' +
      '<section class="dk-sec"><h3>Who are you?</h3><div class="dk-who"><span class="dk-av" id="dkAv"></span>' +
      '<label class="dk-fld"><span>Your name</span><input id="dkName" maxlength="40" autocomplete="name" placeholder="e.g. Nurse Rivera" value="' + E(me) + '"></label></div>' +
      '<p class="dk-hint">Used to show your assignments on the dashboard.</p>' +
      (names.length ? '<div class="dk-chips"><span>Staff on file</span>' + names.slice(0, 6).map(n => '<button type="button" data-n="' + E(n) + '">' + E(n) + '</button>').join('') + '</div>' : '') + '</section>' +
      '<section class="dk-sec"><h3>Accent color</h3><div class="dk-sw" id="dkAcc">' + Object.keys(ACC).map(k =>
        '<button type="button" data-a="' + k + '" class="' + (k === acc ? 'on' : '') + '" title="' + k + '" aria-label="' + k + '" style="--c:' + (ACC[k] ? ACC[k][0] : 'linear-gradient(135deg,#1b2a38 50%,#3b78b0 50%)') + '"></button>').join('') + '</div><p class="dk-hint" id="dkAccName">' + (acc === 'Default' ? 'Default (follows the light or dark theme)' : acc) + '</p></section>' +
      '<section class="dk-sec"><h3>Row density</h3><div class="dk-seg" id="dkDen"><button type="button" data-d="comfortable" class="' + (den === 'comfortable' ? 'on' : '') + '">Comfortable</button><button type="button" data-d="compact" class="' + (den === 'compact' ? 'on' : '') + '">Compact</button></div></section>' +
      '<section class="dk-sec"><h3>Alerts</h3><label class="dk-tog"><input type="checkbox" id="dkAl"' + (ls('dk-alerts') !== 'off' ? ' checked' : '') + '><span>Sound and notification when a new report arrives</span></label><button type="button" id="dkTest" class="dk-test">Play test sound</button><p class="dk-hint">Plays on screens that stay open while someone reports from another tab. Click the page once so the browser allows sound.</p></section>' +
      '<div class="dk-foot"><button type="button" id="dkTour">Take the tour</button><span class="dk-sp"></span><button type="button" class="primary" id="dkSave">Save and close</button></div>');
    const el = m.el, nm = q1('#dkName', el), av = q1('#dkAv', el);
    const ini = () => { const w = nm.value.trim().split(/\s+/).filter(Boolean); av.textContent = (w.length ? w[0][0] + (w[1] ? w[1][0] : '') : '?').toUpperCase(); av.classList.toggle('empty', !w.length); };
    nm.addEventListener('input', ini); ini(); nm.focus();
    const save = () => {
      const v = cleanName(nm.value); ls('incident-desk-me', v || null);
      const l = q1('#whoBtn .lbl'); if (l) l.textContent = v || 'Set my name';
      m.close(); if (typeof render === 'function') render(); toast(v ? 'Saved. Hi, ' + v + '.' : 'Name cleared.');
    };
    nm.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    q1('#dkAl', el).addEventListener('change', e => {
      ls('dk-alerts', e.target.checked ? null : 'off');
      if (e.target.checked && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    });
    el.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.x !== undefined) m.close();
      else if (t.dataset.n) { nm.value = t.dataset.n; ini(); nm.focus(); }
      else if (t.dataset.a) { ls('dk-accent', t.dataset.a === 'Default' ? null : t.dataset.a); applyPrefs(); pick(q1('#dkAcc', el), t); q1('#dkAccName', el).textContent = t.dataset.a === 'Default' ? 'Default (follows the light or dark theme)' : t.dataset.a; }
      else if (t.dataset.d) { ls('dk-density', t.dataset.d); applyPrefs(); pick(q1('#dkDen', el), t); }
      else if (t.id === 'dkTest') window.dkTestSound();
      else if (t.id === 'dkSave') save();
      else if (t.id === 'dkTour') { m.close(); startTour(true); }
    });
  }
  document.addEventListener('click', e => { if (e.target.closest('#whoBtn')) { e.preventDefault(); e.stopImmediatePropagation(); openSettings(); } }, true);

  /* ---------- sidebar additions ---------- */
  const tools = q1('.side-tools');
  if (tools) {
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'setBtn'; b.className = 'theme-btn'; b.title = 'Settings'; b.setAttribute('aria-label', 'Settings');
    b.innerHTML = '<i data-lucide="sliders-horizontal"></i>'; b.addEventListener('click', openSettings);
    tools.insertBefore(b, tools.firstChild);
  }
  const rec = q1('.side nav a[href="records.html"]');
  if (rec) {
    const a = document.createElement('a');
    a.href = 'board.html'; a.title = 'Board view';
    if (here === 'board.html') { a.className = 'on'; a.setAttribute('aria-current', 'page'); }
    a.innerHTML = '<i data-lucide="kanban"></i><span class="lbl">Board view</span>';
    rec.after(a);
  }
  ic();

  /* ---------- quick search (Ctrl+K) ---------- */
  function openPalette() {
    const m = modal('<input id="dkQ" placeholder="Search reports, pages and actions..." autocomplete="off" aria-label="Quick search"><ul id="dkRes" role="listbox"></ul><p class="dk-hint">Up and down to move, Enter to open, Esc to close</p>', 'dk-top');
    const inp = q1('#dkQ', m.el), ul = q1('#dkRes', m.el); let items = [], at = 0;
    const base = (typeof PAGES !== 'undefined' ? PAGES : []).map(p => ({ t: p[1], s: 'Page', go: p[0] })).concat([
      { t: 'Board view', s: 'Page', go: 'board.html' },
      { t: 'Settings', s: 'Action', fn: openSettings },
      { t: 'Set my name', s: 'Action', fn: openSettings },
      { t: 'Toggle dark mode', s: 'Action', fn: () => { const b = q1('#themeBtn'); if (b) b.click(); } },
      { t: 'Switch row density', s: 'Action', fn: () => { ls('dk-density', ls('dk-density') === 'compact' ? 'comfortable' : 'compact'); applyPrefs(); } },
      { t: 'Take the tour', s: 'Action', fn: () => startTour(true) }]);
    function draw() {
      const v = inp.value.trim().toLowerCase();
      const rep = v ? all().filter(r => (r.id + ' ' + r.category + ' ' + r.location + ' ' + r.reporter + ' ' + r.description).toLowerCase().includes(v)).slice(0, 4)
        .reduce((a, r) => a.concat([{ t: r.id + ' · ' + r.category + ' · ' + r.location, s: r.status, go: 'records.html?q=' + encodeURIComponent(r.id) }, { t: 'Print ' + r.id, s: 'Action', fn: () => printIncident(r.id) }]), []) : [];
      items = rep.concat(base.filter(b => !v || b.t.toLowerCase().includes(v))).slice(0, 9);
      at = Math.max(0, Math.min(at, items.length - 1));
      ul.innerHTML = items.length ? items.map((it, i) => '<li role="option" data-i="' + i + '" class="' + (i === at ? 'on' : '') + '"><span>' + E(it.t) + '</span><small>' + E(it.s) + '</small></li>').join('')
        : '<li class="none">No matches. Try an ID, a place or a page name.</li>';
    }
    const run = i => { const it = items[i]; if (!it) return; m.close(); if (it.go) location.href = it.go; else it.fn(); };
    inp.addEventListener('input', () => { at = 0; draw(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { at = Math.min(at + 1, items.length - 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { at = Math.max(at - 1, 0); draw(); e.preventDefault(); }
      else if (e.key === 'Enter') run(at);
    });
    ul.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) run(+li.dataset.i); });
    draw(); inp.focus();
  }
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopImmediatePropagation(); if (!q1('#dkQ')) openPalette(); }
  }, true);

  /* ---------- queue: waiting timers ---------- */
  function decorateQueue() {
    document.querySelectorAll('.queue-item[data-id]').forEach(li => {
      const r = records.findById(li.dataset.id), top = li.querySelector('.qi-top'); if (!r || !top) return;
      const mins = Math.max(0, Math.floor((Date.now() - r.created) / 60000)), lim = r.urgent ? [10, 30] : [60, 240];
      const cls = mins >= lim[1] ? 'late' : mins >= lim[0] ? 'warn' : 'ok';
      let w = top.querySelector('.dk-wait'); if (!w) { w = document.createElement('span'); top.appendChild(w); }
      w.className = 'dk-wait ' + cls; w.textContent = 'Waiting ' + dur(mins); li.dataset.age = cls;
    });
  }
  if (here === 'queue.html') {
    const mo = new MutationObserver(decorateQueue);
    ['uList', 'nList'].forEach(id => { const el = document.getElementById(id); if (el) mo.observe(el, { childList: true }); });
    decorateQueue(); setInterval(decorateQueue, 30000);
  }

  /* ---------- alerts: sound, notification and title flash for new reports from other tabs ---------- */
  let actx = null;
  const unlock = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  function tone(freqs, gap, len, vol) {
    unlock(); if (!actx) return;
    const t = actx.currentTime + .02;
    freqs.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), st = t + i * gap;
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(.0001, st); g.gain.exponentialRampToValueAtTime(vol, st + .02); g.gain.exponentialRampToValueAtTime(.0001, st + len);
      o.start(st); o.stop(st + len + .05);
    });
  }
  const alarm = () => tone([988, 740, 988, 740, 988], .26, .22, .4);
  const ping = () => tone([660, 880], .16, .24, .3);
  const snap = () => { try { return (JSON.parse(ls('incident-desk')).reports || []).map(r => ({ id: r.id, u: !!r.urgent && r.status !== 'Resolved' })); } catch (e) { return []; } };
  let knownIds = new Set(snap().map(r => r.id)), baseTitle = document.title;
  const mark = () => { knownIds = new Set(snap().map(r => r.id)); };
  if (typeof window.addReport === 'function') { const orig = window.addReport; window.addReport = function () { const r = orig.apply(this, arguments); mark(); return r; }; }
  function check() {
    const now = snap(), fresh = now.filter(r => !knownIds.has(r.id)); knownIds = new Set(now.map(r => r.id));
    if (!fresh.length || ls('dk-alerts') === 'off') return;
    const urgent = fresh.filter(r => r.u), ids = fresh.map(r => r.id).join(', ');
    (urgent.length ? alarm : ping)();
    const msg = (urgent.length ? 'New URGENT report: ' : 'New report: ') + ids;
    if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('Incident Desk', { body: msg }); } catch (er) {} }
    toast(msg, { actionLabel: 'Refresh', onAction: () => location.reload() });
    if (document.hidden) { document.title = '(!) ' + msg; const back = () => { document.title = baseTitle; document.removeEventListener('visibilitychange', back); }; document.addEventListener('visibilitychange', back); }
  }
  window.addEventListener('storage', e => { if (e.key === 'incident-desk') check(); });
  setInterval(check, 4000);
  window.dkTestSound = () => { unlock(); alarm(); };

  /* ---------- print one incident ---------- */
  window.printIncident = function (id) {
    const r = records.findById(id); if (!r) return;
    const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print.'); return; }
    const tl = (r.timeline || []).map(t => '<tr><td>' + E(fmt(t.time)) + '</td><td>' + E((t.from || 'New') + ' → ' + t.to) + '</td><td>' + E(t.actor || '') + '</td></tr>').join('');
    w.document.write('<!doctype html><meta charset="utf-8"><title>' + E(r.id) + '</title><style>body{font:14px/1.5 system-ui,sans-serif;max-width:720px;margin:32px auto;color:#111}h1{margin:0}dl{display:grid;grid-template-columns:140px 1fr;gap:6px 16px}dt{color:#555}table{border-collapse:collapse;width:100%}td{border-top:1px solid #ccc;padding:6px 4px}img{max-width:100%;margin:12px 0}.u{color:#b00;font-weight:700}</style>' +
      '<h1>Incident ' + E(r.id) + '</h1>' + (r.urgent ? '<p class="u">URGENT</p>' : '') +
      '<dl><dt>Category</dt><dd>' + E(r.category) + '</dd><dt>Location</dt><dd>' + E(r.location) + '</dd><dt>Reported by</dt><dd>' + E(r.reporter) + '</dd><dt>Reported</dt><dd>' + E(fmt(r.created)) + '</dd><dt>Status</dt><dd>' + E(r.status) + '</dd><dt>Assigned to</dt><dd>' + E(r.assignee || 'Nobody') + '</dd><dt>What happened</dt><dd>' + E(r.description) + '</dd>' +
      (r.aiDescription ? '<dt>AI description</dt><dd>' + E(r.aiDescription) + '</dd>' : '') + '</dl>' + (r.image ? '<img src="' + E(r.image) + '" alt="">' : '') +
      (tl ? '<h3>Timeline</h3><table>' + tl + '</table>' : ''));
    w.document.close(); setTimeout(() => w.print(), 400);
  };
  if (here === 'records.html') {
    const rows = q1('#rows');
    const addPrint = () => rows.querySelectorAll('button[data-del]').forEach(b => {
      if (b.previousElementSibling && b.previousElementSibling.dataset.print) return;
      const p = document.createElement('button'); p.type = 'button'; p.className = 'mini'; p.dataset.print = b.dataset.del;
      p.title = 'Print ' + b.dataset.del; p.setAttribute('aria-label', p.title); p.innerHTML = '<i data-lucide="printer"></i>';
      b.parentNode.insertBefore(p, b); b.parentNode.classList.add('dk-act');
    });
    new MutationObserver(() => { addPrint(); ic(); }).observe(rows, { childList: true }); addPrint(); ic();
    rows.addEventListener('click', e => { const p = e.target.closest('[data-print]'); if (p) printIncident(p.dataset.print); });
    const qs = new URLSearchParams(location.search).get('q');
    if (qs) { const i = q1('#searchText'); i.value = qs; i.dispatchEvent(new Event('input')); }
  }

  /* ---------- hotspot map (analytics) ---------- */
  if (here === 'analytics.html' && q1('main')) {
    const by = {}; all().forEach(r => { const k = (r.location || '').trim() || '(unspecified)'; by[k] = (by[k] || 0) + 1; });
    const ent = Object.keys(by).map(k => [k, by[k]]).sort((a, b) => b[1] - a[1]).slice(0, 24), max = ent.length ? ent[0][1] : 1;
    const s = document.createElement('section'); s.className = 'panel wide';
    s.innerHTML = '<h2>Hotspot map</h2><p class="hint">Each tile is a place. Deeper red means more incidents. Select a tile to open its reports.</p>' +
      (ent.length ? '<div class="dk-heat">' + ent.map(e => '<a href="records.html?q=' + encodeURIComponent(e[0]) + '" style="--h:' + Math.round(8 + e[1] / max * 52) + '%"><b>' + E(e[0]) + '</b><span>' + e[1] + (e[1] === 1 ? ' incident' : ' incidents') + '</span></a>').join('') + '</div>'
        : '<p class="dk-empty">No incidents yet, so there is nothing to map.</p>');
    q1('main').appendChild(s);
  }

  /* ---------- first-time tour ---------- */
  function startTour(force) {
    if (!force && (ls('dk-tour') === 'done' || here !== 'index.html')) return;
    const steps = [
      ['#whoBtn', 'Set your name', 'Open this to set your name, so My assignments shows your reports.'],
      ['.side nav a[href="report.html"]', 'Report an incident', 'Anyone can report what happened and attach a photo.'],
      ['.side nav a[href="queue.html"]', 'Processing queue', 'Urgent reports come first. Cards turn amber, then red, the longer they wait.'],
      ['#setBtn', 'Settings', 'Pick an accent color, row density and alerts. Press Ctrl+K any time to search.']
    ].filter(s => { const el = q1(s[0]); return el && el.getClientRects().length; });
    if (!steps.length) return;
    let i = 0; const pop = document.createElement('div'); pop.className = 'dk-tour'; document.body.appendChild(pop);
    const clear = () => document.querySelectorAll('.dk-hl').forEach(x => x.classList.remove('dk-hl'));
    const end = () => { pop.remove(); clear(); ls('dk-tour', 'done'); };
    const show = () => {
      clear(); if (i >= steps.length) return end();
      const s = steps[i], el = q1(s[0]), r = el.getBoundingClientRect(); el.classList.add('dk-hl');
      pop.innerHTML = '<b>' + E(s[1]) + '</b><p>' + E(s[2]) + '</p><div><small>' + (i + 1) + ' of ' + steps.length + '</small><button type="button" data-s>Skip</button><button type="button" class="primary" data-n>' + (i === steps.length - 1 ? 'Done' : 'Next') + '</button></div>';
      pop.style.left = Math.min(Math.max(8, r.right + 14), innerWidth - 300) + 'px'; pop.style.top = Math.min(Math.max(8, r.top), innerHeight - 180) + 'px';
    };
    pop.addEventListener('click', e => { if (e.target.closest('[data-s]')) end(); else if (e.target.closest('[data-n]')) { i++; show(); } });
    show();
  }
  setTimeout(() => startTour(false), 900);
})();
