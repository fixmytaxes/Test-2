// Verpflegungsmehraufwand nach § 9 Abs. 4a EStG (für Unternehmer über § 4 Abs. 5 Satz 1 Nr. 5 EStG)
// und BMF-Schreiben zu den Auslandsreisekosten.
//
// Regeln:
// - Inland: 28 € bei 24 Stunden Abwesenheit, 14 € für An- und Abreisetag einer mehrtägigen Reise mit
//   Übernachtung (ohne Mindeststunden) sowie bei eintägiger Abwesenheit von mehr als 8 Stunden.
// - Beginnt die Reise an einem Tag und endet sie am Folgetag ohne Übernachtung, werden die Stunden
//   zusammengerechnet; die Pauschale gilt für den Tag mit der überwiegenden Abwesenheit.
// - Ausland: länderweise Pauschbeträge (100 % bzw. 80 %) laut BMF-Tabelle. Maßgebend ist für An-
//   und Zwischentage der Ort, der vor 24 Uhr Ortszeit erreicht wird; für den Rückreisetag der letzte
//   Tätigkeitsort im Ausland; bei eintägigen Reisen der letzte Tätigkeitsort im Ausland.
// - Gestellte Mahlzeiten kürzen um 20 % (Frühstück) bzw. je 40 % (Mittag-/Abendessen) der vollen
//   Tagespauschale des jeweiligen Landes, höchstens bis 0 €.
import type { EinstellungsSnapshot, Ort, Reise, TagAngabe } from '../types';
import { addDays, daysBetween, hoursBetween, MS_D, toMs } from './dates';
import { pauschaleFuer, stadtFuer, tabelleFuer } from './rates';
import { normalize } from './util';

export type TagArt = 'anreise' | 'abreise' | 'zwischentag' | 'eintaegig' | 'zusammengefasst' | 'ohne';

export const TAG_ART_TEXT: Record<TagArt, string> = {
  anreise: 'Anreisetag',
  abreise: 'Rückreisetag',
  zwischentag: '24 Std. abwesend',
  eintaegig: 'mehr als 8 Std.',
  zusammengefasst: 'mehr als 8 Std. (zusammengerechnet)',
  ohne: 'keine Pauschale',
};

export interface TagErgebnis {
  datum: string;
  stunden: number;
  art: TagArt;
  artText: string;
  land: string;
  landName: string;
  stadt: string | null;
  landAuto: string;
  stadtAuto: string | null;
  vollCent: number;
  teilCent: number;
  pauschaleCent: number;
  fruehstueck: boolean;
  mittag: boolean;
  abend: boolean;
  fruehstueckAuto: boolean;
  kuerzungFCent: number;
  kuerzungMCent: number;
  kuerzungACent: number;
  kuerzungCent: number;
  betragCent: number;
  ausgeschlossen: boolean;
  jahr: number;
  quelle: string;
  hinweise: string[];
}

export interface VmaErgebnis {
  tage: TagErgebnis[];
  summeCent: number;
  pauschalenCent: number;
  kuerzungenCent: number;
  beginn?: string;
  ende?: string;
  dauerStunden: number;
  mitUebernachtung: boolean;
  hinweise: string[];
}

type Ctx = Pick<EinstellungsSnapshot, 'inland' | 'zusatzTabellen'>;

interface Ankunft {
  t: number;
  ort: Ort;
}

