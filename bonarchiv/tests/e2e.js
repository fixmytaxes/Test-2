// Ende-zu-Ende-Test der Oberfläche im Browser (Chromium/Playwright) mit Ersatz-Brücke.
//   node bonarchiv/tests/e2e.js
// Erzeugt echte PDF-Kassenbons, spielt Teilen, Scannen (Link, TSE), Offline-Nachladen,
// Suche, Bearbeiten, Export und Zurück-Taste durch.
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const { chromium } = require("playwright");
const S = require("./samples.js");

const WEB = path.join(__dirname, "..", "web");
const SHOTS = process.env.SHOTS || "";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".pdf": "application/pdf", ".json": "application/json" };

let pdfs = {};
let serverUp = true;

function receiptHtml(text) {
  return `<!doctype html><meta charset="utf-8"><style>body{font:11px/1.35 "DejaVu Sans Mono",monospace;margin:0;padding:18px}pre{margin:0;white-space:pre}</style><pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`;
}

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = new URL(req.url, "http://x");
      const cors = { "Access-Control-Allow-Origin": "*" };
      if (url.pathname.startsWith("/beleg/")) {
        if (!serverUp) { req.socket.destroy(); return; }
        const id = url.pathname.split("/")[2];
        if (id === "seite") {
          res.writeHead(200, Object.assign({ "Content-Type": "text/html; charset=utf-8" }, cors));
          return res.end(`<!doctype html><html><body><h1>Ihr digitaler Kassenbon</h1><p>Danke für Ihren Einkauf bei Lidl.</p><a href="/beleg/lidl.pdf" class="btn">PDF herunterladen</a></body></html>`);
        }
        const key = id.replace(/\.pdf$/, "");
        if (!pdfs[key]) { res.writeHead(404, cors); return res.end("nicht gefunden"); }
        res.writeHead(200, Object.assign({ "Content-Type": "application/pdf" }, cors));
        return res.end(pdfs[key]);
      }
      const file = path.join(WEB, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
      if (!file.startsWith(WEB) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, () => resolve(srv));
  });
}

