import { AUSLAND_2026 } from '../data/auslandspauschalen-2026';
import { SOVEREIGN_OF, countryName } from '../data/countries';
import type { EinstellungsSnapshot, RateTable } from '../types';
import { normalize } from './util';
import { parseEuro } from './money';

/** Gesetzliche Inlandspauschalen nach § 9 Abs. 4a Satz 3 EStG (seit 2020 unverändert, auch 2026). */
export const INLAND_GESETZLICH = { vollCent: 2800, teilCent: 1400 };

export const EINGEBAUTE_TABELLEN: RateTable[] = [AUSLAND_2026];

export interface RateInfo {
  land: string;
  landName: string;
  /** Stadt mit eigener Pauschale oder null (übriges Land) */
  ort: string | null;
  vollCent: number;
  teilCent: number;
  uebernachtungCent: number;
  jahr: number;
  quelle: string;
  /** Hinweis, z. B. wenn die Tabelle eines anderen Jahres oder der Luxemburg-Satz verwendet wurde */
  hinweis?: string;
}

type RateCtx = Pick<EinstellungsSnapshot, 'inland' | 'zusatzTabellen'>;

export function alleTabellen(ctx: RateCtx): RateTable[] {
  const byYear = new Map<number, RateTable>();
  for (const t of EINGEBAUTE_TABELLEN) byYear.set(t.jahr, t);
  for (const t of ctx.zusatzTabellen ?? []) byYear.set(t.jahr, t); // eigene Tabelle ersetzt eingebaute desselben Jahres
  return [...byYear.values()].sort((a, b) => a.jahr - b.jahr);
}

/** Tabelle für das Jahr; fehlt sie, die nächstältere (sonst die älteste vorhandene). */
export function tabelleFuer(jahr: number, ctx: RateCtx): { tabelle: RateTable; exakt: boolean } {
  const all = alleTabellen(ctx);
  const exact = all.find((t) => t.jahr === jahr);
  if (exact) return { tabelle: exact, exakt: true };
  const older = all.filter((t) => t.jahr < jahr).pop();
  return { tabelle: older ?? all[0], exakt: false };
}

// Gebräuchliche Schreibweisen der Städte mit eigener Pauschale
const ALIASES: Record<string, string[]> = {
  'new york city': ['new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx'],
  'washington d c': ['washington', 'washington dc'],
  rom: ['roma', 'rome'],
  mailand: ['milano', 'milan'],
  peking: ['beijing'],
  tokio: ['tokyo'],
  warschau: ['warszawa', 'warsaw'],
  breslau: ['wroclaw'],
  moskau: ['moskva', 'moscow'],
  'st petersburg': ['sankt petersburg', 'saint petersburg'],
  'neu delhi': ['new delhi', 'delhi'],
  kalkutta: ['kolkata', 'calcutta'],
  mumbai: ['bombay'],
  chennai: ['madras'],
  bangalore: ['bengaluru'],
  genf: ['geneve', 'geneva', 'ginevra'],
  bern: ['berne'],
  kapstadt: ['cape town', 'kaapstad'],
  djidda: ['jeddah', 'dschidda', 'jidda'],
  riad: ['riyadh', 'riyad'],
  'sao paulo': [],
  'rio de janeiro': ['rio'],
  hongkong: ['hong kong'],
  'palma de mallorca': ['palma'],
  'kanarische inseln': ['las palmas', 'las palmas de gran canaria', 'santa cruz de tenerife', 'teneriffa', 'tenerife', 'gran canaria', 'lanzarote', 'fuerteventura', 'arrecife', 'puerto del rosario', 'la palma', 'la gomera', 'el hierro'],
  izmir: ['smyrna'],
};

/** Ermittelt die Stadt mit eigener Pauschale für einen Ort (Name/PLZ), sonst null. */
export function stadtFuer(land: string, ortName: string | undefined, plz: string | undefined, tabelle: RateTable): string | null {
  const cities = tabelle.zeilen.filter((z) => z[0] === land && z[2]).map((z) => z[2] as string);
  if (!cities.length) return null;
  const n = normalize(ortName ?? '');
  // Paris einschließlich der Départements 77, 78, 91 bis 95
  if (land === 'FR' && cities.includes('Paris')) {
    const p = (plz ?? '').trim();
    if (/^(75|77|78|91|92|93|94|95)\d{3}$/.test(p) || n === 'paris') return 'Paris';
  }
  if (land === 'ES' && cities.includes('Kanarische Inseln') && /^(35|38)\d{3}$/.test((plz ?? '').trim())) return 'Kanarische Inseln';
  if (!n) return null;
  for (const c of cities) {
    const cn = normalize(c);
    if (n === cn || (ALIASES[cn] ?? []).includes(n)) return c;
  }
  for (const c of cities) {
    const cn = normalize(c);
    if (cn.length > 3 && (n.startsWith(cn + ' ') || n.endsWith(' ' + cn))) return c;
  }
  return null;
}

