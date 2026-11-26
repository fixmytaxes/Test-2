// Pflichtangaben (gesetzliche Mindestanforderungen an den Reisekostennachweis) und Hinweise.
import type { Einstellungen, Reise } from '../types';
import { datePart, toMs } from './dates';
import { sumBrutto } from './money';

export interface Meldung {
  text: string;
  /** DOM-id des betroffenen Abschnitts/Elements */
  ziel?: string;
}

export interface Pruefung {
  fehler: Meldung[];
  warnungen: Meldung[];
}

export function pruefeReise(r: Reise, e: Einstellungen): Pruefung {
  const fehler: Meldung[] = [];
  const warnungen: Meldung[] = [];
  const F = (text: string, ziel?: string) => fehler.push({ text, ziel });
  const W = (text: string, ziel?: string) => warnungen.push({ text, ziel });

  if (!r.name.trim()) F('Name der Reise fehlt', 'sec-reise');
  if (!r.anlass.trim()) F('Anlass der Reise fehlt (betrieblicher Zweck)', 'sec-reise');
  if (!r.ziel.ort.trim()) F('Zielort fehlt', 'sec-reise');
  if (!r.ziel.land) F('Land des Zielorts fehlt', 'sec-reise');
  if (r.ziel.ort.trim() && !r.ziel.strasse?.trim()) W('Anschrift des Zielorts unvollständig (Straße empfohlen)', 'sec-reise');
  if (r.start.typ === 'abweichend' && !r.start.ort?.ort?.trim()) F('Abweichender Startpunkt: Ort fehlt', 'sec-reise');
  if (r.start.typ === 'firmensitz' && !e.firma.ort.trim()) W('Firmensitz ist in den Einstellungen nicht hinterlegt', 'sec-reise');
  if (r.start.typ === 'wohnung' && !e.wohnung.ort.trim()) W('Wohnanschrift ist in den Einstellungen nicht hinterlegt', 'sec-reise');

  if (!r.strecken.length) F('Mindestens eine Teilstrecke mit Abfahrt und Ankunft erfassen', 'sec-strecken');
  const sorted = [...r.strecken].sort((a, b) => (a.abfahrt || '').localeCompare(b.abfahrt || ''));
  sorted.forEach((s, i) => {
    const n = `Teilstrecke ${r.strecken.indexOf(s) + 1}`;
    const z = 'leg-' + s.id;
    if (!s.von.ort.trim()) F(`${n}: Startort fehlt`, z);
    if (!s.nach.ort.trim()) F(`${n}: Zielort fehlt`, z);
    if (!s.abfahrt || s.abfahrt.length < 16) F(`${n}: Abfahrt (Datum und Uhrzeit) fehlt`, z);
    if (!s.ankunft || s.ankunft.length < 16) F(`${n}: Ankunft (Datum und Uhrzeit) fehlt`, z);
    if (s.abfahrt && s.ankunft && toMs(s.ankunft) <= toMs(s.abfahrt)) F(`${n}: Ankunft liegt nicht nach der Abfahrt`, z);
    if (s.kostenart === 'km' && !(s.km && s.km > 0)) F(`${n}: Gefahrene Kilometer fehlen`, z);
    if (s.kostenart === 'beleg' && sumBrutto(s.betraege) <= 0) F(`${n}: Ticketpreis fehlt`, z);
    if (s.kostenart === 'beleg' && sumBrutto(s.betraege) > 0 && !s.belege.length) W(`${n}: Beleg/Ticket nicht angehängt`, z);
    const prev = sorted[i - 1];
    if (prev && prev.ankunft && s.abfahrt && toMs(s.abfahrt) < toMs(prev.ankunft)) W(`${n}: beginnt vor Ankunft der vorherigen Teilstrecke`, z);
  });

  r.uebernachtungen.forEach((u, i) => {
    const n = `Übernachtung ${i + 1}`;
    const z = 'stay-' + u.id;
    if (!u.bezeichnung.trim()) F(`${n}: Unterkunft fehlt`, z);
    if (!u.ort.ort.trim()) F(`${n}: Ort fehlt`, z);
    if (!u.anreise || !u.abreise) F(`${n}: An- und Abreisedatum fehlen`, z);
    else if (u.abreise <= u.anreise) F(`${n}: Abreise muss nach der Anreise liegen`, z);
    if (sumBrutto(u.betraege) <= 0) F(`${n}: Betrag fehlt`, z);
    else if (!u.belege.length) W(`${n}: Hotelrechnung nicht angehängt`, z);
    if (u.fruehstueck === 'separat' && !(u.fruehstueckCent && u.fruehstueckCent > 0)) F(`${n}: Betrag des gesondert ausgewiesenen Frühstücks fehlt`, z);
  });

  r.kosten.forEach((k, i) => {
    const n = `Kosten ${i + 1}`;
    const z = 'cost-' + k.id;
    if (!k.beschreibung.trim()) F(`${n}: Beschreibung fehlt`, z);
    if (!k.datum) F(`${n}: Datum fehlt`, z);
    if (sumBrutto(k.betraege) <= 0) F(`${n}: Betrag fehlt`, z);
    else if (!k.belege.length) W(`${n}: Beleg nicht angehängt`, z);
  });

  r.bewirtungen.forEach((b, i) => {
    const n = `Bewirtung ${i + 1}`;
    const z = 'host-' + b.id;
    if (!b.datum) F(`${n}: Datum fehlt`, z);
    if (!b.lokal.trim()) F(`${n}: Ort/Name der Gaststätte fehlt`, z);
    if (!b.anlass.trim()) F(`${n}: Anlass der Bewirtung fehlt`, z);
    if (!b.teilnehmer.trim()) F(`${n}: Teilnehmer (bewirtete Personen) fehlen`, z);
    if (sumBrutto(b.betraege) <= 0) F(`${n}: Betrag fehlt`, z);
    else if (!b.belege.length) W(`${n}: Bewirtungsbeleg (maschinell erstellte Rechnung) nicht angehängt`, z);
    if (sumBrutto(b.betraege) > 25000) W(`${n}: Über 250 € muss die Rechnung Name und Anschrift des Unternehmens enthalten`, z);
  });

  r.korrekturen.forEach((k, i) => {
    if (!(k.betragCent > 0)) F(`Kürzung/Erstattung ${i + 1}: Betrag fehlt`, 'sec-korrekturen');
    if (!k.beschreibung.trim()) W(`Kürzung/Erstattung ${i + 1}: Beschreibung fehlt`, 'sec-korrekturen');
  });

  const dates = r.strecken.map((s) => datePart(s.abfahrt)).filter(Boolean);
  for (const u of r.uebernachtungen) {
    if (dates.length && u.anreise && (u.anreise < dates.sort()[0])) W(`Übernachtung „${u.bezeichnung}“ beginnt vor der ersten Teilstrecke`, 'stay-' + u.id);
  }

  if (!e.reisender.name.trim()) F('Name des Reisenden fehlt (Einstellungen)', 'einstellungen');
  if (!e.firma.name.trim()) F('Name des Unternehmens fehlt (Einstellungen)', 'einstellungen');
  return { fehler, warnungen };
}
