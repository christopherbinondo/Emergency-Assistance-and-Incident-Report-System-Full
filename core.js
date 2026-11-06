/* ===================================================================
   Incident Desk — Core
   =================================================================== */

class Node { constructor(data) { this.data = data; this.next = null; } }

class LinkedList {
  constructor() { this.head = null; this.tail = null; this.size = 0; }
  add(data) {
    const n = new Node(data);
    if (!this.head) this.head = this.tail = n;
    else { this.tail.next = n; this.tail = n; }
    this.size++;
  }
  search(test) {
    const out = [];
    for (let c = this.head; c; c = c.next) if (test(c.data)) out.push(c.data);
    return out;
  }
  findById(id) {
    for (let c = this.head; c; c = c.next) if (c.data.id === id) return c.data;
    return null;
  }
  toArray() { return this.search(() => true); }
}

class Queue {
  constructor() { this.head = null; this.tail = null; this.size = 0; }
  enqueue(data) {
    const n = new Node(data);
    if (this.tail) this.tail.next = n; else this.head = n;
    this.tail = n; this.size++;
  }
  dequeue() {
    if (!this.head) return null;
    const d = this.head.data;
    this.head = this.head.next;
    if (!this.head) this.tail = null;
    this.size--;
    return d;
  }
  remove(id) {
    let prev = null;
    for (let c = this.head; c; prev = c, c = c.next) {
      if (c.data.id !== id) continue;
      if (prev) prev.next = c.next; else this.head = c.next;
      if (c === this.tail) this.tail = prev;
      this.size--; return true;
    }
    return false;
  }
  toArray() { const a = []; for (let c = this.head; c; c = c.next) a.push(c.data); return a; }
  insertAt(index, data) {
    const n = new Node(data);
    if (index <= 0) { n.next = this.head; this.head = n; if (!this.tail) this.tail = n; this.size++; return; }
    let prev = null, c = this.head, i = 0;
    while (c && i < index) { prev = c; c = c.next; i++; }
    if (!prev) { this.head = n; } else { prev.next = n; }
    n.next = c;
    if (!c) this.tail = n;
    this.size++;
  }
  indexOf(id) {
    let i = 0;
    for (let c = this.head; c; c = c.next, i++) if (c.data.id === id) return i;
    return -1;
  }
}

class Stack {
  constructor() { this.top = null; this.size = 0; }
  push(data) { const n = new Node(data); n.next = this.top; this.top = n; this.size++; }
  pop() { if (!this.top) return null; const d = this.top.data; this.top = this.top.next; this.size--; return d; }
  toArray() { const a = []; for (let c = this.top; c; c = c.next) a.push(c.data); return a; }
}

function insertionSort(arr, cmp) {
  const a = arr.slice();
  for (let i = 1; i < a.length; i++) {
    const key = a[i]; let j = i - 1;
    while (j >= 0 && cmp(a[j], key) > 0) { a[j + 1] = a[j]; j--; }
    a[j + 1] = key;
  }
  return a;
}

const CATEGORIES = ['Accident', 'Lost ID', 'Damaged Facility', 'Request for Assistance', 'Other'];
const STATUSES = ['Pending', 'In Progress', 'Resolved'];
const RANK = { 'Pending': 0, 'In Progress': 1, 'Resolved': 2 };

const records = new LinkedList();
const urgentQ = new Queue();
const regularQ = new Queue();
const history = new Stack();
let counter = 0, view = 'all', found = null;

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const qFor = r => (r.urgent ? urgentQ : regularQ);
const fmt = t => new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

function cleanName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function save() {
  try {
    localStorage.setItem('incident-desk', JSON.stringify({
      counter, reports: records.toArray(), history: history.toArray().reverse()
    }));
  } catch (e) { window.storageError = true; }
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem('incident-desk'));
    if (!d) return;
    counter = d.counter || 0;
    d.reports.forEach(r => {
      if (!r.timeline) r.timeline = [];
      if (!r.assignee) r.assignee = '';
      records.add(r);
      if (r.status === 'Pending') qFor(r).enqueue(r);
    });
    (d.history || []).forEach(h => history.push(h));
  } catch (e) {}
}

function newId() { return 'INC-' + String(++counter).padStart(4, '0'); }

function setStatus(r, to, log = true, opts = {}) {
  if (!r) return;
  const from = r.status;
  if (from === to) return;
  const fromQ = qFor(r);
  const prevIndex = from === 'Pending' ? fromQ.indexOf(r.id) : -1;
  urgentQ.remove(r.id); regularQ.remove(r.id);
  r.status = to;
  if (to === 'Pending') qFor(r).enqueue(r);
  if (!r.timeline) r.timeline = [];
  if (log) {
    const entry = { id: r.id, from, to, time: Date.now(), actor: opts.actor || 'staff', prevIndex };
    history.push(entry);
    r.timeline.push({ from, to, time: entry.time, actor: entry.actor });
  }
  save(); render();
}

