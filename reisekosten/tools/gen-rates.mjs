// Erzeugt src/data/auslandspauschalen-2026.ts aus der (MIT-lizenzierten) Tabelle des npm-Pakets @fin.cx/expenses,
// die dort aus dem BMF-Schreiben vom 05.12.2025 generiert wurde. Liest die Datei nur als Text (kein Ausführen).
// Aufruf: node tools/gen-rates.mjs <pfad/zu/travelrates.2026.ts>
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');
const re = /\{ country: '([A-Z]{2})', countryName: '([^']+)', city: (null|'([^']*)'), fullDayCents: (\d+), partialDayCents: (\d+), lodgingFlatCents: (\d+), page: \d+(?:, cityIncludes: '([^']*)')? \}/g;
const rows = [];
for (const m of src.matchAll(re)) {
  rows.push({ land: m[1], name: m[2], ort: m[4] ?? null, voll: +m[5], teil: +m[6], uen: +m[7], hinweis: m[8] ?? null });
}
const assigned = JSON.parse(src.match(/assignedTo: (\{[^}]*\})/)[1].replace(/(\w\w):/g, '"$1":').replace(/'/g, '"'));
const lines = rows.map((r) => `  [${JSON.stringify(r.land)}, ${JSON.stringify(r.name)}, ${JSON.stringify(r.ort)}, ${r.voll}, ${r.teil}, ${r.uen}${r.hinweis ? ', ' + JSON.stringify(r.hinweis) : ''}],`);
const out = `// Pauschbeträge für Verpflegungsmehraufwendungen und Übernachtungskosten im Ausland ab 1. Januar 2026.
// Quelle: BMF-Schreiben vom 05.12.2025, GZ IV C 5 - S 2353/00094/007/012 (DOK COO.7005.100.3.13672232).
// Maschinenlesbare Fassung übernommen aus dem npm-Paket @fin.cx/expenses 3.0.0 (MIT-Lizenz,
// Copyright (c) 2026 Task Venture Capital GmbH), das sie aus dem BMF-PDF erzeugt hat.
// Erzeugt mit tools/gen-rates.mjs – Beträge in Cent: [ISO-Land, Ländername, Ort|null, 24 h, An-/Abreisetag & >8 h, Übernachtung, Hinweis?]
import type { RateTable } from '../types';

export const AUSLAND_2026: RateTable = {
  jahr: 2026,
  quelle: 'BMF-Schreiben vom 05.12.2025 (IV C 5 - S 2353/00094/007/012)',
  zeilen: [
${lines.join('\n')}
  ],
  // Länder, für die laut BMF die Beträge eines anderen Landes gelten
  zuordnung: ${JSON.stringify(assigned)},
  // Für nicht erfasste Länder gilt der für Luxemburg geltende Pauschbetrag
  ersatzLand: 'LU',
};
`;
writeFileSync('src/data/auslandspauschalen-2026.ts', out);
console.log(rows.length, 'Zeilen,', new Set(rows.map((r) => r.land)).size, 'Länder,', rows.filter((r) => r.ort).length, 'Orte');
