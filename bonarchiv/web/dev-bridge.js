/*
 * Nur für Entwicklung und Tests im Browser – wird NICHT in die Android-App gepackt.
 * Ahmt window.BonAndroid nach: Daten in localStorage, Dateien im Arbeitsspeicher.
 */
(function () {
  "use strict";
  const files = new Map();
  let counter = 0;
  const KEY = "bonarchiv-dev-state";

  const reply = (id, obj) => setTimeout(() => window.BonApp && window.BonApp.resolve(id, JSON.stringify(obj)), 0);

  function hash(bytes) {
    // FNV-1a als einfacher Ersatz für SHA-256
    let h = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0") + bytes.length.toString(16);
  }

  function extFor(mime, name) {
    const fromName = /\.([a-z0-9]{2,5})$/i.exec(name || "");
    if (fromName) return fromName[1].toLowerCase();
    if (/pdf/.test(mime)) return "pdf";
    if (/json/.test(mime)) return "json";
    if (/xml/.test(mime)) return "xml";
    if (/png/.test(mime)) return "png";
    if (/jpe?g/.test(mime)) return "jpg";
    if (/html/.test(mime)) return "html";
    return "txt";
  }

  function store(bytes, mime, origName) {
    const ext = extFor(mime, origName);
    const name = "d" + Date.now().toString(36) + (counter++) + "." + ext;
    const type = mime || (ext === "pdf" ? "application/pdf" : "application/octet-stream");
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    files.set(name, { bytes, mime: type, url });
    return { name, mime: type, size: bytes.length, sha256: hash(bytes), origName: origName || name };
  }

  function pick(accept) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      if (accept) input.accept = accept;
      input.onchange = async () => {
        const out = [];
        for (const f of Array.from(input.files || [])) out.push(store(new Uint8Array(await f.arrayBuffer()), f.type, f.name));
        resolve(out);
      };
      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  window.BonAndroid = {
    loadState: () => localStorage.getItem(KEY) || "",
    saveState(json) {
      try { localStorage.setItem(KEY, json); return true; } catch (e) { return false; }
    },
    fileUrl: (name) => (files.get(name) || {}).url || "docs/" + encodeURIComponent(name),
    writeText(text, ext) {
      const bytes = new TextEncoder().encode(text);
      return JSON.stringify(store(bytes, ext === "json" ? "application/json" : ext === "xml" ? "application/xml" : "text/plain", "qr-inhalt." + ext));
    },
    deleteFile(name) {
      const f = files.get(name);
      if (f) URL.revokeObjectURL(f.url);
      files.delete(name);
    },
    cleanup() {},
    scan(id) {
      if (window.__nextScan != null) {
        const t = window.__nextScan;
        window.__nextScan = null;
        return reply(id, t === false ? { ok: false, cancelled: true } : { ok: true, text: t });
      }
      const t = window.prompt("QR-Code-Inhalt (Browser-Modus):");
      reply(id, t ? { ok: true, text: t } : { ok: false, cancelled: true });
    },
    async download(id, url) {
      try {
        const res = await fetch(url);
        if (!res.ok) return reply(id, { ok: false, errorType: "http", error: "Der Server antwortet mit Fehler " + res.status + "." });
        const type = (res.headers.get("content-type") || "").split(";")[0].trim();
        const bytes = new Uint8Array(await res.arrayBuffer());
        const head = new TextDecoder().decode(bytes.slice(0, 200)).trim().toLowerCase();
        if (/html/.test(type) || head.startsWith("<!doctype html") || head.startsWith("<html")) {
          return reply(id, { ok: true, kind: "html", html: new TextDecoder().decode(bytes), finalUrl: res.url || url });
        }
        const name = decodeURIComponent((new URL(res.url || url).pathname.split("/").pop() || "beleg"));
        reply(id, { ok: true, kind: "file", file: store(bytes, type, name), finalUrl: res.url || url });
      } catch (e) {
        reply(id, { ok: false, errorType: "network", error: "Keine Verbindung zum Server." });
      }
    },
    openBrowser(id, url) {
      if (window.__browserResult) {
        const r = window.__browserResult;
        window.__browserResult = null;
        return reply(id, typeof r === "function" ? r(store) : r);
      }
      window.open(url, "_blank");
      reply(id, { ok: false, cancelled: true });
    },
    async pickFiles(id, accept) {
      const list = await pick(accept || ".pdf,.json,.xml,.txt,.html,image/*");
      reply(id, { ok: true, files: list });
    },
    decodeQr(id) { reply(id, { ok: false }); },
    decodeQrImage(id) { reply(id, { ok: false }); },
    shareFile(name, displayName) {
      const f = files.get(name);
      if (!f) return;
      const a = document.createElement("a");
      a.href = f.url;
      a.download = displayName;
      a.click();
    },
    openFile(name) {
      const f = files.get(name);
      if (f) window.open(f.url, "_blank");
    },
    openUrl(url) { window.open(url, "_blank"); },
    exportZip(id, spec) {
      window.__lastExport = JSON.parse(spec);
      reply(id, { ok: true, saved: true });
    },
    exportText(id, spec) {
      window.__lastExport = JSON.parse(spec);
      reply(id, { ok: true, saved: false });
    },
    pickBackup(id) {
      if (window.__backup) return reply(id, { ok: true, index: window.__backup });
      reply(id, { ok: false, error: "Wiederherstellen ist nur in der App möglich." });
    },
    ready: () => "[]",
    isDarkMode: () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    setBars() {},
    haptic() {},
    clipboardText: () => "",
    appVersion: () => "1.0 (Browser)"
  };

  window.__bonDev = {
    files,
    addFile: (bytes, mime, name) => store(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), mime, name)
  };
})();