const PAGES = [
  ['index.html', 'Dashboard', 'layout-dashboard'],
  ['analytics.html', 'Analytics', 'bar-chart-3'],
  ['report.html', 'Report an incident', 'plus-circle'],
  ['queue.html', 'Processing queue', 'list-ordered'],
  ['records.html', 'Incident records', 'archive']
];

function render() { if (typeof pageRender === 'function') pageRender(); }

function addReport(f) {
  const r = {
    id: newId(), reporter: f.reporter, category: f.category, location: f.location,
    description: f.description, urgent: f.urgent, status: 'Pending', created: Date.now(),
    image: f.image || '', aiDescription: f.aiDescription || '',
    assignee: cleanName(f.assignee),
    timeline: [{ from: null, to: 'Pending', time: Date.now(), actor: 'reporter' }]
  };
  records.add(r); qFor(r).enqueue(r); save();
  if (window.storageError) { window.storageError = false; r.image = ''; r.imageDropped = true; save(); window.storageError = false; }
  render(); return r;
}

function processNext() {
  const r = urgentQ.dequeue() || regularQ.dequeue();
  if (r) setStatus(r, 'In Progress', true, { actor: 'queue' });
  return r;
}

function undoLast() {
  const h = history.pop();
  if (!h) return null;
  const r = records.findById(h.id);
  if (!r) return null;
  const from = r.status;
  urgentQ.remove(r.id); regularQ.remove(r.id);
  r.status = h.from;
  if (h.from === 'Pending') {
    const q = qFor(r);
    q.insertAt(Math.max(0, h.prevIndex ?? q.size), r);
  }
  if (r.timeline) r.timeline.push({ from, to: h.from, time: Date.now(), actor: 'undo' });
  save(); render();
  return h;
}

function resetList(l) { l.head = l.tail = null; l.size = 0; }

function clearResolved() {
  const keep = records.toArray().filter(r => r.status !== 'Resolved');
  const ids = new Set(keep.map(r => r.id));
  const keepHist = history.toArray().filter(h => ids.has(h.id)).reverse();
  resetList(records); keep.forEach(r => records.add(r));
  history.top = null; history.size = 0; keepHist.forEach(h => history.push(h));
  save(); render();
}

function clearAll() {
  resetList(records); resetList(urgentQ); resetList(regularQ);
  history.top = null; history.size = 0;
  save(); render();
}

function deleteReport(id) {
  if (!records.findById(id)) return false;
  const keep = records.toArray().filter(r => r.id !== id);
  const keepHist = history.toArray().filter(h => h.id !== id).reverse();
  resetList(records); keep.forEach(r => records.add(r));
  urgentQ.remove(id); regularQ.remove(id);
  history.top = null; history.size = 0; keepHist.forEach(h => history.push(h));
  save(); render(); return true;
}

function fillStats() {
  const a = records.toArray(), set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  set('sTotal', a.length);
  set('sWait', a.filter(r => r.status === 'Pending').length);
  set('sProg', a.filter(r => r.status === 'In Progress').length);
  set('sDone', a.filter(r => r.status === 'Resolved').length);
}

function updateNavCount() {
  const c = document.getElementById('navCount'); if (!c) return;
  const n = urgentQ.toArray().length; c.textContent = n; c.hidden = n === 0;
}

function showAlert() {
  updateNavCount();
  const e = $('alert'), u = urgentQ.toArray(); if (!e) return;
  e.hidden = u.length === 0;
  if (u.length) e.textContent = u.length + ' urgent report' + (u.length > 1 ? 's' : '') + ' waiting. Oldest: ' + u[0].id + ' at ' + u[0].location + '. Open the Processing queue.';
}

function storageWarning() {
  const dropped = records.search(r => r.imageDropped);
  if (!dropped.length) return '';
  return '<div class="storage-warn" role="status"><i data-lucide="alert-triangle"></i>' +
    ' ' + dropped.length + ' report' + (dropped.length > 1 ? 's' : '') + ' had photo' + (dropped.length > 1 ? 's' : '') +
    ' dropped (browser storage full). <a href="records.html">View records</a></div>';
}

const pill = r => '<span class="pill st-' + r.status.replace(' ', '') + '">' + r.status + '</span>';
const tagU = r => (r.urgent ? '<span class="tag"><i data-lucide="alert-triangle"></i>Urgent</span>' : '');