export function berechneVma(reise: Reise, ctx: Ctx): VmaErgebnis {
  const leer: VmaErgebnis = { tage: [], summeCent: 0, pauschalenCent: 0, kuerzungenCent: 0, dauerStunden: 0, mitUebernachtung: false, hinweise: [] };
  const legs = reise.strecken
    .filter((l) => Number.isFinite(toMs(l.abfahrt)) && Number.isFinite(toMs(l.ankunft)) && l.abfahrt.length > 10 && l.ankunft.length > 10)
    .sort((a, b) => toMs(a.abfahrt) - toMs(b.abfahrt));
  if (!legs.length) {
    leer.hinweise.push('Für die Berechnung werden Teilstrecken mit Abfahrts- und Ankunftszeit benötigt.');
    return leer;
  }
  const beginnMs = Math.min(...legs.map((l) => toMs(l.abfahrt)));
  const endeMs = Math.max(...legs.map((l) => toMs(l.ankunft)));
  const beginn = legs.find((l) => toMs(l.abfahrt) === beginnMs)!.abfahrt;
  const ende = legs.find((l) => toMs(l.ankunft) === endeMs)!.ankunft;
  if (endeMs <= beginnMs) {
    leer.hinweise.push('Das Reiseende liegt nicht nach dem Reisebeginn.');
    return { ...leer, beginn, ende };
  }

  const tage = daysBetween(beginn, ende);
  const mitUebernachtung =
    reise.uebernachtungAuswaerts === 'ja' ||
    (reise.uebernachtungAuswaerts === 'auto' && (reise.uebernachtungen.length > 0 || tage.length >= 3));

  const ankuenfte: Ankunft[] = legs.map((l) => ({ t: toMs(l.ankunft), ort: l.nach })).sort((a, b) => a.t - b.t);
  const startOrt = legs[0].von;
  const ortZu = (t: number): Ort => {
    let o = startOrt;
    for (const a of ankuenfte) if (a.t <= t) o = a.ort;
    return o;
  };
  const letzteAuslandsAnkunft = (von: number, bis: number): Ort | null => {
    let o: Ort | null = null;
    for (const a of ankuenfte) if (a.t >= von && a.t <= bis && a.ort.land && a.ort.land !== 'DE') o = a.ort;
    return o;
  };
  const inland: Ort = { ort: '', land: 'DE' };

  // Stunden je Kalendertag
  const stunden = tage.map((d) => {
    const s = toMs(d);
    return Math.max(0, hoursBetween(Math.max(beginnMs, s), Math.min(endeMs, s + MS_D)));
  });

  // Morgende mit im Übernachtungspreis enthaltenem Frühstück
  const fruehstueckTage = new Set<string>();
  for (const u of reise.uebernachtungen) {
    if (u.fruehstueck !== 'inklusive' || !u.anreise || !u.abreise) continue;
    for (const d of daysBetween(addDays(u.anreise, 1), u.abreise)) fruehstueckTage.add(d);
  }

  const hinweise: string[] = [];
  const ergebnisse: TagErgebnis[] = tage.map((d, i) => {
    const dayStart = toMs(d);
    const letzter = i === tage.length - 1;
    // automatisch ermittelter Ort
    let autoOrt: Ort;
    if (tage.length === 1) {
      autoOrt = letzteAuslandsAnkunft(beginnMs, endeMs) ?? inland;
    } else if (!mitUebernachtung && tage.length === 2) {
      autoOrt = letzteAuslandsAnkunft(beginnMs, endeMs) ?? inland;
    } else if (letzter) {
      const nacht = ortZu(dayStart);
      autoOrt = nacht.land && nacht.land !== 'DE' ? nacht : letzteAuslandsAnkunft(dayStart, endeMs) ?? inland;
    } else {
      autoOrt = ortZu(dayStart + MS_D - 1);
    }
    const jahr = Number(d.slice(0, 4));
    const { tabelle } = tabelleFuer(jahr, ctx);
    const landAuto = autoOrt.land || 'DE';
    // PLZ des Reiseziels nutzen, wenn die Teilstrecke dort endet (z. B. Paris inkl. Départements 77, 78, 91–95)
    const plz = autoOrt.plz || (normalize(autoOrt.ort) === normalize(reise.ziel.ort) && autoOrt.land === reise.ziel.land ? reise.ziel.plz : undefined);
    const stadtAuto = landAuto === 'DE' ? null : stadtFuer(landAuto, autoOrt.ort, plz, tabelle);

    const angabe: TagAngabe = reise.tage?.[d] ?? {};
    const land = angabe.land || landAuto;
    let stadt: string | null = land === landAuto ? stadtAuto : null;
    if (angabe.ort !== undefined) stadt = angabe.ort || null;
    const rate = pauschaleFuer(jahr, land, stadt, ctx);
    const tagHinweise: string[] = rate.hinweis ? [rate.hinweis] : [];

    // Art des Tages und Pauschale
    let art: TagArt = 'ohne';
    if (mitUebernachtung && tage.length >= 2) {
      art = i === 0 ? 'anreise' : letzter ? 'abreise' : 'zwischentag';
    } else if (tage.length === 1) {
      art = stunden[0] > 8 ? 'eintaegig' : 'ohne';
      if (art === 'ohne') tagHinweise.push('Abwesenheit nicht mehr als 8 Stunden');
    } else if (tage.length === 2) {
      const total = stunden[0] + stunden[1];
      const tagMitPauschale = stunden[1] > stunden[0] ? 1 : 0;
      if (total > 8 && i === tagMitPauschale) art = 'zusammengefasst';
      else {
        art = 'ohne';
        tagHinweise.push(total > 8 ? 'Pauschale beim Tag mit überwiegender Abwesenheit (Reise ohne Übernachtung)' : 'Abwesenheit insgesamt nicht mehr als 8 Stunden');
      }
    } else {
      art = stunden[i] >= 24 ? 'zwischentag' : stunden[i] > 8 ? 'eintaegig' : 'ohne';
    }
    const pauschaleCent = art === 'zwischentag' ? rate.vollCent : art === 'ohne' ? 0 : rate.teilCent;

    const fruehstueckAuto = fruehstueckTage.has(d);
    const fruehstueck = angabe.fruehstueck ?? fruehstueckAuto;
    const mittag = angabe.mittag ?? false;
    const abend = angabe.abend ?? false;
    const kuerzungFCent = fruehstueck ? Math.round(rate.vollCent * 0.2) : 0;
    const kuerzungMCent = mittag ? Math.round(rate.vollCent * 0.4) : 0;
    const kuerzungACent = abend ? Math.round(rate.vollCent * 0.4) : 0;
    const ausgeschlossen = !!angabe.ausschliessen;
    const kuerzungCent = Math.min(pauschaleCent, kuerzungFCent + kuerzungMCent + kuerzungACent);
    const betragCent = ausgeschlossen ? 0 : pauschaleCent - kuerzungCent;
    if (ausgeschlossen) tagHinweise.push('Tag manuell ausgeschlossen');

    return {
      datum: d,
      stunden: stunden[i],
      art,
      artText: TAG_ART_TEXT[art],
      land: rate.land,
      landName: rate.landName,
      stadt: rate.ort,
      landAuto,
      stadtAuto,
      vollCent: rate.vollCent,
      teilCent: rate.teilCent,
      pauschaleCent: ausgeschlossen ? 0 : pauschaleCent,
      fruehstueck,
      mittag,
      abend,
      fruehstueckAuto,
      kuerzungFCent,
      kuerzungMCent,
      kuerzungACent,
      kuerzungCent: ausgeschlossen ? 0 : kuerzungCent,
      betragCent,
      ausgeschlossen,
      jahr: rate.jahr,
      quelle: rate.quelle,
      hinweise: tagHinweise,
    };
  });

  if (tage.length > 90) {
    hinweise.push('Die Reise dauert länger als drei Monate: Verpflegungspauschalen am selben Tätigkeitsort sind auf die ersten drei Monate begrenzt (§ 9 Abs. 4a Satz 6 EStG).');
  }
  if (reise.uebernachtungAuswaerts === 'auto' && tage.length === 2 && !reise.uebernachtungen.length) {
    hinweise.push('Die Reise geht über zwei Kalendertage ohne erfasste Übernachtung. Wurde auswärts übernachtet, bitte „Übernachtung auswärts: ja“ wählen.');
  }

  const summeCent = ergebnisse.reduce((s, t) => s + t.betragCent, 0);
  return {
    tage: ergebnisse,
    summeCent,
    pauschalenCent: ergebnisse.reduce((s, t) => s + t.pauschaleCent, 0),
    kuerzungenCent: ergebnisse.reduce((s, t) => s + t.kuerzungCent, 0),
    beginn,
    ende,
    dauerStunden: hoursBetween(beginnMs, endeMs),
    mitUebernachtung,
    hinweise,
  };
}
