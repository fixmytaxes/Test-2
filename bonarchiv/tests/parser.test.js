// Tests der Belegerkennung:  TZ=Europe/Berlin node --test bonarchiv/tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../web/parser.js");
const S = require("./samples.js");

const names = (d) => d.items.map((i) => i.name);
const sum = (d) => d.items.reduce((s, i) => s + i.price, 0);

test("Beträge lesen", () => {
  assert.equal(P.parseAmount("23,45"), 2345);
  assert.equal(P.parseAmount("1.234,56 €"), 123456);
  assert.equal(P.parseAmount("23.45"), 2345);
  assert.equal(P.parseAmount("12"), 1200);
  assert.equal(P.parseAmount("-0,50"), -50);
  assert.equal(P.parseAmount("abc"), null);
  assert.deepEqual(P.amountsIn("22.11.2026 10:14 Summe 5,33").map((a) => a.cents), [533]);
  assert.deepEqual(P.amountsIn("0,764 kg x 1,99 EUR/kg").map((a) => a.cents), [199]);
  assert.deepEqual(P.amountsIn("Rabatt 0,50-").map((a) => a.cents), [-50]);
  assert.equal(P.formatPlain(123456), "1.234,56");
  assert.equal(P.formatAmount(2345).replace(/\s/g, " "), "23,45 €");
});

test("Datumswerte", () => {
  assert.equal(P.parseDateValue("2026-11-22T13:05:00+01:00"), "2026-11-22T13:05");
  assert.equal(P.parseDateValue("2026-11-22T12:05:00.000Z"), "2026-11-22T13:05");
  assert.equal(P.parseDateValue("22.11.26 18:42"), "2026-11-22T18:42");
  assert.equal(P.parseDateValue("20261115"), "2026-11-15T00:00");
  assert.equal(P.parseDateValue("31.02.2026"), null);
});

test("REWE-Bon (Mengen- und Gewichtszeilen, Rabatt, MwSt.-Tabelle)", () => {
  const d = P.parseText(S.rewe);
  assert.equal(d.merchant, "REWE");
  assert.equal(d.category, "food");
  assert.equal(d.date, "2026-11-22T10:14");
  assert.equal(d.total, 533);
  assert.deepEqual(names(d), ["JA! H-MILCH 1,5%", "BIO BANANEN", "LAUGENBREZEL", "COCA-COLA 1,0L", "PFAND 0,25 EURO", "RABATT"]);
  assert.equal(sum(d), 533);
  assert.equal(d.items[0].qty, 2);
  assert.equal(d.items[0].unitPrice, 89);
  assert.equal(d.items[1].qty, 0.764);
  assert.equal(d.items[1].unit, "kg");
  assert.deepEqual(d.vat.map((v) => [v.rate, v.net, v.tax, v.gross]), [[19, 146, 28, 174], [7, 336, 23, 359]]);
  assert.equal(d.payment, "Karte");
  assert.equal(d.receiptNo, "4711");
});

test("Lidl-Bon (Menge hinter dem Preis, zu zahlen)", () => {
  const d = P.parseText(S.lidl);
  assert.equal(d.merchant, "Lidl");
  assert.equal(d.date, "2026-11-21T18:42");
  assert.equal(d.total, 758);
  assert.deepEqual(names(d), ["Joghurt Natur", "Bananen", "Vollkornbrot", "Kerrygold Butter", "Lidl Plus Rabatt"]);
  assert.equal(d.items[0].qty, 2);
  assert.equal(d.items[0].unitPrice, 89);
  assert.deepEqual(d.vat.map((v) => [v.rate, v.tax, v.gross]), [[7, 50, 758]]);
  assert.equal(d.payment, "Karte");
});

test("ALDI-Bon (Menge über dem Artikel, Barzahlung mit Rückgeld)", () => {
  const d = P.parseText(S.aldi);
  assert.equal(d.merchant, "ALDI SÜD");
  assert.equal(d.total, 502);
  assert.equal(d.date, "2026-11-20T08:05");
  assert.deepEqual(names(d), ["Milch fettarm", "Äpfel Braeburn", "Spülmittel"]);
  assert.equal(d.items[0].qty, 2);
  assert.equal(d.payment, "Bar");
  assert.equal(d.vat.length, 2);
});

test("dm-Bon (Steuerkennziffer statt Buchstabe)", () => {
  const d = P.parseText(S.dm);
  assert.equal(d.merchant, "dm");
  assert.equal(d.category, "drug");
  assert.equal(d.total, 565);
  assert.equal(d.items.length, 3);
  assert.deepEqual(d.vat.map((v) => [v.rate, v.net, v.tax, v.gross]), [[19, 475, 90, 565]]);
});

test("Restaurant-Rechnung (unbekanntes Geschäft, Mengenspalte)", () => {
  const d = P.parseText(S.trattoria);
  assert.equal(d.merchant, "Trattoria Da Mario");
  assert.equal(P.suggestCategory(d.merchant, d.text), "gastro");
  assert.equal(d.date, "2026-11-21T20:31");
  assert.equal(d.total, 3750);
  assert.deepEqual(names(d), ["Pizza Margherita", "Tiramisu", "Cola 0,33l", "Espresso"]);
  assert.deepEqual(d.items.map((i) => i.qty), [2, 1, 3, 1]);
  assert.equal(sum(d), 3750);
  assert.equal(d.payment, "Kreditkarte");
  assert.deepEqual(d.vat.map((v) => [v.rate, v.tax]), [[19, 599]]);
  assert.equal(d.receiptNo, "2026-1188");
});

