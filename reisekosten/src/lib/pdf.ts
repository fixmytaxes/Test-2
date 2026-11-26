// PDF-Auswertung einer Reisekostenabrechnung (pdf-lib): Reisedaten, Reiseverlauf, Übernachtungen,
// Verpflegungsmehraufwand je Tag, sonstige Kosten, Bewirtungen (getrennt), Kürzungen/Erstattungen,
// Berechnungsteil für Steuerberatung/Buchhaltung, Anlagen (Belege) und eingebettetes E-Rechnungs-XML
// (factur-x.xml, EN 16931 – ZUGFeRD/Factur-X-Hybrid).
import { AFRelationship, PDFDocument, PDFFont, PDFName, PDFPage, StandardFonts, degrees, rgb, type RGB } from 'pdf-lib';
import type { Anhang, Cent, Reise } from '../types';
import { countryName } from '../data/countries';
import { datePart, fmtDate, fmtDateTime, fmtHours, fmtIsoLocal, timePart } from './dates';
import { KOSTEN_KATEGORIEN, KOSTENART_LABEL, VERKEHRSMITTEL, KONTO_LABEL } from './defaults';
import { fmtDecimal, fmtEUR, fmtNum2, splitBrutto, sumBrutto, UST_KURZ, UST_LABEL } from './money';
import { BEREICH_LABEL, kmBetrag, type Abrechnung } from './totals';
import { XML_DATEINAME } from './xml';

export interface PdfOptionen {
  storno?: boolean;
  belegeAnhaengen: boolean;
  xml?: string;
  ladeDatei: (id: string) => Promise<Blob | undefined>;
  /** Wandelt nicht einbettbare Bildformate (z. B. WebP) in JPEG um – nur im Browser verfügbar */
  bildZuJpeg?: (blob: Blob) => Promise<Uint8Array | null>;
}

const A4: [number, number] = [595.28, 841.89];
const M = { l: 42, r: 42, t: 46, b: 52 };
const W = A4[0] - M.l - M.r;
const C = {
  text: rgb(0.1, 0.15, 0.2),
  muted: rgb(0.36, 0.42, 0.48),
  accent: rgb(0.05, 0.39, 0.4),
  line: rgb(0.83, 0.86, 0.89),
  zebra: rgb(0.955, 0.965, 0.975),
  head: rgb(0.9, 0.94, 0.94),
  sum: rgb(0.93, 0.95, 0.96),
  wasser: rgb(0.85, 0.3, 0.25),
};

type Align = 'l' | 'r' | 'c';
interface Spalte {
  titel: string;
  breite: number; // Anteil
  align?: Align;
}
type Zelle = string | { text: string; bold?: boolean; color?: RGB };
interface ZeilenStil {
  bold?: boolean;
  fill?: RGB;
}

class Schreiber {
  doc: PDFDocument;
  font!: PDFFont;
  bold!: PDFFont;
  page!: PDFPage;
  y = 0;
  zeichen = new Set<number>();
  kopf = '';
  wasserzeichen = '';
  seiten: PDFPage[] = [];

  constructor(doc: PDFDocument) {
    this.doc = doc;
  }

  async init() {
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    for (const c of this.font.getCharacterSet()) this.zeichen.add(c);
  }

  /** Ersetzt Zeichen, die die Standardschrift (WinAnsi) nicht darstellen kann */
  s(t: string | undefined): string {
    const MAP: Record<string, string> = { '→': '->', '←': '<-', '−': '-', '≥': '>=', '≤': '<=', ' ': ' ', ' ': ' ', '‑': '-', 'Ł': 'L', 'ł': 'l', 'ı': 'i', '\t': ' ' };
    let out = '';
    for (const ch of (t ?? '').replace(/\r/g, '')) {
      const cp = ch.codePointAt(0)!;
      if (ch === '\n' || this.zeichen.has(cp)) out += ch;
      else if (MAP[ch]) out += MAP[ch];
      else {
        const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
        out += base && [...base].every((b) => this.zeichen.has(b.codePointAt(0)!)) ? base : '?';
      }
    }
    return out;
  }

  breite(t: string, size: number, f = this.font) {
    return f.widthOfTextAtSize(t, size);
  }

  /** Bricht Text auf eine Breite um */
  umbrechen(text: string, size: number, maxW: number, f = this.font): string[] {
    const out: string[] = [];
    for (const absatz of this.s(text).split('\n')) {
      const woerter = absatz.split(/ +/);
      let line = '';
      for (const w of woerter) {
        const test = line ? line + ' ' + w : w;
        if (this.breite(test, size, f) <= maxW) line = test;
        else {
          if (line) out.push(line);
          if (this.breite(w, size, f) > maxW) {
            let rest = w;
            while (this.breite(rest, size, f) > maxW) {
              let i = rest.length;
              while (i > 1 && this.breite(rest.slice(0, i), size, f) > maxW) i--;
              out.push(rest.slice(0, i));
              rest = rest.slice(i);
            }
            line = rest;
          } else line = w;
        }
      }
      out.push(line);
    }
    return out;
  }

  neueSeite(ohneKopf = false) {
    this.page = this.doc.addPage(A4);
    this.seiten.push(this.page);
    this.y = A4[1] - M.t;
    if (this.seiten.length > 1 && this.kopf && !ohneKopf) {
      this.page.drawText(this.s(this.kopf), { x: M.l, y: A4[1] - 30, size: 7.5, font: this.font, color: C.muted });
      this.page.drawLine({ start: { x: M.l, y: A4[1] - 35 }, end: { x: A4[0] - M.r, y: A4[1] - 35 }, thickness: 0.5, color: C.line });
      this.y = A4[1] - M.t - 6;
    }
  }

  platz(h: number) {
    if (this.y - h < M.b) this.neueSeite();
  }

  text(t: string, o: { size?: number; bold?: boolean; color?: RGB; x?: number; maxW?: number; lh?: number } = {}) {
    const size = o.size ?? 9;
    const f = o.bold ? this.bold : this.font;
    const lh = o.lh ?? size * 1.32;
    const lines = this.umbrechen(t, size, o.maxW ?? W - ((o.x ?? M.l) - M.l), f);
    for (const line of lines) {
      this.platz(lh);
      this.page.drawText(line, { x: o.x ?? M.l, y: this.y - size, size, font: f, color: o.color ?? C.text });
      this.y -= lh;
    }
  }