async function main() {
  const srv = await startServer();
  const base = "http://localhost:" + srv.address().port;
  const browser = await chromium.launch();

  // PDF-Belege erzeugen
  const gen = await browser.newPage();
  for (const k of ["rewe", "lidl", "dm"]) {
    await gen.setContent(receiptHtml(S[k]));
    pdfs[k] = await gen.pdf({ width: "80mm", height: "200mm", printBackground: true });
  }
  await gen.close();

  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 1, locale: "de-DE", timezoneId: "Europe/Berlin" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // ERR_EMPTY_RESPONSE stammt vom absichtlich abgeschalteten Server (Offline-Test)
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_EMPTY_RESPONSE/.test(m.text())) errors.push(m.text()); });
  await page.goto(base + "/index.html");
  await page.waitForSelector(".empty");
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + ".png") }); };
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.BonApp._state())));
  const back = () => page.evaluate(() => window.BonApp.back());
  const val = (sel) => page.$eval(sel, (e) => e.value);
  let step = 0;
  const log = (t) => console.log(`  ✓ ${++step}. ${t}`);

  // 1. PDF über „Teilen“ empfangen
  await page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const info = window.__bonDev.addFile(bytes, "application/pdf", "Kassenbon_8812.pdf");
    window.BonApp.incoming(JSON.stringify([info]));
  }, pdfs.rewe.toString("base64"));
  await page.waitForSelector("#f-merchant", { timeout: 15000 });
  await page.waitForSelector("#review-thumb canvas", { timeout: 15000 });
  assert.equal(await val("#f-merchant"), "REWE");
  assert.equal(await val("#f-amount"), "5,33");
  assert.equal(await val("#f-date"), "2026-11-22");
  assert.equal(await val("#f-time"), "10:14");
  assert.equal(await page.$$eval(".ie-row", (r) => r.length), 6);
  assert.ok(await page.$eval('.cat-tile[data-id="food"]', (e) => e.classList.contains("active")));
  await shot("10-review");
  await page.click('[data-action="review-save"]');
  await page.waitForSelector(".row[data-action=open-receipt]");
  let st = await state();
  assert.equal(st.receipts.length, 1);
  assert.equal(st.receipts[0].file.origName, "Kassenbon_8812.pdf");
  assert.equal(st.receipts[0].vat.length, 2);
  assert.equal(st.merchants.rewe.category, "food");
  log("PDF geteilt → REWE, 5,33 €, Datum, 6 Artikel, MwSt. erkannt und gespeichert");

  // 2. Detailansicht mit PDF-Vorschau
  await page.click(".row[data-action=open-receipt]");
  await page.waitForSelector("#doc-preview canvas", { timeout: 15000 });
  assert.match(await page.textContent(".file-line"), /2026-11-22_REWE_5,33EUR\.pdf/);
  assert.equal(await page.$$eval(".items .row:not(.total-row)", (r) => r.length), 6);
  await shot("11-detail");
  log("Detailansicht zeigt PDF-Vorschau, Artikel und einheitlichen Dateinamen");

  // 3. Zurück-Taste
  assert.equal(await back(), true);
  assert.ok(await page.$(".summary"));
  assert.equal(await back(), false);
  log("Zurück-Taste: Detail → Zeitleiste → App verlassen");

  // 4. QR-Code mit Link zur PDF scannen
  await page.evaluate((u) => { window.__nextScan = u; }, base + "/beleg/dm.pdf");
  await page.click('[data-action="scan"]');
  await page.waitForSelector("#f-merchant", { timeout: 15000 });
  assert.equal(await val("#f-merchant"), "dm");
  assert.equal(await val("#f-amount"), "5,65");
  assert.ok(await page.$eval('.cat-tile[data-id="drug"]', (e) => e.classList.contains("active")));
  await page.click("#f-business");
  await page.click('[data-action="review-save"]');
  await page.waitForFunction(() => window.BonApp._state().receipts.length === 2);
  st = await state();
  const dm = st.receipts.find((r) => r.merchant === "dm");
  assert.equal(dm.source.url, base + "/beleg/dm.pdf");
  assert.equal(dm.business, true);
  log("QR-Code mit PDF-Link gescannt → dm, 5,65 €, Drogerie, als geschäftlich gespeichert");

  // 5. Gleichen Code noch einmal scannen → Hinweis auf Duplikat
  await page.evaluate((u) => { window.__nextScan = u; }, base + "/beleg/dm.pdf");
  await page.click('[data-action="scan"]');
  await page.waitForSelector(".dialog >> text=Schon gespeichert");
  await page.click(".dialog >> text=Beleg öffnen");
  await page.waitForSelector(".hero-amount");
  assert.match(await page.textContent(".hero-amount"), /5,65/);
  await back();
  log("Doppelter Scan wird erkannt und öffnet den vorhandenen Beleg");

  // 6. Link führt auf eine Beleg-Webseite mit PDF-Link
  await page.evaluate((u) => { window.__nextScan = u; }, base + "/beleg/seite");
  await page.click('[data-action="scan"]');
  await page.waitForSelector("#f-merchant", { timeout: 15000 });
  assert.equal(await val("#f-merchant"), "Lidl");
  assert.equal(await val("#f-amount"), "7,58");
  await page.click('[data-action="review-save"]');
  await page.waitForFunction(() => window.BonApp._state().receipts.length === 3);
  log("Beleg-Webseite: PDF-Link automatisch gefunden und geladen (Lidl, 7,58 €)");

  // 7. TSE-QR-Code vom Papierbon
  await page.evaluate((t) => { window.__nextScan = t; }, S.tse);
  await page.click('[data-action="scan"]');
  await page.waitForSelector("#f-merchant");
  assert.equal(await val("#f-amount"), "83,32");
  assert.equal(await val("#f-date"), "2019-07-10");
  await page.fill("#f-merchant", "Café Central");
  await page.dispatchEvent("#f-merchant", "change");
  assert.ok(await page.$eval('.cat-tile[data-id="gastro"]', (e) => e.classList.contains("active")));
  await shot("12-tse");
  await page.click('[data-action="review-save"]');
  await page.waitForFunction(() => window.BonApp._state().receipts.length === 4);
  st = await state();
  assert.equal(st.tseMap["955002-00"], "Café Central");
  log("TSE-QR-Code: Betrag 83,32 € und Datum erkannt, Geschäft ergänzt, Kategorie vorgeschlagen");

  // 8. Gleiche Kasse erneut → Geschäft vorausgefüllt; Verwerfen
  await page.evaluate((t) => { window.__nextScan = t.replace(";18;112;", ";19;113;").replace("MEUCIAy4", "MEUCIBx5"); }, S.tse);
  await page.click('[data-action="scan"]');
  await page.waitForSelector("#f-merchant");
  assert.equal(await val("#f-merchant"), "Café Central");
  await page.click('[data-action="review-discard"]');
  await page.click(".dialog .btn.danger");
  await page.waitForSelector(".summary");
  assert.equal((await state()).receipts.length, 4);
  log("Bekannte TSE-Kasse füllt das Geschäft automatisch aus; Verwerfen speichert nichts");

  // 9. Offline an der Kasse → Beleg wird später nachgeladen
  serverUp = false;
  await page.evaluate((u) => { window.__nextScan = u; }, base + "/beleg/rewe.pdf?bon=2");
  await page.click('[data-action="scan"]');
  await page.waitForSelector(".banner >> text=wartet");
  st = await state();
  assert.equal(st.receipts.filter((r) => r.pending).length, 1);
  await shot("13-pending");
  serverUp = true;
  await page.click('.banner [data-action="retry-pending"]');
  await page.waitForFunction(() => window.BonApp._state().receipts.filter((r) => r.pending).length === 0, null, { timeout: 15000 });
  st = await state();
  const reloaded = st.receipts.find((r) => (r.source.url || "").endsWith("bon=2"));
  assert.equal(reloaded.merchant, "REWE");
  assert.equal(reloaded.total, 533);
  assert.ok(reloaded.file);
  log("Ohne Internet gescannt → als ausstehend gemerkt → später automatisch nachgeladen");

  // 10. Doppelter Inhalt (gleiche PDF) wird beim Prüfen markiert
  await page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    window.BonApp.incoming(JSON.stringify([window.__bonDev.addFile(bytes, "application/pdf", "nochmal.pdf")]));
  }, pdfs.lidl.toString("base64"));
  await page.waitForSelector(".banner >> text=vermutlich schon gespeichert", { timeout: 15000 });
  await page.click('[data-action="review-discard"]');
  await page.click(".dialog .btn.danger");
  log("Bereits gespeicherte PDF wird beim Prüfen als Duplikat erkannt");

  // 11. Artikelsuche
  await page.click('.tab[data-tab="suche"]');
  await page.fill("#search-q", "laugenbrez");
  await page.waitForSelector("#search-results .row");
  const hits = await page.$$eval("#search-results .row", (r) => r.map((x) => x.textContent));
  assert.equal(hits.length, 2);
  assert.ok(hits.every((h) => /LAUGENBREZEL/.test(h) && /REWE/.test(h)));
  await page.fill("#search-q", "dm zahnbürste");
  await page.waitForSelector("#search-results mark");
  assert.equal(await page.$$eval("#search-results .row", (r) => r.length), 1);
  await page.fill("#search-q", "spuelmittel");
  await page.waitForSelector("#search-results .empty");
  await page.fill("#search-q", "Gesichtscreme");
  await page.click("#search-results .row");
  await page.waitForSelector(".items .row.item-hit");
  await shot("14-search-hit");
  await back();
  log("Artikelsuche findet Artikel über alle Belege, auch kombiniert mit dem Geschäft");

  // 12. Geschäfte, Kategorien, Umbenennen
  await page.click('.tab[data-tab="geschaefte"]');
  assert.equal(await page.$$eval("#merchant-list .row", (r) => r.length), 4);
  await page.click('#merchant-list .row[data-key="rewe"]');
  await page.waitForSelector(".stat");
  assert.match(await page.textContent(".hero-date"), /2 Belege/);
  await page.click('[data-action="rename-merchant"]');
  await page.fill("#dlg-input", "REWE Markt");
  await page.click(".dialog .btn.primary");
  await page.waitForSelector("text=Geschäft umbenannt");
  st = await state();
  assert.equal(st.receipts.filter((r) => r.merchant === "REWE Markt").length, 2);
  await back();
  await page.click('[data-action="merchant-mode"][data-mode="categories"]');
  await page.click('.row[data-action="open-category"][data-id="food"]');
  await page.waitForSelector(".hero");
  assert.match(await page.textContent(".hero-date"), /3 Belege/);
  await back();
  log("Geschäfte-Übersicht, Kategorie-Ansicht und Umbenennen aller Belege eines Geschäfts");

  // 13. Bearbeiten: Kategorie ändern
  const id = (await state()).receipts.find((r) => r.merchant === "Lidl").id;
  await page.evaluate(() => {});
  await page.click('.tab[data-tab="belege"]');
  await page.click(`.row[data-id="${id}"]`);
  await page.click('[data-action="edit-receipt"] >> nth=0');
  await page.fill("#f-note", "Wocheneinkauf");
  await page.fill("#f-amount", "7,59");
  await page.click('[data-action="review-save"]');
  await page.waitForSelector(".hero-amount");
  assert.match(await page.textContent(".hero-amount"), /7,59/);
  st = await state();
  assert.equal(st.receipts.find((r) => r.id === id).note, "Wocheneinkauf");
  await back();
  log("Beleg bearbeiten (Betrag, Notiz)");

  // 14. Export
  await page.click('.tab[data-tab="mehr"]');
  await page.click('[data-action="open-export"]');
  await page.click('[data-action="export-opt"][data-v="all"]');
  await page.click('[data-action="export-run"][data-mode="save"]');
  await page.waitForFunction(() => !!window.__lastExport);
  const spec = await page.evaluate(() => window.__lastExport);
  const csv = spec.entries.find((e) => e.path === "belege.csv").text;
  assert.ok(spec.entries.some((e) => /^2026-11\/2026-11-22_REWE-Markt_5,33EUR\.pdf$/.test(e.path)));
  assert.ok(spec.entries.some((e) => /_REWE-Markt_5,33EUR_2\.pdf$/.test(e.path)));
  assert.match(csv, /^﻿Datum;Uhrzeit;Geschäft;Kategorie;Betrag/);
  assert.match(csv, /22\.11\.2026;10:14;REWE Markt;Lebensmittel;5,33;EUR;0,28;0,23;Karte;nein/);
  assert.match(csv, /dm;Drogerie;5,65;EUR;0,90;;Karte;ja/);
  await page.evaluate(() => { window.__lastExport = null; });
  await page.click('[data-action="export-opt"][data-k="business"]');
  await page.click('[data-action="export-run"][data-mode="share"]');
  await page.waitForFunction(() => !!window.__lastExport);
  const spec2 = await page.evaluate(() => window.__lastExport);
  assert.equal(spec2.entries.length, 2);
  await page.waitForSelector(".busy", { state: "detached" });
  await back();
  log("Export: ZIP mit Monatsordnern, einheitlichen Dateinamen und CSV (auch nur geschäftliche)");

  // 15. Löschen
  await page.click('.tab[data-tab="belege"]');
  const before = (await state()).receipts.length;
  await page.click(".row[data-action=open-receipt] >> nth=0");
  await page.click('[data-action="delete-receipt"]');
  await page.click(".dialog .btn.danger");
  await page.waitForFunction((n) => window.BonApp._state().receipts.length === n - 1, before);
  log("Beleg löschen");

  // 16. Daten bleiben nach Neustart erhalten
  await page.reload();
  await page.waitForSelector(".summary");
  assert.equal((await state()).receipts.length, before - 1);
  log("Daten bleiben nach Neustart erhalten");

  // 17. Dunkler Modus
  await page.click('.tab[data-tab="mehr"]');
  await page.click('[data-action="set-theme"][data-theme="dark"]');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await page.click('.tab[data-tab="belege"]');
  await shot("15-dark");
  log("Dunkler Modus");

  assert.deepEqual(errors, [], "Fehler in der Konsole: " + errors.join("\n"));
  console.log(`\nAlle ${step} Schritte erfolgreich.`);
  await browser.close();
  srv.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