let toastTimer = null;
function toast(msg, opts = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.innerHTML = '<span class="toast-msg">' + esc(msg) + '</span>' +
    (opts.actionLabel ? '<button type="button" class="toast-action">' + esc(opts.actionLabel) + '</button>' : '');
  if (opts.actionLabel && typeof opts.onAction === 'function') {
    el.querySelector('.toast-action').addEventListener('click', () => {
      opts.onAction(); el.classList.remove('show');
    });
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), opts.duration || 5000);
}

function exportJSON() {
  const data = JSON.stringify({ counter, reports: records.toArray(), history: history.toArray() }, null, 2);
  downloadFile('incident-desk-' + new Date().toISOString().slice(0, 10) + '.json', data, 'application/json');
}

function exportCSV() {
  const rows = [['ID', 'Category', 'Location', 'Reporter', 'Assignee', 'Urgent', 'Status', 'Created', 'Description', 'AI Description']];
  records.toArray().forEach(r => {
    rows.push([r.id, r.category, r.location, r.reporter, r.assignee || '',
      r.urgent ? 'yes' : 'no', r.status, new Date(r.created).toISOString(),
      r.description, r.aiDescription || '']);
  });
  const csv = rows.map(row => row.map(cell => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
  downloadFile('incident-desk-' + new Date().toISOString().slice(0, 10) + '.csv', csv, 'text/csv');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const d = JSON.parse(reader.result);
      if (!d || !Array.isArray(d.reports)) throw new Error('Invalid backup file.');
      if (!(await dkAsk({ tone: 'danger', title: 'Replace all incidents?', message: 'This backup has ' + d.reports.length + ' report(s). Importing it replaces every incident currently stored in this browser.', ok: 'Replace all' }))) return;
      resetList(records); resetList(urgentQ); resetList(regularQ);
      history.top = null; history.size = 0;
      counter = d.counter || d.reports.length;
      d.reports.forEach(r => {
        if (!r.timeline) r.timeline = [];
        if (!r.assignee) r.assignee = '';
        records.add(r);
        if (r.status === 'Pending') qFor(r).enqueue(r);
      });
      (d.history || []).forEach(h => history.push(h));
      save(); render();
      toast('Imported ' + d.reports.length + ' report(s).');
    } catch (e) { dkAsk({ tone: 'danger', title: 'Import failed', message: e.message, ok: 'OK', cancel: null }); }
  };
  reader.readAsText(file);
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

function openLightbox(src, alt) {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = '<button type="button" class="lightbox-close" aria-label="Close">&times;</button><img alt="">';
    document.body.appendChild(lb);
    lb.addEventListener('click', e => {
      if (e.target === lb || e.target.classList.contains('lightbox-close')) lb.classList.remove('show');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') lb.classList.remove('show');
    });
  }
  const img = lb.querySelector('img');
  img.src = src; img.alt = alt || 'Photo';
  lb.classList.add('show');
}

