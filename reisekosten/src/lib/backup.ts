// Datensicherung: alle Reisen, Belege und Einstellungen als eine JSON-Datei (für Gerätewechsel und Archiv).
import type { Einstellungen, Reise } from '../types';
import type { Backend } from './db';
import { mitStandards } from './defaults';

interface Sicherung {
  format: 'reisekosten-sicherung';
  version: 1;
  erstellt: string;
  einstellungen: Einstellungen;
  zaehler: Record<string, number>;
  reisen: Reise[];
  dateien: { id: string; name: string; typ: string; groesse: number; erstelltAm: string; base64: string }[];
}

function zuBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] ?? '');
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(b);
  });
}

function vonBase64(s: string, typ: string): Blob {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: typ });
}

export async function sicherungErstellen(b: Backend): Promise<Blob> {
  const reisen = await b.alleReisen();
  const dateien: Sicherung['dateien'] = [];
  for (const id of await b.alleDateiIds()) {
    const d = await b.datei(id);
    if (d) dateien.push({ id: d.id, name: d.name, typ: d.typ, groesse: d.groesse, erstelltAm: d.erstelltAm, base64: await zuBase64(d.blob) });
  }
  const s: Sicherung = {
    format: 'reisekosten-sicherung',
    version: 1,
    erstellt: new Date().toISOString(),
    einstellungen: mitStandards(await b.meta<Einstellungen>('einstellungen')),
    zaehler: (await b.meta<Record<string, number>>('zaehler')) ?? {},
    reisen,
    dateien,
  };
  return new Blob([JSON.stringify(s)], { type: 'application/json' });
}

export async function sicherungEinlesen(b: Backend, datei: File): Promise<{ reisen: number; dateien: number }> {
  const s = JSON.parse(await datei.text()) as Sicherung;
  if (s.format !== 'reisekosten-sicherung' || !Array.isArray(s.reisen)) throw new Error('Keine gültige Sicherungsdatei der Reisekosten-App.');
  await b.allesLoeschen();
  await b.setzeMeta('einstellungen', mitStandards(s.einstellungen));
  await b.setzeMeta('zaehler', s.zaehler ?? {});
  for (const r of s.reisen) await b.speichereReise(r);
  for (const d of s.dateien ?? []) await b.speichereDatei({ id: d.id, name: d.name, typ: d.typ, groesse: d.groesse, erstelltAm: d.erstelltAm, blob: vonBase64(d.base64, d.typ) });
  return { reisen: s.reisen.length, dateien: s.dateien?.length ?? 0 };
}