  abstand(h: number) {
    this.y -= h;
  }

  ueberschrift(t: string, unter?: string) {
    this.platz(unter ? 48 : 38);
    this.abstand(10);
    this.page.drawRectangle({ x: M.l, y: this.y - 14, width: 3, height: 14, color: C.accent });
    this.page.drawText(this.s(t), { x: M.l + 9, y: this.y - 11.5, size: 11.5, font: this.bold, color: C.text });
    this.y -= 19;
    if (unter) this.text(unter, { size: 8, color: C.muted });
    this.abstand(3);
  }

  /** Zweispaltige Liste aus Bezeichnung und Wert */
  liste(paare: [string, string][], labelW = 120) {
    for (const [k, v] of paare) {
      if (!v) continue;
      const lines = this.umbrechen(v, 9, W - labelW);
      const h = lines.length * 12 + 1;
      this.platz(h);
      this.page.drawText(this.s(k), { x: M.l, y: this.y - 9, size: 8.5, font: this.font, color: C.muted });
      lines.forEach((l, i) => this.page.drawText(l, { x: M.l + labelW, y: this.y - 9 - i * 12, size: 9, font: this.font, color: C.text }));
      this.y -= h;
    }
  }

  tabelle(spalten: Spalte[], zeilen: Zelle[][], stile: ZeilenStil[] = [], o: { size?: number } = {}) {
    const size = o.size ?? 8;
    const lh = size * 1.3;
    const pad = 3.5;
    const total = spalten.reduce((s, c) => s + c.breite, 0);
    const ws = spalten.map((c) => (c.breite / total) * W);
    const xs = ws.map((_, i) => M.l + ws.slice(0, i).reduce((s, x) => s + x, 0));

    const kopfzeile = () => {
      const lines = spalten.map((c, i) => this.umbrechen(c.titel, size - 0.5, ws[i] - 2 * pad, this.bold));
      const h = Math.max(...lines.map((l) => l.length)) * lh + 2 * pad;
      this.platz(h + lh + 2 * pad);
      this.page.drawRectangle({ x: M.l, y: this.y - h, width: W, height: h, color: C.head });
      lines.forEach((ls, i) =>
        ls.forEach((l, j) => {
          const tw = this.breite(l, size - 0.5, this.bold);
          const x = spalten[i].align === 'r' ? xs[i] + ws[i] - pad - tw : spalten[i].align === 'c' ? xs[i] + (ws[i] - tw) / 2 : xs[i] + pad;
          this.page.drawText(l, { x, y: this.y - pad - size + 0.5 - j * lh, size: size - 0.5, font: this.bold, color: C.text });
        }),
      );
      this.y -= h;
    };

    kopfzeile();
    zeilen.forEach((zeile, zi) => {
      const stil = stile[zi] ?? {};
      const zellen = zeile.map((z) => (typeof z === 'string' ? { text: z } : z));
      const lines = zellen.map((z, i) => this.umbrechen(z.text, size, ws[i] - 2 * pad, z.bold || stil.bold ? this.bold : this.font));
      const h = Math.max(1, ...lines.map((l) => l.length)) * lh + 2 * pad - 1;
      if (this.y - h < M.b) {
        this.neueSeite();
        kopfzeile();
      }
      const fill = stil.fill ?? (zi % 2 === 1 ? C.zebra : undefined);
      if (fill) this.page.drawRectangle({ x: M.l, y: this.y - h, width: W, height: h, color: fill });
      lines.forEach((ls, i) => {
        const f = zellen[i].bold || stil.bold ? this.bold : this.font;
        ls.forEach((l, j) => {
          const tw = this.breite(l, size, f);
          const x = spalten[i].align === 'r' ? xs[i] + ws[i] - pad - tw : spalten[i].align === 'c' ? xs[i] + (ws[i] - tw) / 2 : xs[i] + pad;
          this.page.drawText(l, { x, y: this.y - pad - size + 1 - j * lh, size, font: f, color: zellen[i].color ?? C.text });
        });
      });
      this.y -= h;
      this.page.drawLine({ start: { x: M.l, y: this.y }, end: { x: M.l + W, y: this.y }, thickness: 0.4, color: C.line });
    });
    this.abstand(4);
  }

  hinweis(t: string) {
    this.text(t, { size: 7.5, color: C.muted, lh: 9.8 });
  }
}

const ortKurz = (o: { ort?: string; land?: string; plz?: string }) =>
  o.ort ? `${o.plz ? o.plz + ' ' : ''}${o.ort}${o.land && o.land !== 'DE' ? ` (${countryName(o.land)})` : ''}` : '';

const adresse = (o: { bezeichnung?: string; strasse?: string; plz?: string; ort?: string; land?: string }) =>
  [o.bezeichnung, o.strasse, [o.plz, o.ort].filter(Boolean).join(' '), o.land && o.land !== 'DE' ? countryName(o.land) : ''].filter(Boolean).join(', ');

export function dateiBasis(r: Reise, storno = false): string {
  const nr = r.nummer ? r.nummer + (storno ? '-Storno' : '') : 'Entwurf';
  const name = (r.name || 'Reise').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 40);
  return `Reisekostenabrechnung_${nr}_${name}`;
}