(function buildShell() {
  const here = location.pathname.split('/').pop() || 'index.html';
  const logoSvg = `
    <svg class="mark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 2Z" fill="var(--red)" fill-opacity="0.15" stroke="var(--red)" stroke-width="2" stroke-linejoin="round"/>
      <path d="M12 8V12" stroke="var(--red)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="16" r="1.5" fill="var(--red)"/>
      <rect x="15" y="12" width="5" height="7" rx="1" fill="var(--primary)" />
      <path d="M16 14H19" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M16 16H18" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  const P = h => PAGES.find(p => p[0] === h);
  const link = p => '<a href="' + p[0] + '" title="' + p[1] + '"' + (p[0] === here ? ' class="on" aria-current="page"' : '') + '><i data-lucide="' + p[2] + '"></i><span class="lbl">' + p[1] + '</span>' +
    (p[0] === 'queue.html' ? '<span class="nav-count" id="navCount" hidden>0</span>' : '') + '</a>';
  const me = (function () { try { return localStorage.getItem('incident-desk-me') || ''; } catch (e) { return ''; } })();
  document.body.insertAdjacentHTML('afterbegin',
    '<aside class="side">' +
      '<div class="logo">' + logoSvg + '<div><strong>Incident Desk</strong><small>Emergency assistance</small></div></div>' +
      '<nav aria-label="Main">' + link(P('index.html')) +
        '<div class="nav-group">Take action</div>' + link(P('report.html')) + link(P('queue.html')) +
        '<div class="nav-group">Review</div>' + link(P('records.html')) + link(P('analytics.html')) +
      '</nav>' +
      '<div class="sos" title="In an emergency, call 911 first"><i data-lucide="phone-call"></i><span class="lbl">Emergency: call <b>911</b></span></div>' +
      '<button type="button" id="whoBtn" class="theme-btn" title="Set my name"><i data-lucide="user"></i><span class="lbl">' + esc(me || 'Set my name') + '</span></button>' +
      '<div class="side-tools"><button type="button" id="themeBtn" class="theme-btn"></button><button type="button" id="railBtn" class="theme-btn"></button></div>' +
    '</aside>');
  document.getElementById('whoBtn').addEventListener('click', () => {
    const name = prompt('Your name (used to filter "My assignments"):', me);
    if (name === null) return;
    try { if (name.trim()) localStorage.setItem('incident-desk-me', cleanName(name)); else localStorage.removeItem('incident-desk-me'); } catch (e) {}
    location.reload();
  });
  const rb = document.getElementById('railBtn'), RK = 'incident-desk-rail';
  function railPaint() {
    const on = document.body.classList.contains('rail');
    rb.title = on ? 'Expand sidebar' : 'Collapse sidebar';
    rb.setAttribute('aria-label', rb.title);
    rb.innerHTML = '<i data-lucide="' + (on ? 'chevrons-right' : 'chevrons-left') + '"></i><span class="lbl">Collapse</span>';
    if (window.lucide) lucide.createIcons();
  }
  try { if (localStorage.getItem(RK) === 'yes') document.body.classList.add('rail'); } catch (e) {}
  rb.addEventListener('click', () => {
    document.body.classList.toggle('rail');
    try { localStorage.setItem(RK, document.body.classList.contains('rail') ? 'yes' : 'no'); } catch (e) {}
    railPaint();
  });
  railPaint();
})();

(function themeInit() {
  const KEY = 'incident-desk-theme';
  const root = document.documentElement;
  function apply(t) { if (t === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme'); }
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  const osDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  apply(saved || (osDark ? 'dark' : 'light'));

  const btn = document.getElementById('themeBtn');
  function paint() {
    const dark = root.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.innerHTML = '<i data-lucide="' + (dark ? 'sun' : 'moon') + '"></i><span>' + (dark ? 'Light mode' : 'Dark mode') + '</span>';
    if (window.lucide) lucide.createIcons();
  }
  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    paint();
  });
  paint();
  if (window.lucide) lucide.createIcons();
})();

load();
const todayEl = $('today');
if (todayEl) todayEl.textContent = new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

function refreshIcons() { if (window.lucide) lucide.createIcons(); }

function highlight(text, q) {
  if (!q) return esc(text);
  const safe = esc(text), lower = safe.toLowerCase(), needle = esc(q).toLowerCase();
  if (!needle) return safe;
  let out = '', i = 0, idx;
  while ((idx = lower.indexOf(needle, i)) !== -1) {
    out += safe.slice(i, idx) + '<mark>' + safe.slice(idx, idx + needle.length) + '</mark>';
    i = idx + needle.length;
  }
  return out + safe.slice(i);
}

function relativeTime(ts) {
  const diff = Date.now() - ts, s = Math.floor(diff / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return d + 'd ago';
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function storageStats() {
  try {
    let bytes = 0;
    for (const k in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, k)) bytes += (localStorage[k].length + k.length) * 2;
    }
    const quota = 10 * 1024 * 1024;
    return { bytes, quota, pct: Math.min(100, Math.round(bytes / quota * 100)) };
  } catch (e) { return { bytes: 0, quota: 0, pct: 0 }; }
}

function debounce(fn, ms) {
  let t;
  return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}

function trapFocus(el) {
  const f = el.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
  if (!f.length) return () => {};
  const first = f[0], last = f[f.length - 1];
  const h = e => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  el.addEventListener('keydown', h);
  return () => el.removeEventListener('keydown', h);
}

function bulkSetStatus(ids, to) {
  const n = ids.length; if (!n) return;
  ids.forEach(id => { const r = records.findById(id); if (r) setStatus(r, to, true, { actor: 'bulk' }); });
  toast('Updated ' + n + ' report(s) to ' + to + '.');
}

function bulkDelete(ids) {
  const n = ids.length; if (!n) return;
  ids.forEach(id => deleteReport(id));
  toast('Deleted ' + n + ' report(s).');
}

(function observeReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

window.addEventListener('load', refreshIcons);
if (typeof window.dkAsk !== 'function') window.dkAsk = o => Promise.resolve(o.input ? prompt(o.message, o.input.value || '') : o.cancel === null ? (alert(o.message), true) : confirm(o.message));
