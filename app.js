/* Thekenkasse – Kassen-App für Getränkeverkauf und Thekendienst.
   Läuft komplett im Browser. Alle Daten liegen auf dem Gerät (localStorage);
   innerhalb von claude.ai kommt eine automatische Cloud-Sicherung im eigenen Konto dazu. */
(function () {
  'use strict';

  // ================================================================
  // Hilfsfunktionen
  // ================================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  const fmt = (c) => EUR.format((c || 0) / 100);
  const fmtPlain = (c) => ((c || 0) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const fmtDenom = (c) => (c >= 100 ? `${c / 100} €` : `${c} ct`);
  const TIME = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
  const DATETIME = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const DATE_FILE = (ts) => { const d = new Date(ts); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const fTime = (ts) => TIME.format(new Date(ts));
  const fDateTime = (ts) => DATETIME.format(new Date(ts));
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  /** Verhindert Umbrüche zwischen Zahl und Einheit („0,5 l“) */
  const nb = (s) => esc(s).replace(/(\d) (l|cl|ml|g|kg|Stk\.?|St\.?)(?=$|\s|\))/g, '$1\u00A0$2');

  /** "3,50" · "3.5" · "1.234,50" · "-2" → Cent (Ganzzahl) oder NaN */
  function parseMoney(input) {
    if (input == null) return NaN;
    let s = String(input).trim().replace(/[\s€]/g, '').replace(/^−/, '-');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    if (!/^-?\d*(\.\d*)?$/.test(s) || s === '-' || s === '.') return NaN;
    const v = Number(s);
    return Number.isFinite(v) ? Math.round(v * 100) : NaN;
  }

  let FRAMED = false;
  try { FRAMED = window.self !== window.top; } catch (e) { FRAMED = true; }
  const HAS_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');

  // ================================================================
  // Konstanten
  // ================================================================
  const STORAGE_KEY = 'thekenkasse.v1';
  const COLORS = ['amber', 'gold', 'orange', 'red', 'rose', 'violet', 'blue', 'teal', 'green', 'slate'];
  const COLOR_NAMES = { amber: 'Bernstein', gold: 'Gold', orange: 'Orange', red: 'Rot', rose: 'Rosé', violet: 'Violett', blue: 'Blau', teal: 'Petrol', green: 'Grün', slate: 'Grau' };
  const NOTES = [500, 1000, 2000, 5000, 10000];
  const COINS = [200, 100, 50, 20, 10];
  const CHANGE_DENOMS = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
  const VIEWS = ['kasse', 'deckel', 'abrechnung', 'sortiment'];

  const ICON = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    backspace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M21 5H9l-6 7 6 7h12z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg>',
    coaster: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 8.5v7M12 8.5v7M15 8.5v7"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  // ================================================================
  // Zustand & Speicherung
  // ================================================================
  function newSession(float) {
    return { id: uid(), startedAt: Date.now(), float: float || 0, counted: null, counter: 0, events: [] };
  }

  function defaultState() {
    const p = (name, euro, cat, color) => ({ id: uid(), name, price: Math.round(euro * 100), cat, color, active: true });
    return {
      v: 1,
      categories: [{ id: 'getraenke', name: 'Getränke' }, { id: 'essen', name: 'Essen' }],
      products: [
        p('Bier 0,5 l', 3.5, 'getraenke', 'amber'),
        p('Radler 0,5 l', 3.5, 'getraenke', 'gold'),
        p('Weizen 0,5 l', 4, 'getraenke', 'orange'),
        p('Wein 0,2 l', 4, 'getraenke', 'red'),
        p('Weinschorle 0,4 l', 3.5, 'getraenke', 'rose'),
        p('Sekt 0,1 l', 3, 'getraenke', 'violet'),
        p('Cola 0,33 l', 2.5, 'getraenke', 'slate'),
        p('Spezi 0,33 l', 2.5, 'getraenke', 'orange'),
        p('Apfelschorle 0,5 l', 2.5, 'getraenke', 'green'),
        p('Wasser 0,5 l', 2, 'getraenke', 'blue'),
        p('Kaffee', 2, 'getraenke', 'slate'),
        p('Bratwurst im Brötchen', 3.5, 'essen', 'red'),
        p('Pommes', 3, 'essen', 'gold'),
        p('Brezel', 2, 'essen', 'amber'),
        p('Kuchen', 2.5, 'essen', 'rose')
      ],
      settings: { tileSize: 'm', theme: 'auto', wakeLock: false },
      cart: [],
      tabs: [],
      session: newSession(0),
      history: [],
      meta: { deviceId: uid(), created: Date.now(), updated: Date.now(), sampleHint: true, edited: false }
    };
  }

  function migrate(s) {
    const d = defaultState();
    if (!s || typeof s !== 'object' || !Array.isArray(s.products)) return d;
    s.categories = Array.isArray(s.categories) && s.categories.length ? s.categories : d.categories;
    s.settings = Object.assign({}, d.settings, s.settings || {});
    s.cart = Array.isArray(s.cart) ? s.cart.filter((l) => l && l.pid && l.qty > 0) : [];
    s.tabs = Array.isArray(s.tabs) ? s.tabs : [];
    s.tabs.forEach((t) => { t.entries = Array.isArray(t.entries) ? t.entries : []; t.status = t.status || 'open'; });
    s.session = s.session && Array.isArray(s.session.events) ? s.session : newSession(0);
    s.history = Array.isArray(s.history) ? s.history : [];
    s.meta = Object.assign({}, d.meta, s.meta || {});
    s.products.forEach((p) => { if (!COLORS.includes(p.color)) p.color = 'slate'; if (typeof p.active !== 'boolean') p.active = true; });
    s.v = 1;
    return s;
  }

  let storageOk = true;
  let restoredFromStorage = false;
  const IS_LOCAL_FILE = location.protocol === 'file:';
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { restoredFromStorage = true; return migrate(JSON.parse(raw)); }
    } catch (e) { storageOk = false; }
    return defaultState();
  }

  let state = load();
  const ui = { view: 'kasse', cat: 'all', orderOpen: false, reportId: null, journalAll: false };

  function save() {
    state.meta.updated = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (!storageOk) { storageOk = true; }
    } catch (e) {
      if (storageOk) toast('Speichern auf diesem Gerät nicht möglich. Bitte eine Sicherung exportieren.', { error: true, ms: 8000 });
      storageOk = false;
    }
    Cloud.schedule();
  }

  const isTouched = () => state.session.events.length > 0 || state.tabs.length > 0 || state.history.length > 0 || state.meta.edited;

  // ================================================================
  // Fachlogik
  // ================================================================
  const prod = (id) => state.products.find((p) => p.id === id);
  const catName = (id, names) => (names && names[id]) || (state.categories.find((c) => c.id === id) || {}).name || 'Sonstiges';
  const tabById = (id) => state.tabs.find((t) => t.id === id);
  const tabTotal = (t) => sum(t.entries, (e) => e.total);
  const tabItemCount = (t) => sum(t.entries, (e) => sum(e.items, (i) => i.qty));
  const openTabs = () => state.tabs.filter((t) => t.status === 'open');
  const itemsTotal = (items) => sum(items, (i) => i.price * i.qty);
  const itemsCount = (items) => sum(items, (i) => i.qty);
  const itemsText = (items) => items.map((i) => `${i.qty}× ${i.name}`).join(', ');

  function cartItems() {
    const items = [];
    for (const l of state.cart) {
      const p = prod(l.pid);
      if (p && l.qty > 0) items.push({ pid: p.id, name: p.name, cat: p.cat, price: p.price, qty: l.qty });
    }
    return items;
  }

  function cartChange(pid, delta) {
    const line = state.cart.find((l) => l.pid === pid);
    if (line) {
      line.qty += delta;
      if (line.qty <= 0) state.cart = state.cart.filter((l) => l !== line);
    } else if (delta > 0) {
      state.cart.push({ pid, qty: delta });
    }
    if (!state.cart.length) ui.orderOpen = false;
    save();
    updateBadges(delta > 0 ? pid : null);
    renderOrder();
  }

  function setCartFromItems(items) {
    for (const i of items) {
      if (!prod(i.pid)) continue;
      const line = state.cart.find((l) => l.pid === i.pid);
      if (line) line.qty += i.qty; else state.cart.push({ pid: i.pid, qty: i.qty });
    }
  }

  function addEvent(ev) {
    ev.id = uid();
    ev.ts = Date.now();
    ev.no = ++state.session.counter;
    state.session.events.push(ev);
    return ev;
  }

  function bookCash(given, change) {
    const items = cartItems();
    if (!items.length) return;
    const total = itemsTotal(items);
    const ev = addEvent({ kind: 'cash', items, total, given, change });
    state.cart = [];
    ui.orderOpen = false;
    save();
    renderKasse();
    renderNav();
    const msg = total < 0
      ? `Ausgezahlt: <strong>${fmt(-total)}</strong>`
      : change > 0 ? `Bezahlt · Rückgeld <strong>${fmt(change)}</strong>` : `Bezahlt · <strong>${fmt(total)}</strong> passend`;
    toast(msg, { html: true, action: 'Rückgängig', onAction: () => undoEvent(ev.id, true) });
  }

  function createTab(name) {
    const t = { id: uid(), name: name.trim().slice(0, 40), created: Date.now(), updated: Date.now(), status: 'open', entries: [] };
    state.tabs.push(t);
    return t;
  }

  function bookTab(tab) {
    const items = cartItems();
    if (!items.length || !tab || tab.status !== 'open') return;
    const total = itemsTotal(items);
    const ev = addEvent({ kind: 'tab', tabId: tab.id, tabName: tab.name, items, total });
    tab.entries.push({ eventId: ev.id, sessionId: state.session.id, ts: ev.ts, items, total });
    tab.updated = ev.ts;
    state.cart = [];
    ui.orderOpen = false;
    save();
    renderKasse();
    renderNav();
    toast(`Auf Deckel „${esc(tab.name)}“ · <strong>${fmt(total)}</strong> · gesamt ${fmt(tabTotal(tab))}`, { html: true, action: 'Rückgängig', onAction: () => undoEvent(ev.id, true) });
  }

  function payTab(tab, given, change) {
    if (!tab || tab.status !== 'open') return;
    const total = tabTotal(tab);
    const ev = addEvent({ kind: 'tabpay', tabId: tab.id, tabName: tab.name, total, given, change, entries: tab.entries.length });
    tab.status = 'paid';
    tab.paidAt = ev.ts;
    tab.paymentEventId = ev.id;
    tab.given = given;
    tab.change = change;
    save();
    renderAfterChange();
    const msg = change > 0 ? `Deckel „${esc(tab.name)}“ bezahlt · Rückgeld <strong>${fmt(change)}</strong>` : `Deckel „${esc(tab.name)}“ bezahlt · <strong>${fmt(total)}</strong>`;
    toast(msg, { html: true, action: 'Rückgängig', onAction: () => undoEvent(ev.id, false) });
  }

  /** Macht eine Buchung vollständig rückgängig (direkt nach dem Buchen). */
  function undoEvent(evId, restoreCart) {
    const evs = state.session.events;
    const idx = evs.findIndex((e) => e.id === evId);
    if (idx < 0) return;
    const ev = evs[idx];
    if (ev.kind === 'tab') {
      const tab = tabById(ev.tabId);
      if (tab) {
        if (tab.status !== 'open') { toast('Der Deckel wurde inzwischen bezahlt. Bitte über Abrechnung stornieren.', { error: true }); return; }
        tab.entries = tab.entries.filter((en) => en.eventId !== ev.id);
      }
    }
    if (ev.kind === 'tabpay') reopenTab(ev.tabId);
    evs.splice(idx, 1);
    if (ev.no === state.session.counter) state.session.counter--;
    if (restoreCart && ev.items) setCartFromItems(ev.items);
    save();
    renderAfterChange();
    toast('Buchung rückgängig gemacht');
  }

  function reopenTab(tabId) {
    const tab = tabById(tabId);
    if (!tab) return;
    tab.status = 'open';
    delete tab.paidAt; delete tab.paymentEventId; delete tab.given; delete tab.change;
  }

  /** Storniert eine Buchung der laufenden Abrechnung (bleibt sichtbar, zählt nicht mehr). */
  function voidEvent(evId) {
    const ev = state.session.events.find((e) => e.id === evId);
    if (!ev || ev.voided) return false;
    if (ev.kind === 'tab') {
      const tab = tabById(ev.tabId);
      if (tab && tab.status !== 'open') { toast('Dieser Deckel ist bereits bezahlt. Storniere zuerst die Deckel-Zahlung.', { error: true, ms: 6000 }); return false; }
      if (tab) tab.entries = tab.entries.filter((en) => en.eventId !== ev.id);
    }
    if (ev.kind === 'tabpay') {
      const tab = tabById(ev.tabId);
      if (!tab) { toast('Der zugehörige Deckel existiert nicht mehr.', { error: true }); return false; }
      reopenTab(ev.tabId);
    }
    ev.voided = Date.now();
    save();
    renderAfterChange();
    toast(`Beleg #${ev.no} storniert`);
    return true;
  }

  function voidTabEntry(tab, eventId) {
    const entry = tab.entries.find((en) => en.eventId === eventId);
    if (!entry) return false;
    if (entry.sessionId !== state.session.id) {
      toast('Dieser Eintrag stammt aus einer abgeschlossenen Abrechnung und kann nicht mehr storniert werden.', { error: true, ms: 6000 });
      return false;
    }
    return voidEvent(eventId);
  }

  function deleteTab(tab) {
    const foreign = tab.entries.filter((en) => en.sessionId !== state.session.id);
    if (foreign.length) { toast('Der Deckel enthält Einträge aus einer früheren Abrechnung. Bitte kassieren.', { error: true, ms: 6000 }); return false; }
    for (const en of tab.entries.slice()) {
      const ev = state.session.events.find((e) => e.id === en.eventId);
      if (ev && !ev.voided) ev.voided = Date.now();
    }
    state.tabs = state.tabs.filter((t) => t !== tab);
    save();
    renderAfterChange();
    toast(`Deckel „${esc(tab.name)}“ gelöscht`, { html: true });
    return true;
  }

  function closeSession(newFloat) {
    const s = state.session;
    const open = openTabs();
    s.closedAt = Date.now();
    s.catNames = Object.fromEntries(state.categories.map((c) => [c.id, c.name]));
    s.openTabsAtClose = { count: open.length, total: sum(open, tabTotal) };
    state.history.unshift(s);
    state.tabs = state.tabs.filter((t) => t.status === 'open');
    state.session = newSession(newFloat);
    ui.reportId = null;
    ui.journalAll = false;
    save();
    Cloud.pushHistory(s);
    renderAfterChange();
  }

  // ================================================================
  // Auswertung
  // ================================================================
  function computeReport(session) {
    const live = session.events.filter((e) => !e.voided);
    const voided = session.events.filter((e) => e.voided);
    const r = {
      cashSales: 0, tabCharges: 0, tabPayments: 0,
      cashCount: 0, tabCount: 0, tabPayCount: 0,
      voidCount: voided.length,
      voidSum: sum(voided, (e) => (e.kind === 'tabpay' ? 0 : e.total)),
      products: new Map(), itemCount: 0
    };
    for (const e of live) {
      if (e.kind === 'cash') { r.cashSales += e.total; r.cashCount++; }
      else if (e.kind === 'tab') { r.tabCharges += e.total; r.tabCount++; }
      else if (e.kind === 'tabpay') { r.tabPayments += e.total; r.tabPayCount++; }
      if (e.kind === 'cash' || e.kind === 'tab') {
        for (const i of e.items) {
          const key = (i.pid || '') + '|' + i.name + '|' + i.price;
          let row = r.products.get(key);
          if (!row) { row = { name: i.name, cat: i.cat, price: i.price, qty: 0, revenue: 0, cashQty: 0, tabQty: 0 }; r.products.set(key, row); }
          row.qty += i.qty;
          row.revenue += i.qty * i.price;
          if (e.kind === 'cash') row.cashQty += i.qty; else row.tabQty += i.qty;
          r.itemCount += i.qty;
        }
      }
    }
    r.sales = r.cashSales + r.tabCharges;
    r.cashIn = r.cashSales + r.tabPayments;
    r.expected = (session.float || 0) + r.cashIn;
    r.receipts = live.length;

    // nach Kategorie gruppieren, Reihenfolge wie im Sortiment
    const names = session.catNames || null;
    const order = state.categories.map((c) => c.id);
    const groups = new Map();
    for (const row of r.products.values()) {
      if (!groups.has(row.cat)) groups.set(row.cat, []);
      groups.get(row.cat).push(row);
    }
    const prodOrder = (row) => { const i = state.products.findIndex((p) => p.name === row.name); return i < 0 ? 9999 : i; };
    r.groups = Array.from(groups.entries())
      .sort((a, b) => ((order.indexOf(a[0]) + 1) || 999) - ((order.indexOf(b[0]) + 1) || 999))
      .map(([cat, rows]) => ({ cat, name: catName(cat, names), rows: rows.sort((a, b) => prodOrder(a) - prodOrder(b) || b.qty - a.qty), qty: sum(rows, (x) => x.qty), revenue: sum(rows, (x) => x.revenue) }));
    r.maxQty = Math.max(1, ...Array.from(r.products.values()).map((x) => x.qty));
    return r;
  }

  function csvField(v) {
    const s = String(v == null ? '' : v);
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function buildCsv(session) {
    const r = computeReport(session);
    const rows = [];
    const add = (...cols) => rows.push(cols.map(csvField).join(';'));
    const end = session.closedAt || Date.now();
    add('Thekenkasse – Abrechnung');
    add('Beginn', fDateTime(session.startedAt));
    add(session.closedAt ? 'Abgeschlossen' : 'Stand', fDateTime(end));
    add('');
    add('Zusammenfassung', 'Betrag (EUR)');
    add('Umsatz gesamt', fmtPlain(r.sales));
    add('davon bar bezahlt', fmtPlain(r.cashSales));
    add('davon auf Deckel geschrieben', fmtPlain(r.tabCharges));
    add('Deckel kassiert (bar)', fmtPlain(r.tabPayments));
    add('Bareinnahmen gesamt', fmtPlain(r.cashIn));
    add('Anfangsbestand Kasse', fmtPlain(session.float || 0));
    add('Kassenbestand Soll', fmtPlain(r.expected));
    if (session.counted != null) {
      add('Kassenbestand gezählt', fmtPlain(session.counted));
      add('Differenz', fmtPlain(session.counted - r.expected));
    }
    if (session.openTabsAtClose) add('Offene Deckel bei Abschluss', fmtPlain(session.openTabsAtClose.total), `${session.openTabsAtClose.count} Deckel`);
    add('Stornierte Belege', r.voidCount);
    add('');
    add('Artikel', 'Kategorie', 'Einzelpreis', 'Menge', 'davon bar', 'davon Deckel', 'Umsatz');
    for (const g of r.groups) for (const row of g.rows) add(row.name, g.name, fmtPlain(row.price), row.qty, row.cashQty, row.tabQty, fmtPlain(row.revenue));
    add('Summe', '', '', r.itemCount, '', '', fmtPlain(r.sales));
    add('');
    add('Beleg', 'Zeit', 'Art', 'Deckel', 'Artikel', 'Menge', 'Einzelpreis', 'Betrag', 'Gegeben', 'Rückgeld', 'Status');
    const kindName = { cash: 'Bar', tab: 'Deckel', tabpay: 'Deckel kassiert' };
    for (const e of session.events) {
      const status = e.voided ? 'storniert' : '';
      const base = [e.no, fTime(e.ts), kindName[e.kind] || e.kind, e.tabName || ''];
      if (e.kind === 'tabpay') {
        add(...base, '', '', '', fmtPlain(e.total), fmtPlain(e.given), fmtPlain(e.change), status);
      } else {
        e.items.forEach((i, n) => {
          add(...base, i.name, i.qty, fmtPlain(i.price), fmtPlain(i.qty * i.price), n === 0 && e.kind === 'cash' ? fmtPlain(e.given) : '', n === 0 && e.kind === 'cash' ? fmtPlain(e.change) : '', status);
        });
      }
    }
    return '﻿' + rows.join('\r\n') + '\r\n';
  }

  function changeBreakdown(cents) {
    const out = [];
    let rest = cents;
    for (const d of CHANGE_DENOMS) {
      const n = Math.floor(rest / d);
      if (n > 0) { out.push([n, d]); rest -= n * d; }
    }
    return out;
  }

  // ================================================================
  // UI-Grundbausteine: Dialoge, Hinweise, Bestätigen
  // ================================================================
  const modals = [];
  let modalSeq = 0;

  function openModal({ title, subtitle = '', body, foot = '', wide = false, full = false, closeOnBackdrop = true, onClose }) {
    const back = document.createElement('div');
    const id = 'mt' + (++modalSeq);
    back.className = 'modal-backdrop' + (full ? ' full' : '');
    back.innerHTML = `<div class="modal${wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="modal-head"><div><h2 id="${id}">${title}</h2>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}</div>
      <button class="icon-btn" data-action="modal-close" aria-label="Schließen">${ICON.close}</button></div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
    back.addEventListener('click', (e) => { if (e.target === back && closeOnBackdrop) closeModal(); });
    $('#modalRoot').appendChild(back);
    modals.push({ el: back, onClose });
    return back.querySelector('.modal');
  }

  function closeModal() {
    const m = modals.pop();
    if (!m) return;
    m.el.remove();
    if (m.onClose) m.onClose();
  }

  function confirmDialog({ title, text = '', ok = 'OK', danger = false }) {
    return new Promise((resolve) => {
      let done = false;
      const m = openModal({
        title: esc(title),
        body: text ? `<p>${text}</p>` : '',
        foot: `<button class="btn btn-outline" data-m="no">Abbrechen</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-m="yes">${esc(ok)}</button>`,
        onClose: () => { if (!done) resolve(false); }
      });
      m.addEventListener('click', (e) => {
        const b = e.target.closest('[data-m]');
        if (!b) return;
        done = true;
        closeModal();
        resolve(b.dataset.m === 'yes');
      });
    });
  }

  function toast(message, opts = {}) {
    const root = $('#toastRoot');
    const el = document.createElement('div');
    el.className = 'toast' + (opts.error ? ' is-error' : '');
    el.setAttribute('role', opts.error ? 'alert' : 'status');
    el.innerHTML = `<p>${opts.html ? message : esc(message)}</p>${opts.action ? `<button type="button">${esc(opts.action)}</button>` : ''}`;
    const remove = () => { if (el.isConnected) el.remove(); };
    if (opts.action) el.querySelector('button').addEventListener('click', () => { remove(); opts.onAction && opts.onAction(); });
    root.prepend(el);
    while (root.children.length > 2) root.lastElementChild.remove();
    setTimeout(remove, opts.ms || (opts.action ? 6000 : 3200));
  }

  /** Zweistufige Bestätigung direkt am Knopf: erster Tipp „Sicher?“, zweiter Tipp führt aus. */
  function armed(el) {
    if (!el.hasAttribute('data-arm')) return true;
    if (el.dataset.armed) return true;
    el.dataset.armed = '1';
    el._label = el.innerHTML;
    el.innerHTML = esc(el.dataset.arm || 'Sicher?');
    clearTimeout(el._armTimer);
    el._armTimer = setTimeout(() => {
      if (el.isConnected) { delete el.dataset.armed; el.innerHTML = el._label; }
    }, 3000);
    return false;
  }

  // ================================================================
  // Geld-Grafiken (stilisiert)
  // ================================================================
  const NOTE_COLORS = { 500: ['#7F8F86', '#B4C2BA'], 1000: ['#C04E47', '#E9A49D'], 2000: ['#3A66A8', '#93B3E0'], 5000: ['#D27A22', '#F3BE83'], 10000: ['#3B8A55', '#93CFA5'] };
  function noteSvg(c) {
    const [a, b] = NOTE_COLORS[c];
    return `<svg viewBox="0 0 120 64" aria-hidden="true"><rect x="1" y="1" width="118" height="62" rx="6" fill="${a}"/>
      <rect x="5.5" y="5.5" width="109" height="53" rx="3" fill="none" stroke="${b}" stroke-width="1.4"/>
      <circle cx="90" cy="32" r="17" fill="${b}" opacity=".5"/><path d="M77 44 Q90 12 103 44" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>
      <text x="12" y="39" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" fill="#fff">${c / 100}</text>
      <text x="13" y="52" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="700" letter-spacing="1.6" fill="#fff" opacity=".9">EURO</text></svg>`;
  }
  function coinSvg(c) {
    const gold = '#D6A93C', goldDark = '#A97D1E', silver = '#CDD1D6', silverDark = '#959BA3';
    const bi = c >= 100;
    const outer = c === 200 ? silver : gold;
    const outerDark = c === 200 ? silverDark : goldDark;
    const inner = c === 200 ? gold : c === 100 ? silver : gold;
    const label = c >= 100 ? c / 100 : c;
    const unit = c >= 100 ? 'EURO' : 'CENT';
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30.5" fill="${outer}" stroke="${outerDark}" stroke-width="1.5"/>
      ${bi ? `<circle cx="32" cy="32" r="21" fill="${inner}" stroke="${outerDark}" stroke-opacity=".5"/>` : `<circle cx="32" cy="32" r="25" fill="none" stroke="${outerDark}" stroke-opacity=".45" stroke-dasharray="1.5 2.5"/>`}
      <text x="32" y="${c >= 100 ? 38 : 37}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${c >= 100 ? 21 : 19}" font-weight="700" fill="#3A2A06">${label}</text>
      <text x="32" y="48" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="6.5" font-weight="700" letter-spacing="1" fill="#3A2A06" opacity=".8">${unit}</text></svg>`;
  }

  // ================================================================
  // Navigation
  // ================================================================
  function show(view) {
    if (!VIEWS.includes(view)) view = 'kasse';
    ui.view = view;
    for (const s of $$('.view')) {
      const on = s.dataset.name === view;
      s.hidden = !on;
      s.classList.toggle('is-active', on);
    }
    for (const a of $$('[data-nav]')) a.setAttribute('aria-current', a.dataset.nav === view ? 'page' : 'false');
    renderView(view);
  }

  function routeFromHash() {
    const v = (location.hash || '').replace('#', '');
    show(VIEWS.includes(v) ? v : 'kasse');
  }

  function go(view) {
    show(view);
    try { if (location.hash !== '#' + view) location.hash = view; } catch (e) { /* ohne Hash-Navigation */ }
  }

  function renderNav() {
    const n = openTabs().length;
    const b = $('#navTabBadge');
    b.hidden = n === 0;
    b.textContent = n;
  }

  function renderView(v) {
    renderNav();
    if (v === 'kasse') renderKasse();
    else if (v === 'deckel') renderDeckel();
    else if (v === 'abrechnung') renderReport();
    else if (v === 'sortiment') renderSortiment();
  }

  function renderAfterChange() { renderView(ui.view); }

  // ================================================================
  // Ansicht: Kasse
  // ================================================================
  function groupedProducts(onlyActive) {
    const groups = state.categories.map((c) => ({ cat: c, items: state.products.filter((p) => p.cat === c.id && (!onlyActive || p.active)) }));
    const known = new Set(state.categories.map((c) => c.id));
    const orphans = state.products.filter((p) => !known.has(p.cat) && (!onlyActive || p.active));
    if (orphans.length) groups.push({ cat: { id: '__other', name: 'Sonstiges' }, items: orphans });
    return groups;
  }

  function renderKasse() {
    const groups = groupedProducts(true).filter((g) => g.items.length);
    if (ui.cat !== 'all' && !groups.some((g) => g.cat.id === ui.cat)) ui.cat = 'all';

    const chips = $('#catChips');
    chips.hidden = groups.length < 2;
    chips.innerHTML = [`<button class="chip" data-action="cat" data-id="all" aria-pressed="${ui.cat === 'all'}">Alle</button>`]
      .concat(groups.map((g) => `<button class="chip" data-action="cat" data-id="${esc(g.cat.id)}" aria-pressed="${ui.cat === g.cat.id}">${esc(g.cat.name)}</button>`))
      .join('');

    $('#sampleHint').innerHTML = state.meta.sampleHint
      ? `<div class="hint"><p>Das ist ein Beispiel-Sortiment. Passe Artikel und Preise unter <strong>Sortiment</strong> an.${IS_LOCAL_FILE && !restoredFromStorage ? ' Tipp: Schließe die App einmal und öffne sie neu. Unter Sortiment → Daten siehst du dann, ob deine Daten erhalten bleiben.' : ''}</p>
         <button class="btn btn-sm btn-outline" data-action="goto" data-id="sortiment">Sortiment</button>
         <button class="icon-btn" data-action="dismiss-hint" aria-label="Hinweis ausblenden">${ICON.close}</button></div>`
      : '';

    const shown = ui.cat === 'all' ? groups : groups.filter((g) => g.cat.id === ui.cat);
    const titles = shown.length > 1;
    let html = '';
    for (const g of shown) {
      if (titles) html += `<h3 class="grid-title">${esc(g.cat.name)}</h3>`;
      for (const p of g.items) {
        html += `<button class="tile tc-${p.color}" data-action="add" data-id="${p.id}" aria-label="${esc(p.name)}, ${fmt(p.price)}">
          <span class="tile-name">${nb(p.name)}</span><span class="tile-price">${fmt(p.price)}</span><span class="tile-qty" hidden></span></button>`;
      }
    }
    if (!html) {
      html = `<div class="empty-state" style="grid-column:1/-1"><p>Auf der Kasse sind noch keine Artikel sichtbar.</p>
        <button class="btn btn-primary" data-action="goto" data-id="sortiment">Sortiment einrichten</button></div>`;
    }
    $('#productGrid').innerHTML = html;
    updateBadges();
    renderOrder();
  }

  function updateBadges(popId) {
    const q = {};
    for (const l of state.cart) q[l.pid] = l.qty;
    for (const el of $$('#productGrid .tile')) {
      const n = q[el.dataset.id] || 0;
      const b = el.querySelector('.tile-qty');
      b.hidden = !n;
      b.textContent = n;
      el.classList.toggle('in-cart', n > 0);
      if (popId && el.dataset.id === popId) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    }
  }

  function renderOrder() {
    const el = $('#orderPanel');
    const items = cartItems();
    const total = itemsTotal(items);
    const count = itemsCount(items);
    el.classList.toggle('is-empty', items.length === 0);
    el.classList.toggle('is-open', ui.orderOpen && items.length > 0);
    const lines = items.map((i) => `<li class="line">
        <div class="line-info"><span class="line-name">${esc(i.name)}</span><span class="line-unit">${fmt(i.price)}</span></div>
        <div class="stepper"><button data-action="dec" data-id="${i.pid}" aria-label="${esc(i.name)} entfernen">−</button><span class="stepper-n">${i.qty}</span><button data-action="inc" data-id="${i.pid}" aria-label="${esc(i.name)} hinzufügen">+</button></div>
        <span class="line-sum">${fmt(i.price * i.qty)}</span></li>`).join('');
    el.innerHTML = `
      <div class="order-head">
        <button class="order-toggle" data-action="toggle-order" aria-expanded="${ui.orderOpen}">
          <span class="order-title">Bestellung</span>
          <span class="order-count">${count ? plural(count, 'Artikel', 'Artikel') : 'leer'}</span>${count ? ICON.chevron : ''}
        </button>
        <button class="link-btn" data-action="clear-cart" ${items.length ? '' : 'disabled'}>Leeren</button>
      </div>
      <ul class="order-lines">${lines}</ul>
      <p class="order-empty">Tippe auf eine Kachel, um sie zur Bestellung hinzuzufügen.</p>
      <div class="order-foot">
        <div class="order-total"><span>Summe</span><output class="tabular">${fmt(total)}</output></div>
        <div class="order-actions">
          <button class="btn btn-coaster" data-action="to-tab" ${items.length ? '' : 'disabled'}>${ICON.coaster}Auf Deckel</button>
          <button class="btn btn-primary" data-action="pay-cash" ${items.length ? '' : 'disabled'}>${ICON.cash}Bar kassieren</button>
        </div>
      </div>`;
  }

  // ================================================================
  // Dialog: Barzahlung mit Rückgeld
  // ================================================================
  function openPayment({ title, subtitle, total, onConfirm }) {
    const pay = { parts: [], str: '' };
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back'];
    const m = openModal({
      title, subtitle, wide: true, full: true, closeOnBackdrop: false,
      body: `<div class="pay">
        <div class="pay-summary">
          <div class="pay-figure"><span class="label">Zu zahlen</span><span class="value">${fmt(total)}</span></div>
          <div class="pay-figure pay-given"><span class="label">Gegeben</span><span class="value" data-k="given">–</span><span class="sub" data-k="given-sub"></span>
            <button class="icon-btn clear" data-m="clear" aria-label="Eingabe löschen">${ICON.close}</button></div>
          <div class="pay-figure pay-change" data-k="change-box"><span class="label" data-k="change-label">Rückgeld</span><span class="value" data-k="change">–</span><div class="sub denoms" data-k="denoms"></div></div>
        </div>
        <div class="pay-input">
          <div class="money-row" role="group" aria-label="Geldscheine">${NOTES.map((c) => `<button class="money-btn note" data-m="money" data-v="${c}" aria-label="${fmtDenom(c)}-Schein">${noteSvg(c)}<span class="count" hidden></span></button>`).join('')}</div>
          <div class="money-row" role="group" aria-label="Münzen">${COINS.map((c) => `<button class="money-btn coin" data-m="money" data-v="${c}" aria-label="${fmtDenom(c)}-Münze">${coinSvg(c)}<span class="count" hidden></span></button>`).join('')}</div>
          <div class="keypad" role="group" aria-label="Betrag eintippen">${keys.map((k) => k === 'back'
            ? `<button class="key" data-m="key" data-v="back" aria-label="Letzte Eingabe löschen">${ICON.backspace}</button>`
            : `<button class="key" data-m="key" data-v="${k}">${k}</button>`).join('')}</div>
        </div>
      </div>`,
      foot: `<button class="btn btn-outline btn-lg" data-action="modal-close">Abbrechen</button><button class="btn btn-primary btn-lg" style="flex:2 1 auto" data-m="confirm"></button>`,
      onClose: () => document.removeEventListener('keydown', onKey, true)
    });

    const given = () => (pay.str !== '' ? Math.max(0, parseMoney(pay.str) || 0) : sum(pay.parts, (x) => x));
    const k = (name) => m.querySelector(`[data-k="${name}"]`);
    const confirmBtn = m.querySelector('[data-m="confirm"]');

    function partsLabel() {
      const counts = new Map();
      for (const p of pay.parts) counts.set(p, (counts.get(p) || 0) + 1);
      return Array.from(counts.entries()).map(([v, n]) => {
        const label = NOTES.includes(v) || COINS.includes(v) ? fmtDenom(v) : fmt(v);
        return n > 1 ? `${n} × ${label}` : label;
      }).join(' + ');
    }

    function update() {
      const g = given();
      const entered = pay.str !== '' || pay.parts.length > 0;
      k('given').textContent = entered ? fmt(g) : '–';
      k('given-sub').textContent = pay.str !== '' ? 'eingetippt' : pay.parts.length ? partsLabel() : 'Schein antippen oder Betrag tippen';
      const box = k('change-box');
      const missing = entered && g < total;
      box.classList.toggle('is-missing', missing);
      if (!entered) {
        k('change-label').textContent = 'Rückgeld';
        k('change').textContent = '–';
        k('denoms').innerHTML = '';
      } else if (missing) {
        k('change-label').textContent = 'Es fehlen';
        k('change').textContent = fmt(total - g);
        k('denoms').innerHTML = '';
      } else {
        const ch = g - total;
        k('change-label').textContent = 'Rückgeld';
        k('change').textContent = fmt(ch);
        k('denoms').innerHTML = ch > 0 ? changeBreakdown(ch).map(([n, d]) => `<span class="denom">${n}× ${fmtDenom(d)}</span>`).join('') : '<span class="denom">passend</span>';
      }
      if (!entered) { confirmBtn.disabled = false; confirmBtn.innerHTML = `${ICON.check}Passend erhalten`; }
      else if (missing) { confirmBtn.disabled = true; confirmBtn.textContent = `Es fehlen ${fmt(total - g)}`; }
      else { confirmBtn.disabled = false; confirmBtn.innerHTML = `${ICON.check}Bezahlt${g - total > 0 ? ` · ${fmt(g - total)} zurück` : ''}`; }
      const counts = {};
      for (const p of pay.parts) counts[p] = (counts[p] || 0) + 1;
      for (const b of m.querySelectorAll('[data-m="money"]')) {
        const n = counts[b.dataset.v] || 0;
        const c = b.querySelector('.count');
        c.hidden = !n; c.textContent = n;
      }
    }

    function press(v) {
      if (v === 'back') {
        if (pay.str !== '') pay.str = pay.str.slice(0, -1);
        else pay.parts.pop();
      } else if (v === ',') {
        if (pay.parts.length) pay.parts = [];
        if (!pay.str.includes(',')) pay.str = (pay.str || '0') + ',';
      } else {
        if (pay.parts.length) pay.parts = [];
        const [int, dec] = pay.str.split(',');
        if (dec !== undefined && dec.length >= 2) return update();
        if (dec === undefined && int.replace(/^0+/, '').length >= 5) return update();
        pay.str = pay.str === '0' ? v : pay.str + v;
      }
      update();
    }

    function money(v) {
      if (pay.str !== '') { const cur = parseMoney(pay.str); pay.parts = cur > 0 ? [cur] : []; pay.str = ''; }
      pay.parts.push(v);
      update();
    }

    function confirm() {
      if (confirmBtn.disabled) return;
      const entered = pay.str !== '' || pay.parts.length > 0;
      const g = entered ? given() : total;
      closeModal();
      onConfirm(g, g - total);
    }

    function onKey(e) {
      if (modals.length === 0 || modals[modals.length - 1].el !== m.parentElement) return;
      if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === ',' || e.key === '.') { press(','); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('back'); e.preventDefault(); }
      else if (e.key === 'Enter') { confirm(); e.preventDefault(); }
    }
    document.addEventListener('keydown', onKey, true);

    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      const a = b.dataset.m;
      if (a === 'money') money(Number(b.dataset.v));
      else if (a === 'key') press(b.dataset.v);
      else if (a === 'clear') { pay.parts = []; pay.str = ''; update(); }
      else if (a === 'confirm') confirm();
    });
    update();
  }

  function startCashPayment() {
    const items = cartItems();
    if (!items.length) return;
    const total = itemsTotal(items);
    if (total <= 0) { bookCash(0, -total); return; }
    openPayment({
      title: 'Barzahlung',
      subtitle: `${plural(itemsCount(items), 'Artikel', 'Artikel')} · ${esc(itemsText(items))}`,
      total,
      onConfirm: (given, change) => bookCash(given, change)
    });
  }

  // ================================================================
  // Dialog: Auf Deckel schreiben
  // ================================================================
  function openTabPicker() {
    const items = cartItems();
    if (!items.length) return;
    const total = itemsTotal(items);
    const tabs = openTabs().sort((a, b) => (b.updated || 0) - (a.updated || 0));
    const m = openModal({
      title: 'Auf Deckel schreiben',
      subtitle: `${plural(itemsCount(items), 'Artikel', 'Artikel')} · ${fmt(total)}`,
      body: `<form class="row" data-k="form" autocomplete="off">
          <input class="input" id="tabNameInput" name="name" maxlength="40" placeholder="${tabs.length ? 'Name suchen oder neu anlegen' : 'Name für den neuen Deckel'}" enterkeyhint="done" aria-label="Name">
          <button class="btn btn-coaster" type="submit">${ICON.plus}Neuer Deckel</button>
        </form>
        <div class="picker-grid" data-k="list"></div>`
    });
    const input = m.querySelector('#tabNameInput');
    const list = m.querySelector('[data-k="list"]');
    function renderList() {
      const q = input.value.trim().toLowerCase();
      const shown = tabs.filter((t) => !q || t.name.toLowerCase().includes(q));
      list.innerHTML = shown.length
        ? shown.map((t) => `<button class="picker-btn" data-tab="${t.id}"><strong>${esc(t.name)}</strong><span>${fmt(tabTotal(t))} · ${plural(tabItemCount(t), 'Strich', 'Striche')}</span></button>`).join('')
        : `<p class="muted" style="grid-column:1/-1">${tabs.length ? 'Kein offener Deckel mit diesem Namen. Mit „Neuer Deckel“ anlegen.' : 'Noch keine offenen Deckel. Gib einen Namen ein, um den ersten anzulegen.'}</p>`;
    }
    input.addEventListener('input', renderList);
    m.querySelector('[data-k="form"]').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      const existing = openTabs().find((t) => t.name.toLowerCase() === name.toLowerCase());
      const tab = existing || createTab(name);
      closeModal();
      bookTab(tab);
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      closeModal();
      bookTab(tabById(b.dataset.tab));
    });
    renderList();
    if (!tabs.length) setTimeout(() => input.focus(), 60);
  }

  // ================================================================
  // Ansicht: Deckel
  // ================================================================
  function jitter(i) {
    const r = (k) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
    return [r(1) * 0.9, r(2) * 1.4, r(3) * 0.8];
  }

  function tallySvg(n) {
    const shown = Math.min(n, 30);
    const groups = Math.ceil(shown / 5);
    const perRow = 3;
    const rows = Math.max(1, Math.ceil(groups / perRow));
    let d = '';
    for (let g = 0; g < groups; g++) {
      const gx = (g % perRow) * 31 + 4;
      const gy = Math.floor(g / perRow) * 28 + 4;
      const inGroup = Math.min(5, shown - g * 5);
      for (let i = 0; i < Math.min(4, inGroup); i++) {
        const j = jitter(g * 5 + i);
        const x = gx + 2 + i * 5.5;
        d += `M${(x + j[0]).toFixed(1)} ${(gy + j[1]).toFixed(1)}L${(x - j[0] * 0.6 + j[2]).toFixed(1)} ${(gy + 20 - j[1]).toFixed(1)}`;
      }
      if (inGroup === 5) d += `M${gx - 2} ${gy + 16}L${gx + 23} ${gy + 4}`;
    }
    const w = Math.min(groups, perRow) * 31 + 6;
    return `<svg class="coaster-tally" viewBox="0 0 ${w} ${rows * 28 + 2}" style="width:${Math.round((w / 99) * 78)}%" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>`;
  }

  function renderDeckel() {
    const view = $('#view-deckel');
    const open = openTabs().sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const paid = state.tabs.filter((t) => t.status === 'paid').sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0));
    const coasters = open.map((t) => {
      const n = tabItemCount(t);
      return `<button class="coaster" data-action="open-tab" data-id="${t.id}" aria-label="Deckel ${esc(t.name)}, ${fmt(tabTotal(t))}">
        <span class="coaster-name">${esc(t.name)}</span>
        ${n ? tallySvg(n) : '<span class="coaster-empty">noch leer</span>'}
        ${n > 30 ? `<span class="coaster-more">+${n - 30} weitere</span>` : ''}
        <span class="coaster-total">${fmt(tabTotal(t))}</span></button>`;
    }).join('');
    view.innerHTML = `<div class="view-inner">
      <div class="view-head">
        <div><h1>Deckel</h1><p class="muted">${open.length ? `${plural(open.length, 'offener Deckel', 'offene Deckel')} · ${fmt(sum(open, tabTotal))}` : 'Keine offenen Deckel'}</p></div>
        <div class="head-actions"><button class="btn btn-coaster" data-action="new-tab">${ICON.plus}Neuer Deckel</button></div>
      </div>
      ${open.length ? `<div class="coasters">${coasters}</div>` : `<div class="empty-state"><p>Wer nicht sofort zahlt, bekommt einen Deckel: In der Kasse die Bestellung zusammenstellen und „Auf Deckel“ wählen.</p></div>`}
      ${paid.length ? `<section class="section"><div class="section-head"><h2>Bezahlt in dieser Abrechnung</h2><span class="muted">${fmt(sum(paid, tabTotal))}</span></div>
        <ul class="list card" style="padding-block:0">${paid.map((t) => `<li class="list-row"><div class="grow"><strong>${esc(t.name)}</strong><span class="meta">bezahlt ${fTime(t.paidAt)} · ${plural(t.entries.length, 'Bestellung', 'Bestellungen')}</span></div>
          <span class="amount">${fmt(tabTotal(t))}</span><button class="btn btn-sm btn-outline" data-action="open-tab" data-id="${t.id}">Ansehen</button></li>`).join('')}</ul></section>` : ''}
    </div>`;
  }

  function openNewTabDialog() {
    const m = openModal({
      title: 'Neuer Deckel',
      body: `<form data-k="form" autocomplete="off" class="field"><span>Name</span><input class="input" id="newTabName" maxlength="40" placeholder="z. B. Max oder Tisch 4" enterkeyhint="done"><p class="form-error" data-k="err"></p></form>`,
      foot: `<button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-coaster" data-m="ok">Deckel anlegen</button>`
    });
    const input = m.querySelector('#newTabName');
    const submit = () => {
      const name = input.value.trim();
      if (!name) { m.querySelector('[data-k="err"]').textContent = 'Bitte einen Namen eingeben.'; input.focus(); return; }
      if (openTabs().some((t) => t.name.toLowerCase() === name.toLowerCase())) { m.querySelector('[data-k="err"]').textContent = 'Es gibt bereits einen offenen Deckel mit diesem Namen.'; return; }
      createTab(name);
      save();
      closeModal();
      renderAfterChange();
      toast(`Deckel „${esc(name)}“ angelegt`, { html: true });
    };
    m.querySelector('[data-k="form"]').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    m.querySelector('[data-m="ok"]').addEventListener('click', submit);
    setTimeout(() => input.focus(), 60);
  }

  function openTabDetail(id) {
    const tab = tabById(id);
    if (!tab) return;
    const isOpen = tab.status === 'open';
    const total = tabTotal(tab);
    const entries = tab.entries.slice().sort((a, b) => b.ts - a.ts);
    const m = openModal({
      title: `Deckel „${esc(tab.name)}“`,
      subtitle: isOpen ? `angelegt ${fTime(tab.created)} · ${plural(tab.entries.length, 'Bestellung', 'Bestellungen')}` : `bezahlt ${fTime(tab.paidAt)}${tab.given ? ` · gegeben ${fmt(tab.given)} · Rückgeld ${fmt(tab.change || 0)}` : ''}`,
      body: `<div class="tab-total"><span>${isOpen ? 'Offener Betrag' : 'Bezahlt'}</span><strong>${fmt(total)}</strong></div>
        ${entries.length ? `<ul class="list">${entries.map((en) => `<li class="list-row">
          <div class="grow"><span>${esc(itemsText(en.items))}</span><span class="meta">${fTime(en.ts)}${en.sessionId !== state.session.id ? ' · aus früherer Abrechnung' : ''}</span></div>
          <span class="amount">${fmt(en.total)}</span>
          ${isOpen ? `<button class="btn btn-sm btn-outline" data-m="void" data-id="${en.eventId}" data-arm="Wirklich stornieren?">Storno</button>` : ''}</li>`).join('')}</ul>`
        : '<p class="muted">Noch keine Bestellungen auf diesem Deckel.</p>'}`,
      foot: isOpen
        ? `<button class="btn btn-outline" data-m="rename">Umbenennen</button><button class="btn btn-danger" data-m="delete" data-arm="${tab.entries.length ? 'Alles stornieren & löschen?' : 'Wirklich löschen?'}">Löschen</button><span class="spacer"></span>
           <button class="btn btn-primary btn-lg" data-m="pay" ${tab.entries.length ? '' : 'disabled'}>${ICON.cash}Kassieren · ${fmt(total)}</button>`
        : `<button class="btn btn-outline btn-block" data-action="modal-close">Schließen</button>`
    });
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b || !armed(b)) return;
      const a = b.dataset.m;
      if (a === 'void') {
        if (voidTabEntry(tab, b.dataset.id)) { closeModal(); openTabDetail(tab.id); }
      } else if (a === 'delete') {
        if (deleteTab(tab)) closeModal();
      } else if (a === 'rename') {
        closeModal();
        openRenameTab(tab);
      } else if (a === 'pay') {
        closeModal();
        if (total <= 0) { payTab(tab, 0, -total); return; }
        openPayment({
          title: `Deckel „${esc(tab.name)}“ kassieren`,
          subtitle: `${plural(tab.entries.length, 'Bestellung', 'Bestellungen')} · ${plural(tabItemCount(tab), 'Artikel', 'Artikel')}`,
          total,
          onConfirm: (given, change) => payTab(tab, given, change)
        });
      }
    });
  }

  function openRenameTab(tab) {
    const m = openModal({
      title: 'Deckel umbenennen',
      body: `<form data-k="form" class="field" autocomplete="off"><span>Name</span><input class="input" id="renameTab" maxlength="40" value="${esc(tab.name)}" enterkeyhint="done"></form>`,
      foot: `<button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="ok">Speichern</button>`
    });
    const input = m.querySelector('#renameTab');
    const submit = () => {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      tab.name = name.slice(0, 40);
      save();
      closeModal();
      renderAfterChange();
      openTabDetail(tab.id);
    };
    m.querySelector('[data-k="form"]').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    m.querySelector('[data-m="ok"]').addEventListener('click', submit);
  }

  // ================================================================
  // Ansicht: Abrechnung
  // ================================================================
  function renderReport() {
    const view = $('#view-abrechnung');
    const archived = ui.reportId ? state.history.find((h) => h.id === ui.reportId) : null;
    if (ui.reportId && !archived) ui.reportId = null;
    const s = archived || state.session;
    const r = computeReport(s);
    const open = openTabs();
    const openInfo = archived ? (s.openTabsAtClose || { count: 0, total: 0 }) : { count: open.length, total: sum(open, tabTotal) };
    const kindLabel = { cash: ['Bar', 'pill-cash'], tab: ['Deckel', 'pill-tab'], tabpay: ['Deckel bezahlt', 'pill-tabpay'] };

    const events = s.events.slice().reverse();
    const shownEvents = ui.journalAll ? events : events.slice(0, 40);
    const journal = shownEvents.map((e) => {
      const [label, cls] = kindLabel[e.kind] || [e.kind, ''];
      let desc = e.kind === 'tabpay' ? `Deckel „${esc(e.tabName)}“ kassiert` : esc(itemsText(e.items));
      if (e.kind === 'tab') desc = `<strong>${esc(e.tabName)}:</strong> ${desc}`;
      if ((e.kind === 'cash' || e.kind === 'tabpay') && e.given) desc += `<br><span class="muted">gegeben ${fmt(e.given)} · zurück ${fmt(e.change)}</span>`;
      return `<li class="jrow${e.voided ? ' is-void' : ''}">
        <span class="jno">#${e.no}</span><span class="jtime">${fTime(e.ts)}</span>
        <span class="pill ${e.voided ? 'pill-void' : cls}">${e.voided ? 'storniert' : label}</span>
        <span class="jdesc">${desc}</span><span class="jamt">${fmt(e.total)}</span>
        <span class="jact">${!archived && !e.voided ? `<button class="btn btn-sm btn-ghost" data-action="void" data-id="${e.id}" data-arm="Stornieren?">Storno</button>` : ''}</span></li>`;
    }).join('');

    const table = r.groups.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Artikel</th><th class="num">Preis</th><th class="num">Menge</th><th class="num">Umsatz</th></tr></thead>
        <tbody>${r.groups.map((g) => `
          <tr class="group"><th colspan="4">${esc(g.name)}</th></tr>
          ${g.rows.map((row) => `<tr><td>${esc(row.name)}${row.tabQty ? ` <span class="muted">(${row.tabQty} auf Deckel)</span>` : ''}<span class="qbar"><i style="width:${Math.round((row.qty / r.maxQty) * 100)}%"></i></span></td>
            <td class="num">${fmt(row.price)}</td><td class="num">${row.qty}</td><td class="num">${fmt(row.revenue)}</td></tr>`).join('')}
          ${r.groups.length > 1 ? `<tr class="subtotal"><td>Summe ${esc(g.name)}</td><td></td><td class="num">${g.qty}</td><td class="num">${fmt(g.revenue)}</td></tr>` : ''}`).join('')}
        </tbody>
        <tfoot><tr><td>Gesamt</td><td></td><td class="num">${r.itemCount}</td><td class="num">${fmt(r.sales)}</td></tr></tfoot>
      </table></div>` : `<div class="card empty-state"><p>Noch nichts verkauft.</p></div>`;

    const counted = s.counted;
    const diff = counted == null ? null : counted - r.expected;
    const diffHtml = diff == null ? '–' : `<span class="${diff === 0 ? '' : diff > 0 ? 'diff-pos' : 'diff-neg'}">${diff > 0 ? '+' : ''}${fmt(diff)}</span>`;

    const history = state.history.map((h) => {
      const hr = computeReport(h);
      return `<li class="list-row"><div class="grow"><strong>${fDateTime(h.startedAt)}</strong><span class="meta">bis ${fDateTime(h.closedAt)} · ${plural(hr.receipts, 'Beleg', 'Belege')}</span></div>
        <span class="amount">${fmt(hr.sales)}</span>
        <button class="btn btn-sm btn-outline" data-action="view-report" data-id="${h.id}">Ansehen</button>
        <button class="btn btn-sm btn-ghost" data-action="delete-history" data-id="${h.id}" data-arm="Löschen?">Löschen</button></li>`;
    }).join('');

    view.innerHTML = `<div class="view-inner">
      <div class="view-head">
        <div><h1>${archived ? 'Abrechnung (Archiv)' : 'Abrechnung'}</h1>
          <p class="muted">${archived ? `${fDateTime(s.startedAt)} bis ${fDateTime(s.closedAt)}` : `seit ${fDateTime(s.startedAt)}`} · ${plural(r.receipts, 'Beleg', 'Belege')}${r.voidCount ? ` · ${r.voidCount} storniert` : ''}</p></div>
        <div class="head-actions">
          <button class="btn btn-outline" data-action="export-csv">CSV exportieren</button>
          ${!FRAMED && typeof window.print === 'function' ? '<button class="btn btn-outline" data-action="print">Drucken</button>' : ''}
          ${archived ? '<button class="btn btn-primary" data-action="view-report" data-id="">Zur laufenden Abrechnung</button>'
            : `<button class="btn btn-primary" data-action="close-session" ${s.events.length ? '' : 'disabled'}>Abend abschließen</button>`}
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><span class="kpi-label">Umsatz gesamt</span><span class="kpi-value">${fmt(r.sales)}</span><span class="kpi-sub">bar ${fmt(r.cashSales)} · Deckel ${fmt(r.tabCharges)}</span></div>
        <div class="kpi kpi-accent"><span class="kpi-label">Bareinnahmen</span><span class="kpi-value">${fmt(r.cashIn)}</span><span class="kpi-sub">inkl. kassierter Deckel ${fmt(r.tabPayments)}</span></div>
        <div class="kpi kpi-coaster"><span class="kpi-label">${archived ? 'Offen bei Abschluss' : 'Offene Deckel'}</span><span class="kpi-value">${fmt(openInfo.total)}</span><span class="kpi-sub">${plural(openInfo.count, 'Deckel', 'Deckel')}</span></div>
        <div class="kpi"><span class="kpi-label">Kasse Soll</span><span class="kpi-value">${fmt(r.expected)}</span>
          <span class="kpi-sub">Anfangsbestand ${archived ? fmt(s.float || 0) : `<button class="link-btn" style="padding:0" data-action="edit-float">${fmt(s.float || 0)}</button>`}</span></div>
      </div>
      <section class="card">
        <div class="section-head"><h2>Kassensturz</h2><span class="muted">Bargeld zählen und mit dem Soll vergleichen</span></div>
        <div class="cash-count">
          ${archived ? `<div class="figure"><span class="muted">Gezählt</span><strong>${counted == null ? '–' : fmt(counted)}</strong></div>`
            : `<label class="field"><span>Gezählt</span><input class="input" id="countedInput" inputmode="decimal" placeholder="Betrag in €" value="${counted == null ? '' : fmtPlain(counted)}"></label>`}
          <div class="figure"><span class="muted">Soll</span><strong>${fmt(r.expected)}</strong></div>
          <div class="figure"><span class="muted">Differenz</span><strong data-k="diff">${diffHtml}</strong></div>
        </div>
      </section>
      <section class="section"><div class="section-head"><h2>Verkaufte Artikel</h2><span class="muted">${plural(r.itemCount, 'Artikel', 'Artikel')}</span></div>${table}</section>
      <section class="section"><div class="section-head"><h2>Belege</h2><span class="muted">neueste zuerst</span></div>
        ${events.length ? `<ul class="journal">${journal}</ul>${events.length > shownEvents.length ? `<button class="btn btn-outline" data-action="journal-all">Alle ${events.length} Belege anzeigen</button>` : ''}` : '<div class="card empty-state"><p>Noch keine Buchungen.</p></div>'}
      </section>
      ${state.history.length ? `<section class="section no-print"><div class="section-head"><h2>Frühere Abrechnungen</h2></div><ul class="list card" style="padding-block:0">${history}</ul></section>` : ''}
    </div>`;

    const ci = $('#countedInput');
    if (ci) {
      const apply = (commit) => {
        const v = ci.value.trim() === '' ? null : parseMoney(ci.value);
        if (v !== null && Number.isNaN(v)) return;
        const d = v == null ? null : v - r.expected;
        $('[data-k="diff"]', view).innerHTML = d == null ? '–' : `<span class="${d === 0 ? '' : d > 0 ? 'diff-pos' : 'diff-neg'}">${d > 0 ? '+' : ''}${fmt(d)}</span>`;
        if (commit) { state.session.counted = v; save(); }
      };
      ci.addEventListener('input', () => apply(false));
      ci.addEventListener('change', () => apply(true));
    }
  }

  function openFloatEditor() {
    const m = openModal({
      title: 'Anfangsbestand',
      subtitle: 'Wechselgeld in der Kasse zu Beginn',
      body: `<form data-k="form" class="field" autocomplete="off"><span>Betrag in €</span><input class="input" id="floatInput" inputmode="decimal" value="${state.session.float ? fmtPlain(state.session.float) : ''}" placeholder="z. B. 100"><p class="form-error" data-k="err"></p></form>`,
      foot: `<button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="ok">Speichern</button>`
    });
    const input = m.querySelector('#floatInput');
    const submit = () => {
      const v = input.value.trim() === '' ? 0 : parseMoney(input.value);
      if (Number.isNaN(v) || v < 0) { m.querySelector('[data-k="err"]').textContent = 'Bitte einen gültigen Betrag eingeben.'; return; }
      state.session.float = v;
      save();
      closeModal();
      renderAfterChange();
    };
    m.querySelector('[data-k="form"]').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    m.querySelector('[data-m="ok"]').addEventListener('click', submit);
    setTimeout(() => input.select(), 60);
  }

  function openCloseSession() {
    const r = computeReport(state.session);
    const open = openTabs();
    const m = openModal({
      title: 'Abend abschließen',
      body: `<p>Die laufende Abrechnung wird archiviert und eine neue begonnen. Du findest sie danach unter „Frühere Abrechnungen“.</p>
        <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <div class="kpi"><span class="kpi-label">Umsatz</span><span class="kpi-value">${fmt(r.sales)}</span></div>
          <div class="kpi kpi-accent"><span class="kpi-label">Kasse Soll</span><span class="kpi-value">${fmt(r.expected)}</span></div>
        </div>
        ${open.length ? `<p class="hint" style="margin:0;background:var(--coaster-soft);color:var(--coaster-ink)">${plural(open.length, 'offener Deckel', 'offene Deckel')} (${fmt(sum(open, tabTotal))}) ${open.length === 1 ? 'bleibt' : 'bleiben'} bestehen und ${open.length === 1 ? 'kann' : 'können'} später kassiert werden.</p>` : ''}
        <label class="field"><span>Anfangsbestand für die neue Abrechnung</span><input class="input" id="nextFloat" inputmode="decimal" value="${state.session.float ? fmtPlain(state.session.float) : ''}" placeholder="0,00"></label>
        <p class="field-hint">Tipp: Vorher die CSV-Datei exportieren, falls du sie weitergeben möchtest.</p>`,
      foot: `<button class="btn btn-outline" data-m="csv">CSV exportieren</button><span class="spacer"></span><button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="ok">Abschließen</button>`
    });
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'csv') exportCsv(state.session);
      if (b.dataset.m === 'ok') {
        const raw = m.querySelector('#nextFloat').value.trim();
        const v = raw === '' ? 0 : parseMoney(raw);
        closeModal();
        closeSession(Number.isNaN(v) || v < 0 ? 0 : v);
        toast('Abrechnung abgeschlossen. Eine neue Abrechnung läuft.');
      }
    });
  }

  function exportCsv(session) {
    const name = `Thekenkasse_Abrechnung_${DATE_FILE(session.startedAt)}.csv`;
    openExport('Abrechnung exportieren', name, buildCsv(session), 'text/csv');
  }

  // ================================================================
  // Ansicht: Sortiment & Einstellungen
  // ================================================================
  function renderSortiment() {
    const view = $('#view-sortiment');
    const groups = groupedProducts(false);
    const t = state.settings;
    const seg = (key, options) => `<div class="seg" role="group">${options.map(([v, l]) => `<button data-action="setting" data-key="${key}" data-id="${v}" aria-pressed="${t[key] === v}">${l}</button>`).join('')}</div>`;
    view.innerHTML = `<div class="view-inner">
      <div class="view-head">
        <div><h1>Sortiment</h1><p class="muted">${plural(state.products.length, 'Artikel', 'Artikel')} in ${plural(state.categories.length, 'Kategorie', 'Kategorien')}. Tippe auf einen Artikel, um ihn zu bearbeiten.</p></div>
        <div class="head-actions">
          <button class="btn btn-outline" data-action="new-category">${ICON.plus}Kategorie</button>
          <button class="btn btn-primary" data-action="new-product">${ICON.plus}Artikel</button>
        </div>
      </div>
      ${groups.map((g) => `<section class="sort-cat">
        <div class="sort-cat-head"><h2>${esc(g.cat.name)}</h2>
          ${g.cat.id !== '__other' ? `<button class="btn btn-sm btn-ghost" data-action="edit-category" data-id="${esc(g.cat.id)}">Bearbeiten</button>` : ''}
          <button class="btn btn-sm btn-outline" data-action="new-product" data-id="${esc(g.cat.id)}">${ICON.plus}Artikel</button></div>
        ${g.items.length ? `<ul class="sort-list">${g.items.map((p, i) => `<li class="sort-row tc-${p.color}${p.active ? '' : ' is-hidden'}">
            <button class="sort-main" data-action="edit-product" data-id="${p.id}"><span class="sort-dot"></span><span class="sort-name">${esc(p.name)}${p.active ? '' : ' <span class="muted">(ausgeblendet)</span>'}</span><span class="sort-price">${fmt(p.price)}</span></button>
            <div class="sort-move">
              <button class="icon-btn" data-action="move-product" data-id="${p.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(p.name)} nach oben">${ICON.up}</button>
              <button class="icon-btn" data-action="move-product" data-id="${p.id}" data-dir="1" ${i === g.items.length - 1 ? 'disabled' : ''} aria-label="${esc(p.name)} nach unten">${ICON.down}</button>
            </div>
            <button class="switch" role="switch" aria-checked="${p.active}" data-action="toggle-product" data-id="${p.id}" aria-label="${esc(p.name)} auf der Kasse anzeigen"></button>
          </li>`).join('')}</ul>` : '<p class="muted">Noch keine Artikel in dieser Kategorie.</p>'}
      </section>`).join('')}

      <section class="card">
        <h2>Anzeige</h2>
        <div>
          <div class="setting"><div><span class="setting-title">Kachelgröße</span><span class="setting-desc">Größere Kacheln lassen sich schneller treffen, kleinere zeigen mehr Artikel auf einmal.</span></div>
            ${seg('tileSize', [['s', 'Klein'], ['m', 'Mittel'], ['l', 'Groß']])}</div>
          <div class="setting"><div><span class="setting-title">Farbschema</span><span class="setting-desc">„Automatisch“ folgt der Einstellung des Geräts.</span></div>
            ${seg('theme', [['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']])}</div>
          <div class="setting"><div><span class="setting-title">Bildschirm anlassen</span><span class="setting-desc">Verhindert, dass sich der Bildschirm während des Thekendiensts abschaltet${'wakeLock' in navigator ? '' : ' (von diesem Browser nicht unterstützt)'}.</span></div>
            <button class="switch" role="switch" aria-checked="${t.wakeLock}" data-action="toggle-wakelock" aria-label="Bildschirm anlassen" ${'wakeLock' in navigator ? '' : 'disabled'}></button></div>
        </div>
      </section>

      <section class="card" id="dataSection"></section>
    </div>`;
    renderDataSection();
  }

  function renderDataSection() {
    const el = $('#dataSection');
    if (!el) return;
    const c = Cloud.status;
    const cloudLine = c === 'on'
      ? `<span class="cloud-dot on"></span>Automatische Sicherung in deinem Claude-Konto aktiv${Cloud.lastSaved ? ` · zuletzt ${fTime(Cloud.lastSaved)}` : ''}${Cloud.note ? ` · ${esc(Cloud.note)}` : ''}`
      : c === 'connecting' ? '<span class="cloud-dot"></span>Cloud-Sicherung wird verbunden …'
      : c === 'error' ? `<span class="cloud-dot err"></span>${esc(Cloud.note || 'Cloud-Sicherung nicht erreichbar.')}`
      : !storageOk ? '<span class="cloud-dot err"></span>Speichern ist hier nicht möglich. Die Daten gehen beim Schließen verloren.'
      : restoredFromStorage ? `<span class="cloud-dot on"></span>Daten werden auf diesem Gerät gespeichert und sind seit ${fDateTime(state.meta.created)} erhalten geblieben.`
      : '<span class="cloud-dot"></span>Daten werden auf diesem Gerät gespeichert. Schließe die App einmal und öffne sie neu: Steht hier dann „erhalten geblieben“, funktioniert die Speicherung.';
    el.innerHTML = `<h2>Daten</h2>
      <p class="cloud-line">${cloudLine}</p>
      <div class="data-actions">
        <button class="btn btn-outline" data-action="export-backup">Sicherung exportieren</button>
        <button class="btn btn-outline" data-action="import-backup">Sicherung importieren</button>
        ${c === 'on' ? '<button class="btn btn-outline" data-action="cloud-restore">Cloud-Sicherungen</button>' : ''}
        <button class="btn btn-danger" data-action="reset-all">Alles zurücksetzen</button>
      </div>
      <p class="field-hint">Die Sicherung (JSON) enthält Sortiment, Einstellungen, offene Deckel und alle Abrechnungen. So überträgst du alles auf ein anderes Gerät, z. B. vom Handy aufs iPad. Exportiere nach jedem Einsatz die Abrechnung als CSV.</p>`;
  }

  function openProductEditor(id, presetCat) {
    const existing = id ? prod(id) : null;
    const p = existing ? clone(existing) : { id: uid(), name: '', price: 0, cat: presetCat && presetCat !== '__other' ? presetCat : (state.categories[0] || {}).id, color: COLORS[state.products.length % COLORS.length], active: true };
    const m = openModal({
      title: existing ? 'Artikel bearbeiten' : 'Neuer Artikel',
      body: `<label class="field"><span>Name</span><input class="input" id="peName" maxlength="40" value="${esc(p.name)}" placeholder="z. B. Bier 0,5 l" autocomplete="off"></label>
        <label class="field"><span>Preis in €</span><input class="input" id="pePrice" inputmode="decimal" value="${existing ? fmtPlain(p.price) : ''}" placeholder="z. B. 3,50" autocomplete="off">
          <span class="field-hint">Negative Preise sind möglich, z. B. −2,00 für eine Pfandrückgabe.</span></label>
        <div class="field"><span class="field-label">Kategorie</span><div class="seg" data-k="cats">${state.categories.map((c) => `<button type="button" data-cat="${esc(c.id)}" aria-pressed="${p.cat === c.id}">${esc(c.name)}</button>`).join('')}</div></div>
        <div class="field"><span class="field-label">Farbe</span><div class="swatches" data-k="colors">${COLORS.map((c) => `<button type="button" class="swatch-btn tc-${c}" data-color="${c}" aria-pressed="${p.color === c}" aria-label="${COLOR_NAMES[c]}">Aa</button>`).join('')}</div></div>
        <div class="field"><span class="field-label">Vorschau</span><div class="pe-preview" data-k="preview"></div></div>
        <div class="setting"><div><span class="setting-title">Auf der Kasse anzeigen</span><span class="setting-desc">Ausgeblendete Artikel bleiben im Sortiment und in den Abrechnungen erhalten.</span></div>
          <button type="button" class="switch" role="switch" data-k="active" aria-checked="${p.active}" aria-label="Auf der Kasse anzeigen"></button></div>
        <p class="form-error" data-k="err"></p>`,
      foot: `${existing ? '<button class="btn btn-danger" data-m="delete" data-arm="Wirklich löschen?">Löschen</button><span class="spacer"></span>' : ''}
        <button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="save">Speichern</button>`
    });
    const nameI = m.querySelector('#peName');
    const priceI = m.querySelector('#pePrice');
    const preview = () => {
      const price = parseMoney(priceI.value);
      m.querySelector('[data-k="preview"]').innerHTML = `<div class="tile tc-${p.color}"><span class="tile-name">${nb(nameI.value || 'Artikelname')}</span><span class="tile-price">${Number.isNaN(price) ? '–' : fmt(price)}</span></div>`;
    };
    nameI.addEventListener('input', preview);
    priceI.addEventListener('input', preview);
    m.addEventListener('click', (e) => {
      const cat = e.target.closest('[data-cat]');
      if (cat) { p.cat = cat.dataset.cat; $$('[data-cat]', m).forEach((b) => b.setAttribute('aria-pressed', b === cat)); return; }
      const col = e.target.closest('[data-color]');
      if (col) { p.color = col.dataset.color; $$('[data-color]', m).forEach((b) => b.setAttribute('aria-pressed', b === col)); preview(); return; }
      const act = e.target.closest('[data-k="active"]');
      if (act) { p.active = !p.active; act.setAttribute('aria-checked', p.active); return; }
      const b = e.target.closest('[data-m]');
      if (!b || !armed(b)) return;
      if (b.dataset.m === 'delete') {
        state.products = state.products.filter((x) => x.id !== p.id);
        state.cart = state.cart.filter((l) => l.pid !== p.id);
        state.meta.edited = true; state.meta.sampleHint = false;
        save(); closeModal(); renderAfterChange();
        toast(`„${esc(p.name)}“ gelöscht`, { html: true });
      } else if (b.dataset.m === 'save') {
        const name = nameI.value.trim();
        const price = parseMoney(priceI.value);
        const err = m.querySelector('[data-k="err"]');
        if (!name) { err.textContent = 'Bitte einen Namen eingeben.'; nameI.focus(); return; }
        if (Number.isNaN(price)) { err.textContent = 'Bitte einen gültigen Preis eingeben, z. B. 3,50.'; priceI.focus(); return; }
        if (!state.categories.some((c) => c.id === p.cat)) { err.textContent = 'Bitte eine Kategorie wählen.'; return; }
        p.name = name; p.price = price;
        if (existing) Object.assign(existing, p); else state.products.push(p);
        state.meta.edited = true; state.meta.sampleHint = false;
        save(); closeModal(); renderAfterChange();
        toast(existing ? 'Artikel gespeichert' : `„${esc(name)}“ hinzugefügt`, { html: true });
      }
    });
    preview();
    if (!existing) setTimeout(() => nameI.focus(), 60);
  }

  function moveProduct(id, dir) {
    const p = prod(id);
    if (!p) return;
    const same = state.products.filter((x) => x.cat === p.cat);
    const i = same.indexOf(p);
    const other = same[i + dir];
    if (!other) return;
    const a = state.products.indexOf(p);
    const b = state.products.indexOf(other);
    state.products[a] = other;
    state.products[b] = p;
    state.meta.edited = true;
    save();
    renderAfterChange();
  }

  function openCategoryEditor(id) {
    const cat = id ? state.categories.find((c) => c.id === id) : null;
    const count = cat ? state.products.filter((p) => p.cat === cat.id).length : 0;
    const idx = cat ? state.categories.indexOf(cat) : -1;
    const m = openModal({
      title: cat ? 'Kategorie bearbeiten' : 'Neue Kategorie',
      body: `<label class="field"><span>Name</span><input class="input" id="catName" maxlength="30" value="${esc(cat ? cat.name : '')}" placeholder="z. B. Cocktails oder Snacks" autocomplete="off"></label>
        ${cat ? `<div class="setting"><div><span class="setting-title">Reihenfolge</span><span class="setting-desc">Position auf der Kasse</span></div>
          <div class="row"><button class="btn btn-sm btn-outline" data-m="up" ${idx === 0 ? 'disabled' : ''}>${ICON.up}Nach vorn</button><button class="btn btn-sm btn-outline" data-m="down" ${idx === state.categories.length - 1 ? 'disabled' : ''}>${ICON.down}Nach hinten</button></div></div>` : ''}
        <p class="form-error" data-k="err"></p>`,
      foot: `${cat ? `<button class="btn btn-danger" data-m="delete" ${count ? 'disabled title="Kategorie enthält noch Artikel"' : 'data-arm="Wirklich löschen?"'}>Löschen</button><span class="spacer"></span>` : ''}
        <button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="save">Speichern</button>`
    });
    if (cat && count) m.querySelector('[data-k="err"]').textContent = `Löschen ist erst möglich, wenn die ${plural(count, 'Artikel', 'Artikel')} verschoben oder gelöscht sind.`;
    const input = m.querySelector('#catName');
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b || !armed(b)) return;
      const a = b.dataset.m;
      if (a === 'up' || a === 'down') {
        const j = idx + (a === 'up' ? -1 : 1);
        [state.categories[idx], state.categories[j]] = [state.categories[j], state.categories[idx]];
        state.meta.edited = true;
        save(); closeModal(); renderAfterChange(); openCategoryEditor(cat.id);
      } else if (a === 'delete') {
        state.categories = state.categories.filter((c) => c !== cat);
        state.meta.edited = true;
        save(); closeModal(); renderAfterChange();
      } else if (a === 'save') {
        const name = input.value.trim();
        if (!name) { m.querySelector('[data-k="err"]').textContent = 'Bitte einen Namen eingeben.'; return; }
        if (cat) cat.name = name; else state.categories.push({ id: 'c-' + uid(), name });
        state.meta.edited = true;
        save(); closeModal(); renderAfterChange();
      }
    });
    if (!cat) setTimeout(() => input.focus(), 60);
  }

  // ================================================================
  // Sicherung, Import, Dateien
  // ================================================================
  async function saveFile(filename, text, mime) {
    if (HAS_CLAUDE) {
      try {
        const dl = await window.claude.use('downloads');
        if (dl) {
          await dl.save({ filename, data: text });
          toast('Datei gespeichert');
          return;
        }
      } catch (e) {
        const code = e && e.code;
        if (code === 'declined') return;
        if (code === 'rate_limited') { toast('Bitte kurz warten und erneut versuchen.', { error: true }); return; }
      }
      if (FRAMED) {
        try { await navigator.clipboard.writeText(text.replace(/^﻿/, '')); toast('Herunterladen ist hier nicht möglich. Der Inhalt wurde in die Zwischenablage kopiert.', { ms: 6000 }); }
        catch (e) { toast('Herunterladen ist in dieser Ansicht nicht möglich.', { error: true }); }
        return;
      }
    }
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    try {
      const file = new File([blob], filename, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPad|iPhone|iPod|Android/.test(navigator.userAgent + (navigator.maxTouchPoints > 1 ? ' iPad' : ''))) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function exportBackup() {
    const data = Object.assign({ app: 'thekenkasse', exported: Date.now() }, state);
    openExport('Sicherung exportieren', `Thekenkasse_Sicherung_${DATE_FILE(Date.now())}.json`, JSON.stringify(data), 'application/json');
  }

  function openExport(title, filename, text, mime) {
    const kb = Math.max(1, Math.round(new Blob([text]).size / 1024));
    const m = openModal({
      title: esc(title),
      subtitle: `${esc(filename)} · ${kb} KB`,
      body: '<p>Speichere die Datei oder teile sie, zum Beispiel per AirDrop, Mail oder in die Dateien-App. Falls das in deiner App nicht klappt, kopiere den Inhalt und füge ihn in eine Mail oder Notiz ein.</p>',
      foot: '<button class="btn btn-outline" data-m="copy">In Zwischenablage kopieren</button><button class="btn btn-primary" data-m="save">Speichern / Teilen</button>'
    });
    m.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'save') { closeModal(); saveFile(filename, text, mime); return; }
      if (await copyText(text.replace(/^\uFEFF/, ''))) { closeModal(); toast('In die Zwischenablage kopiert'); }
      else toast('Kopieren ist hier nicht möglich.', { error: true });
    });
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* weiter mit Ersatzweg */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  async function importFromText(raw) {
    let data;
    try { data = JSON.parse(String(raw).trim()); } catch (err) { data = null; }
    if (!data || !Array.isArray(data.products) || !data.session) { toast('Das ist keine gültige Thekenkasse-Sicherung.', { error: true }); return false; }
    const ok = await confirmDialog({
      title: 'Sicherung importieren?',
      text: `Die Sicherung enthält ${plural(data.products.length, 'Artikel', 'Artikel')}, ${plural((data.tabs || []).filter((t) => t.status === 'open').length, 'offenen Deckel', 'offene Deckel')} und ${plural((data.history || []).length, 'frühere Abrechnung', 'frühere Abrechnungen')}. Die aktuellen Daten auf diesem Gerät werden ersetzt.`,
      ok: 'Importieren', danger: true
    });
    if (!ok) return false;
    replaceState(data);
    toast('Sicherung importiert');
    return true;
  }

  function openImport() {
    const m = openModal({
      title: 'Sicherung importieren',
      body: `<p>Wähle eine Sicherungsdatei (.json) aus oder füge den kopierten Inhalt einer Sicherung ein.</p>
        <div><button class="btn btn-outline" data-m="file">Datei auswählen</button><input type="file" id="importFile" accept="application/json,.json,text/plain" hidden></div>
        <label class="field"><span>Oder Inhalt einfügen</span><textarea class="input" id="importText" rows="5" spellcheck="false" autocomplete="off"></textarea></label>`,
      foot: '<button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="go">Importieren</button>'
    });
    const fileInput = m.querySelector('#importFile');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => { if (await importFromText(reader.result)) closeModal(); };
      reader.readAsText(file);
    });
    m.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'file') fileInput.click();
      else if (b.dataset.m === 'go') {
        const text = m.querySelector('#importText').value;
        if (!text.trim()) { toast('Bitte zuerst eine Datei auswählen oder Inhalt einfügen.', { error: true }); return; }
        if (await importFromText(text)) closeModal();
      }
    });
  }

  function replaceState(data) {
    const deviceId = state.meta.deviceId;
    const next = migrate(clone(data));
    delete next.app; delete next.exported;
    next.meta.deviceId = deviceId;
    state = next;
    ui.reportId = null;
    save();
    applySettings();
    renderAfterChange();
    Cloud.syncHistory();
  }

  async function resetAll() {
    const ok = await confirmDialog({
      title: 'Alles zurücksetzen?',
      text: 'Sortiment, Deckel und alle Abrechnungen auf diesem Gerät werden gelöscht. Exportiere vorher eine Sicherung, wenn du die Daten noch brauchst.',
      ok: 'Alles löschen', danger: true
    });
    if (!ok) return;
    const deviceId = state.meta.deviceId;
    state = defaultState();
    state.meta.deviceId = deviceId;
    ui.reportId = null; ui.cat = 'all';
    save();
    applySettings();
    go('kasse');
    toast('Alle Daten wurden zurückgesetzt');
  }

  // ================================================================
  // Cloud-Sicherung (nur innerhalb von claude.ai verfügbar)
  // ================================================================
  function deviceLabel() {
    const ua = navigator.userAgent;
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android-Handy' : 'Android-Tablet';
    if (/Macintosh/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows-PC';
    return 'Browser';
  }

  const Cloud = {
    status: 'off', note: '', col: null, timer: null, busy: false, dirty: false, lastSaved: 0, docs: [],
    async init() {
      if (!HAS_CLAUDE) return;
      this.status = 'connecting';
      renderDataSection();
      try {
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        const id = db && user ? await user.id() : null;
        if (!id) { this.status = 'off'; renderDataSection(); return; }
        this.col = db.collection('data/users/' + id);
        this.status = 'on';
        await this.refreshList();
        this.syncHistory();
        this.offerRestore();
        this.schedule();
      } catch (e) {
        this.status = 'error';
        this.note = 'Cloud-Sicherung nicht erreichbar. Die Daten bleiben auf diesem Gerät.';
      }
      renderDataSection();
    },
    async refreshList() {
      const snap = await this.col.get();
      this.docs = snap.docs.map((d) => Object.assign({ _id: d.id }, d.data()));
    },
    backups() { return this.docs.filter((d) => d.kind === 'backup' && d.data).sort((a, b) => b.savedAt - a.savedAt); },
    schedule() {
      if (this.status !== 'on') return;
      this.dirty = true;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 2000);
    },
    async flush() {
      if (this.status !== 'on' || !this.dirty) return;
      if (this.busy) { this.schedule(); return; }
      this.busy = true;
      this.dirty = false;
      try {
        const rest = Object.assign({}, state);
        delete rest.history;
        const size = new Blob([JSON.stringify(rest)]).size;
        if (size > 240000) {
          this.note = 'Zu viele Buchungen für die Cloud-Sicherung. Bitte den Abend abschließen.';
        } else {
          const body = { kind: 'backup', deviceId: state.meta.deviceId, device: deviceLabel(), savedAt: Date.now(), receipts: state.session.events.length, openTabs: openTabs().length, products: state.products.length, data: rest };
          await this.col.doc('b-' + state.meta.deviceId).set(body);
          const i = this.docs.findIndex((d) => d._id === 'b-' + state.meta.deviceId);
          const local = Object.assign({ _id: 'b-' + state.meta.deviceId }, body);
          if (i >= 0) this.docs[i] = local; else this.docs.push(local);
          this.lastSaved = Date.now();
          this.note = '';
        }
      } catch (e) {
        const code = e && e.code;
        if (code === 'revoked' || code === 'not_granted' || code === 'invalid_argument') { this.status = 'error'; this.note = 'Cloud-Sicherung nicht möglich. Die Daten bleiben auf diesem Gerät.'; }
        else { this.note = 'Letzte Cloud-Sicherung fehlgeschlagen, neuer Versuch folgt.'; this.dirty = true; setTimeout(() => this.flush(), 15000); }
      }
      this.busy = false;
      renderDataSection();
    },
    async pushHistory(session) {
      if (this.status !== 'on') return;
      try {
        const body = { kind: 'history', deviceId: state.meta.deviceId, closedAt: session.closedAt, data: session };
        if (new Blob([JSON.stringify(body)]).size > 250000) return;
        await this.col.doc('h-' + session.id).set(body);
        this.docs.push(Object.assign({ _id: 'h-' + session.id }, body));
      } catch (e) { /* bleibt lokal erhalten */ }
    },
    async syncHistory() {
      if (this.status !== 'on') return;
      const have = new Set(this.docs.map((d) => d._id));
      for (const h of state.history) if (!have.has('h-' + h.id)) await this.pushHistory(h);
    },
    async removeHistory(id) {
      if (this.status !== 'on') return;
      try { await this.col.doc('h-' + id).delete(); this.docs = this.docs.filter((d) => d._id !== 'h-' + id); } catch (e) { /* ignorieren */ }
    },
    offerRestore() {
      if (isTouched()) return;
      const others = this.backups().filter((b) => b.receipts || b.openTabs || (b.data && b.data.meta && b.data.meta.edited));
      if (!others.length) return;
      toast(`Cloud-Sicherung vom ${fDateTime(others[0].savedAt)} (${esc(others[0].device || 'Gerät')}) gefunden.`, { html: true, action: 'Ansehen', ms: 12000, onAction: () => openCloudRestore() });
    },
    restore(b) {
      const hist = this.docs.filter((d) => d.kind === 'history' && d.deviceId === b.deviceId && d.data).map((d) => d.data).sort((x, y) => (y.closedAt || 0) - (x.closedAt || 0));
      const data = clone(b.data);
      const known = new Set((data.history || []).map((h) => h.id));
      data.history = (data.history || []).concat(hist.filter((h) => !known.has(h.id)));
      replaceState(data);
    }
  };

  function openCloudRestore() {
    const list = Cloud.backups();
    const m = openModal({
      title: 'Cloud-Sicherungen',
      subtitle: 'Jedes Gerät sichert seinen eigenen Stand automatisch in deinem Claude-Konto.',
      body: list.length ? `<ul class="list">${list.map((b) => `<li class="list-row"><div class="grow"><strong>${esc(b.device || 'Gerät')}${b.deviceId === state.meta.deviceId ? ' (dieses Gerät)' : ''}</strong>
          <span class="meta">gesichert ${fDateTime(b.savedAt)} · ${plural(b.receipts || 0, 'Beleg', 'Belege')} · ${plural(b.openTabs || 0, 'offener Deckel', 'offene Deckel')} · ${plural(b.products || 0, 'Artikel', 'Artikel')}</span></div>
          ${b.deviceId === state.meta.deviceId ? '' : `<button class="btn btn-sm btn-primary" data-m="restore" data-id="${esc(b._id)}" data-arm="Daten hier ersetzen?">Wiederherstellen</button>
          <button class="btn btn-sm btn-ghost" data-m="delete" data-id="${esc(b._id)}" data-arm="Löschen?">Löschen</button>`}</li>`).join('')}</ul>
          <p class="field-hint">Beim Wiederherstellen werden die Daten auf diesem Gerät durch den gewählten Stand ersetzt.</p>`
        : '<p class="muted">Noch keine Cloud-Sicherungen vorhanden.</p>'
    });
    m.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-m]');
      if (!b || !armed(b)) return;
      const doc = Cloud.docs.find((d) => d._id === b.dataset.id);
      if (!doc) return;
      if (b.dataset.m === 'restore') {
        closeModal();
        Cloud.restore(doc);
        toast('Daten aus der Cloud-Sicherung übernommen');
      } else if (b.dataset.m === 'delete') {
        try { await Cloud.col.doc(doc._id).delete(); Cloud.docs = Cloud.docs.filter((d) => d !== doc); } catch (err) { toast('Löschen fehlgeschlagen.', { error: true }); return; }
        closeModal();
        openCloudRestore();
      }
    });
  }

  // ================================================================
  // Einstellungen, Bildschirm anlassen, Offline-Betrieb
  // ================================================================
  const hostTheme = document.documentElement.getAttribute('data-theme');
  let themeOverridden = false;
  function applySettings() {
    const t = state.settings.theme;
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') { root.setAttribute('data-theme', t); themeOverridden = true; }
    else if (themeOverridden) {
      if (hostTheme) root.setAttribute('data-theme', hostTheme); else root.removeAttribute('data-theme');
      themeOverridden = false;
    }
    $('#app').dataset.tiles = state.settings.tileSize || 'm';
    applyWakeLock();
  }

  let wakeLock = null;
  async function applyWakeLock() {
    if (!('wakeLock' in navigator)) return;
    const want = state.settings.wakeLock && document.visibilityState === 'visible';
    if (want && !wakeLock) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } catch (e) { wakeLock = null; }
    } else if (!want && wakeLock) {
      try { await wakeLock.release(); } catch (e) { /* ignorieren */ }
      wakeLock = null;
    }
  }
  document.addEventListener('visibilitychange', applyWakeLock);

  function registerServiceWorker() {
    if (HAS_CLAUDE || FRAMED || !('serviceWorker' in navigator)) return;
    if (!/^https:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline-Modus nicht verfügbar */ });
  }

  // ================================================================
  // Bedienung: zentrale Klick-Verarbeitung
  // ================================================================
  const actions = {
    'modal-close': () => closeModal(),
    add: (el) => { cartChange(el.dataset.id, 1); if (navigator.vibrate) navigator.vibrate(8); },
    inc: (el) => cartChange(el.dataset.id, 1),
    dec: (el) => cartChange(el.dataset.id, -1),
    cat: (el) => { ui.cat = el.dataset.id; renderKasse(); $('#gridScroll').scrollTop = 0; },
    'toggle-order': () => { ui.orderOpen = !ui.orderOpen; renderOrder(); },
    'clear-cart': () => {
      const items = cartItems();
      if (!items.length) return;
      state.cart = [];
      ui.orderOpen = false;
      save(); updateBadges(); renderOrder();
      toast('Bestellung geleert', { action: 'Rückgängig', onAction: () => { setCartFromItems(items); save(); updateBadges(); renderOrder(); } });
    },
    'pay-cash': () => startCashPayment(),
    'to-tab': () => openTabPicker(),
    goto: (el) => go(el.dataset.id),
    'dismiss-hint': () => { state.meta.sampleHint = false; save(); renderKasse(); },
    'new-tab': () => openNewTabDialog(),
    'open-tab': (el) => openTabDetail(el.dataset.id),
    void: (el) => voidEvent(el.dataset.id),
    'journal-all': () => { ui.journalAll = true; renderReport(); },
    'view-report': (el) => { ui.reportId = el.dataset.id || null; ui.journalAll = false; renderReport(); $('#view-abrechnung').scrollTop = 0; },
    'delete-history': (el) => {
      state.history = state.history.filter((h) => h.id !== el.dataset.id);
      if (ui.reportId === el.dataset.id) ui.reportId = null;
      save(); Cloud.removeHistory(el.dataset.id); renderReport();
      toast('Abrechnung gelöscht');
    },
    'export-csv': () => exportCsv(ui.reportId ? state.history.find((h) => h.id === ui.reportId) : state.session),
    print: () => window.print(),
    'close-session': () => openCloseSession(),
    'edit-float': () => openFloatEditor(),
    'new-product': (el) => openProductEditor(null, el.dataset.id),
    'edit-product': (el) => openProductEditor(el.dataset.id),
    'toggle-product': (el) => {
      const p = prod(el.dataset.id);
      if (!p) return;
      p.active = !p.active;
      if (!p.active) state.cart = state.cart.filter((l) => l.pid !== p.id);
      state.meta.edited = true;
      save(); renderSortiment();
    },
    'move-product': (el) => moveProduct(el.dataset.id, Number(el.dataset.dir)),
    'new-category': () => openCategoryEditor(null),
    'edit-category': (el) => openCategoryEditor(el.dataset.id),
    setting: (el) => { state.settings[el.dataset.key] = el.dataset.id; save(); applySettings(); renderSortiment(); },
    'toggle-wakelock': () => { state.settings.wakeLock = !state.settings.wakeLock; save(); applyWakeLock(); renderSortiment(); },
    'export-backup': () => exportBackup(),
    'import-backup': () => openImport(),
    'cloud-restore': () => openCloudRestore(),
    'reset-all': () => resetAll()
  };

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); go(nav.dataset.nav); return; }
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    if (!armed(el)) return;
    const fn = actions[el.dataset.action];
    if (fn) fn(el, e);
    if (state.settings.wakeLock && !wakeLock) applyWakeLock();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modals.length) { e.preventDefault(); closeModal(); }
  });

  window.addEventListener('hashchange', routeFromHash);
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try { state = migrate(JSON.parse(e.newValue)); applySettings(); renderAfterChange(); } catch (err) { /* ignorieren */ }
    }
  });

  // ================================================================
  // Start
  // ================================================================
  function start() {
    applySettings();
    routeFromHash();
    registerServiceWorker();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    Cloud.init();
    // Testhilfe für automatisierte Prüfungen
    window.__thekenkasse = { get state() { return state; }, computeReport, parseMoney, changeBreakdown, buildCsv };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