export async function erzeugePdf(a: Abrechnung, opt: PdfOptionen): Promise<Uint8Array> {
  const r = a.reise;
  const ctx = a.ctx;
  const s = a.summen;
  const doc = await PDFDocument.create();
  const w = new Schreiber(doc);
  await w.init();
  const entwurf = r.status === 'entwurf';
  const titel = opt.storno ? 'Stornobeleg zur Reisekostenabrechnung' : 'Reisekostenabrechnung';
  const nummer = r.nummer ? (opt.storno ? `${r.nummer}-S` : r.nummer) : '';
  w.kopf = `${titel}${nummer ? ' Nr. ' + nummer : ' (Entwurf)'} · ${r.name} · ${ctx.reisender.name}`;
  w.wasserzeichen = entwurf ? 'ENTWURF' : r.status === 'storniert' && !opt.storno ? 'STORNIERT' : opt.storno ? 'STORNO' : '';

  // Anlagen nummerieren
  const anlagen: { anhang: Anhang; nr: string; text: string }[] = [];
  const anlageNr = new Map<string, string>();
  const anlage = (an: Anhang, text: string) => {
    if (anlageNr.has(an.id)) return;
    const nr = `A${anlagen.length + 1}`;
    anlageNr.set(an.id, nr);
    anlagen.push({ anhang: an, nr, text });
  };
  r.anlassDokumente.forEach((d) => anlage(d, 'Nachweis Reiseanlass'));
  const strecken = [...r.strecken].sort((x, y) => (x.abfahrt || '').localeCompare(y.abfahrt || ''));
  strecken.forEach((l, i) => l.belege.forEach((b) => anlage(b, `Beleg zu Teilstrecke ${i + 1}: ${l.von.ort} – ${l.nach.ort}`)));
  const uebs = [...r.uebernachtungen].sort((x, y) => (x.anreise || '').localeCompare(y.anreise || ''));
  uebs.forEach((u, i) => u.belege.forEach((b) => anlage(b, `Rechnung Übernachtung 2.${i + 1}: ${u.bezeichnung}`)));
  const kosten = [...r.kosten].sort((x, y) => (x.datum || '').localeCompare(y.datum || ''));
  kosten.forEach((k, i) => k.belege.forEach((b) => anlage(b, `Beleg sonstige Kosten 4.${i + 1}: ${KOSTEN_KATEGORIEN[k.kategorie].label}`)));
  const bews = [...r.bewirtungen].sort((x, y) => (x.datum || '').localeCompare(y.datum || ''));
  bews.forEach((b, i) => b.belege.forEach((x) => anlage(x, `Bewirtungsbeleg 5.${i + 1}: ${b.lokal}`)));
  const refs = (bs: Anhang[]) => bs.map((b) => anlageNr.get(b.id)).filter(Boolean).join(', ');

  // ---------- Seite 1: Kopf ----------
  w.neueSeite();
  const p = w.page;
  p.drawText(w.s(titel), { x: M.l, y: w.y - 18, size: 18, font: w.bold, color: C.text });
  p.drawText(w.s(nummer ? `Nr. ${nummer}` : 'Entwurf – noch nicht abgeschlossen'), { x: M.l, y: w.y - 34, size: 11, font: w.bold, color: nummer ? C.accent : C.wasser });
  const firmaZeilen = [ctx.firma.name, ctx.firma.strasse, [ctx.firma.plz, ctx.firma.ort].filter(Boolean).join(' '), ctx.firma.ustId ? `USt-IdNr. ${ctx.firma.ustId}` : '', ctx.firma.steuernummer ? `St.-Nr. ${ctx.firma.steuernummer}` : ''].filter(Boolean);
  firmaZeilen.forEach((z, i) => {
    const t = w.s(z);
    const f = i === 0 ? w.bold : w.font;
    p.drawText(t, { x: A4[0] - M.r - w.breite(t, 8.5, f), y: w.y - 9 - i * 11, size: 8.5, font: f, color: i === 0 ? C.text : C.muted });
  });
  w.y -= Math.max(50, firmaZeilen.length * 11 + 8);
  p.drawLine({ start: { x: M.l, y: w.y }, end: { x: A4[0] - M.r, y: w.y }, thickness: 0.8, color: C.accent });
  w.abstand(10);

  const startOrt =
    r.start.typ === 'firmensitz'
      ? `Firmensitz – ${adresse({ strasse: ctx.firma.strasse, plz: ctx.firma.plz, ort: ctx.firma.ort })}`
      : r.start.typ === 'wohnung'
        ? `Wohnung – ${adresse(ctx.wohnung)}`
        : `abweichend – ${adresse(r.start.ort ?? { ort: '', land: 'DE' })}`;
  w.liste([
    ['Abrechnungsdatum', r.abrechnungsdatum ? fmtDate(r.abrechnungsdatum) : '—'],
    ['Reisender', `${ctx.reisender.name}${ctx.reisender.typ === 'unternehmer' ? ' (Unternehmer)' : ' (Arbeitnehmer)'}`],
    ['Name der Reise', r.name],
    ['Anlass (betrieblicher Zweck)', r.anlass],
    ['Reiseziel', adresse(r.ziel)],
    ['Startpunkt', startOrt],
    ['Reisebeginn', fmtDateTime(a.beginn)],
    ['Reiseende', fmtDateTime(a.ende)],
    ['Abwesenheit', a.vma.dauerStunden ? `${fmtHours(a.vma.dauerStunden)} · ${a.vma.tage.length} Kalendertag(e) · Übernachtung auswärts: ${a.vma.mitUebernachtung ? 'ja' : 'nein'}` : ''],
    ['Kostenstelle/Projekt', r.kostenstelle ?? ''],
    ['Ersetzt Abrechnung', r.ersetzt ? `Nr. ${r.ersetzt} (storniert)` : ''],
    ['Status', r.status === 'storniert' ? `storniert am ${fmtIsoLocal(r.storniertAm)} – Grund: ${r.stornoGrund ?? ''}` : ''],
    ['Nachweis Anlass', r.anlassDokumente.length ? `${r.anlassDokumente.map((d) => d.name).join(', ')} (${refs(r.anlassDokumente)})` : ''],
    ['Bemerkung', r.notiz ?? ''],
  ], 132);

  // Übersicht der Summen
  w.abstand(6);
  w.tabelle(
    [
      { titel: 'Übersicht', breite: 5 },
      { titel: 'Betrag', breite: 2, align: 'r' },
    ],
    [
      [BEREICH_LABEL.fahrt, fmtEUR(s.bereiche.fahrt)],
      [BEREICH_LABEL.uebernachtung, fmtEUR(s.bereiche.uebernachtung)],
      [BEREICH_LABEL.vma, fmtEUR(s.bereiche.vma)],
      [BEREICH_LABEL.sonstige, fmtEUR(s.bereiche.sonstige)],
      ...(s.korrekturenCent ? [['abzüglich Kürzungen und Erstattungen', '− ' + fmtEUR(s.korrekturenCent)]] : []),
      [{ text: 'Reisekosten gesamt', bold: true }, { text: fmtEUR(s.reisekostenNachKorrektur), bold: true }],
      [BEREICH_LABEL.bewirtung + ' (gesondert)', fmtEUR(s.bereiche.bewirtung)],
      [{ text: s.auszahlungCent >= 0 ? 'Auszahlungsbetrag an den Reisenden' : 'Rückzahlung durch den Reisenden', bold: true }, { text: fmtEUR(Math.abs(s.auszahlungCent)), bold: true, color: C.accent }],
    ] as Zelle[][],
    [{}, {}, {}, {}, ...(s.korrekturenCent ? [{}] : []), { fill: C.sum }, {}, { fill: C.sum }],
    { size: 8.5 },
  );

  // ---------- 1 Fahrtkosten ----------
  w.ueberschrift('1. Fahrtkosten – Reiseverlauf', `Kilometerpauschale: Pkw ${fmtNum2(ctx.kmSaetze.pkw)} €/km, Motorrad ${fmtNum2(ctx.kmSaetze.motorrad)} €/km (§ 9 Abs. 1 Satz 3 Nr. 4a EStG i. V. m. BRKG); sonst tatsächliche Kosten laut Beleg.`);
  if (strecken.length) {
    w.tabelle(
      [
        { titel: 'Nr.', breite: 0.5 },
        { titel: 'Abfahrt', breite: 1.25 },
        { titel: 'Ankunft', breite: 1.25 },
        { titel: 'Strecke', breite: 3 },
        { titel: 'Verkehrsmittel', breite: 1.35 },
        { titel: 'Berechnung', breite: 1.7 },
        { titel: 'Betrag', breite: 1.05, align: 'r' },
        { titel: 'Beleg', breite: 0.6 },
      ],
      strecken.map((l, i) => {
        const vm = VERKEHRSMITTEL[l.verkehrsmittel];
        const satz = ctx.kmSaetze[vm.km ?? 'pkw'] ?? 30;
        const betrag = l.kostenart === 'km' ? kmBetrag(l.km, satz) : l.kostenart === 'beleg' ? sumBrutto(l.betraege) : 0;
        const ber =
          l.kostenart === 'km'
            ? `${fmtDecimal(l.km, 1)} km × ${fmtNum2(satz)} €`
            : l.kostenart === 'beleg'
              ? `${KOSTENART_LABEL.beleg}${l.betraege.length ? ' · USt ' + l.betraege.map((b) => UST_KURZ[b.ust]).join('/') : ''}${l.bezahlt === 'firma' ? ' · Firma' : ''}`
              : KOSTENART_LABEL.keine;
        const richt = l.richtung === 'hin' ? 'Hinreise' : l.richtung === 'rueck' ? 'Rückreise' : 'vor Ort';
        return [
          String(i + 1),
          fmtDateTime(l.abfahrt),
          datePart(l.ankunft) === datePart(l.abfahrt) ? timePart(l.ankunft) : fmtDateTime(l.ankunft),
          `${ortKurz(l.von)} – ${ortKurz(l.nach)} (${richt})${l.notiz ? '\n' + l.notiz : ''}`,
          vm.label,
          ber,
          betrag ? fmtEUR(betrag) : '—',
          refs(l.belege),
        ];
      }),
    );
    w.liste([
      ['Summe Fahrtkosten', `${fmtEUR(s.bereiche.fahrt)}  (davon Kilometerpauschale ${fmtDecimal(s.fahrt.kmGesamt, 1)} km = ${fmtEUR(s.fahrt.kmCent)}, Tickets/Belege ${fmtEUR(s.fahrt.belegCent)})`],
    ]);
  } else w.hinweis('Keine Teilstrecken erfasst.');

  // ---------- 2 Übernachtungen ----------
  w.ueberschrift('2. Übernachtungskosten', 'Tatsächliche Kosten laut Rechnung. Frühstück ist kein Übernachtungsaufwand: gesondert ausgewiesenes Frühstück wird abgezogen, im Preis enthaltenes Frühstück kürzt den Verpflegungsmehraufwand.');
  if (uebs.length) {
    w.tabelle(
      [
        { titel: 'Nr.', breite: 0.5 },
        { titel: 'Zeitraum', breite: 1.8 },
        { titel: 'Unterkunft, Ort', breite: 3.2 },
        { titel: 'Nächte', breite: 0.75, align: 'r' },
        { titel: 'Frühstück', breite: 1.6 },
        { titel: 'USt', breite: 0.8 },
        { titel: 'Betrag', breite: 1.1, align: 'r' },
        { titel: 'Beleg', breite: 0.6 },
      ],
      uebs.map((u, i) => {
        const pos = a.positionen.find((x) => x.quelleId === u.id);
        const n = Math.max(0, Math.round((Date.parse(u.abreise) - Date.parse(u.anreise)) / 86400000)) || 0;
        return [
          `2.${i + 1}`,
          `${fmtDate(u.anreise)} – ${fmtDate(u.abreise)}`,
          `${u.bezeichnung}, ${ortKurz(u.ort)}${u.bezahlt === 'firma' ? ' (Firma bezahlt)' : ''}`,
          String(n),
          u.fruehstueck === 'inklusive' ? 'im Preis enthalten' : u.fruehstueck === 'separat' ? `abgezogen ${fmtEUR(u.fruehstueckCent ?? 0)}` : 'ohne',
          u.betraege.map((b) => UST_KURZ[b.ust]).join('/'),
          fmtEUR(pos?.bruttoCent ?? 0),
          refs(u.belege),
        ];
      }),
    );
  } else w.hinweis('Keine Übernachtungen erfasst.');

  // ---------- 3 Verpflegungsmehraufwand ----------
  w.ueberschrift(
    '3. Verpflegungsmehraufwand',
    'Pauschalen nach § 9 Abs. 4a EStG (Inland 14 €/28 €) bzw. BMF-Auslandspauschalen. Kürzung für gestellte Mahlzeiten: Frühstück 20 %, Mittag- und Abendessen je 40 % der vollen Tagespauschale.',
  );
  if (a.vma.tage.length) {
    w.tabelle(
      [
        { titel: 'Datum', breite: 1 },
        { titel: 'Land / Ort', breite: 2 },
        { titel: 'Dauer', breite: 0.9, align: 'r' },
        { titel: 'Art', breite: 1.9 },
        { titel: 'Pauschale', breite: 1, align: 'r' },
        { titel: 'Mahlzeiten', breite: 1 },
        { titel: 'Kürzung', breite: 1, align: 'r' },
        { titel: 'Betrag', breite: 1, align: 'r' },
      ],
      [
        ...a.vma.tage.map((t) => [
          fmtDate(t.datum),
          `${t.landName}${t.stadt ? ' – ' + t.stadt : ''}${t.hinweise.length ? '\n' + t.hinweise.join('; ') : ''}`,
          fmtHours(t.stunden),
          t.artText,
          fmtEUR(t.pauschaleCent),
          [t.fruehstueck && 'F', t.mittag && 'M', t.abend && 'A'].filter(Boolean).join(' ') || '—',
          t.kuerzungCent ? '− ' + fmtEUR(t.kuerzungCent) : '—',
          fmtEUR(t.betragCent),
        ]),
        ['', { text: 'Summe', bold: true }, '', '', fmtEUR(a.vma.pauschalenCent), '', a.vma.kuerzungenCent ? '− ' + fmtEUR(a.vma.kuerzungenCent) : '—', { text: fmtEUR(a.vma.summeCent), bold: true }],
      ] as Zelle[][],
      [...a.vma.tage.map(() => ({})), { fill: C.sum }],
    );
    const quellen = [...new Set(a.vma.tage.filter((t) => t.land !== 'DE').map((t) => t.quelle))];
    if (quellen.length) w.hinweis(`Auslandspauschalen: ${quellen.join('; ')}. F = Frühstück, M = Mittagessen, A = Abendessen gestellt.`);
    a.vma.hinweise.forEach((h) => w.hinweis(h));
  } else w.hinweis('Keine Berechnung möglich – Teilstrecken mit Abfahrt und Ankunft fehlen.');

  // ---------- 4 Sonstige Kosten ----------
  w.ueberschrift('4. Sonstige Kosten', 'Fortbildungs- und Seminarkosten, Reisenebenkosten (Parken, Maut, Gepäck …) und weitere Kosten im Zusammenhang mit der Reise.');
  if (kosten.length) {
    w.tabelle(
      [
        { titel: 'Nr.', breite: 0.5 },
        { titel: 'Datum', breite: 1 },
        { titel: 'Kategorie / Beschreibung', breite: 4.3 },
        { titel: 'USt', breite: 0.9 },
        { titel: 'Betrag', breite: 1.1, align: 'r' },
        { titel: 'Beleg', breite: 0.6 },
      ],
      kosten.map((k, i) => [
        `4.${i + 1}`,
        fmtDate(k.datum),
        `${KOSTEN_KATEGORIEN[k.kategorie].label}: ${k.beschreibung}${k.bezahlt === 'firma' ? ' (Firma bezahlt)' : ''}`,
        k.betraege.map((b) => UST_KURZ[b.ust]).join('/'),
        fmtEUR(sumBrutto(k.betraege)),
        refs(k.belege),
      ]),
    );
  } else w.hinweis('Keine sonstigen Kosten erfasst.');

  // ---------- 5 Bewirtungen ----------
  w.ueberschrift('5. Bewirtungskosten (gesondert)', 'Bewirtung aus geschäftlichem Anlass – 70 % abziehbar (§ 4 Abs. 5 Satz 1 Nr. 2 EStG), Vorsteuer bei ordnungsgemäßer Rechnung voll abziehbar. Getrennt von den Reisekosten auszuweisen.');
  if (bews.length) {
    w.tabelle(
      [
        { titel: 'Nr.', breite: 0.5 },
        { titel: 'Datum', breite: 1 },
        { titel: 'Gaststätte, Anlass, Teilnehmer', breite: 4.3 },
        { titel: 'USt', breite: 0.9 },
        { titel: 'Betrag', breite: 1.1, align: 'r' },
        { titel: 'Beleg', breite: 0.6 },
      ],
      bews.map((b, i) => [
        `5.${i + 1}`,
        fmtDate(b.datum),
        `${b.lokal}${b.anschrift ? ', ' + b.anschrift : ''}\nAnlass: ${b.anlass}\nTeilnehmer: ${b.teilnehmer}${b.trinkgeldCent ? `\nTrinkgeld: ${fmtEUR(b.trinkgeldCent)}` : ''}${b.bezahlt === 'firma' ? '\n(Firma bezahlt)' : ''}`,
        b.betraege.map((x) => UST_KURZ[x.ust]).join('/'),
        fmtEUR(sumBrutto(b.betraege) + (b.trinkgeldCent || 0)),
        refs(b.belege),
      ]),
    );
  } else w.hinweis('Keine Bewirtungen erfasst.');

  // ---------- 6 Kürzungen und Erstattungen ----------
  if (a.korrekturen.length) {
    w.ueberschrift('6. Kürzungen, Erstattungen und Vorschüsse');
    w.tabelle(
      [
        { titel: 'Art', breite: 1.6 },
        { titel: 'Beschreibung', breite: 4 },
        { titel: 'USt', breite: 0.9 },
        { titel: 'Betrag', breite: 1.2, align: 'r' },
      ],
      a.korrekturen.map((k) => [k.art === 'erstattung' ? 'Erstattung Dritter' : k.art === 'kuerzung' ? 'Kürzung' : 'Vorschuss', k.text, UST_KURZ[k.ust], '− ' + fmtEUR(k.betragCent)]),
    );
  }

  // ---------- Berechnungsteil ----------
  w.neueSeite();
  w.ueberschrift('Berechnung für Steuerberatung und Buchhaltung', `Abrechnung ${nummer || '(Entwurf)'} · Leistungszeitraum ${fmtDate(a.beginn)} – ${fmtDate(a.ende)} · Kontenrahmen ${ctx.kontenrahmen} (Kontenvorschlag)`);

  const sonstFort = a.positionen.filter((x) => x.bereich === 'sonstige' && x.konto === ctx.konten.fortbildung).reduce((t, x) => t + x.bruttoCent, 0);
  const kontoZeilen: Zelle[][] = [
    [BEREICH_LABEL.fahrt, `${ctx.konten.fahrt}${ctx.konten.km !== ctx.konten.fahrt ? ' / ' + ctx.konten.km : ''}`, fmtEUR(s.bereiche.fahrt)],
    [{ text: `– davon Kilometerpauschale (${fmtDecimal(s.fahrt.kmGesamt, 1)} km)`, color: C.muted }, ctx.konten.km, { text: fmtEUR(s.fahrt.kmCent), color: C.muted }],
    [{ text: '– davon Tickets/Belege', color: C.muted }, ctx.konten.fahrt, { text: fmtEUR(s.bereiche.fahrt - s.fahrt.kmCent), color: C.muted }],
    [BEREICH_LABEL.uebernachtung, ctx.konten.uebernachtung, fmtEUR(s.bereiche.uebernachtung)],
    [BEREICH_LABEL.vma, ctx.konten.vma, fmtEUR(s.bereiche.vma)],
    [BEREICH_LABEL.sonstige, ctx.konten.sonstige, fmtEUR(s.bereiche.sonstige)],
    ...(sonstFort ? [[{ text: '– davon Fortbildung/Seminare', color: C.muted }, ctx.konten.fortbildung, { text: fmtEUR(sonstFort), color: C.muted }]] : []),
    [{ text: 'Zwischensumme Reisekosten', bold: true }, '', { text: fmtEUR(s.reisekostenBrutto), bold: true }],
    ...(s.korrekturenCent ? [['abzüglich Kürzungen und Erstattungen Dritter', '', '− ' + fmtEUR(s.korrekturenCent)]] : []),
    [{ text: 'Reisekosten gesamt (brutto)', bold: true }, '', { text: fmtEUR(s.reisekostenNachKorrektur), bold: true }],
  ] as Zelle[][];
  w.text('A. Reisekosten nach Kostenarten', { bold: true, size: 9.5 });
  w.abstand(2);
  w.tabelle(
    [
      { titel: 'Kostenart', breite: 4.5 },
      { titel: 'Konto', breite: 1.3 },
      { titel: 'Brutto', breite: 1.5, align: 'r' },
    ],
    kontoZeilen,
    kontoZeilen.map((z) => (typeof z[0] !== 'string' && z[0].bold ? { fill: C.sum } : {})),
    { size: 8.5 },
  );

  w.text('B. Umsatzsteuer der Reisekosten', { bold: true, size: 9.5 });
  w.abstand(2);
  const ustZeilen: Zelle[][] = s.ustReise.map((u) => [UST_LABEL[u.ust], fmtEUR(u.netto), fmtEUR(u.ust === '19' || u.ust === '7' ? u.steuer : 0), fmtEUR(u.brutto)]);
  ustZeilen.push([{ text: 'Summe', bold: true }, { text: fmtEUR(s.nettoReise), bold: true }, { text: fmtEUR(s.vorsteuerReise), bold: true }, { text: fmtEUR(s.reisekostenNachKorrektur), bold: true }]);
  w.tabelle(
    [
      { titel: 'Steuersatz', breite: 3.2 },
      { titel: 'Netto', breite: 1.4, align: 'r' },
      { titel: 'Vorsteuer', breite: 1.4, align: 'r' },
      { titel: 'Brutto', breite: 1.4, align: 'r' },
    ],
    ustZeilen,
    ustZeilen.map((_, i) => (i === ustZeilen.length - 1 ? { fill: C.sum } : {})),
    { size: 8.5 },
  );
  w.hinweis('Kilometer- und Verpflegungspauschalen enthalten keine Vorsteuer. Vorsteuer nur aus ordnungsgemäßen Rechnungen (bis 250 € Kleinbetragsrechnung, Fahrausweise § 34 UStDV); ausländische Umsatzsteuer ist im Inland nicht abziehbar (ggf. Vorsteuer-Vergütungsverfahren).');

  w.abstand(4);
  w.text('C. Bewirtungskosten (getrennt von den Reisekosten)', { bold: true, size: 9.5 });
  w.abstand(2);
  const b = s.bewirtung;
  w.tabelle(
    [
      { titel: 'Bewirtung', breite: 4.5 },
      { titel: 'Konto', breite: 1.3 },
      { titel: 'Betrag', breite: 1.5, align: 'r' },
    ],
    [
      ['Bewirtungskosten brutto' + (b.trinkgeldCent ? ` (inkl. Trinkgeld ${fmtEUR(b.trinkgeldCent)})` : ''), '', fmtEUR(b.bruttoCent)],
      ...b.ust.filter((u) => u.steuer).map((u) => [`– darin Vorsteuer ${u.ust} % (voll abziehbar)`, '', fmtEUR(u.steuer)]),
      ['Bemessungsgrundlage (netto)', '', fmtEUR(b.basisCent)],
      [{ text: 'davon 70 % abziehbar', bold: true }, ctx.konten.bewirtung, { text: fmtEUR(b.abziehbarCent), bold: true }],
      ['davon 30 % nicht abziehbar', ctx.konten.bewirtungNichtAbziehbar, fmtEUR(b.nichtAbziehbarCent)],
    ] as Zelle[][],
    [],
    { size: 8.5 },
  );

  w.text('D. Zahlungsübersicht', { bold: true, size: 9.5 });
  w.abstand(2);
  w.tabelle(
    [
      { titel: 'Zahlung', breite: 5.8 },
      { titel: 'Betrag', breite: 1.5, align: 'r' },
    ],
    [
      ['Gesamtkosten (Reisekosten vor Kürzungen zzgl. Bewirtung)', fmtEUR(s.privatCent + s.firmaCent)],
      ['– davon vom Unternehmen direkt bezahlt (Firmenkarte/-konto)', fmtEUR(s.firmaCent)],
      ['– davon privat verauslagt inkl. Pauschalen', fmtEUR(s.privatCent)],
      ...(s.korrekturenCent ? [['abzüglich Kürzungen und Erstattungen Dritter', '− ' + fmtEUR(s.korrekturenCent)]] : []),
      ...(s.vorschussCent ? [['abzüglich erhaltener Vorschuss', '− ' + fmtEUR(s.vorschussCent)]] : []),
      [{ text: s.auszahlungCent >= 0 ? 'Auszahlungsbetrag an den Reisenden' : 'Rückzahlung durch den Reisenden', bold: true }, { text: fmtEUR(Math.abs(s.auszahlungCent)), bold: true, color: C.accent }],
    ] as Zelle[][],
    [{}, {}, {}, ...(s.korrekturenCent ? [{}] : []), ...(s.vorschussCent ? [{}] : []), { fill: C.sum }],
    { size: 8.5 },
  );
  if (ctx.reisender.iban) w.hinweis(`Auszahlung auf IBAN ${ctx.reisender.iban}`);

  // Buchungsvorschlag je Konto
  w.abstand(4);
  w.text('E. Buchungsvorschlag nach Konten', { bold: true, size: 9.5 });
  w.abstand(2);
  const konten = new Map<string, { bez: string; netto: Cent; ust: Cent; brutto: Cent }>();
  const add = (konto: string, bez: string, netto: Cent, ust: Cent, brutto: Cent) => {
    const k = konten.get(konto + bez) ?? { bez, netto: 0, ust: 0, brutto: 0 };
    k.netto += netto;
    k.ust += ust;
    k.brutto += brutto;
    konten.set(konto + bez, k);
  };
  for (const pos of a.positionen) {
    for (const x of pos.betraege) {
      const sp = splitBrutto(x.ust, x.bruttoCent);
      const vst = x.ust === '19' || x.ust === '7' ? sp.steuer : 0;
      if (pos.bereich === 'bewirtung') {
        const nab = Math.round(sp.netto * 0.3);
        add(pos.konto, KONTO_LABEL.bewirtung, sp.netto - nab, vst, sp.netto - nab + vst);
        add(pos.kontoNichtAbziehbar ?? '', KONTO_LABEL.bewirtungNichtAbziehbar, nab, 0, nab);
      } else {
        add(pos.konto, KONTO_LABEL[pos.kontoKey], sp.netto, vst, x.bruttoCent);
      }
    }
  }
  const buchZeilen: Zelle[][] = [...konten.entries()]
    .sort((x, y) => x[0].localeCompare(y[0]))
    .map(([k, v]) => [k.replace(v.bez, ''), v.bez, fmtEUR(v.netto), v.ust ? fmtEUR(v.ust) : '—', fmtEUR(v.brutto)]);
  if (s.korrekturenCent) buchZeilen.push(['', 'Kürzungen/Erstattungen Dritter', '', '', '− ' + fmtEUR(s.korrekturenCent)]);
  w.tabelle(
    [
      { titel: 'Konto', breite: 0.9 },
      { titel: 'Bezeichnung', breite: 3.3 },
      { titel: 'Netto', breite: 1.1, align: 'r' },
      { titel: 'Vorsteuer', breite: 1.1, align: 'r' },
      { titel: 'Brutto', breite: 1.1, align: 'r' },
    ],
    buchZeilen,
    [],
    { size: 8.5 },
  );
  w.hinweis('Kontenvorschlag nach DATEV-Standardkontenrahmen; Netto/Vorsteuer je Position rechnerisch aus dem Bruttobetrag ermittelt (Abweichungen von einem Cent durch Rundung möglich). Bitte mit der Buchhaltung abstimmen.');

  // Bestätigung
  w.abstand(8);
  w.text('Bestätigung', { bold: true, size: 9.5 });
  w.text('Ich versichere, dass die Reise aus betrieblichem Anlass durchgeführt wurde und die Angaben richtig und vollständig sind. Mahlzeiten, die vom Unternehmen oder auf dessen Veranlassung von Dritten gestellt wurden, sind angegeben.', { size: 8.5 });
  w.platz(44);
  w.abstand(28);
  w.page.drawLine({ start: { x: M.l, y: w.y }, end: { x: M.l + 180, y: w.y }, thickness: 0.6, color: C.text });
  w.page.drawLine({ start: { x: M.l + 230, y: w.y }, end: { x: M.l + 480, y: w.y }, thickness: 0.6, color: C.text });
  w.page.drawText('Ort, Datum', { x: M.l, y: w.y - 10, size: 7.5, font: w.font, color: C.muted });
  w.page.drawText(w.s(`Unterschrift ${ctx.reisender.name}`), { x: M.l + 230, y: w.y - 10, size: 7.5, font: w.font, color: C.muted });
  w.abstand(20);
  const meta: [string, string][] = [];
  if (r.abgeschlossenAm) meta.push(['Abgeschlossen am', fmtIsoLocal(r.abgeschlossenAm)]);
  if (r.pruefsumme) meta.push(['Prüfsumme (SHA-256)', r.pruefsumme]);
  if (opt.xml) meta.push(['E-Rechnung', `${XML_DATEINAME} (UN/CEFACT CII, EN 16931) ist als Datei in diese PDF eingebettet`]);
  w.liste(meta, 110);

  // ---------- Anlagen ----------
  if (opt.belegeAnhaengen && anlagen.length) {
    w.ueberschrift('Anlagenverzeichnis');
    w.tabelle(
      [
        { titel: 'Anlage', breite: 0.8 },
        { titel: 'Inhalt', breite: 4.5 },
        { titel: 'Datei', breite: 2.4 },
      ],
      anlagen.map((x) => [x.nr, x.text, x.anhang.name]),
    );
    for (const x of anlagen) await anlageEinfuegen(doc, w, x, opt);
  } else if (anlagen.length) {
    w.hinweis(`${anlagen.length} Beleg(e) liegen gesondert vor (Anlagen nicht eingebunden).`);
  }

  // Kopf-/Fußzeilen und Wasserzeichen
  const n = w.seiten.length;
  w.seiten.forEach((pg, i) => {
    const fuss = w.s(`${ctx.firma.name} · ${titel}${nummer ? ' Nr. ' + nummer : ' (Entwurf)'}`);
    pg.drawLine({ start: { x: M.l, y: 34 }, end: { x: A4[0] - M.r, y: 34 }, thickness: 0.5, color: C.line });
    pg.drawText(fuss, { x: M.l, y: 22, size: 7, font: w.font, color: C.muted });
    const seite = `Seite ${i + 1} von ${n}`;
    pg.drawText(seite, { x: A4[0] - M.r - w.breite(seite, 7), y: 22, size: 7, font: w.font, color: C.muted });
    if (w.wasserzeichen) {
      const size = 86;
      const tw = w.bold.widthOfTextAtSize(w.wasserzeichen, size);
      pg.drawText(w.wasserzeichen, {
        x: A4[0] / 2 - (tw / 2) * Math.cos(Math.PI / 5) + 20,
        y: A4[1] / 2 - (tw / 2) * Math.sin(Math.PI / 5),
        size,
        font: w.bold,
        color: C.wasser,
        opacity: 0.12,
        rotate: degrees(36),
      });
    }
  });

  // Metadaten und eingebettete E-Rechnung
  const jetzt = new Date();
  doc.setTitle(`${titel}${nummer ? ' ' + nummer : ''} – ${r.name}`);
  doc.setAuthor(ctx.reisender.name || ctx.firma.name);
  doc.setSubject(`${titel} ${r.name}`);
  doc.setKeywords(['Reisekostenabrechnung', nummer, ctx.firma.name].filter(Boolean));
  doc.setCreator('Reisekosten-App');
  doc.setProducer('Reisekosten-App (pdf-lib)');
  doc.setLanguage('de-DE');
  doc.setCreationDate(jetzt);
  doc.setModificationDate(jetzt);
  if (opt.xml) {
    await doc.attach(new TextEncoder().encode(opt.xml), XML_DATEINAME, {
      mimeType: 'text/xml',
      description: 'Rechnungsdaten nach EN 16931 (Factur-X/ZUGFeRD, Profil EN 16931)',
      creationDate: jetzt,
      modificationDate: jetzt,
      afRelationship: AFRelationship.Alternative,
    });
    const xmp = xmpMetadaten(doc.getTitle() ?? titel, ctx.reisender.name || ctx.firma.name, jetzt);
    const stream = doc.context.stream(new TextEncoder().encode(xmp), { Type: 'Metadata', Subtype: 'XML' });
    doc.catalog.set(PDFName.of('Metadata'), doc.context.register(stream));
  }
  return doc.save({ useObjectStreams: false });
}

