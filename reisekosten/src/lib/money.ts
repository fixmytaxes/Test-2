import type { Betragszeile, Cent, UstKey } from '../types';

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const num2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtEUR = (c: Cent): string => eur.format((c || 0) / 100);
export const fmtNum2 = (c: Cent): string => num2.format((c || 0) / 100);
/** Betrag für XML: Punkt als Dezimaltrenner, zwei Nachkommastellen */
export const xmlAmount = (c: Cent): string => (Math.round(c) / 100).toFixed(2);

/** "12,50" | "1.234,56" | "12.5" | "12" → Cent; leer/ungültig → null */
export function parseEuro(input: string): Cent | null {
  let s = (input ?? '').trim().replace(/\s|€/g, '');
  if (!s) return null;
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  if (!/^\d*(\.\d*)?$/.test(s) || s === '.') return null;
  const v = Math.round(parseFloat(s) * 100);
  if (!Number.isFinite(v)) return null;
  return neg ? -v : v;
}

/** Cent → Eingabetext "12,50" (leer bei 0/undefined, wenn emptyZero) */
export function centToInput(c: Cent | undefined, emptyZero = true): string {
  if (c === undefined || c === null || (emptyZero && c === 0)) return '';
  return num2.format(c / 100);
}

export function parseDecimal(input: string): number | null {
  let s = (input ?? '').trim().replace(/\s/g, '');
  if (!s) return null;
  s = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

export const fmtDecimal = (v: number | undefined, digits = 1): string =>
  v === undefined || v === null ? '' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(v);

export const UST_RATE: Record<UstKey, number> = { '19': 19, '7': 7, '0': 0, ausl: 0 };

export const UST_LABEL: Record<UstKey, string> = {
  '19': '19 %',
  '7': '7 %',
  '0': 'ohne USt / steuerfrei',
  ausl: 'ausländische USt (kein Vorsteuerabzug)',
};

export const UST_KURZ: Record<UstKey, string> = { '19': '19 %', '7': '7 %', '0': '0 %', ausl: 'ausl.' };

export const sumBrutto = (z: Betragszeile[] | undefined): Cent => (z ?? []).reduce((s, b) => s + (b.bruttoCent || 0), 0);

export interface UstAufteilung {
  ust: UstKey;
  brutto: Cent;
  netto: Cent;
  /** brutto − netto (für die Anzeige, Netto + Steuer = Brutto) */
  steuer: Cent;
  /** round(netto × Satz) – Steuerbetrag nach EN 16931 (BR-CO-17) */
  steuerEN: Cent;
  /** steuer − steuerEN, i. d. R. 0, höchstens ±1 Cent (in der E-Rechnung als Rundungsbetrag BT-114) */
  rundung: Cent;
}

/**
 * Teilt eine Bruttosumme in Netto und Steuer auf. Gesucht wird ein Nettobetrag, für den
 * netto + round(netto × Satz) exakt die Bruttosumme ergibt. Gibt es keinen (bei manchen Beträgen
 * mathematisch unmöglich), bleibt eine Rundungsdifferenz von höchstens einem Cent.
 */
export function splitBrutto(ust: UstKey, brutto: Cent): UstAufteilung {
  const r = UST_RATE[ust];
  if (r === 0) return { ust, brutto, netto: brutto, steuer: 0, steuerEN: 0, rundung: 0 };
  const steuerVon = (n: number) => Math.round((n * r) / 100);
  const base = Math.round(brutto / (1 + r / 100));
  let netto = base;
  for (const d of [0, -1, 1, -2, 2]) {
    if (base + d + steuerVon(base + d) === brutto) {
      netto = base + d;
      break;
    }
  }
  const steuerEN = steuerVon(netto);
  return { ust, brutto, netto, steuer: brutto - netto, steuerEN, rundung: brutto - netto - steuerEN };
}

export const UST_ORDER: UstKey[] = ['19', '7', '0', 'ausl'];