test("Tankstelle in Großbuchstaben", () => {
  const d = P.parseText(S.tank);
  assert.equal(d.merchant, "Aral");
  assert.equal(d.category, "mobility");
  assert.equal(d.total, 7894);
  assert.equal(d.payment, "Karte");
});

test("Unbekannter Händler in Großbuchstaben wird lesbar", () => {
  const d = P.parseText("BÄCKEREI MÜLLER-SCHULZE GMBH\nKirchplatz 3\n12345 Musterstadt\nBrot 3,20\nSUMME 3,20\n01.10.2026 07:45");
  assert.equal(d.merchant, "Bäckerei Müller-Schulze");
  assert.equal(P.suggestCategory(d.merchant, d.text), "food");
});

test("TSE-QR-Code nach DSFinV-K", () => {
  const d = P.parseTSE(S.tse);
  assert.equal(d.total, 8332);
  assert.equal(d.date, "2019-07-10T20:41");
  assert.deepEqual(d.vat.map((v) => [v.rate, v.gross]), [[19, 7533], [7, 799]]);
  assert.equal(d.payment, "Bar, Karte");
  assert.equal(d.tse.serial, "955002-00");
  assert.equal(d.tse.transaction, "18");
  assert.equal(P.parseTSE("https://example.org"), null);
});

test("JSON-Beleg (DFKA-ähnlich)", () => {
  const d = P.parseJsonReceipt(S.dfkaJson);
  assert.equal(d.merchant, "Bäckerei Schmitz");
  assert.equal(P.suggestCategory(d.merchant, d.text), "food");
  assert.equal(d.date, "2026-11-22T13:05");
  assert.equal(d.total, 785);
  assert.deepEqual(names(d), ["Roggenbrot 750g", "Brötchen", "Butterbreze"]);
  assert.equal(d.items[1].qty, 6);
  assert.equal(d.items[1].unitPrice, 45);
  assert.deepEqual(d.vat.map((v) => [v.rate, v.net, v.tax, v.gross]), [[7, 734, 51, 785]]);
  assert.equal(d.payment, "Bar");
});

test("Anderes JSON-Format mit Cent-Beträgen", () => {
  const d = P.parseJsonReceipt({
    store: { name: "Kiosk am Eck" },
    timestamp: 1763812800,
    total_cents: 450,
    items: [{ description: "Zeitung", amount_cents: 250 }, { description: "Kaffee", amount_cents: 200 }]
  });
  assert.equal(d.merchant, "Kiosk am Eck");
  assert.equal(d.items.length, 2);
  assert.ok(d.date && d.date.startsWith("2025-11-22"));
});

test("XRechnung (UBL)", () => {
  const d = P.parseXmlReceipt(S.ubl);
  assert.equal(d.merchant, "Elektro Meier");
  assert.equal(P.suggestCategory(d.merchant, d.text), "tech");
  assert.equal(d.date, "2026-11-15T00:00");
  assert.equal(d.total, 11900);
  assert.deepEqual(names(d), ["LED-Leuchte"]);
  assert.equal(d.items[0].qty, 2);
  assert.deepEqual(d.vat.map((v) => [v.rate, v.net, v.tax, v.gross]), [[19, 10000, 1900, 11900]]);
  assert.equal(d.isInvoice, true);
});

test("ZUGFeRD / Factur-X (CII)", () => {
  const d = P.parseXmlReceipt(S.cii);
  assert.equal(d.merchant, "Bürobedarf Klein");
  assert.equal(d.date, "2026-11-03T00:00");
  assert.equal(d.total, 5950);
  assert.deepEqual(names(d), ["Kopierpapier A4", "Kugelschreiber"]);
});

test("QR-Inhalte einordnen", () => {
  assert.equal(P.classifyQr("https://beleg.example.de/r/abc").type, "url");
  assert.equal(P.classifyQr("www.example.de/r/1").url, "https://www.example.de/r/1");
  assert.equal(P.classifyQr(S.tse).type, "tse");
  assert.equal(P.classifyQr('{"a":1}').type, "json");
  assert.equal(P.classifyQr("<?xml version='1.0'?><a/>").type, "xml");
  assert.equal(P.classifyQr("Hallo Welt").type, "text");
});

test("Kategorie-Vorschläge", () => {
  assert.equal(P.suggestCategory("Rossmann"), "drug");
  assert.equal(P.suggestCategory("Stadt-Apotheke"), "health");
  assert.equal(P.suggestCategory("Café Central"), "gastro");
  assert.equal(P.suggestCategory("IKEA"), "home");
  assert.equal(P.suggestCategory("Irgendwas"), "other");
  assert.equal(P.suggestCategory("Barbara Schmidt"), "other");
});

test("Suche: Umlaute vereinheitlicht", () => {
  assert.equal(P.fold("Spülmittel MÜLLER Straße"), "spuelmittel mueller strasse");
});