/** Städte mit eigener Pauschale in einem Land */
export function staedte(land: string, jahr: number, ctx: RateCtx): string[] {
  const { tabelle } = tabelleFuer(jahr, ctx);
  return tabelle.zeilen.filter((z) => z[0] === land && z[2]).map((z) => z[2] as string);
}

/** Pauschbeträge für Land/Stadt in einem Jahr */
export function pauschaleFuer(jahr: number, land: string, stadt: string | null, ctx: RateCtx): RateInfo {
  if (!land || land === 'DE') {
    const inland = ctx.inland ?? INLAND_GESETZLICH;
    return {
      land: 'DE',
      landName: 'Deutschland',
      ort: null,
      vollCent: inland.vollCent,
      teilCent: inland.teilCent,
      uebernachtungCent: 0,
      jahr,
      quelle: '§ 9 Abs. 4a Satz 3 EStG',
    };
  }
  const { tabelle, exakt } = tabelleFuer(jahr, ctx);
  const hinweise: string[] = [];
  if (!exakt) hinweise.push(`Für ${jahr} ist keine Auslandstabelle hinterlegt – Werte ${tabelle.jahr} verwendet`);

  const find = (l: string, s: string | null) => tabelle.zeilen.find((z) => z[0] === l && (s ? z[2] === s : !z[2]));
  let code = land;
  let row = find(code, stadt) ?? find(code, null);
  if (!row && land === 'HK') {
    row = find('CN', 'Hongkong');
  }
  if (!row && tabelle.zuordnung[land]) {
    code = tabelle.zuordnung[land];
    row = find(code, null);
    if (row) hinweise.push(`Laut BMF gelten für ${countryName(land)} die Beträge für ${row[1]}`);
  }
  if (!row && SOVEREIGN_OF[land]) {
    code = SOVEREIGN_OF[land];
    row = find(code, null) ?? (tabelle.zuordnung[code] ? find(tabelle.zuordnung[code], null) : undefined);
    if (row) hinweise.push(`Überseegebiet: Pauschbetrag des Mutterlandes ${row[1]}`);
  }
  if (!row) {
    row = find(tabelle.ersatzLand, null)!;
    hinweise.push(`${countryName(land)} ist nicht erfasst – Pauschbetrag für Luxemburg (BMF)`);
  }
  return {
    land,
    landName: countryName(land) || row[1],
    ort: row[2],
    vollCent: row[3],
    teilCent: row[4],
    uebernachtungCent: row[5],
    jahr: tabelle.jahr,
    quelle: tabelle.quelle,
    hinweis: hinweise.join('; ') || undefined,
  };
}

/**
 * Liest eine Pauschalentabelle aus CSV/Text (z. B. aus dem BMF-Schreiben kopiert).
 * Erwartet je Zeile: Land;Ort(leer);24h;An-/Abreise;Übernachtung – Beträge in Euro.
 * Ländernamen werden über die deutschen Bezeichnungen den ISO-Codes zugeordnet.
 */
export function parseTabelle(text: string, jahr: number, codeFuerName: (name: string) => string | null): { tabelle: RateTable; fehler: string[] } {
  const zeilen: RateTable['zeilen'] = [];
  const fehler: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const parts = line.split(/;|\t|\|/).map((p) => p.trim());
      if (parts.length < 5) {
        if (i > 0) fehler.push(`Zeile ${i + 1}: zu wenige Spalten`);
        return;
      }
      const [landRaw, ortRaw, v, t, u] = parts;
      const num = (x: string) => parseEuro(x) ?? NaN;
      const code = /^[A-Z]{2}$/.test(landRaw) ? landRaw : codeFuerName(landRaw);
      if (!code) {
        if (i > 0) fehler.push(`Zeile ${i + 1}: Land „${landRaw}“ nicht erkannt`);
        return;
      }
      const vals = [num(v), num(t), num(u)];
      if (vals.some((x) => !Number.isFinite(x))) {
        if (i > 0) fehler.push(`Zeile ${i + 1}: Beträge nicht lesbar`);
        return;
      }
      zeilen.push([code, countryName(code) || landRaw, ortRaw || null, vals[0], vals[1], vals[2]]);
    });
  return {
    tabelle: { jahr, quelle: `Eigene Tabelle ${jahr} (importiert)`, zeilen, zuordnung: AUSLAND_2026.zuordnung, ersatzLand: 'LU' },
    fehler,
  };
}