async function anlageEinfuegen(doc: PDFDocument, w: Schreiber, x: { anhang: Anhang; nr: string; text: string }, opt: PdfOptionen) {
  const blob = await opt.ladeDatei(x.anhang.id);
  const kopfzeile = (pg: PDFPage, zusatz = '') => {
    pg.drawRectangle({ x: 0, y: A4[1] - 28, width: A4[0], height: 28, color: rgb(1, 1, 1) });
    pg.drawText(w.s(`Anlage ${x.nr}${zusatz} – ${x.text}`).slice(0, 120), { x: M.l, y: A4[1] - 19, size: 8.5, font: w.bold, color: C.accent });
    pg.drawText(w.s(x.anhang.name).slice(0, 90), { x: M.l, y: A4[1] - 27, size: 6.5, font: w.font, color: C.muted });
  };
  const platzhalter = (grund: string) => {
    w.neueSeite(true);
    kopfzeile(w.page);
    w.y = A4[1] - 60;
    w.text(grund, { size: 9, color: C.muted });
  };
  if (!blob) return platzhalter('Datei nicht gefunden.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const typ = x.anhang.typ || blob.type;
  try {
    if (typ === 'application/pdf') {
      let seiten;
      try {
        const quelle = await PDFDocument.load(bytes, { ignoreEncryption: true });
        seiten = await doc.embedPdf(quelle, quelle.getPageIndices());
      } catch {
        seiten = null;
      }
      if (!seiten) {
        await doc.attach(bytes, x.anhang.name, { mimeType: 'application/pdf', description: `Anlage ${x.nr}: ${x.text}` });
        return platzhalter('Diese PDF-Datei konnte nicht als Seite eingebunden werden (z. B. verschlüsselt). Sie ist als Dateianhang in diesem Dokument enthalten.');
      }
      seiten.forEach((sp, i) => {
        w.neueSeite(true);
        const maxW = A4[0] - 2 * 30;
        const maxH = A4[1] - 40 - 30;
        const sc = Math.min(maxW / sp.width, maxH / sp.height, 1.5);
        const pw = sp.width * sc;
        const ph = sp.height * sc;
        w.page.drawPage(sp, { x: (A4[0] - pw) / 2, y: 30 + (maxH - ph), width: pw, height: ph });
        w.page.drawRectangle({ x: (A4[0] - pw) / 2, y: 30 + (maxH - ph), width: pw, height: ph, borderColor: C.line, borderWidth: 0.5 });
        kopfzeile(w.page, seiten!.length > 1 ? ` (Seite ${i + 1}/${seiten!.length})` : '');
      });
      return;
    }
    if (typ.startsWith('image/')) {
      let img;
      if (typ === 'image/jpeg' || typ === 'image/jpg') img = await doc.embedJpg(bytes);
      else if (typ === 'image/png') img = await doc.embedPng(bytes);
      else if (opt.bildZuJpeg) {
        const jpg = await opt.bildZuJpeg(blob);
        if (jpg) img = await doc.embedJpg(jpg);
      }
      if (!img) return platzhalter(`Bildformat ${typ} kann nicht eingebunden werden.`);
      w.neueSeite(true);
      const maxW = A4[0] - 2 * 36;
      const maxH = A4[1] - 44 - 36;
      const sc = Math.min(maxW / img.width, maxH / img.height, 1);
      const pw = img.width * sc;
      const ph = img.height * sc;
      w.page.drawImage(img, { x: (A4[0] - pw) / 2, y: 36 + (maxH - ph), width: pw, height: ph });
      kopfzeile(w.page);
      return;
    }
    await doc.attach(bytes, x.anhang.name, { mimeType: typ || 'application/octet-stream', description: `Anlage ${x.nr}: ${x.text}` });
    return platzhalter('Diese Datei ist als Dateianhang in diesem Dokument enthalten.');
  } catch (e) {
    return platzhalter(`Datei konnte nicht eingebunden werden: ${(e as Error).message}`);
  }
}

function xmpMetadaten(titel: string, autor: string, datum: Date): string {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const iso = datum.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${esc(titel)}</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>${esc(autor)}</rdf:li></rdf:Seq></dc:creator>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreatorTool>Reisekosten-App</xmp:CreatorTool>
      <xmp:CreateDate>${iso}</xmp:CreateDate>
      <xmp:ModifyDate>${iso}</xmp:ModifyDate>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>Reisekosten-App (pdf-lib)</pdf:Producer>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>${XML_DATEINAME}</fx:DocumentFileName>
      <fx:Version>1.0</fx:Version>
      <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

