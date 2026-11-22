/*
 * Bonarchiv – digitale Kassenbons scannen, archivieren und finden.
 *
 * Die Oberfläche läuft in der WebView der Android-App. Alles, was nur eine echte
 * App kann (Kamera, Dateien, Netzwerk ohne CORS, Teilen, Speichern), erledigt die
 * Java-Seite über window.BonAndroid. Länger dauernde Aufrufe melden sich über
 * BonApp.resolve(id, json) zurück.
 */
(function () {
  "use strict";

  const P = window.BonParser;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const icon = (name, cls) => `<svg class="i${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------------------------------------------------------------------------
  // Brücke zur Android-App
  // ---------------------------------------------------------------------------

  let Native = window.BonAndroid || null;
  const waiting = new Map();
  let seq = 0;

  function call(method, ...args) {
    return new Promise((resolve) => {
      const id = "q" + ++seq;
      waiting.set(id, resolve);
      try {
        Native[method](id, ...args);
      } catch (e) {
        waiting.delete(id);
        resolve({ ok: false, error: String((e && e.message) || e) });
      }
    });
  }

  function native(method, ...args) {
    try {
      return Native && typeof Native[method] === "function" ? Native[method](...args) : undefined;
    } catch (e) {
      console.warn(method, e);
      return undefined;
    }
  }

  function parseJson(s, fallback) {
    if (s == null || s === "") return fallback;
    if (typeof s !== "string") return s;
    try { return JSON.parse(s); } catch (e) { return fallback; }
  }

  const fileUrl = (name) => native("fileUrl", name) || "docs/" + encodeURIComponent(name);

  async function fetchBytes(name) {
    const res = await fetch(fileUrl(name));
    if (!res.ok) throw new Error("Datei nicht lesbar");
    return new Uint8Array(await res.arrayBuffer());
  }

  async function fetchText(name) {
    const bytes = await fetchBytes(name);
    let text = new TextDecoder("utf-8").decode(bytes);
    if (text.indexOf("�") >= 0) text = new TextDecoder("windows-1252").decode(bytes);
    return text.replace(/^﻿/, "");
  }

  // ---------------------------------------------------------------------------
  // Daten
  // ---------------------------------------------------------------------------

  const DEFAULT_SETTINGS = { theme: "auto", scanOnStart: false, quickSave: false, merchantSort: "recent" };
  let state = freshState();
  let systemDark = false;
  let saveTimer = null;
  let cacheVersion = 0;

  function freshState() {
    return {
      version: 1,
      receipts: [],
      categories: clone(P.CATEGORIES),
      merchants: {},
      tseMap: {},
      searches: [],
      settings: Object.assign({}, DEFAULT_SETTINGS)
    };
  }

  function loadState() {
    const raw = native("loadState");
    const data = parseJson(raw, null);
    if (data && Array.isArray(data.receipts)) {
      state = Object.assign(freshState(), data);
      state.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});
      if (!Array.isArray(state.categories) || !state.categories.length) state.categories = clone(P.CATEGORIES);
      if (!state.categories.some((c) => c.id === "other")) state.categories.push(clone(P.CATEGORIES[P.CATEGORIES.length - 1]));
    }
  }

  function changed() {
    cacheVersion++;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 250);
  }

  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    const ok = native("saveState", JSON.stringify(state));
    if (ok === false) toast("Speichern fehlgeschlagen – ist der Speicher voll?");
  }

  function catById(id) {
    return state.categories.find((c) => c.id === id) || state.categories.find((c) => c.id === "other") || P.CATEGORIES[9];
  }

  let sortedCache = { v: -1, list: [] };
  function sortedReceipts() {
    if (sortedCache.v !== cacheVersion) {
      sortedCache = {
        v: cacheVersion,
        list: state.receipts.slice().sort((a, b) => String(b.date || b.created).localeCompare(String(a.date || a.created)))
      };
    }
    return sortedCache.list;
  }

  const receiptById = (id) => state.receipts.find((r) => r.id === id);

  function merchantGroups() {
    const map = new Map();
    for (const r of sortedReceipts()) {
      const key = r.merchantKey || "";
      let g = map.get(key);
      if (!g) {
        g = { key, name: r.merchant || "Ohne Geschäft", receipts: [], total: 0, last: r.date, categories: {} };
        map.set(key, g);
      }
      g.receipts.push(r);
      g.total += r.total || 0;
      g.categories[r.category] = (g.categories[r.category] || 0) + 1;
    }
    for (const g of map.values()) {
      const pref = state.merchants[g.key];
      g.category = (pref && pref.category) || Object.keys(g.categories).sort((a, b) => g.categories[b] - g.categories[a])[0] || "other";
    }
    return Array.from(map.values());
  }

  // ---------------------------------------------------------------------------
  // Formatierung
  // ---------------------------------------------------------------------------

  const money = (c, cur) => P.formatAmount(c, cur);
  const DAY = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];
  const DAY_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const MONTH = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const MON_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const pad = (n) => (n < 10 ? "0" : "") + n;

  function toDate(iso) {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  }

  const hasTime = (iso) => !!iso && !/T00:00/.test(iso);

  function fmtDate(iso, style) {
    const d = toDate(iso);
    if (!d) return "ohne Datum";
    const dm = pad(d.getDate()) + "." + pad(d.getMonth() + 1) + ".";
    const time = hasTime(iso) ? pad(d.getHours()) + ":" + pad(d.getMinutes()) : "";
    switch (style) {
      case "row": {
        const now = new Date();
        const sameYear = d.getFullYear() === now.getFullYear();
        return DAY[d.getDay()] + ", " + dm + (sameYear ? "" : d.getFullYear()) + (time ? " · " + time : "");
      }
      case "long":
        return DAY_LONG[d.getDay()] + ", " + d.getDate() + ". " + MONTH[d.getMonth()] + " " + d.getFullYear() + (time ? " · " + time + " Uhr" : "");
      case "date":
        return dm + d.getFullYear();
      case "month":
        return MONTH[d.getMonth()] + " " + d.getFullYear();
      default:
        return dm + d.getFullYear() + (time ? " " + time : "");
    }
  }

  function nowIso() {
    return P.toLocalIso(new Date());
  }

  function initials(name) {
    const words = String(name || "").replace(/[^\p{L}\p{N}&\s-]/gu, " ").split(/[\s-]+/).filter(Boolean);
    if (!words.length) return "?";
    if (words.length === 1) return words[0].slice(0, 2);
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  function niceFileName(r, fallbackExt) {
    const ext = ((r.file && r.file.name.split(".").pop()) || fallbackExt || "txt").toLowerCase();
    const d = (r.date || r.created || "").slice(0, 10) || "ohne-Datum";
    const m = String(r.merchant || "Beleg").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 40) || "Beleg";
    const a = r.total != null ? "_" + P.formatPlain(r.total).replace(/\./g, "") + "EUR" : "";
    return d + "_" + m + a + "." + ext;
  }

  const SOURCE_LABEL = {
    scan: "Per QR-Code gescannt",
    share: "Über „Teilen“ empfangen",
    import: "Aus Datei importiert",
    browser: "Von der Beleg-Webseite übernommen",
    link: "Über einen Link geladen",
    manual: "Manuell erfasst",
    image: "QR-Code aus Bild gelesen",
    sample: "Beispielbeleg"
  };

  const FORMAT_LABEL = { pdf: "PDF", image: "Bild", json: "JSON", xml: "XML", html: "Webseite", web: "Webseite", tse: "TSE-Daten", text: "Text", manual: "Manuell", sample: "Beispiel" };

  // Suchbegriff → Muster, das auch Umlaut-Schreibweisen findet ("mueller" ↔ "Müller")
  function tokenRegex(tokens) {
    const parts = tokens.filter(Boolean).map((t) =>
      t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/ae/g, "(?:ae|ä)").replace(/oe/g, "(?:oe|ö)").replace(/ue/g, "(?:ue|ü)").replace(/ss/g, "(?:ss|ß)")
    );
    return parts.length ? new RegExp("(" + parts.join("|") + ")", "gi") : null;
  }

  function highlight(text, re) {
    const s = String(text || "");
    if (!re) return esc(s);
    let out = "";
    let last = 0;
    s.replace(re, (m, g, idx) => {
      out += esc(s.slice(last, idx)) + "<mark>" + esc(m) + "</mark>";
      last = idx + m.length;
      return m;
    });
    return out + esc(s.slice(last));
  }

  // ---------------------------------------------------------------------------
  // Darstellung (hell/dunkel)
  // ---------------------------------------------------------------------------

  function isDark() {
    const t = state.settings.theme;
    return t === "dark" || (t === "auto" && systemDark);
  }

  let lastBars = "";
  function applyTheme() {
    const dark = isDark();
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const cs = getComputedStyle(document.documentElement);
    const bg = cs.getPropertyValue("--bg").trim();
    const surface = cs.getPropertyValue("--surface").trim();
    const withTabs = $("#app").classList.contains("with-tabs");
    const key = bg + surface + withTabs + dark;
    if (key !== lastBars) {
      lastBars = key;
      native("setBars", bg, withTabs ? surface : bg, !dark);
    }
  }

  // ---------------------------------------------------------------------------
  // Overlays: Blätter, Dialoge, Hinweise
  // ---------------------------------------------------------------------------

  const overlays = [];

  function openOverlay(html, opts) {
    const o = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "backdrop" + (o.center ? " center" : "");
    wrap.innerHTML = html;
    $("#overlay-root").appendChild(wrap);
    const entry = { el: wrap, onClose: o.onClose };
    overlays.push(entry);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap && o.dismissable !== false) closeOverlay(entry);
    });
    if (o.mount) o.mount(wrap, entry);
    return entry;
  }

  function closeOverlay(entry, value) {
    const i = overlays.indexOf(entry);
    if (i < 0) return;
    overlays.splice(i, 1);
    entry.el.remove();
    if (entry.onClose) entry.onClose(value);
  }

  function closeTopOverlay() {
    const top = overlays[overlays.length - 1];
    if (!top || top.locked) return !!top;
    closeOverlay(top);
    return true;
  }

  /** Dialog mit Knöpfen; liefert den Wert des gedrückten Knopfs (oder null). */
  function dialog(opts) {
    return new Promise((resolve) => {
      const buttons = (opts.buttons || [{ label: "OK", value: true, kind: "primary" }])
        .map((b, i) => `<button class="btn ${b.kind || "ghost"}" data-i="${i}">${esc(b.label)}</button>`).join("");
      const html = `<div class="dialog" role="dialog" aria-modal="true">
        ${opts.title ? `<h2>${esc(opts.title)}</h2>` : ""}
        ${opts.text ? `<p>${esc(opts.text)}</p>` : ""}
        ${opts.html || ""}
        <div class="actions${opts.stack ? " stack" : ""}">${buttons}</div></div>`;
      openOverlay(html, {
        center: true,
        onClose: (v) => resolve(v === undefined ? null : v),
        mount(el, entry) {
          $$(".actions .btn", el).forEach((btn) => btn.addEventListener("click", () => {
            const b = opts.buttons ? opts.buttons[+btn.dataset.i] : { value: true };
            let value = b.value;
            if (opts.collect && value !== null && value !== false) value = { button: value, form: opts.collect(el) };
            closeOverlay(entry, value);
          }));
          const first = $("input, textarea", el);
          if (first) setTimeout(() => { first.focus(); if (first.select) first.select(); }, 60);
          if (opts.mount) opts.mount(el);
        }
      });
    });
  }

  const confirmDialog = (title, text, okLabel, danger) => dialog({
    title, text,
    buttons: [{ label: "Abbrechen", value: false }, { label: okLabel || "OK", value: true, kind: danger ? "danger" : "primary" }]
  });

  function prompt(title, value, opts) {
    const o = opts || {};
    return dialog({
      title,
      text: o.text,
      html: `<label class="field"><input id="dlg-input" type="${o.type || "text"}" value="${esc(value || "")}" placeholder="${esc(o.placeholder || "")}" ${o.list ? 'list="dlg-list"' : ""} autocomplete="off">
        ${o.list ? `<datalist id="dlg-list">${o.list.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>` : ""}</label>`,
      buttons: [{ label: "Abbrechen", value: false }, { label: o.ok || "Übernehmen", value: true, kind: "primary" }],
      collect: (el) => $("#dlg-input", el).value,
      mount(el) {
        $("#dlg-input", el).addEventListener("keydown", (e) => {
          if (e.key === "Enter") $(".actions .btn.primary", el).click();
        });
      }
    }).then((r) => (r && r.button ? r.form : null));
  }

  function sheet(html, mount) {
    return openOverlay(`<div class="sheet" role="dialog" aria-modal="true">${html}</div>`, { mount });
  }

  let toastTimer = null;
  function toast(text, action) {
    const el = $("#toast");
    el.innerHTML = `<span>${esc(text)}</span>${action ? `<button>${esc(action.label)}</button>` : ""}`;
    if (action) $("button", el).onclick = () => { el.classList.remove("show"); action.run(); };
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), action ? 5000 : 2600);
  }

  let busyEl = null;
  function busy(text) {
    if (!busyEl) {
      busyEl = document.createElement("div");
      busyEl.className = "busy";
      document.body.appendChild(busyEl);
    }
    busyEl.innerHTML = `<div class="busy-card"><div class="spinner"></div><div>${esc(text)}</div></div>`;
  }
  function unbusy() {
    if (busyEl) { busyEl.remove(); busyEl = null; }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  let nav = [{ tab: "belege" }];
  const ui = { filter: "all", merchantMode: "merchants", merchantQuery: "", query: "" };

  const top = () => nav[nav.length - 1];

  function rememberScroll() {
    const r = top();
    if (r) r.scroll = $("#view").scrollTop;
  }

  function go(route) {
    rememberScroll();
    nav.push(route);
    render();
    $("#view").scrollTop = 0;
  }

  function replaceTop(route) {
    nav[nav.length - 1] = route;
    render();
    $("#view").scrollTop = 0;
  }

  function goTab(tab) {
    rememberScroll();
    nav = [{ tab }];
    render();
    $("#view").scrollTop = 0;
  }

  function goBack() {
    if (busyEl) return true;
    if (overlays.length) return closeTopOverlay();
    const r = top();
    if (r.page === "review") {
      discardReview(r);
      return true;
    }
    if (nav.length > 1) {
      nav.pop();
      render();
      $("#view").scrollTop = top().scroll || 0;
      return true;
    }
    if (r.tab !== "belege") {
      goTab("belege");
      return true;
    }
    return false;
  }

  function render() {
    const r = top();
    const isTab = !!r.tab && nav.length === 1;
    $("#app").classList.toggle("with-tabs", isTab);
    $$(".tab[data-tab]").forEach((t) => t.classList.toggle("active", isTab && t.dataset.tab === r.tab));
    const v = (VIEWS[r.tab || r.page] || VIEWS.belege)(r);
    const actions = (v.actions || []).map((a) =>
      `<button class="icon-btn${a.primary ? " primary" : ""}" data-action="${a.action}" aria-label="${esc(a.label)}" ${a.attrs || ""}>${icon(a.icon)}</button>`).join("");
    const topbar = $("#topbar");
    topbar.className = "topbar" + (v.back ? " has-back" : "");
    topbar.innerHTML = (v.back ? `<button class="icon-btn" data-action="back" aria-label="Zurück">${icon("back")}</button>` : "") +
      `<h1>${esc(v.title)}${v.sub ? ` <span class="sub">${esc(v.sub)}</span>` : ""}</h1>` + actions;
    const view = $("#view");
    view.innerHTML = v.html;
    if (v.mount) v.mount(view);
    applyTheme();
  }

  // ---------------------------------------------------------------------------
  // Bausteine der Ansichten
  // ---------------------------------------------------------------------------

  function receiptRow(r, opts) {
    const o = opts || {};
    const cat = catById(r.category);
    const title = r.merchant || (r.pending ? "Beleg wird nachgeladen" : "Unbekanntes Geschäft");
    const sub = [fmtDate(r.date || r.created, "row"), o.hideCategory ? null : cat.name].filter(Boolean).join(" · ");
    const badges = [];
    if (r.pending) badges.push(`<span class="badge warn">${icon("clock")}ausstehend</span>`);
    if (r.business) badges.push(icon("briefcase"));
    if (r.sample) badges.push(`<span class="badge">Beispiel</span>`);
    return `<button class="row" data-action="open-receipt" data-id="${esc(r.id)}">
      <span class="avatar soft" style="--c:${esc(cat.color)}">${r.pending ? icon("clock") : esc(initials(r.merchant || "?"))}</span>
      <span class="row-main"><span class="row-title">${esc(title)}</span><span class="row-sub">${esc(sub)}</span></span>
      <span class="row-end"><span class="row-amount${r.total < 0 ? " neg" : ""}">${r.total != null ? money(r.total, r.currency) : "–"}</span>
      ${badges.length ? `<span class="row-icons">${badges.join("")}</span>` : ""}</span>
    </button>`;
  }

  function monthGroups(list, opts) {
    let html = "";
    let curKey = null;
    let group = [];
    const flush = () => {
      if (!group.length) return;
      const sum = group.reduce((s, r) => s + (r.total || 0), 0);
      html += `<div class="month"><span>${esc(curKey ? fmtDate(curKey + "-01", "month") : "Ohne Datum")}</span>
        <span class="muted num">${group.length} ${group.length === 1 ? "Beleg" : "Belege"} · ${money(sum)}</span></div>
        <div class="card list">${group.map((r) => receiptRow(r, opts)).join("")}</div>`;
      group = [];
    };
    for (const r of list) {
      const key = (r.date || r.created || "").slice(0, 7) || null;
      if (key !== curKey) { flush(); curKey = key; }
      group.push(r);
    }
    flush();
    return html;
  }

  function emptyState(iconName, title, text, buttons) {
    return `<div class="empty"><div class="empty-art">${icon(iconName)}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>${buttons || ""}</div>`;
  }

  function catAvatar(cat, cls) {
    return `<span class="avatar soft ${cls || ""}" style="--c:${esc(cat.color)}">${icon(cat.icon || "tag")}</span>`;
  }

  function sumOf(list) {
    return list.reduce((s, r) => s + (r.total || 0), 0);
  }

  // ---------------------------------------------------------------------------
  // Ansichten
  // ---------------------------------------------------------------------------

  const VIEWS = {};

  // ----- Belege (Zeitleiste) -----
  VIEWS.belege = function () {
    const all = sortedReceipts();
    const actions = [
      { icon: "search", action: "goto-search", label: "Suchen" },
      { icon: "plus", action: "add-menu", label: "Beleg hinzufügen", primary: true }
    ];
    if (!all.length) {
      return {
        title: "Belege",
        actions,
        html: emptyState("receipt", "Noch keine Kassenbons",
          "Scanne an der Kasse den QR-Code für den digitalen Beleg. Bonarchiv lädt ihn herunter, erkennt Geschäft, Betrag und Artikel und legt alles ordentlich ab.",
          `<button class="btn primary" data-action="scan">${icon("scan")}QR-Code scannen</button>
           <button class="btn" data-action="import-files">${icon("import")}Datei importieren</button>
           <button class="btn ghost" data-action="load-samples">Beispielbelege ansehen</button>`)
      };
    }
    const now = new Date();
    const monthKey = now.getFullYear() + "-" + pad(now.getMonth() + 1);
    const yearKey = String(now.getFullYear());
    const thisMonth = all.filter((r) => (r.date || "").startsWith(monthKey));
    const thisYear = all.filter((r) => (r.date || "").startsWith(yearKey));
    const pendingList = all.filter((r) => r.pending);

    const f = ui.filter;
    const list = all.filter((r) => f === "all" || (f === "business" && r.business) || (f === "pending" && r.pending) || f === "cat:" + r.category);
    const usedCats = state.categories.filter((c) => all.some((r) => r.category === c.id));
    const businessCount = all.filter((r) => r.business).length;
    const chip = (id, label, count, color) =>
      `<button class="chip${f === id ? " active" : ""}" data-action="filter" data-filter="${esc(id)}">${color ? `<span class="dot" style="--c:${esc(color)}"></span>` : ""}${esc(label)}${count != null ? ` <span class="count">${count}</span>` : ""}</button>`;

    let html = `<div class="summary">
      <div class="stat"><div class="stat-label">${esc(MONTH[now.getMonth()])}</div><div class="stat-value">${money(sumOf(thisMonth))}</div><div class="stat-sub">${thisMonth.length} ${thisMonth.length === 1 ? "Beleg" : "Belege"}</div></div>
      <div class="stat"><div class="stat-label">Jahr ${yearKey}</div><div class="stat-value">${money(sumOf(thisYear))}</div><div class="stat-sub">${thisYear.length} ${thisYear.length === 1 ? "Beleg" : "Belege"}</div></div>
    </div>`;
    if (pendingList.length) {
      html += `<div class="banner">${icon("clock")}<div class="row-main">${pendingList.length === 1 ? "1 Beleg wartet" : pendingList.length + " Belege warten"} auf den Download.</div>
        <button class="btn" data-action="retry-pending">Jetzt laden</button></div>`;
    }
    html += `<div class="chips">${chip("all", "Alle", all.length)}${businessCount ? chip("business", "Geschäftlich", businessCount) : ""}${pendingList.length ? chip("pending", "Ausstehend", pendingList.length) : ""}
      ${usedCats.map((c) => chip("cat:" + c.id, c.name, all.filter((r) => r.category === c.id).length, c.color)).join("")}</div>`;
    html += list.length ? monthGroups(list) : `<p class="muted" style="text-align:center;margin-top:30px">Keine Belege für diesen Filter.</p>`;
    return { title: "Belege", actions, html };
  };

  // ----- Geschäfte & Kategorien -----
  VIEWS.geschaefte = function () {
    const mode = ui.merchantMode;
    const all = sortedReceipts();
    let html = `<div class="seg" style="margin:4px 0 14px">
      <button data-action="merchant-mode" data-mode="merchants" class="${mode === "merchants" ? "active" : ""}">Geschäfte</button>
      <button data-action="merchant-mode" data-mode="categories" class="${mode === "categories" ? "active" : ""}">Kategorien</button></div>`;
    if (!all.length) {
      html += emptyState("store", "Noch keine Geschäfte", "Sobald du Belege speicherst, findest du hier jedes Geschäft mit deinen letzten Einkäufen.",
        `<button class="btn primary" data-action="scan">${icon("scan")}QR-Code scannen</button>`);
      return { title: "Geschäfte", html };
    }
    if (mode === "categories") {
      const rows = state.categories.map((c) => {
        const rs = all.filter((r) => r.category === c.id);
        const merchants = new Set(rs.map((r) => r.merchantKey)).size;
        return { c, rs, merchants };
      }).filter((x) => x.rs.length);
      html += `<div class="card list">${rows.map((x) => `<button class="row" data-action="open-category" data-id="${esc(x.c.id)}">
        ${catAvatar(x.c)}
        <span class="row-main"><span class="row-title">${esc(x.c.name)}</span><span class="row-sub">${x.rs.length} ${x.rs.length === 1 ? "Beleg" : "Belege"} · ${x.merchants} ${x.merchants === 1 ? "Geschäft" : "Geschäfte"}</span></span>
        <span class="row-end"><span class="row-amount">${money(sumOf(x.rs))}</span></span>${icon("chevron", "chev")}
      </button>`).join("")}</div>
      <button class="btn ghost block" style="margin-top:10px" data-action="manage-categories">${icon("edit")}Kategorien bearbeiten</button>`;
      return { title: "Geschäfte", html };
    }
    const sort = state.settings.merchantSort;
    let groups = merchantGroups();
    if (sort === "name") groups.sort((a, b) => a.name.localeCompare(b.name, "de"));
    else if (sort === "total") groups.sort((a, b) => b.total - a.total);
    html += `<div class="searchbox" style="margin-bottom:12px">${icon("search")}<input id="merchant-q" type="search" placeholder="Geschäft suchen" value="${esc(ui.merchantQuery)}" autocomplete="off"></div>
      <div class="chips">
        <button class="chip small${sort === "recent" ? " active" : ""}" data-action="merchant-sort" data-sort="recent">Zuletzt besucht</button>
        <button class="chip small${sort === "name" ? " active" : ""}" data-action="merchant-sort" data-sort="name">A–Z</button>
        <button class="chip small${sort === "total" ? " active" : ""}" data-action="merchant-sort" data-sort="total">Höchste Summe</button>
      </div><div id="merchant-list"></div>`;
    return {
      title: "Geschäfte",
      sub: groups.length + "",
      html,
      mount(view) {
        const input = $("#merchant-q", view);
        const draw = () => {
          const q = P.fold(ui.merchantQuery).trim();
          const shown = q ? groups.filter((g) => P.fold(g.name).includes(q)) : groups;
          $("#merchant-list", view).innerHTML = shown.length ? `<div class="card list">${shown.map((g) => {
            const cat = catById(g.category);
            return `<button class="row" data-action="open-merchant" data-key="${esc(g.key)}">
              <span class="avatar soft" style="--c:${esc(cat.color)}">${esc(initials(g.name))}</span>
              <span class="row-main"><span class="row-title">${esc(g.name)}</span>
              <span class="row-sub">${g.receipts.length} ${g.receipts.length === 1 ? "Beleg" : "Belege"} · zuletzt ${esc(fmtDate(g.last, "date"))}</span></span>
              <span class="row-end"><span class="row-amount">${money(g.total)}</span></span>${icon("chevron", "chev")}
            </button>`;
          }).join("")}</div>` : `<p class="muted" style="text-align:center">Kein Geschäft gefunden.</p>`;
        };
        input.addEventListener("input", () => { ui.merchantQuery = input.value; draw(); });
        draw();
      }
    };
  };

  // ----- Suche -----
  const hayCache = new Map();
  function haystack(r) {
    const key = r.id + ":" + cacheVersion;
    let h = hayCache.get(r.id);
    if (!h || h.key !== key) {
      const cat = catById(r.category);
      h = {
        key,
        head: P.fold([r.merchant, cat.name, r.note, r.payment, r.receiptNo, r.total != null ? P.formatPlain(r.total) : "", fmtDate(r.date, "date")].join(" ")),
        text: P.fold(r.text || "")
      };
      hayCache.set(r.id, h);
    }
    return h;
  }

  function runSearch(q) {
    const tokens = P.fold(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) return { items: [], receipts: [], tokens };
    const items = [];
    const receipts = [];
    for (const r of sortedReceipts()) {
      let hit = false;
      (r.items || []).forEach((it, idx) => {
        const name = P.fold(it.name);
        const merchant = P.fold(r.merchant);
        // Jeder Suchbegriff muss im Artikel stehen – Geschäftsname darf mitgesucht werden ("rewe milch")
        if (tokens.every((t) => name.includes(t) || merchant.includes(t)) && tokens.some((t) => name.includes(t))) {
          items.push({ r, it, idx });
          hit = true;
        }
      });
      if (hit) continue;
      const h = haystack(r);
      if (tokens.every((t) => h.head.includes(t) || h.text.includes(t))) receipts.push(r);
    }
    return { items, receipts, tokens };
  }

  function frequentItems(limit) {
    const map = new Map();
    for (const r of sortedReceipts()) {
      for (const it of r.items || []) {
        if (!it.name || it.price < 0) continue;
        const k = P.fold(it.name).replace(/\s+/g, " ").trim();
        if (k.length < 3) continue;
        const e = map.get(k);
        if (e) e.count++;
        else map.set(k, { name: it.name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, limit);
  }

  function itemMeta(it, cur) {
    if (it.qty && it.unitPrice != null) {
      const q = String(it.qty).replace(".", ",");
      if (!it.unit || it.unit === "stk") return q + " × " + money(it.unitPrice, cur);
      return q + (it.unit ? " " + it.unit : "") + " × " + money(it.unitPrice, cur) + (it.unit ? "/" + it.unit : "");
    }
    if (it.qty && it.qty !== 1) return String(it.qty).replace(".", ",") + " Stück";
    return "";
  }

  VIEWS.suche = function () {
    const html = `<div class="searchbox" style="margin:4px 0 6px">${icon("search")}
        <input id="search-q" type="search" enterkeyhint="search" placeholder="Artikel, Geschäft oder Betrag" value="${esc(ui.query)}" autocomplete="off">
        <button class="icon-btn${ui.query ? "" : " hidden"}" id="search-clear" aria-label="Suche leeren">${icon("close")}</button></div>
      <div id="search-results"></div>`;
    return {
      title: "Suche",
      html,
      mount(view) {
        const input = $("#search-q", view);
        const clear = $("#search-clear", view);
        const draw = () => {
          clear.classList.toggle("hidden", !ui.query);
          $("#search-results", view).innerHTML = searchResultsHtml(ui.query);
        };
        input.addEventListener("input", () => { ui.query = input.value; draw(); });
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") { input.blur(); rememberSearch(ui.query); } });
        clear.addEventListener("click", () => { ui.query = ""; input.value = ""; draw(); input.focus(); });
        draw();
        if (!ui.query && state.receipts.length) setTimeout(() => input.focus(), 50);
      }
    };
  };

  function rememberSearch(q) {
    const t = String(q || "").trim();
    if (t.length < 2) return;
    state.searches = [t].concat((state.searches || []).filter((x) => x.toLowerCase() !== t.toLowerCase())).slice(0, 8);
    changed();
  }

  function searchResultsHtml(q) {
    if (!state.receipts.length) {
      return emptyState("search", "Noch nichts zu finden", "Gespeicherte Belege werden hier nach Artikeln, Geschäften, Beträgen und Notizen durchsucht.");
    }
    if (!q.trim()) {
      const freq = frequentItems(14);
      let html = "";
      if (state.searches && state.searches.length) {
        html += `<div class="section-title">Letzte Suchen</div><div class="chips wrap">${state.searches.map((s) => `<button class="chip" data-action="search-term" data-term="${esc(s)}">${icon("clock")}${esc(s)}</button>`).join("")}</div>`;
      }
      if (freq.length) {
        html += `<div class="section-title">Häufig gekauft</div><div class="chips wrap">${freq.map((x) => `<button class="chip" data-action="search-term" data-term="${esc(x.name)}">${esc(x.name)} <span class="count">${x.count}×</span></button>`).join("")}</div>`;
      }
      html += `<p class="muted small" style="margin:22px 4px">Tipp: Du kannst nach Artikeln („Milch“), Geschäften („REWE“), Beträgen („12,99“) oder Notizen suchen und Begriffe kombinieren („rewe milch“).</p>`;
      return html;
    }
    const res = runSearch(q);
    const re = tokenRegex(res.tokens);
    if (!res.items.length && !res.receipts.length) {
      return `<div class="empty"><div class="empty-art">${icon("search")}</div><h2>Nichts gefunden</h2><p>Für „${esc(q)}“ gibt es keinen Artikel und keinen Beleg.</p></div>`;
    }
    let html = "";
    if (res.items.length) {
      const total = res.items.reduce((s, x) => s + (x.it.price || 0), 0);
      html += `<div class="section-title"><span>Artikel · ${res.items.length}</span><span class="num">${money(total)}</span></div>
        <div class="card list">${res.items.slice(0, 200).map(({ r, it, idx }) => {
          const cat = catById(r.category);
          const meta = itemMeta(it, r.currency);
          return `<button class="row" data-action="open-receipt" data-id="${esc(r.id)}" data-item="${idx}">
            <span class="avatar soft" style="--c:${esc(cat.color)}">${esc(initials(r.merchant))}</span>
            <span class="row-main"><span class="row-title">${highlight(it.name, re)}</span>
            <span class="row-sub">${highlight(r.merchant || "Unbekannt", re)} · ${esc(fmtDate(r.date, "date"))}${meta ? " · " + esc(meta) : ""}</span></span>
            <span class="row-end"><span class="row-amount">${money(it.price, r.currency)}</span></span>
          </button>`;
        }).join("")}</div>`;
    }
    if (res.receipts.length) {
      html += `<div class="section-title"><span>Belege · ${res.receipts.length}</span></div><div class="card list">${res.receipts.slice(0, 200).map((r) => receiptRow(r)).join("")}</div>`;
    }
    return html;
  }

  // ----- Mehr -----
  VIEWS.mehr = function () {
    const all = sortedReceipts();
    const s = state.settings;
    const now = new Date();
    // Letzte 6 Monate
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + "-" + pad(d.getMonth() + 1);
      months.push({ key, label: MON_SHORT[d.getMonth()], sum: sumOf(all.filter((r) => (r.date || "").startsWith(key) && r.total > 0)), current: i === 0 });
    }
    const max = Math.max(1, ...months.map((m) => m.sum));
    const yearKey = String(now.getFullYear());
    const yearList = all.filter((r) => (r.date || "").startsWith(yearKey) && r.total > 0);
    const yearSum = sumOf(yearList);
    const byCat = state.categories.map((c) => ({ c, sum: sumOf(yearList.filter((r) => r.category === c.id)) })).filter((x) => x.sum > 0).sort((a, b) => b.sum - a.sum);
    const sw = (key, label, sub) => `<button class="switch-row" data-action="toggle-setting" data-key="${key}">
      <span class="row-main">${esc(label)}${sub ? `<div class="row-sub" style="white-space:normal">${esc(sub)}</div>` : ""}</span><span class="switch${s[key] ? " on" : ""}"></span></button>`;
    const menuRow = (iconName, label, action, sub, color) => `<button class="row" data-action="${action}">
      <span class="avatar soft" style="--c:${color || "var(--primary)"}">${icon(iconName)}</span>
      <span class="row-main"><span class="row-title">${esc(label)}</span>${sub ? `<span class="row-sub">${esc(sub)}</span>` : ""}</span>${icon("chevron", "chev")}</button>`;
    const hasSamples = state.receipts.some((r) => r.sample);

    let html = "";
    if (all.length) {
      html += `<div class="section-title">Ausgaben</div><div class="card">
        <div class="bars">${months.map((m) => `<div class="bar-col${m.current ? " current" : ""}"><div class="bar" style="height:${Math.round((m.sum / max) * 100)}%" title="${esc(money(m.sum))}"></div><div class="bar-label">${m.label}</div></div>`).join("")}</div>
        <div class="bar-legend"><span>${esc(months[5].label)}: <b class="num">${money(months[5].sum)}</b></span><span>Ø 6 Monate: <b class="num">${money(Math.round(sumOf(months.map((m) => ({ total: m.sum }))) / 6))}</b></span></div>
        ${byCat.length ? `<div class="catbar">${byCat.map((x) => `<span style="--c:${esc(x.c.color)};width:${(x.sum / yearSum) * 100}%"></span>`).join("")}</div>
        ${byCat.slice(0, 5).map((x) => `<div class="share-line"><span class="dot" style="--c:${esc(x.c.color)}"></span><span class="row-main">${esc(x.c.name)}</span><span class="num muted">${Math.round((x.sum / yearSum) * 100)} %</span><span class="num" style="font-weight:600;min-width:84px;text-align:right">${money(x.sum)}</span></div>`).join("")}
        <div style="height:10px"></div>` : ""}
      </div>`;
    }
    html += `<div class="section-title">Ordnen &amp; weitergeben</div><div class="card list">
      ${menuRow("grid", "Kategorien", "manage-categories", state.categories.length + " Kategorien bearbeiten")}
      ${menuRow("folder", "Export für Steuer & Buchhaltung", "open-export", "ZIP mit Belegen und CSV-Liste")}
    </div>
    <div class="section-title">Datensicherung</div><div class="card list">
      ${menuRow("shield", "Sicherung erstellen", "backup-create", "Alle Belege und Einstellungen als ZIP")}
      ${menuRow("refresh", "Sicherung wiederherstellen", "backup-restore", "Belege aus einer Sicherung übernehmen")}
    </div>
    <div class="section-title">Einstellungen</div><div class="card">
      ${sw("scanOnStart", "Scanner beim Öffnen starten", "Praktisch an der Kasse: die App öffnet direkt die Kamera.")}
      ${sw("quickSave", "Ohne Rückfrage speichern", "Erkannte Belege werden sofort abgelegt – du kannst sie später bearbeiten.")}
      <div class="switch-row"><span class="row-main">Darstellung</span>
        <div class="seg" style="width:210px">${[["auto", "Auto"], ["light", "Hell"], ["dark", "Dunkel"]].map(([k, l]) => `<button data-action="set-theme" data-theme="${k}" class="${s.theme === k ? "active" : ""}">${l}</button>`).join("")}</div></div>
    </div>
    <div class="section-title">Beispiele</div><div class="card list">
      ${hasSamples ? menuRow("trash", "Beispielbelege entfernen", "remove-samples", "Löscht nur die Beispiele", "var(--danger)") : menuRow("sparkle", "Beispielbelege laden", "load-samples", "Zum Ausprobieren der App")}
    </div>
    <div class="section-title">Über Bonarchiv</div>
    <div class="about"><p>Bonarchiv speichert deine digitalen Kassenbons ausschließlich auf diesem Gerät. Es gibt kein Konto und keinen Server – Belege werden nur aus dem Internet geladen, wenn du einen QR-Code scannst oder einen Link öffnest.</p>
      <p>Erkannt werden PDF-Belege, JSON- und XML-Belege (auch XRechnung und ZUGFeRD), Beleg-Webseiten und der TSE-QR-Code auf Kassenbons. Prüfe die erkannten Angaben vor allem bei steuerlich relevanten Belegen.</p>
      <p class="faint">${esc(state.receipts.length)} Belege gespeichert · Version ${esc(native("appVersion") || "1.0")}</p></div>`;
    return { title: "Mehr", html };
  };

  // ----- Beleg-Details -----
  VIEWS.receipt = function (route) {
    const r = receiptById(route.id);
    if (!r) return { title: "Beleg", back: true, html: `<p class="muted">Dieser Beleg existiert nicht mehr.</p>` };
    const cat = catById(r.category);
    const items = r.items || [];
    const itemSum = items.reduce((s, it) => s + (it.price || 0), 0);
    let html = `<div class="card hero">
      <span class="avatar lg soft" style="--c:${esc(cat.color)}">${esc(initials(r.merchant || "?"))}</span>
      ${r.merchant ? `<button class="hero-merchant" data-action="open-merchant" data-key="${esc(r.merchantKey)}">${esc(r.merchant)}${icon("chevron")}</button>`
        : `<button class="hero-merchant" data-action="edit-receipt">Geschäft eintragen${icon("edit")}</button>`}
      <div class="hero-date">${esc(fmtDate(r.date, "long"))}</div>
      <div class="hero-amount">${r.total != null ? money(r.total, r.currency) : "–"}</div>
      <div class="chips wrap">
        <button class="chip tinted" style="--c:${esc(cat.color)}" data-action="pick-category">${icon(cat.icon || "tag")}${esc(cat.name)}</button>
        <button class="chip${r.business ? " active" : ""}" data-action="toggle-business">${icon("briefcase")}${r.business ? "Geschäftlich" : "Privat"}</button>
        ${r.payment ? `<span class="chip">${esc(r.payment)}</span>` : ""}
      </div>
    </div>`;
    if (r.pending) {
      html += `<div class="banner" style="margin-top:14px">${icon("clock")}<div class="row-main">Der Beleg konnte noch nicht geladen werden${r.pendingError ? ` (${esc(r.pendingError)})` : ""}.</div>
        <button class="btn" data-action="retry-one">Laden</button></div>`;
    }
    if (items.length) {
      html += `<div class="section-title"><span>Artikel · ${items.length}</span></div><div class="card list items">
        ${items.map((it, i) => {
          const meta = itemMeta(it, r.currency);
          return `<div class="row${route.item === i ? " item-hit" : ""}" data-idx="${i}"><span class="row-main"><div class="item-name">${esc(it.name)}</div>${meta ? `<div class="item-meta">${esc(meta)}</div>` : ""}</span>
            <span class="row-amount${it.price < 0 ? " neg" : ""}">${money(it.price, r.currency)}</span></div>`;
        }).join("")}
        <div class="row total-row"><span class="row-main">Summe</span><span class="row-amount">${money(r.total != null ? r.total : itemSum, r.currency)}</span></div>
      </div>
      ${r.total != null && Math.abs(itemSum - r.total) > 1 ? `<p class="muted small" style="margin:6px 4px 0">Die erkannten Artikel ergeben ${esc(money(itemSum, r.currency))}. Einzelne Positionen wurden evtl. nicht erkannt.</p>` : ""}`;
    }
    if (r.vat && r.vat.length) {
      html += `<div class="section-title">Mehrwertsteuer</div><div class="card"><table class="kv">
        <tr><th>Satz</th><th class="r">Netto</th><th class="r">MwSt.</th><th class="r">Brutto</th></tr>
        ${r.vat.map((v) => `<tr><td>${esc(String(v.rate).replace(".", ","))} %</td><td class="r">${v.net != null ? esc(P.formatPlain(v.net)) : "–"}</td><td class="r">${v.tax != null ? esc(P.formatPlain(v.tax)) : "–"}</td><td class="r">${v.gross != null ? esc(P.formatPlain(v.gross)) : "–"}</td></tr>`).join("")}
      </table></div>`;
    }
    html += `<div class="section-title"><span>Originalbeleg</span>${r.format ? `<span class="badge">${esc(FORMAT_LABEL[r.format] || r.format)}</span>` : ""}</div>
      <div class="card"><div class="doc-preview" id="doc-preview">${r.file && (r.format === "pdf" || r.format === "image" || r.format === "web") ? `<div class="loading">Beleg wird angezeigt …</div>` : paperHtml(r)}</div>
      ${r.file ? `<div class="file-line">${icon("file", "i-sm")}<span>${esc(niceFileName(r))}${r.file.size ? " · " + esc(fmtSize(r.file.size)) : ""}</span></div>
        <div class="doc-actions">
          <button class="btn" data-action="open-file">${icon("external")}Öffnen</button>
          <button class="btn" data-action="share-file">${icon("share")}Teilen</button>
          ${["json", "xml", "text", "tse", "html"].includes(r.format) ? `<button class="btn" data-action="show-raw">${icon("code")}Rohdaten</button>` : ""}
        </div>` : ""}
      </div>`;
    html += `<div class="section-title">Notiz</div><div class="card"><textarea class="note-input" id="note" rows="2" placeholder="z. B. Geschenk für Anna, Garantie bis 2028 …">${esc(r.note || "")}</textarea></div>`;
    const details = [];
    if (r.source) {
      details.push(["Herkunft", (SOURCE_LABEL[r.source.type] || r.source.type) + (r.source.at ? " am " + fmtDate(r.source.at) : "")]);
      if (r.source.url) details.push(["Link", `<a href="#" data-action="open-source" class="wrap" style="color:var(--primary)">${esc(r.source.url)}</a>`, true]);
    }
    if (r.receiptNo) details.push(["Bon-Nr.", r.receiptNo]);
    if (r.tse && r.tse.serial) details.push(["TSE", "Seriennr. " + r.tse.serial + (r.tse.transaction ? " · Transaktion " + r.tse.transaction : "")]);
    details.push(["Gespeichert", fmtDate(r.created)]);
    html += `<div class="section-title">Details</div><div class="card"><table class="kv">${details.map(([k, v, raw]) => `<tr><td class="label">${esc(k)}</td><td class="wrap">${raw ? v : esc(v)}</td></tr>`).join("")}</table></div>`;
    html += `<div class="danger-zone btn-row"><button class="btn" data-action="edit-receipt">${icon("edit")}Bearbeiten</button><button class="btn danger" data-action="delete-receipt">${icon("trash")}Löschen</button></div>`;
    return {
      title: r.merchant || "Beleg",
      back: true,
      actions: r.file ? [{ icon: "share", action: "share-file", label: "Teilen" }, { icon: "edit", action: "edit-receipt", label: "Bearbeiten" }] : [{ icon: "edit", action: "edit-receipt", label: "Bearbeiten" }],
      html,
      mount(view) {
        const note = $("#note", view);
        note.addEventListener("change", () => { r.note = note.value.trim(); changed(); });
        if (r.file && (r.format === "pdf" || r.format === "image" || r.format === "web")) renderPreview(r, $("#doc-preview", view));
        if (route.item != null) {
          const row = $(`.items .row[data-idx="${route.item}"]`, view);
          if (row) setTimeout(() => row.scrollIntoView({ block: "center" }), 60);
        }
      }
    };
  };

  function fmtSize(b) {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return Math.round(b / 1024) + " KB";
    return (b / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";
  }

  /** Beleg aus den erkannten Daten als Papierbon darstellen (für TSE, JSON, manuelle Belege …). */
  function paperHtml(r) {
    const items = r.items || [];
    const line = (a, b, cls) => `<div class="p-line ${cls || ""}"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
    let h = `<div class="paper"><div class="p-head">${esc(r.merchant || "Kassenbon")}</div>`;
    h += `<div class="p-center">${esc(fmtDate(r.date))}</div><div class="p-sep"></div>`;
    if (items.length) {
      h += items.map((it) => {
        const meta = itemMeta(it, r.currency);
        return line(it.name, P.formatPlain(it.price)) + (meta ? `<div class="p-small">  ${esc(meta)}</div>` : "");
      }).join("");
      h += `<div class="p-sep"></div>`;
    }
    h += line("SUMME " + (r.currency || "EUR"), r.total != null ? P.formatPlain(r.total) : "–", "p-total");
    if (r.payment) h += line(r.payment, r.total != null ? P.formatPlain(r.total) : "");
    if (r.vat && r.vat.length) {
      h += `<div class="p-sep"></div>` + r.vat.map((v) => line("MwSt " + String(v.rate).replace(".", ",") + " %", v.tax != null ? P.formatPlain(v.tax) : "")).join("");
    }
    if (r.tse && r.tse.serial) {
      h += `<div class="p-sep"></div><div class="p-small">TSE ${esc(r.tse.serial)}${r.tse.transaction ? " · TA " + esc(r.tse.transaction) : ""}${r.tse.start ? "<br>Start " + esc(r.tse.start) : ""}</div>`;
    }
    if (r.format === "sample") h += `<div class="p-sep"></div><div class="p-center p-small">Beispielbeleg – nicht echt</div>`;
    else if (!r.file && r.format === "manual") h += `<div class="p-sep"></div><div class="p-center p-small">Manuell erfasst</div>`;
    return h + `</div>`;
  }

  // ----- Geschäft -----
  VIEWS.merchant = function (route) {
    const g = merchantGroups().find((x) => x.key === route.key);
    if (!g) return { title: "Geschäft", back: true, html: `<p class="muted">Keine Belege mehr für dieses Geschäft.</p>` };
    const cat = catById(g.category);
    const yearKey = String(new Date().getFullYear());
    const yearList = g.receipts.filter((r) => (r.date || "").startsWith(yearKey));
    const freq = new Map();
    g.receipts.forEach((r) => (r.items || []).forEach((it) => {
      if (it.price < 0) return;
      const k = P.fold(it.name).trim();
      if (k.length < 3) return;
      const e = freq.get(k) || { name: it.name, count: 0, last: it.price };
      e.count++;
      freq.set(k, e);
    }));
    const top = Array.from(freq.values()).sort((a, b) => b.count - a.count).slice(0, 10);
    const avg = Math.round(g.total / g.receipts.length);
    let html = `<div class="card hero">
      <span class="avatar lg soft" style="--c:${esc(cat.color)}">${esc(initials(g.name))}</span>
      <div class="hero-merchant">${esc(g.name)}</div>
      <div class="hero-date">${g.receipts.length} ${g.receipts.length === 1 ? "Beleg" : "Belege"} · zuletzt ${esc(fmtDate(g.last, "date"))}</div>
      <div class="chips wrap" style="margin-top:12px"><button class="chip tinted" style="--c:${esc(cat.color)}" data-action="merchant-category">${icon(cat.icon || "tag")}${esc(cat.name)}</button></div>
    </div>
    <div class="summary" style="margin-top:14px">
      <div class="stat"><div class="stat-label">Summe ${yearKey}</div><div class="stat-value">${money(sumOf(yearList))}</div><div class="stat-sub">${yearList.length} ${yearList.length === 1 ? "Einkauf" : "Einkäufe"}</div></div>
      <div class="stat"><div class="stat-label">Ø pro Einkauf</div><div class="stat-value">${money(avg)}</div><div class="stat-sub">gesamt ${money(g.total)}</div></div>
    </div>`;
    if (top.length) {
      html += `<div class="section-title">Häufig gekauft</div><div class="chips wrap">${top.map((x) => `<button class="chip" data-action="search-term" data-term="${esc(x.name)}">${esc(x.name)} <span class="count">${x.count}×</span></button>`).join("")}</div>`;
    }
    html += `<div class="section-title">Letzte Einkäufe</div>` + monthGroups(g.receipts, { hideCategory: false });
    return {
      title: g.name,
      back: true,
      actions: g.key ? [{ icon: "edit", action: "rename-merchant", label: "Umbenennen" }] : [],
      html
    };
  };

  // ----- Kategorie -----
  VIEWS.category = function (route) {
    const cat = catById(route.id);
    const list = sortedReceipts().filter((r) => r.category === cat.id);
    const groups = merchantGroups().filter((g) => g.receipts.some((r) => r.category === cat.id))
      .map((g) => ({ g, rs: g.receipts.filter((r) => r.category === cat.id) }))
      .sort((a, b) => String(b.rs[0].date).localeCompare(String(a.rs[0].date)));
    let html = `<div class="card hero">${catAvatar(cat, "lg")}<div class="hero-merchant" style="margin-top:10px">${esc(cat.name)}</div>
      <div class="hero-date">${list.length} ${list.length === 1 ? "Beleg" : "Belege"} · ${money(sumOf(list))}</div></div>`;
    if (groups.length) {
      html += `<div class="section-title">Geschäfte</div><div class="card list">${groups.map(({ g, rs }) => `<button class="row" data-action="open-merchant" data-key="${esc(g.key)}">
        <span class="avatar soft" style="--c:${esc(cat.color)}">${esc(initials(g.name))}</span>
        <span class="row-main"><span class="row-title">${esc(g.name)}</span><span class="row-sub">${rs.length} ${rs.length === 1 ? "Beleg" : "Belege"} · zuletzt ${esc(fmtDate(rs[0].date, "date"))}</span></span>
        <span class="row-end"><span class="row-amount">${money(sumOf(rs))}</span></span>${icon("chevron", "chev")}</button>`).join("")}</div>`;
      html += `<div class="section-title">Alle Belege</div>` + monthGroups(list, { hideCategory: true });
    } else {
      html += `<p class="muted" style="text-align:center;margin-top:24px">Noch keine Belege in dieser Kategorie.</p>`;
    }
    return { title: cat.name, back: true, html };
  };

  // ----- Kategorien verwalten -----
  const COLORS = ["#2e9e5b", "#d64f8a", "#e07b24", "#3a7bd5", "#8e5bd6", "#1f8fa3", "#9a7b2f", "#d64545", "#c2559d", "#6b7a75", "#4f6bd6", "#b5a50f"];
  const ICONS = ["cart", "drop", "cup", "fuel", "shirt", "plug", "home", "heart", "star", "book", "gift", "paw", "briefcase", "receipt", "tag"];

  VIEWS.categories = function () {
    const counts = {};
    state.receipts.forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; });
    const html = `<div class="card list">${state.categories.map((c) => `<button class="row" data-action="edit-category" data-id="${esc(c.id)}">
        ${catAvatar(c)}<span class="row-main"><span class="row-title">${esc(c.name)}</span><span class="row-sub">${counts[c.id] || 0} Belege</span></span>${icon("edit", "chev")}</button>`).join("")}</div>
      <button class="btn primary block" style="margin-top:14px" data-action="add-category">${icon("plus")}Neue Kategorie</button>
      <p class="muted small" style="margin:14px 4px">Neue Belege werden anhand des Geschäfts automatisch einsortiert. Wenn du die Kategorie eines Geschäfts änderst, merkt sich die App das für künftige Belege.</p>`;
    return { title: "Kategorien", back: true, html };
  };

  function editCategory(id) {
    const existing = state.categories.find((c) => c.id === id);
    const c = existing ? clone(existing) : { id: "c" + uid(), name: "", color: COLORS[10], icon: "tag" };
    const html = `<h2>${existing ? "Kategorie bearbeiten" : "Neue Kategorie"}</h2>
      <label class="field" style="margin-top:12px"><span>Name</span><input id="cat-name" value="${esc(c.name)}" placeholder="z. B. Haustier" maxlength="40"></label>
      <div class="field"><span>Farbe</span></div><div class="color-pick">${COLORS.map((col) => `<button data-color="${col}" style="--c:${col}" class="${col === c.color ? "active" : ""}" aria-label="Farbe ${col}"></button>`).join("")}</div>
      <div class="field"><span>Symbol</span></div><div class="icon-pick">${ICONS.map((ic) => `<button data-icon="${ic}" class="${ic === c.icon ? "active" : ""}">${icon(ic)}</button>`).join("")}</div>
      <div class="btn-row">${existing && c.id !== "other" ? `<button class="btn danger" id="cat-del">${icon("trash")}Löschen</button>` : ""}<button class="btn primary" id="cat-save">Speichern</button></div>`;
    sheet(html, (el, entry) => {
      $$(".color-pick button", el).forEach((b) => b.addEventListener("click", () => {
        c.color = b.dataset.color;
        $$(".color-pick button", el).forEach((x) => x.classList.toggle("active", x === b));
      }));
      $$(".icon-pick button", el).forEach((b) => b.addEventListener("click", () => {
        c.icon = b.dataset.icon;
        $$(".icon-pick button", el).forEach((x) => x.classList.toggle("active", x === b));
      }));
      $("#cat-save", el).addEventListener("click", () => {
        c.name = $("#cat-name", el).value.trim();
        if (!c.name) { $("#cat-name", el).focus(); return; }
        if (existing) Object.assign(existing, c);
        else state.categories.push(c);
        changed();
        closeOverlay(entry);
        render();
      });
      const del = $("#cat-del", el);
      if (del) del.addEventListener("click", async () => {
        const n = state.receipts.filter((r) => r.category === c.id).length;
        closeOverlay(entry);
        const ok = await confirmDialog("Kategorie löschen?", n ? `${n} Belege werden nach „Sonstiges“ verschoben.` : "Die Kategorie wird entfernt.", "Löschen", true);
        if (!ok) return;
        state.receipts.forEach((r) => { if (r.category === c.id) r.category = "other"; });
        Object.values(state.merchants).forEach((m) => { if (m.category === c.id) m.category = "other"; });
        state.categories = state.categories.filter((x) => x.id !== c.id);
        changed();
        render();
      });
      if (!existing) setTimeout(() => $("#cat-name", el).focus(), 80);
    });
  }

  function pickCategory(current, title) {
    return new Promise((resolve) => {
      let chosen = null;
      const html = `<h2>${esc(title || "Kategorie wählen")}</h2><div class="cat-grid" style="margin-top:12px">${state.categories.map((c) =>
        `<button class="cat-tile${c.id === current ? " active" : ""}" style="--c:${esc(c.color)}" data-id="${esc(c.id)}">${catAvatar(c)}${esc(c.name)}</button>`).join("")}</div>`;
      sheet(html, (el, entry) => {
        entry.onClose = () => resolve(chosen);
        $$(".cat-tile", el).forEach((b) => b.addEventListener("click", () => { chosen = b.dataset.id; closeOverlay(entry); }));
      });
    });
  }

  // ----- Export -----
  VIEWS["export"] = function (route) {
    const o = route.opts || (route.opts = { period: "lastMonth", from: "", to: "", business: false, category: "", folders: "month" });
    const list = exportSelection(o);
    const periods = [["thisMonth", "Dieser Monat"], ["lastMonth", "Letzter Monat"], ["thisQuarter", "Dieses Quartal"], ["lastQuarter", "Letztes Quartal"], ["thisYear", "Dieses Jahr"], ["lastYear", "Letztes Jahr"], ["all", "Alles"], ["custom", "Zeitraum …"]];
    const html = `<div class="section-title">Zeitraum</div>
      <div class="chips wrap">${periods.map(([k, l]) => `<button class="chip${o.period === k ? " active" : ""}" data-action="export-opt" data-k="period" data-v="${k}">${esc(l)}</button>`).join("")}</div>
      ${o.period === "custom" ? `<div class="field-row" style="margin-top:12px"><label class="field"><span>Von</span><input type="date" id="ex-from" value="${esc(o.from)}"></label><label class="field"><span>Bis</span><input type="date" id="ex-to" value="${esc(o.to)}"></label></div>` : ""}
      <div class="section-title">Auswahl</div>
      <div class="card">
        <button class="switch-row" data-action="export-opt" data-k="business" data-v="${o.business ? "" : "1"}"><span class="row-main">Nur geschäftliche Belege</span><span class="switch${o.business ? " on" : ""}"></span></button>
        <label class="switch-row"><span class="row-main">Kategorie</span>
          <select id="ex-cat" class="input" style="width:auto;min-height:40px;padding:6px 10px">${[["", "Alle"]].concat(state.categories.map((c) => [c.id, c.name])).map(([k, l]) => `<option value="${esc(k)}" ${o.category === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      </div>
      <div class="section-title">Ordner in der ZIP-Datei</div>
      <div class="seg">${[["month", "Nach Monat"], ["merchant", "Nach Geschäft"], ["none", "Ohne Ordner"]].map(([k, l]) => `<button class="${o.folders === k ? "active" : ""}" data-action="export-opt" data-k="folders" data-v="${k}">${l}</button>`).join("")}</div>
      <div class="card card-pad" style="margin-top:18px;display:flex;align-items:center;gap:14px">
        <span class="avatar soft" style="--c:var(--primary)">${icon("folder")}</span>
        <div class="row-main"><div class="row-title">${list.length} ${list.length === 1 ? "Beleg" : "Belege"} · ${money(sumOf(list))}</div>
        <div class="row-sub">${list.filter((r) => r.file).length} Originaldateien + Übersicht „belege.csv“</div></div>
      </div>
      <div class="btn-row" style="margin-top:16px"><button class="btn" data-action="export-run" data-mode="share" ${list.length ? "" : "disabled"}>${icon("share")}Teilen</button>
        <button class="btn primary" data-action="export-run" data-mode="save" ${list.length ? "" : "disabled"}>${icon("import")}Speichern</button></div>
      <button class="btn ghost block" style="margin-top:6px" data-action="export-csv" ${list.length ? "" : "disabled"}>Nur CSV-Liste teilen</button>
      <p class="muted small" style="margin:14px 4px">Die CSV-Datei (Semikolon-getrennt) lässt sich direkt in Excel, Numbers oder einer Buchhaltungssoftware öffnen. Die Originaldateien sind einheitlich benannt: <i>Datum_Geschäft_Betrag</i>.</p>`;
    return {
      title: "Export",
      back: true,
      html,
      mount(view) {
        const from = $("#ex-from", view);
        const to = $("#ex-to", view);
        if (from) from.addEventListener("change", () => { o.from = from.value; render(); });
        if (to) to.addEventListener("change", () => { o.to = to.value; render(); });
        $("#ex-cat", view).addEventListener("change", (e) => { o.category = e.target.value; render(); });
      }
    };
  };

  function periodRange(o) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const q = Math.floor(m / 3);
    const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    switch (o.period) {
      case "thisMonth": return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
      case "lastMonth": return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
      case "thisQuarter": return [iso(new Date(y, q * 3, 1)), iso(new Date(y, q * 3 + 3, 0))];
      case "lastQuarter": return [iso(new Date(y, q * 3 - 3, 1)), iso(new Date(y, q * 3, 0))];
      case "thisYear": return [y + "-01-01", y + "-12-31"];
      case "lastYear": return [(y - 1) + "-01-01", (y - 1) + "-12-31"];
      case "custom": return [o.from || "0000-01-01", o.to || "9999-12-31"];
      default: return ["0000-01-01", "9999-12-31"];
    }
  }

  function exportSelection(o) {
    const [from, to] = periodRange(o);
    return sortedReceipts().filter((r) => {
      const d = (r.date || r.created || "").slice(0, 10);
      if (d < from || d > to) return false;
      if (o.business && !r.business) return false;
      if (o.category && r.category !== o.category) return false;
      return !r.sample;
    }).reverse();
  }

  function csvFor(list, names) {
    const cell = (v) => {
      const s = String(v == null ? "" : v);
      return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const vatOf = (r, rate) => {
      const v = (r.vat || []).find((x) => x.rate === rate);
      return v && v.tax != null ? P.formatPlain(v.tax) : "";
    };
    const head = ["Datum", "Uhrzeit", "Geschäft", "Kategorie", "Betrag", "Währung", "MwSt 19 %", "MwSt 7 %", "Zahlungsart", "Geschäftlich", "Notiz", "Bon-Nr.", "Artikel", "Datei", "Link"];
    const rows = list.map((r, i) => {
      const d = toDate(r.date);
      return [
        d ? fmtDate(r.date, "date") : "",
        hasTime(r.date) ? r.date.slice(11, 16) : "",
        r.merchant || "",
        catById(r.category).name,
        r.total != null ? P.formatPlain(r.total) : "",
        r.currency || "EUR",
        vatOf(r, 19),
        vatOf(r, 7),
        r.payment || "",
        r.business ? "ja" : "nein",
        r.note || "",
        r.receiptNo || "",
        (r.items || []).length,
        names[i] || "",
        (r.source && r.source.url) || ""
      ];
    });
    return "﻿" + [head].concat(rows).map((row) => row.map(cell).join(";")).join("\r\n") + "\r\n";
  }

  function buildExportEntries(list, folders) {
    const used = new Set();
    const entries = [];
    const names = list.map((r) => {
      if (!r.file) return "";
      let folder = "";
      if (folders === "month") folder = (r.date || r.created || "ohne-Datum").slice(0, 7) + "/";
      else if (folders === "merchant") folder = String(r.merchant || "Ohne Geschäft").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 40) + "/";
      let name = folder + niceFileName(r);
      let n = 2;
      while (used.has(name)) name = folder + niceFileName(r).replace(/(\.[^.]+)$/, "_" + n++ + "$1");
      used.add(name);
      entries.push({ path: name, file: r.file.name });
      return name;
    });
    entries.push({ path: "belege.csv", text: csvFor(list, names) });
    return entries;
  }

  // ----- Prüfen & Speichern -----
  VIEWS.review = function (route) {
    const ctx = route.ctx;
    const f = route.form;
    const d = ctx.draft;
    const dup = findDuplicate(ctx, f);
    const qInfo = route.queueTotal > 1 ? `<span class="counter">${route.queueIndex} von ${route.queueTotal}</span>` : "";
    const detected = [];
    if (!ctx.editId) {
      if (d.merchant) detected.push(`<span class="badge ok">${icon("check")}Geschäft</span>`);
      if (d.date) detected.push(`<span class="badge ok">${icon("check")}Datum</span>`);
      if (d.total != null) detected.push(`<span class="badge ok">${icon("check")}Betrag</span>`);
      if (d.items && d.items.length) detected.push(`<span class="badge ok">${icon("check")}${d.items.length} Artikel</span>`);
      if (d.vat && d.vat.length) detected.push(`<span class="badge ok">${icon("check")}MwSt.</span>`);
      if (!detected.length) detected.push(`<span class="badge warn">Bitte Angaben ergänzen</span>`);
    }
    const merchants = merchantGroups().map((g) => g.name).filter((n) => n && n !== "Ohne Geschäft");
    let html = "";
    if (ctx.file || d.format) {
      html += `<div class="card review-preview"><div class="thumb" id="review-thumb">${icon(d.format === "image" || d.format === "web" ? "image" : "file", "i-lg")}</div>
        <div class="row-main"><div class="row-title">${esc(ctx.file ? (ctx.file.origName || FORMAT_LABEL[d.format] || "Beleg") : (FORMAT_LABEL[d.format] || "Beleg"))}</div>
        <div class="row-sub">${esc(SOURCE_LABEL[ctx.source && ctx.source.type] || "")}${ctx.file && ctx.file.size ? " · " + esc(fmtSize(ctx.file.size)) : ""}</div>
        ${detected.length ? `<div class="detect">${detected.join("")}</div>` : ""}</div></div>`;
    }
    if (dup) {
      html += `<div class="banner" style="margin-top:12px">${icon("warn")}<div class="row-main">Dieser Beleg ist vermutlich schon gespeichert (${esc(dup.merchant || "Beleg")}, ${esc(fmtDate(dup.date, "date"))}).</div>
        <button class="btn" data-action="open-duplicate" data-id="${esc(dup.id)}">Ansehen</button></div>`;
    }
    html += `<div style="height:14px"></div>
      <label class="field"><span>Geschäft</span><input id="f-merchant" list="merchant-list-dl" value="${esc(f.merchant)}" placeholder="z. B. Bäckerei Schmitz" autocomplete="off" autocapitalize="words">
        <datalist id="merchant-list-dl">${merchants.map((m) => `<option value="${esc(m)}">`).join("")}</datalist></label>
      <div class="field-row">
        <label class="field"><span>Datum</span><input id="f-date" type="date" value="${esc(f.date)}"></label>
        <label class="field" style="max-width:130px"><span>Uhrzeit</span><input id="f-time" type="time" value="${esc(f.time)}"></label>
      </div>
      <label class="field"><span>Betrag (€)</span><input id="f-amount" class="input-amount" inputmode="decimal" value="${esc(f.amount)}" placeholder="0,00" autocomplete="off"></label>
      <div class="field"><span>Kategorie</span></div>
      <div class="cat-grid" id="f-cats">${state.categories.map((c) => `<button class="cat-tile${c.id === f.category ? " active" : ""}" style="--c:${esc(c.color)}" data-id="${esc(c.id)}">${catAvatar(c)}${esc(c.name)}</button>`).join("")}</div>
      <div class="card" style="margin-top:14px">
        <button class="switch-row" id="f-business"><span class="row-main">Geschäftlich${`<div class="row-sub">Für Steuer oder Spesenabrechnung markieren</div>`}</span><span class="switch${f.business ? " on" : ""}"></span></button>
      </div>
      <label class="field" style="margin-top:14px"><span>Notiz</span><textarea id="f-note" rows="2" placeholder="optional">${esc(f.note)}</textarea></label>
      <div class="section-title"><span>Artikel${f.items.length ? " · " + f.items.length : ""}</span><button class="link" id="f-add-item">+ Artikel</button></div>
      <div class="item-editor" id="f-items"></div>
      <div class="sticky-actions"><button class="btn" data-action="review-discard">${ctx.editId ? "Abbrechen" : "Verwerfen"}</button><button class="btn primary" data-action="review-save">${icon("check")}Speichern</button></div>`;
    return {
      title: ctx.editId ? "Beleg bearbeiten" : "Neuer Beleg",
      back: true,
      html: (qInfo ? `<div style="text-align:right;margin:-2px 2px 6px">${qInfo}</div>` : "") + html,
      mount(view) {
        const bind = (id, key) => {
          const el = $("#" + id, view);
          el.addEventListener("input", () => { f[key] = el.value; });
        };
        bind("f-merchant", "merchant");
        bind("f-date", "date");
        bind("f-time", "time");
        bind("f-amount", "amount");
        bind("f-note", "note");
        const merchantInput = $("#f-merchant", view);
        merchantInput.addEventListener("change", () => {
          // Bekanntes Geschäft → dessen Kategorie vorschlagen
          if (f.categoryTouched) return;
          const pref = state.merchants[P.keyOf(merchantInput.value)];
          const sug = pref ? pref.category : suggestCategoryFor(merchantInput.value, d);
          if (sug && sug !== f.category) {
            f.category = sug;
            $$("#f-cats .cat-tile", view).forEach((t) => t.classList.toggle("active", t.dataset.id === sug));
          }
        });
        $$("#f-cats .cat-tile", view).forEach((t) => t.addEventListener("click", () => {
          f.category = t.dataset.id;
          f.categoryTouched = true;
          $$("#f-cats .cat-tile", view).forEach((x) => x.classList.toggle("active", x === t));
        }));
        $("#f-business", view).addEventListener("click", (e) => {
          f.business = !f.business;
          $(".switch", e.currentTarget).classList.toggle("on", f.business);
        });
        const itemsEl = $("#f-items", view);
        const drawItems = () => {
          itemsEl.innerHTML = f.items.map((it, i) => `<div class="ie-row" data-i="${i}">
            <input class="ie-name" value="${esc(it.name)}" placeholder="Artikel">
            <input class="ie-price" value="${esc(it.priceText)}" placeholder="0,00" inputmode="decimal">
            <button class="icon-btn" data-del="${i}" aria-label="Artikel entfernen">${icon("close")}</button></div>`).join("") ||
            `<p class="muted small" style="margin:0 4px">Keine Artikel erkannt. Du kannst sie hier für die Suche ergänzen.</p>`;
          $$(".ie-row", itemsEl).forEach((row) => {
            const i = +row.dataset.i;
            $(".ie-name", row).addEventListener("input", (e) => { f.items[i].name = e.target.value; });
            $(".ie-price", row).addEventListener("input", (e) => { f.items[i].priceText = e.target.value; });
            $("[data-del]", row).addEventListener("click", () => { f.items.splice(i, 1); drawItems(); });
          });
        };
        drawItems();
        $("#f-add-item", view).addEventListener("click", () => {
          f.items.push({ name: "", priceText: "" });
          drawItems();
          const last = $$(".ie-name", itemsEl).pop();
          if (last) last.focus();
        });
        if (ctx.file && (d.format === "pdf" || d.format === "image" || d.format === "web")) renderThumb(ctx.file, d.format, $("#review-thumb", view));
      }
    };
  };

  function suggestCategoryFor(merchant, draft) {
    const pref = state.merchants[P.keyOf(merchant)];
    if (pref && pref.category) return pref.category;
    const chain = P.chainFor(merchant || "");
    if (chain) return chain.category;
    const sug = P.suggestCategory(merchant, draft && draft.text);
    if (sug !== "other") return sug;
    return (draft && draft.category) || "other";
  }

  function formFromDraft(draft, existing) {
    const r = existing || {};
    const d = existing ? existing : draft;
    const dateIso = d.date || "";
    let merchant = d.merchant || "";
    if (!existing && !merchant && draft.tse && draft.tse.serial && state.tseMap[draft.tse.serial]) merchant = state.tseMap[draft.tse.serial];
    if (!existing && merchant) {
      // Schreibweise eines bekannten Geschäfts übernehmen
      const known = merchantGroups().find((g) => g.key === P.keyOf(merchant));
      if (known) merchant = known.name;
    }
    return {
      merchant,
      date: dateIso ? dateIso.slice(0, 10) : "",
      time: dateIso && hasTime(dateIso) ? dateIso.slice(11, 16) : "",
      amount: d.total != null ? P.formatPlain(d.total) : "",
      category: existing ? r.category : suggestCategoryFor(merchant, draft),
      business: existing ? !!r.business : false,
      note: existing ? r.note || "" : "",
      items: (d.items || []).map((it) => Object.assign({}, it, { priceText: P.formatPlain(it.price) }))
    };
  }

  function findDuplicate(ctx, f) {
    const sha = ctx.file && ctx.file.sha256;
    const url = ctx.source && ctx.source.url;
    const sig = ctx.draft.tse && ctx.draft.tse.signature;
    return state.receipts.find((r) => {
      if (r.id === ctx.editId) return false;
      if (sha && r.file && r.file.sha256 === sha) return true;
      if (url && r.source && r.source.url === url && !r.pending) return true;
      if (sig && r.tse && r.tse.signature === sig) return true;
      if (!ctx.editId && f && f.merchant && f.amount && f.date) {
        return r.merchantKey === P.keyOf(f.merchant) && r.total === P.parseAmount(f.amount) && (r.date || "").slice(0, 10) === f.date &&
          (!f.time || !hasTime(r.date) || r.date.slice(11, 16) === f.time);
      }
      return false;
    }) || null;
  }

  let reviewQueue = [];
  let reviewTotal = 0;

  function queueReviews(entries) {
    reviewQueue = reviewQueue.concat(entries);
    reviewTotal += entries.length;
    if (top().page !== "review") nextReview();
  }

  function nextReview() {
    const next = reviewQueue.shift();
    if (!next) {
      reviewTotal = 0;
      return false;
    }
    const route = {
      page: "review",
      ctx: next,
      form: formFromDraft(next.draft),
      queueIndex: reviewTotal - reviewQueue.length,
      queueTotal: reviewTotal
    };
    if (top().page === "review") replaceTop(route);
    else go(route);
    return true;
  }

  function closeReview() {
    if (!nextReview()) {
      nav.pop();
      render();
      $("#view").scrollTop = top().scroll || 0;
    }
  }

  async function discardReview(route) {
    const ctx = route.ctx;
    if (!ctx.editId) {
      const ok = await confirmDialog("Beleg verwerfen?", "Der Beleg wird nicht gespeichert.", "Verwerfen", true);
      if (!ok) return;
      if (ctx.file && !ctx.keepFile && !state.receipts.some((r) => r.file && r.file.name === ctx.file.name)) native("deleteFile", ctx.file.name);
    }
    closeReview();
  }

  function receiptFromForm(ctx, f, base) {
    const r = base || { id: "r" + uid(), created: nowIso() };
    const d = ctx.draft;
    r.merchant = String(f.merchant || "").replace(/\s+/g, " ").trim().slice(0, 60);
    r.merchantKey = P.keyOf(r.merchant);
    r.date = f.date ? f.date + "T" + (f.time || "00:00") : (base ? base.date : nowIso());
    r.total = P.parseAmount(f.amount);
    r.currency = (base && base.currency) || d.currency || "EUR";
    r.category = f.category || "other";
    r.business = !!f.business;
    r.note = (f.note || "").trim();
    r.items = f.items.filter((it) => it.name.trim()).map((it) => {
      const price = P.parseAmount(it.priceText);
      return { name: it.name.trim(), qty: it.qty == null ? null : it.qty, unit: it.unit || "", unitPrice: it.unitPrice == null ? null : it.unitPrice, price: price == null ? 0 : price };
    });
    if (!base) {
      r.vat = d.vat || [];
      r.payment = d.payment || "";
      r.receiptNo = d.receiptNo || null;
      r.tse = d.tse || null;
      r.text = String(d.text || "").slice(0, 30000);
      r.format = d.format || (ctx.file ? "file" : "manual");
      r.file = ctx.file ? { name: ctx.file.name, mime: ctx.file.mime, size: ctx.file.size, sha256: ctx.file.sha256, origName: ctx.file.origName } : null;
      r.source = Object.assign({ at: nowIso() }, ctx.source || { type: "manual" });
      r.pending = false;
    }
    return r;
  }

  function rememberMerchant(r) {
    if (!r.merchantKey) return;
    state.merchants[r.merchantKey] = { name: r.merchant, category: r.category };
    if (r.tse && r.tse.serial) state.tseMap[r.tse.serial] = r.merchant;
  }

  function saveReview(route) {
    const ctx = route.ctx;
    const f = route.form;
    if (f.amount && P.parseAmount(f.amount) == null) {
      toast("Der Betrag ist ungültig");
      $("#f-amount").focus();
      return;
    }
    let r;
    if (ctx.editId) {
      const existing = receiptById(ctx.editId);
      if (!existing) return closeReview();
      r = receiptFromForm(ctx, f, existing);
    } else {
      r = receiptFromForm(ctx, f);
      if (ctx.replaceId) {
        // Ausstehender Beleg wurde nachgeladen
        const old = receiptById(ctx.replaceId);
        if (old) {
          r.id = old.id;
          r.created = old.created;
          if (!f.note && old.note) r.note = old.note;
          state.receipts = state.receipts.filter((x) => x.id !== old.id);
        }
      }
      state.receipts.push(r);
    }
    rememberMerchant(r);
    changed();
    saveNow();
    const isEdit = !!ctx.editId;
    closeReview();
    if (!isEdit && top().page !== "review") {
      toast("Beleg gespeichert", { label: "Ansehen", run: () => go({ page: "receipt", id: r.id }) });
    }
  }

  function completePending(entry) {
    const old = receiptById(entry.replaceId);
    if (!old) return;
    const f = formFromDraft(entry.draft);
    if (!f.merchant && old.merchant) f.merchant = old.merchant;
    if (!f.date) { f.date = (old.date || "").slice(0, 10); f.time = hasTime(old.date) ? old.date.slice(11, 16) : ""; }
    f.note = old.note || "";
    f.business = !!old.business;
    if (old.category && old.category !== "other" && !P.keyOf(f.merchant)) f.category = old.category;
    const r = receiptFromForm(entry, f);
    r.id = old.id;
    r.created = old.created;
    state.receipts = state.receipts.filter((x) => x.id !== old.id);
    state.receipts.push(r);
    rememberMerchant(r);
    changed();
    saveNow();
    render();
    toast("Beleg nachgeladen: " + (r.merchant || "Beleg") + (r.total != null ? " · " + money(r.total) : ""), { label: "Ansehen", run: () => go({ page: "receipt", id: r.id }) });
  }

  function quickSaveDraft(entry) {
    const f = formFromDraft(entry.draft);
    if (!f.merchant || !f.amount) return false;
    if (findDuplicate(entry, f)) return false;
    const r = receiptFromForm(entry, f);
    if (entry.replaceId) {
      const old = receiptById(entry.replaceId);
      if (old) { r.id = old.id; r.created = old.created; r.note = old.note || ""; state.receipts = state.receipts.filter((x) => x.id !== old.id); }
    }
    state.receipts.push(r);
    rememberMerchant(r);
    changed();
    return r;
  }

  // ---------------------------------------------------------------------------
  // PDF (pdf.js) – Text lesen und Vorschau zeichnen
  // ---------------------------------------------------------------------------

  let pdfjsPromise = null;
  function loadPdfJs() {
    if (!pdfjsPromise) {
      pdfjsPromise = (async () => {
        // Worker im Hauptthread laden: kein zusätzlicher Thread, funktioniert in jeder WebView
        await import("./vendor/pdfjs/pdf.worker.min.mjs");
        return import("./vendor/pdfjs/pdf.min.mjs");
      })();
      pdfjsPromise.catch(() => { pdfjsPromise = null; });
    }
    return pdfjsPromise;
  }

  async function openPdf(bytes) {
    const pdfjs = await loadPdfJs();
    return pdfjs.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true, verbosity: 0 }).promise;
  }

  async function pdfText(doc) {
    const lines = [];
    const pages = Math.min(doc.numPages, 12);
    for (let p = 1; p <= pages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const rows = [];
      for (const it of content.items) {
        if (typeof it.str !== "string" || (!it.str.trim() && !it.hasEOL)) continue;
        if (!it.str.trim()) continue;
        const x = it.transform[4];
        const y = it.transform[5];
        const h = Math.abs(it.transform[3]) || it.height || 10;
        let row = null;
        for (const r of rows) if (Math.abs(r.y - y) < Math.max(h, r.h) * 0.55) { row = r; break; }
        if (!row) { row = { y, h, parts: [] }; rows.push(row); }
        row.parts.push({ x, w: it.width || 0, s: it.str });
      }
      rows.sort((a, b) => b.y - a.y);
      for (const r of rows) {
        r.parts.sort((a, b) => a.x - b.x);
        let line = "";
        let end = null;
        const cw = r.h * 0.5;
        for (const part of r.parts) {
          if (end != null) {
            const gap = part.x - end;
            if (gap > cw * 1.6) line += "    ";
            else if (gap > cw * 0.2 && !/\s$/.test(line) && !/^\s/.test(part.s)) line += " ";
          }
          line += part.s;
          end = part.x + part.w;
        }
        lines.push(line);
      }
      page.cleanup();
    }
    return lines.join("\n");
  }

  async function pdfEmbeddedXml(doc) {
    try {
      const att = await doc.getAttachments();
      if (!att) return null;
      for (const k of Object.keys(att)) {
        const a = att[k];
        if (/\.xml$/i.test(a.filename || k)) return new TextDecoder("utf-8").decode(a.content);
      }
    } catch (e) { /* keine Anhänge */ }
    return null;
  }

  async function renderPdfPage(doc, pageNo, width, canvas) {
    const page = await doc.getPage(pageNo);
    const base = page.getViewport({ scale: 1 });
    const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
    const scale = (width / base.width) * ratio;
    const vp = page.getViewport({ scale });
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    canvas.style.width = Math.floor(vp.width / ratio) + "px";
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return canvas;
  }

  async function renderPreview(r, el) {
    try {
      if (r.format === "pdf") {
        const doc = await openPdf(await fetchBytes(r.file.name));
        el.innerHTML = "";
        const width = Math.min(el.clientWidth - 24, 520);
        const pages = Math.min(doc.numPages, 6);
        for (let p = 1; p <= pages; p++) {
          const c = document.createElement("canvas");
          el.appendChild(c);
          await renderPdfPage(doc, p, width, c);
        }
        if (doc.numPages > pages) el.insertAdjacentHTML("beforeend", `<p class="muted small">… und ${doc.numPages - pages} weitere Seiten – „Öffnen“ zeigt alles.</p>`);
        doc.destroy();
      } else {
        el.innerHTML = `<img alt="Beleg" src="${esc(fileUrl(r.file.name))}">`;
      }
    } catch (e) {
      el.innerHTML = paperHtml(r) + `<p class="muted small">Vorschau nicht möglich – „Öffnen“ zeigt die Originaldatei.</p>`;
    }
  }

  async function renderThumb(file, format, el) {
    try {
      if (format === "pdf") {
        const doc = await openPdf(await fetchBytes(file.name));
        const c = document.createElement("canvas");
        await renderPdfPage(doc, 1, 64, c);
        el.innerHTML = "";
        el.appendChild(c);
        doc.destroy();
      } else {
        el.innerHTML = `<img alt="" src="${esc(fileUrl(file.name))}">`;
      }
    } catch (e) { /* Symbol bleibt */ }
  }

  // ---------------------------------------------------------------------------
  // Belege einlesen
  // ---------------------------------------------------------------------------

  function kindOf(file) {
    const mime = String(file.mime || "").toLowerCase();
    const ext = String(file.name || file.origName || "").toLowerCase().split(".").pop();
    if (mime === "application/pdf" || ext === "pdf") return "pdf";
    if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) return "image";
    if (mime.includes("json") || ext === "json") return "json";
    if (mime.includes("xml") || ext === "xml") return "xml";
    if (mime.includes("html") || ext === "html" || ext === "htm") return "html";
    if (mime.startsWith("text/") || ["txt", "csv"].includes(ext)) return "text";
    return "file";
  }

  function htmlToText(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, noscript, template, svg").forEach((n) => n.remove());
    doc.querySelectorAll("br").forEach((n) => n.replaceWith("\n"));
    doc.querySelectorAll("p, div, tr, li, h1, h2, h3, h4, h5, h6, table, section, article, header, footer").forEach((n) => n.append("\n"));
    doc.querySelectorAll("td, th").forEach((n) => n.append("    "));
    return (doc.body ? doc.body.textContent : "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  async function analyzeContent(text, kindHint) {
    const t = String(text || "").trim();
    const cls = P.classifyQr(t);
    if (kindHint === "json" || cls.type === "json") {
      const d = P.parseJsonReceipt(t);
      if (d) return d;
    }
    if (kindHint === "xml" || cls.type === "xml") {
      const d = P.parseXmlReceipt(t);
      if (d && (d.total != null || d.merchant)) return d;
      return Object.assign(P.parseText(htmlToText(t)), { format: "xml" });
    }
    if (cls.type === "tse") return P.parseTSE(t);
    if (kindHint === "html") return Object.assign(P.parseText(htmlToText(t)), { format: "html" });
    return P.parseText(t);
  }

  /** Datei auswerten → Entwurf mit erkannten Angaben. */
  async function analyzeFile(file) {
    const kind = kindOf(file);
    let draft = null;
    try {
      if (kind === "pdf") {
        const doc = await openPdf(await fetchBytes(file.name));
        const text = await pdfText(doc);
        const xml = await pdfEmbeddedXml(doc);
        draft = P.parseText(text);
        if (xml) {
          const x = P.parseXmlReceipt(xml);
          if (x) draft = Object.assign(P.mergeDrafts(x, draft), { text: draft.text });
        }
        if ((draft.total == null || !draft.date) && doc.numPages >= 1) {
          // QR-Code der TSE im PDF suchen (Seite als Bild an die App)
          const tse = await qrFromPdf(doc);
          if (tse) draft = P.mergeDrafts(draft, tse);
        }
        if (!text.trim()) draft.textMissing = true;
        doc.destroy();
      } else if (kind === "image") {
        const res = await call("decodeQr", file.name);
        if (res && res.ok && res.text) {
          const t = P.parseTSE(res.text);
          if (t) draft = t;
          else if (/^[\[{<]/.test(res.text.trim())) draft = await analyzeContent(res.text);
        }
        draft = draft || P.emptyDraft();
      } else if (kind === "json" || kind === "xml" || kind === "html" || kind === "text") {
        draft = await analyzeContent(await fetchText(file.name), kind);
      } else {
        draft = P.emptyDraft();
      }
    } catch (e) {
      console.warn("Auswertung fehlgeschlagen", e);
      draft = P.emptyDraft();
      draft.error = String((e && e.message) || e);
    }
    // Format = Art der Originaldatei; TSE-Daten in einer Textdatei bleiben "tse"
    draft.format = kind === "text" && draft.format === "tse" ? "tse" : kind;
    return draft;
  }

  async function qrFromPdf(doc) {
    if (!Native || typeof Native.decodeQrImage !== "function") return null;
    try {
      const pages = [doc.numPages];
      if (doc.numPages > 1) pages.unshift(1);
      for (const p of pages) {
        const c = document.createElement("canvas");
        await renderPdfPage(doc, p, 700, c);
        const res = await call("decodeQrImage", c.toDataURL("image/png"));
        if (res && res.ok && res.text) {
          const t = P.parseTSE(res.text);
          if (t) return t;
        }
      }
    } catch (e) { /* kein QR-Code */ }
    return null;
  }

  async function processFiles(files, sourceType, extra) {
    if (!files || !files.length) return;
    const entries = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.text != null) {
        // Geteilter Text (z. B. Link aus dem Browser)
        await handleQrText(f.text, sourceType);
        continue;
      }
      if (!f.name) continue;
      busy(files.length > 1 ? `Beleg ${i + 1} von ${files.length} wird gelesen …` : "Beleg wird gelesen …");
      const draft = await analyzeFile(f);
      entries.push(Object.assign({ draft, file: f, source: { type: sourceType } }, extra || {}));
    }
    unbusy();
    finishEntries(entries);
  }

  function finishEntries(entries) {
    if (!entries.length) return;
    // Nachgeladene (ausstehende) Belege wurden schon bestätigt → direkt übernehmen
    const completions = entries.filter((e) => e.replaceId);
    entries = entries.filter((e) => !e.replaceId);
    completions.forEach(completePending);
    if (!entries.length) return;
    if (state.settings.quickSave) {
      const rest = [];
      let saved = 0;
      let lastSaved = null;
      for (const e of entries) {
        const r = quickSaveDraft(e);
        if (r) { saved++; lastSaved = r; } else rest.push(e);
      }
      if (saved) {
        saveNow();
        render();
        toast(saved === 1 ? "Beleg gespeichert" : saved + " Belege gespeichert", lastSaved ? { label: "Ansehen", run: () => go({ page: "receipt", id: lastSaved.id }) } : null);
      }
      if (rest.length) queueReviews(rest);
      return;
    }
    queueReviews(entries);
  }

  /** Inhalt eines QR-Codes (oder geteilter Text) verarbeiten. */
  async function handleQrText(text, sourceType, opts) {
    const t = String(text || "").trim();
    if (!t) return;
    const cls = P.classifyQr(t);
    if (cls.type === "url") return importUrl(cls.url, sourceType || "scan", opts);
    let ext = "txt";
    if (cls.type === "json") ext = "json";
    else if (cls.type === "xml") ext = "xml";
    if (cls.type === "text" && !(opts && opts.silent)) {
      const choice = await dialog({
        title: "Inhalt des QR-Codes",
        html: `<pre class="raw-text" style="border-radius:12px;max-height:200px;margin-bottom:12px">${esc(t.slice(0, 1500))}</pre>`,
        text: "Der Code enthält keinen Link zu einem digitalen Beleg. Trotzdem als Beleg speichern?",
        buttons: [{ label: "Abbrechen", value: false }, { label: "Als Beleg speichern", value: true, kind: "primary" }]
      });
      if (!choice) return;
    }
    const info = parseJson(native("writeText", t, ext), null);
    const draft = await analyzeContent(t, ext === "txt" ? "text" : ext);
    if (cls.type === "tse") draft.format = "tse";
    else draft.format = ext === "txt" ? "text" : ext;
    if (!draft.date && (sourceType || "scan") === "scan") draft.date = nowIso();
    const entry = { draft, file: info && info.name ? info : null, source: { type: sourceType || "scan" } };
    finishEntries([entry]);
  }

  function linkCandidates(html, base) {
    const out = [];
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const push = (href, text, bonus) => {
        if (!href || /^(javascript|mailto|tel):/i.test(href)) return;
        let url;
        try { url = new URL(href, base).href; } catch (e) { return; }
        if (!/^https?:/i.test(url)) return;
        const h = href.toLowerCase();
        const t = String(text || "").toLowerCase();
        let score = bonus || 0;
        if (/\.pdf(\?|#|$)/.test(h)) score += 6;
        else if (/pdf/.test(h)) score += 3;
        if (/\.(json|xml)(\?|#|$)/.test(h)) score += 5;
        if (/download|herunterladen/.test(h + " " + t)) score += 2;
        if (/pdf/.test(t)) score += 3;
        if (/beleg|bon|receipt|rechnung|invoice/.test(h + " " + t)) score += 1;
        if (score >= 3 && !out.some((o) => o.url === url)) out.push({ url, score });
      };
      doc.querySelectorAll("a[href]").forEach((a) => push(a.getAttribute("href"), a.textContent + " " + (a.getAttribute("download") != null ? "download" : ""), 0));
      doc.querySelectorAll("iframe[src], embed[src], object[data]").forEach((e) => push(e.getAttribute("src") || e.getAttribute("data"), "pdf", 1));
      const meta = doc.querySelector('meta[http-equiv="refresh" i]');
      if (meta) {
        const m = /url=(.+)$/i.exec(meta.getAttribute("content") || "");
        if (m) push(m[1].replace(/['"]/g, "").trim(), "", 4);
      }
    } catch (e) { /* kein HTML */ }
    return out.sort((a, b) => b.score - a.score);
  }

  function merchantFromUrl(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      const chain = P.chainFor(host.replace(/[.-]/g, " "));
      return chain ? chain.name : "";
    } catch (e) {
      return "";
    }
  }

  async function downloadUrl(url) {
    if (!Native || typeof Native.download !== "function") return { ok: false, error: "Herunterladen ist nur in der App möglich.", errorType: "unsupported" };
    return (await call("download", url)) || { ok: false, error: "Keine Antwort", errorType: "network" };
  }

  /** Link aus dem QR-Code laden: Datei direkt übernehmen, Webseite auswerten oder im Browser öffnen. */
  async function importUrl(url, sourceType, opts) {
    const o = opts || {};
    const st = sourceType || "scan";
    if (!o.replaceId) {
      const dup = state.receipts.find((r) => r.source && r.source.url === url);
      if (dup) {
        const c = await dialog({
          title: "Schon gespeichert",
          text: `Diesen Beleg hast du bereits${dup.merchant ? " (" + dup.merchant + ", " + fmtDate(dup.date, "date") + ")" : ""}.`,
          buttons: [{ label: "Neu laden", value: "again" }, { label: "Beleg öffnen", value: "open", kind: "primary" }]
        });
        if (c === "open") return go({ page: "receipt", id: dup.id });
        if (c !== "again") return;
      }
    }
    busy("Beleg wird geladen …");
    let res = await downloadUrl(url);
    if (res.ok && res.kind === "html") {
      const cands = linkCandidates(res.html || "", res.finalUrl || url);
      if (cands.length && cands[0].score >= 5) {
        busy("Beleg wird heruntergeladen …");
        const second = await downloadUrl(cands[0].url);
        if (second.ok && second.kind === "file") res = second;
      }
    }
    unbusy();
    const extra = { source: { type: st, url } };
    if (o.replaceId) extra.replaceId = o.replaceId;
    if (res.ok && res.kind === "file") {
      busy("Beleg wird gelesen …");
      const draft = await analyzeFile(res.file);
      unbusy();
      if (!draft.date && st === "scan" && !o.replaceId) draft.date = nowIso();
      if (o.pendingDate && !draft.date) draft.date = o.pendingDate;
      if (!draft.merchant) draft.merchant = merchantFromUrl(res.finalUrl || url);
      finishEntries([Object.assign({ draft, file: res.file }, extra)]);
      return true;
    }
    if (res.ok && res.kind === "html") {
      if (o.auto && o.replaceId) {
        // Beim automatischen Nachladen keinen Browser aufdrängen
        const pr = receiptById(o.replaceId);
        if (pr) { pr.needsBrowser = true; pr.pendingError = "Beleg-Webseite – zum Übernehmen öffnen"; changed(); render(); }
        return false;
      }
      // Beleg-Webseite: im eingebauten Browser anzeigen, dort PDF laden oder Seite sichern
      const b = await openInAppBrowser(res.finalUrl || url);
      if (b && b.ok) {
        await handleBrowserResult(b, extra, o);
        return true;
      }
      if (b && b.cancelled && !o.replaceId) {
        const keep = await dialog({
          title: "Beleg nicht übernommen",
          text: "Soll der Link trotzdem gespeichert werden? Du kannst den Beleg später öffnen und übernehmen.",
          buttons: [{ label: "Nein", value: false }, { label: "Link merken", value: true, kind: "primary" }]
        });
        if (keep) createPending(url, st, "Webseite noch nicht übernommen", true);
      }
      return false;
    }
    // Fehler
    if (o.replaceId) {
      const r = receiptById(o.replaceId);
      if (r) { r.pendingError = res.error || "Fehler"; changed(); }
      return false;
    }
    if (res.errorType === "offline" || res.errorType === "network") {
      createPending(url, st, res.error);
      toast("Kein Internet – der Beleg wird automatisch nachgeladen.");
      return false;
    }
    const c = await dialog({
      title: "Beleg konnte nicht geladen werden",
      text: (res.error || "Unbekannter Fehler") + "\n\n" + url,
      stack: true,
      buttons: [
        { label: "Im Browser öffnen", value: "browser", kind: "primary" },
        { label: "Später erneut versuchen", value: "later" },
        { label: "Abbrechen", value: false }
      ]
    });
    if (c === "browser") {
      const b = await openInAppBrowser(url);
      if (b && b.ok) await handleBrowserResult(b, extra, o);
    } else if (c === "later") {
      createPending(url, st, res.error);
    }
    return false;
  }

  async function openInAppBrowser(url) {
    if (!Native || typeof Native.openBrowser !== "function") {
      window.open(url, "_blank");
      return { ok: false, cancelled: true };
    }
    return call("openBrowser", url);
  }

  async function handleBrowserResult(b, extra, o) {
    if (b.kind === "file" && b.file) {
      busy("Beleg wird gelesen …");
      const draft = await analyzeFile(b.file);
      unbusy();
      if (!draft.merchant) draft.merchant = merchantFromUrl(b.url || extra.source.url);
      if (!draft.date && o && o.pendingDate) draft.date = o.pendingDate;
      finishEntries([Object.assign({ draft, file: b.file }, extra)]);
    } else if (b.kind === "snapshot" && b.file) {
      const draft = Object.assign(P.parseText(b.text || ""), { format: "web" });
      if (!draft.merchant) draft.merchant = merchantFromUrl(b.url || extra.source.url) || P.cleanMerchantName(b.title || "");
      if (!draft.date && o && o.pendingDate) draft.date = o.pendingDate;
      if (!draft.date) draft.date = nowIso();
      extra.source.type = extra.source.type === "scan" ? "scan" : "browser";
      finishEntries([Object.assign({ draft, file: b.file }, extra)]);
    }
  }

  function createPending(url, sourceType, error, needsBrowser) {
    const r = {
      id: "r" + uid(),
      created: nowIso(),
      merchant: merchantFromUrl(url),
      merchantKey: "",
      date: nowIso(),
      total: null,
      currency: "EUR",
      category: "other",
      business: false,
      note: "",
      items: [],
      vat: [],
      payment: "",
      text: "",
      format: null,
      file: null,
      source: { type: sourceType, url, at: nowIso() },
      pending: true,
      pendingError: error || "",
      needsBrowser: !!needsBrowser
    };
    r.merchantKey = P.keyOf(r.merchant);
    if (r.merchant) r.category = suggestCategoryFor(r.merchant, null);
    state.receipts.push(r);
    changed();
    saveNow();
    render();
  }

  let retrying = false;
  async function retryPending(manual) {
    if (retrying) return;
    const list = state.receipts.filter((r) => r.pending && r.source && r.source.url && (manual || !r.needsBrowser));
    if (!list.length) return;
    if (!manual && navigator.onLine === false) return;
    retrying = true;
    try {
      for (const r of list) {
        await importUrl(r.source.url, r.source.type, { replaceId: r.id, pendingDate: r.date, auto: !manual });
      }
    } finally {
      retrying = false;
    }
    if (manual) render();
  }

  // ---------------------------------------------------------------------------
  // Beispielbelege
  // ---------------------------------------------------------------------------

  function loadSamples() {
    const now = new Date();
    const at = (daysAgo, h, m) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m);
      return P.toLocalIso(d);
    };
    const it = (name, price, qty, unitPrice, unit) => ({ name, price, qty: qty || null, unitPrice: unitPrice || null, unit: unit || "" });
    const samples = [
      ["REWE", "food", at(0, 10, 14), 533, "Karte", [it("JA! H-Milch 1,5%", 178, 2, 89), it("Bio Bananen", 152, 0.764, 199, "kg"), it("Laugenbrezel", 59), it("Coca-Cola 1,0l", 149), it("Pfand", 25), it("Rabatt", -30)], [{ rate: 19, net: 146, tax: 28, gross: 174 }, { rate: 7, net: 336, tax: 23, gross: 359 }]],
      ["dm", "drug", at(1, 11, 2), 565, "Karte", [it("Balea Duschgel Men", 95), it("alverde Gesichtscreme", 345), it("Zahnbürste Dontodent", 125)], [{ rate: 19, net: 475, tax: 90, gross: 565 }]],
      ["Trattoria Da Mario", "gastro", at(2, 20, 31), 3750, "Kreditkarte", [it("Pizza Margherita", 1900, 2, 950), it("Tiramisu", 650), it("Cola 0,33l", 960, 3, 320), it("Espresso", 240)], [{ rate: 19, net: 3151, tax: 599, gross: 3750 }]],
      ["Aral", "mobility", at(4, 7, 12), 7894, "Karte", [it("Super E10 44,00 l", 7696), it("Kaffee to go", 198)], [{ rate: 19, net: 6634, tax: 1260, gross: 7894 }], true],
      ["Lidl", "food", at(6, 18, 42), 758, "Karte", [it("Joghurt Natur", 178, 2, 89), it("Bananen", 152), it("Vollkornbrot", 199), it("Kerrygold Butter", 279), it("Lidl Plus Rabatt", -50)], [{ rate: 7, net: 708, tax: 50, gross: 758 }]],
      ["MediaMarkt", "tech", at(9, 15, 20), 4999, "Karte", [it("USB-C Ladegerät 65W", 3499), it("HDMI-Kabel 2m", 1500)], [{ rate: 19, net: 4201, tax: 798, gross: 4999 }], true],
      ["Bäckerei Schmitz", "food", at(12, 7, 45), 785, "Bar", [it("Roggenbrot 750g", 395), it("Brötchen", 270, 6, 45), it("Butterbreze", 120)], [{ rate: 7, net: 734, tax: 51, gross: 785 }]],
      ["REWE", "food", at(16, 17, 55), 2346, "Karte", [it("Bio Vollmilch 3,8%", 129), it("Gouda jung", 249), it("Spaghetti", 99), it("Tomaten passiert", 89), it("Rinderhack 500g", 549), it("Basilikum Topf", 199), it("Mineralwasser 6x1,5l", 354), it("Pfand", 150), it("Äpfel Elstar", 528, 1.2, 440, "kg")], [{ rate: 7, net: 1959, tax: 137, gross: 2096 }, { rate: 19, net: 210, tax: 40, gross: 250 }]],
      ["IKEA", "home", at(24, 13, 10), 4697, "Kreditkarte", [it("KALLAX Regal", 3999), it("Teelichter 100 St.", 399), it("Hot Dog", 299)], [{ rate: 19, net: 3947, tax: 750, gross: 4697 }]],
      ["dm", "drug", at(33, 16, 40), 1287, "Bar", [it("Sonnencreme LSF 30", 495), it("Bio Vollmilch 3,8%", 109), it("Taschentücher", 189), it("Zahnpasta", 145), it("Shampoo", 349)], [{ rate: 19, net: 1063, tax: 202, gross: 1265 }]],
      ["Stadt-Apotheke", "health", at(41, 9, 30), 1495, "Karte", [it("Ibuprofen 400", 595), it("Nasenspray", 450), it("Halstabletten", 450)], [{ rate: 19, net: 1256, tax: 239, gross: 1495 }]],
      ["Café Central", "gastro", at(52, 15, 5), 1180, "Bar", [it("Cappuccino", 380, 2, 190), it("Käsekuchen", 420), it("Trinkgeld", 380)], [{ rate: 19, net: 992, tax: 188, gross: 1180 }]]
    ];
    samples.forEach(([merchant, category, date, total, payment, items, vat, business], i) => {
      state.receipts.push({
        id: "s" + uid() + i,
        created: nowIso(),
        merchant,
        merchantKey: P.keyOf(merchant),
        date,
        total,
        currency: "EUR",
        category,
        business: !!business,
        note: "",
        items,
        vat,
        payment,
        receiptNo: null,
        tse: null,
        text: items.map((x) => x.name).join("\n"),
        format: "sample",
        file: null,
        source: { type: "sample", at: nowIso() },
        pending: false,
        sample: true
      });
    });
    changed();
    saveNow();
    goTab("belege");
    toast("12 Beispielbelege geladen");
  }

  // ---------------------------------------------------------------------------
  // Aktionen (Klicks)
  // ---------------------------------------------------------------------------

  async function scan() {
    if (!Native || typeof Native.scan !== "function") {
      const t = await prompt("QR-Code-Inhalt", "", { text: "Im Browser gibt es keine Kamera-Erkennung. Füge den Inhalt des QR-Codes ein (z. B. den Link).", ok: "Weiter" });
      if (t) handleQrText(t, "scan");
      return;
    }
    const res = await call("scan");
    if (res && res.ok && res.text) await handleQrText(res.text, "scan");
    else if (res && res.error) toast(res.error);
  }

  function addMenu() {
    const item = (iconName, title, sub, action) => `<button class="row" data-act="${action}"><span class="avatar soft" style="--c:var(--primary)">${icon(iconName)}</span>
      <span class="row-main"><span class="row-title">${esc(title)}</span><span class="row-sub">${esc(sub)}</span></span></button>`;
    sheet(`<h2>Beleg hinzufügen</h2><div class="list menu">
      ${item("scan", "QR-Code scannen", "An der Kasse oder auf dem Kassenbon", "scan")}
      ${item("import", "Datei importieren", "PDF, Bild, JSON oder XML aus Downloads", "import-files")}
      ${item("image", "QR-Code aus Bild lesen", "z. B. aus einem Screenshot", "qr-image")}
      ${item("link", "Link einfügen", "Adresse eines digitalen Belegs", "paste-link")}
      ${item("pen", "Manuell erfassen", "Beleg ohne Datei eintragen", "manual")}
    </div>`, (el, entry) => {
      $$("[data-act]", el).forEach((b) => b.addEventListener("click", () => {
        closeOverlay(entry);
        ACTIONS[b.dataset.act](b);
      }));
    });
  }

  const ACTIONS = {
    back: () => goBack(),
    scan: () => scan(),
    "add-menu": () => addMenu(),
    "goto-search": () => goTab("suche"),
    "import-files": async () => {
      const res = await call("pickFiles", "");
      if (res && res.ok && res.files && res.files.length) processFiles(res.files, "import");
      else if (res && res.error) toast(res.error);
    },
    "qr-image": async () => {
      const res = await call("pickFiles", "image/*");
      if (!res || !res.ok || !res.files || !res.files.length) return;
      const f = res.files[0];
      busy("QR-Code wird gesucht …");
      const q = await call("decodeQr", f.name);
      unbusy();
      native("deleteFile", f.name);
      if (q && q.ok && q.text) handleQrText(q.text, "image");
      else dialog({ title: "Kein QR-Code gefunden", text: "Im Bild wurde kein lesbarer QR-Code erkannt. Achte auf einen scharfen, vollständigen Ausschnitt." });
    },
    "paste-link": async () => {
      const clip = String(native("clipboardText") || "").trim();
      const t = await prompt("Link einfügen", /^https?:\/\//i.test(clip) ? clip : "", { placeholder: "https://…", type: "url", ok: "Laden" });
      if (t) handleQrText(t, "link");
    },
    manual: () => {
      const draft = P.emptyDraft();
      draft.date = nowIso();
      queueReviews([{ draft, file: null, source: { type: "manual" } }]);
    },
    "open-receipt": (el) => go({ page: "receipt", id: el.dataset.id, item: el.dataset.item != null ? +el.dataset.item : null }),
    "open-duplicate": (el) => go({ page: "receipt", id: el.dataset.id }),
    "open-merchant": (el) => go({ page: "merchant", key: el.dataset.key }),
    "open-category": (el) => go({ page: "category", id: el.dataset.id }),
    filter: (el) => { ui.filter = el.dataset.filter; render(); },
    "merchant-mode": (el) => { ui.merchantMode = el.dataset.mode; render(); },
    "merchant-sort": (el) => { state.settings.merchantSort = el.dataset.sort; changed(); render(); },
    "search-term": (el) => { ui.query = el.dataset.term; rememberSearch(ui.query); goTab("suche"); },
    "retry-pending": () => retryPending(true),
    "retry-one": () => {
      const r = receiptById(top().id);
      if (!r) return;
      if (r.needsBrowser) {
        openInAppBrowser(r.source.url).then((b) => { if (b && b.ok) handleBrowserResult(b, { source: { type: r.source.type, url: r.source.url }, replaceId: r.id }, { pendingDate: r.date }); });
      } else importUrl(r.source.url, r.source.type, { replaceId: r.id, pendingDate: r.date }).then(() => render());
    },
    "pick-category": async () => {
      const r = receiptById(top().id);
      const id = await pickCategory(r.category);
      if (!id || id === r.category) return;
      r.category = id;
      if (r.merchantKey) state.merchants[r.merchantKey] = { name: r.merchant, category: id };
      changed();
      render();
    },
    "toggle-business": () => {
      const r = receiptById(top().id);
      r.business = !r.business;
      changed();
      render();
      toast(r.business ? "Als geschäftlich markiert" : "Als privat markiert");
    },
    "edit-receipt": () => {
      const r = receiptById(top().id);
      if (!r) return;
      go({ page: "review", ctx: { draft: r, file: r.file, source: r.source, editId: r.id }, form: formFromDraft(null, r) });
    },
    "delete-receipt": async () => {
      const r = receiptById(top().id);
      const ok = await confirmDialog("Beleg löschen?", `${r.merchant || "Beleg"} vom ${fmtDate(r.date, "date")} wird endgültig gelöscht – auch die Originaldatei.`, "Löschen", true);
      if (!ok) return;
      state.receipts = state.receipts.filter((x) => x.id !== r.id);
      if (r.file && !state.receipts.some((x) => x.file && x.file.name === r.file.name)) native("deleteFile", r.file.name);
      changed();
      saveNow();
      goBack();
      toast("Beleg gelöscht");
    },
    "open-file": () => {
      const r = receiptById(top().id);
      if (r && r.file) native("openFile", r.file.name, niceFileName(r), r.file.mime || "");
    },
    "share-file": () => {
      const r = receiptById(top().id);
      if (r && r.file) native("shareFile", r.file.name, niceFileName(r), r.file.mime || "");
    },
    "show-raw": async () => {
      const r = receiptById(top().id);
      let text = "";
      try { text = await fetchText(r.file.name); } catch (e) { text = r.text || ""; }
      if (r.format === "json") { try { text = JSON.stringify(JSON.parse(text), null, 2); } catch (e) { /* Rohtext */ } }
      sheet(`<h2>Rohdaten</h2><p class="lead">${esc(niceFileName(r))}</p><pre class="raw-text" style="border-radius:12px;max-height:60dvh">${esc(text.slice(0, 60000))}</pre>`);
    },
    "open-source": () => {
      const r = receiptById(top().id);
      if (r && r.source && r.source.url) native("openUrl", r.source.url);
    },
    "rename-merchant": async () => {
      const key = top().key;
      const g = merchantGroups().find((x) => x.key === key);
      if (!g) return;
      const names = merchantGroups().map((x) => x.name).filter((n) => n !== g.name);
      const name = await prompt("Geschäft umbenennen", g.name, { text: "Gib den Namen eines anderen Geschäfts ein, um beide zusammenzuführen.", list: names });
      if (!name || !name.trim() || name.trim() === g.name) return;
      const clean = name.trim();
      const newKey = P.keyOf(clean);
      const target = merchantGroups().find((x) => x.key === newKey);
      const finalName = target ? target.name : clean;
      g.receipts.forEach((r) => { r.merchant = finalName; r.merchantKey = newKey; });
      if (state.merchants[key] && !state.merchants[newKey]) state.merchants[newKey] = Object.assign({}, state.merchants[key], { name: finalName });
      Object.keys(state.tseMap).forEach((s) => { if (P.keyOf(state.tseMap[s]) === key) state.tseMap[s] = finalName; });
      changed();
      top().key = newKey;
      render();
      toast(target ? "Geschäfte zusammengeführt" : "Geschäft umbenannt");
    },
    "merchant-category": async () => {
      const key = top().key;
      const g = merchantGroups().find((x) => x.key === key);
      if (!g) return;
      const id = await pickCategory(g.category, "Kategorie für " + g.name);
      if (!id) return;
      state.merchants[key] = { name: g.name, category: id };
      const others = g.receipts.filter((r) => r.category !== id);
      if (others.length) {
        const all = await confirmDialog("Auf alle Belege anwenden?", `${others.length} Belege von ${g.name} haben eine andere Kategorie. Sollen sie ebenfalls geändert werden?`, "Alle ändern");
        if (all) others.forEach((r) => { r.category = id; });
      }
      changed();
      render();
    },
    "manage-categories": () => go({ page: "categories" }),
    "edit-category": (el) => editCategory(el.dataset.id),
    "add-category": () => editCategory(null),
    "open-export": () => go({ page: "export" }),
    "export-opt": (el) => {
      const o = top().opts;
      o[el.dataset.k] = el.dataset.k === "business" ? !!el.dataset.v : el.dataset.v;
      if (o.period === "custom" && !o.from) {
        const [f, t] = periodRange({ period: "thisYear" });
        o.from = f; o.to = t;
      }
      render();
    },
    "export-run": async (el) => {
      const o = top().opts;
      const list = exportSelection(o);
      if (!list.length) return;
      const [from, to] = periodRange(o);
      const label = o.period === "all" ? "alle" : (from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : from + "_bis_" + to);
      const spec = { fileName: "Belege_" + label + ".zip", mode: el.dataset.mode, entries: buildExportEntries(list, o.folders) };
      busy("ZIP-Datei wird erstellt …");
      const res = await call("exportZip", JSON.stringify(spec));
      unbusy();
      if (res && res.ok) { if (res.saved) toast("Export gespeichert"); }
      else if (res && res.error) dialog({ title: "Export fehlgeschlagen", text: res.error });
    },
    "export-csv": async () => {
      const o = top().opts;
      const list = exportSelection(o);
      const names = list.map((r) => (r.file ? niceFileName(r) : ""));
      const res = await call("exportText", JSON.stringify({ fileName: "belege.csv", mime: "text/csv", text: csvFor(list, names), mode: "share" }));
      if (res && !res.ok && res.error) toast(res.error);
    },
    "backup-create": async () => {
      const files = state.receipts.filter((r) => r.file).map((r) => r.file.name);
      const d = new Date();
      const spec = {
        fileName: "Bonarchiv-Sicherung_" + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + ".zip",
        mode: "save",
        entries: [{ path: "bonarchiv.json", text: JSON.stringify(state) }].concat(Array.from(new Set(files)).map((n) => ({ path: "docs/" + n, file: n })))
      };
      busy("Sicherung wird erstellt …");
      const res = await call("exportZip", JSON.stringify(spec));
      unbusy();
      if (res && res.ok && res.saved) toast("Sicherung gespeichert");
      else if (res && res.error) dialog({ title: "Sicherung fehlgeschlagen", text: res.error });
    },
    "backup-restore": async () => {
      const res = await call("pickBackup");
      if (!res || !res.ok) { if (res && res.error) dialog({ title: "Wiederherstellen fehlgeschlagen", text: res.error }); return; }
      const data = parseJson(res.index, null);
      if (!data || !Array.isArray(data.receipts)) { dialog({ title: "Keine Bonarchiv-Sicherung", text: "Die Datei enthält keine Belege von Bonarchiv." }); return; }
      const ids = new Set(state.receipts.map((r) => r.id));
      let added = 0;
      data.receipts.forEach((r) => { if (r && r.id && !ids.has(r.id)) { state.receipts.push(r); added++; } });
      (data.categories || []).forEach((c) => { if (c && c.id && !state.categories.some((x) => x.id === c.id)) state.categories.push(c); });
      Object.keys(data.merchants || {}).forEach((k) => { if (!state.merchants[k]) state.merchants[k] = data.merchants[k]; });
      Object.keys(data.tseMap || {}).forEach((k) => { if (!state.tseMap[k]) state.tseMap[k] = data.tseMap[k]; });
      changed();
      saveNow();
      render();
      dialog({ title: "Sicherung übernommen", text: added ? `${added} Belege wurden hinzugefügt.` : "Alle Belege der Sicherung waren schon vorhanden." });
    },
    "toggle-setting": (el) => {
      const k = el.dataset.key;
      state.settings[k] = !state.settings[k];
      changed();
      render();
    },
    "set-theme": (el) => {
      state.settings.theme = el.dataset.theme;
      changed();
      applyTheme();
      render();
    },
    "load-samples": () => loadSamples(),
    "remove-samples": async () => {
      const ok = await confirmDialog("Beispielbelege entfernen?", "Deine eigenen Belege bleiben erhalten.", "Entfernen", true);
      if (!ok) return;
      state.receipts = state.receipts.filter((r) => !r.sample);
      changed();
      saveNow();
      render();
    },
    "review-save": () => saveReview(top()),
    "review-discard": () => discardReview(top())
  };

  function onClick(e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const fn = ACTIONS[el.dataset.action];
    if (!fn) return;
    e.preventDefault();
    fn(el, e);
  }

  // ---------------------------------------------------------------------------
  // Aufrufe aus der App (Java)
  // ---------------------------------------------------------------------------

  window.BonApp = {
    resolve(id, json) {
      const r = waiting.get(id);
      if (!r) return;
      waiting.delete(id);
      r(parseJson(json, null));
    },
    back() {
      return goBack();
    },
    incoming(json) {
      const list = parseJson(json, []);
      if (list && list.length) processFiles(list, "share");
    },
    setSystemDark(dark) {
      systemDark = !!dark;
      applyTheme();
    },
    resume() {
      retryPending(false);
    },
    flush() {
      if (saveTimer) saveNow();
    },
    // Für Tests
    _state: () => state,
    _handleQrText: (t, s) => handleQrText(t, s)
  };

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  async function start() {
    if (!Native) {
      // Entwicklungsmodus im Browser: Ersatz für die App-Funktionen laden
      await new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = "dev-bridge.js";
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      });
      Native = window.BonAndroid || null;
    }
    const sd = native("isDarkMode");
    systemDark = sd == null ? window.matchMedia("(prefers-color-scheme: dark)").matches : !!sd;
    if (sd == null) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => { systemDark = e.matches; applyTheme(); });
    loadState();
    document.addEventListener("click", onClick);
    $("#view").addEventListener("scroll", () => $("#topbar").classList.toggle("scrolled", $("#view").scrollTop > 4), { passive: true });
    $$(".tab[data-tab]").forEach((t) => t.addEventListener("click", () => goTab(t.dataset.tab)));
    window.addEventListener("online", () => retryPending(false));
    document.addEventListener("visibilitychange", () => { if (document.hidden && saveTimer) saveNow(); });
    render();

    // Aufräumen: Dateien ohne Beleg entfernen (die App löscht nur ältere Dateien)
    const keep = state.receipts.filter((r) => r.file).map((r) => r.file.name);
    native("cleanup", JSON.stringify(keep));

    const incoming = parseJson(native("ready"), []);
    if (incoming && incoming.length) processFiles(incoming, "share");
    else if (state.settings.scanOnStart) setTimeout(scan, 250);
    setTimeout(() => retryPending(false), 1500);
  }

  start();
})();
