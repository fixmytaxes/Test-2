// Berechnet aus einer Reise alle Positionen, Summen, die Umsatzsteuer-Aufteilung und die Zahlungsübersicht.
import type {
  Anhang,
  Betragszeile,
  Bezahlt,
  Cent,
  Einstellungen,
  EinstellungsSnapshot,
  KontoKey,
  KorrekturArt,
  Reise,
  UstKey,
} from '../types';
import { countryName } from '../data/countries';
import { datePart, fmtDate } from './dates';
import { KOSTEN_KATEGORIEN, VERKEHRSMITTEL, snapshotVon } from './defaults';
import { fmtDecimal, fmtNum2, splitBrutto, sumBrutto, UST_ORDER, type UstAufteilung } from './money';
import { berechneVma, type VmaErgebnis } from './perdiem';

export type Bereich = 'fahrt' | 'uebernachtung' | 'vma' | 'sonstige' | 'bewirtung';

export const BEREICH_LABEL: Record<Bereich, string> = {
  fahrt: 'Fahrtkosten',
  uebernachtung: 'Übernachtungskosten',
  vma: 'Verpflegungsmehraufwand',
  sonstige: 'Sonstige Kosten',
  bewirtung: 'Bewirtungskosten',
};

export const BEREICH_ORDER: Bereich[] = ['fahrt', 'uebernachtung', 'vma', 'sonstige', 'bewirtung'];

export interface Position {
  key: string;
  quelleId: string;
  bereich: Bereich;
  nr: string;
  datum: string;
  /** Leistungsbeschreibung, z. B. "Flugticket Frankfurt – Wien" */
  text: string;
  detail: string;
  betraege: Betragszeile[];
  bruttoCent: Cent;
  bezahlt: Bezahlt;
  belege: Anhang[];
  konto: string;
  kontoKey: KontoKey;
  /** nur für Bewirtung: nicht abziehbarer Anteil */
  kontoNichtAbziehbar?: string;
  pauschale?: boolean;
}

export interface KorrekturPosition {
  key: string;
  art: KorrekturArt;
  text: string;
  betragCent: Cent;
  ust: UstKey;
}

export interface Summen {
  bereiche: Record<Bereich, Cent>;
  reisekostenBrutto: Cent;
  /** Erstattungen und Kürzungen (positiver Wert, wird abgezogen) */
  korrekturenCent: Cent;
  vorschussCent: Cent;
  reisekostenNachKorrektur: Cent;
  ustReise: UstAufteilung[];
  vorsteuerReise: Cent;
  nettoReise: Cent;
  bewirtung: {
    bruttoCent: Cent;
    trinkgeldCent: Cent;
    ust: UstAufteilung[];
    vorsteuerCent: Cent;
    /** Bemessungsgrundlage für die 70/30-Aufteilung: Netto zzgl. nicht abziehbarer (ausländischer) Steuer */
    basisCent: Cent;
    abziehbarCent: Cent;
    nichtAbziehbarCent: Cent;
  };
  gesamtBrutto: Cent;
  privatCent: Cent;
  firmaCent: Cent;
  auszahlungCent: Cent;
  fahrt: { kmGesamt: number; kmCent: Cent; belegCent: Cent };
  uebernachtungen: { naechte: number; fruehstueckAbzugCent: Cent };
}

export interface Abrechnung {
  reise: Reise;
  ctx: EinstellungsSnapshot;
  vma: VmaErgebnis;
  positionen: Position[];
  korrekturen: KorrekturPosition[];
  summen: Summen;
  beginn?: string;
  ende?: string;
}

export function ctxFuer(reise: Reise, e: Einstellungen): EinstellungsSnapshot {
  return reise.snapshot ?? snapshotVon(e);
}

const ortText = (o: { ort?: string; land?: string }) =>
  o.ort ? (o.land && o.land !== 'DE' ? `${o.ort} (${countryName(o.land)})` : o.ort) : '?';

export function kmBetrag(km: number | undefined, satzCent: number): Cent {
  return Math.round((km || 0) * satzCent);
}

/** Ordnet einen Abzug (gesondert ausgewiesenes Frühstück) einer Steuerzeile zu */
function abziehen(betraege: Betragszeile[], betrag: Cent, ust: UstKey | undefined): Betragszeile[] {
  if (!betrag) return betraege;
  const out = betraege.map((b) => ({ ...b }));
  let idx = out.findIndex((b) => b.ust === ust && b.bruttoCent >= betrag);
  if (idx < 0) idx = out.reduce((best, b, i) => (b.bruttoCent > (out[best]?.bruttoCent ?? -1) ? i : best), 0);
  if (out[idx]) out[idx].bruttoCent = Math.max(0, out[idx].bruttoCent - betrag);
  return out;
}

export function berechne(reise: Reise, e: Einstellungen | EinstellungsSnapshot): Abrechnung {
  const ctx: EinstellungsSnapshot = 'datev' in e ? ctxFuer(reise, e as Einstellungen) : (e as EinstellungsSnapshot);
  const vma = berechneVma(reise, ctx);
  const konten = ctx.konten;
  const positionen: Position[] = [];

  // 1 Fahrtkosten
  let nr = 0;
  let kmGesamt = 0;
  let kmCent = 0;
  let belegCent = 0;
  const strecken = [...reise.strecken].sort((a, b) => (a.abfahrt || '').localeCompare(b.abfahrt || ''));
  for (const s of strecken) {
    const vm = VERKEHRSMITTEL[s.verkehrsmittel];
    const route = `${ortText(s.von)} – ${ortText(s.nach)}`;
    if (s.kostenart === 'km') {
      const fz = vm.km ?? 'pkw';
      const satz = ctx.kmSaetze[fz] ?? 30;
      const betrag = kmBetrag(s.km, satz);
      kmGesamt += s.km || 0;
      kmCent += betrag;
      if (betrag <= 0 && !(s.km && s.km > 0)) continue;
      positionen.push({
        key: 'strecke:' + s.id,
        quelleId: s.id,
        bereich: 'fahrt',
        nr: `1.${++nr}`,
        datum: datePart(s.abfahrt),
        text: `Fahrtkosten ${vm.label}: ${route}`,
        detail: `${fmtDecimal(s.km, 1)} km × ${fmtNum2(satz)} € (Kilometerpauschale)`,
        betraege: [{ ust: '0', bruttoCent: betrag }],
        bruttoCent: betrag,
        bezahlt: 'privat',
        belege: s.belege,
        konto: konten.km,
        kontoKey: 'km',
        pauschale: true,
      });
    } else if (s.kostenart === 'beleg') {
      const brutto = sumBrutto(s.betraege);
      belegCent += brutto;
      if (brutto <= 0) continue;
      const art =
        s.verkehrsmittel === 'flug'
          ? 'Flugticket'
          : s.verkehrsmittel === 'bahn' || s.verkehrsmittel === 'oepnv'
            ? 'Ticket öffentlicher Nah- und Fernverkehr'
            : s.verkehrsmittel === 'mietwagen'
              ? 'Mietwagen'
              : s.verkehrsmittel === 'taxi'
                ? 'Taxi'
                : `Fahrtkosten ${vm.label}`;
      positionen.push({
        key: 'strecke:' + s.id,
        quelleId: s.id,
        bereich: 'fahrt',
        nr: `1.${++nr}`,
        datum: datePart(s.abfahrt),
        text: `${art}: ${route}`,
        detail: s.verkehrsmittel === 'bahn' ? 'Bahn (Fernverkehr)' : vm.label,
        betraege: s.betraege,
        bruttoCent: brutto,
        bezahlt: s.bezahlt,
        belege: s.belege,
        konto: konten.fahrt,
        kontoKey: 'fahrt',
      });
    }
  }

  // 2 Übernachtungen
  nr = 0;
  let naechte = 0;
  let fruehstueckAbzugCent = 0;
  for (const u of [...reise.uebernachtungen].sort((a, b) => (a.anreise || '').localeCompare(b.anreise || ''))) {
    const n = Math.max(0, Math.round((Date.parse(u.abreise) - Date.parse(u.anreise)) / 86400000)) || 0;
    naechte += n;
    const abzug = u.fruehstueck === 'separat' ? u.fruehstueckCent || 0 : 0;
    fruehstueckAbzugCent += abzug;
    const betraege = abziehen(u.betraege, abzug, u.fruehstueckUst);
    const brutto = sumBrutto(betraege);
    if (brutto <= 0 && sumBrutto(u.betraege) <= 0) continue;
    const details = [`${fmtDate(u.anreise)} – ${fmtDate(u.abreise)}, ${n} ${n === 1 ? 'Nacht' : 'Nächte'}`];
    if (u.fruehstueck === 'inklusive') details.push('Frühstück im Preis enthalten (Kürzung beim Verpflegungsmehraufwand)');
    if (abzug) details.push(`ohne gesondert ausgewiesenes Frühstück ${fmtNum2(abzug)} €`);
    positionen.push({
      key: 'uebernachtung:' + u.id,
      quelleId: u.id,
      bereich: 'uebernachtung',
      nr: `2.${++nr}`,
      datum: u.anreise,
      text: `Übernachtung ${u.bezeichnung || ''}, ${ortText(u.ort)}`.replace(/\s+,/, ','),
      detail: details.join('; '),
      betraege,
      bruttoCent: brutto,
      bezahlt: u.bezahlt,
      belege: u.belege,
      konto: konten.uebernachtung,
      kontoKey: 'uebernachtung',
    });
  }

  // 3 Verpflegungsmehraufwand – je Land/Stadt zusammengefasst
  nr = 0;
  const gruppen = new Map<string, typeof vma.tage>();
  for (const t of vma.tage) {
    if (t.betragCent <= 0 && t.pauschaleCent <= 0) continue;
    const k = `${t.land}|${t.stadt ?? ''}`;
    gruppen.set(k, [...(gruppen.get(k) ?? []), t]);
  }
  for (const [k, tage] of gruppen) {
    const betrag = tage.reduce((s, t) => s + t.betragCent, 0);
    const [land, stadt] = k.split('|');
    const name = land === 'DE' ? 'Inland' : stadt ? `${countryName(land)} – ${stadt}` : countryName(land);
    const voll = tage.filter((t) => t.art === 'zwischentag');
    const teil = tage.filter((t) => t.art !== 'zwischentag' && t.pauschaleCent > 0);
    const kuerzung = tage.reduce((s, t) => s + t.kuerzungCent, 0);
    const parts: string[] = [];
    if (voll.length) parts.push(`${voll.length} × ${fmtNum2(voll[0].vollCent)} € (24 Std.)`);
    if (teil.length) parts.push(`${teil.length} × ${fmtNum2(teil[0].teilCent)} € (An-/Abreisetag bzw. > 8 Std.)`);
    if (kuerzung) parts.push(`abzgl. Kürzung Mahlzeiten ${fmtNum2(kuerzung)} €`);
    positionen.push({
      key: 'vma:' + k,
      quelleId: k,
      bereich: 'vma',
      nr: `3.${++nr}`,
      datum: tage[0].datum,
      text: `Verpflegungsmehraufwand ${name}`,
      detail: parts.join(', '),
      betraege: [{ ust: '0', bruttoCent: betrag }],
      bruttoCent: betrag,
      bezahlt: 'privat',
      belege: [],
      konto: konten.vma,
      kontoKey: 'vma',
      pauschale: true,
    });
  }

  // 4 Sonstige Kosten
  nr = 0;
  for (const k of [...reise.kosten].sort((a, b) => (a.datum || '').localeCompare(b.datum || ''))) {
    const brutto = sumBrutto(k.betraege);
    if (brutto <= 0) continue;
    const kat = KOSTEN_KATEGORIEN[k.kategorie];
    positionen.push({
      key: 'kosten:' + k.id,
      quelleId: k.id,
      bereich: 'sonstige',
      nr: `4.${++nr}`,
      datum: k.datum,
      text: `${kat.label}${k.beschreibung ? ': ' + k.beschreibung : ''}`,
      detail: kat.label,
      betraege: k.betraege,
      bruttoCent: brutto,
      bezahlt: k.bezahlt,
      belege: k.belege,
      konto: konten[kat.konto],
      kontoKey: kat.konto,
    });
  }

  // 5 Bewirtungen (getrennt)
  nr = 0;
  for (const b of [...reise.bewirtungen].sort((a, c) => (a.datum || '').localeCompare(c.datum || ''))) {
    const betraege: Betragszeile[] = [...b.betraege];
    if (b.trinkgeldCent > 0) betraege.push({ ust: '0', bruttoCent: b.trinkgeldCent });
    const brutto = sumBrutto(betraege);
    if (brutto <= 0) continue;
    positionen.push({
      key: 'bewirtung:' + b.id,
      quelleId: b.id,
      bereich: 'bewirtung',
      nr: `5.${++nr}`,
      datum: b.datum,
      text: `Bewirtung ${b.lokal}${b.anlass ? ' – ' + b.anlass : ''}`,
      detail: `Teilnehmer: ${b.teilnehmer}${b.trinkgeldCent ? `; inkl. Trinkgeld ${fmtNum2(b.trinkgeldCent)} €` : ''}`,
      betraege,
      bruttoCent: brutto,
      bezahlt: b.bezahlt,
      belege: b.belege,
      konto: konten.bewirtung,
      kontoKey: 'bewirtung',
      kontoNichtAbziehbar: konten.bewirtungNichtAbziehbar,
    });
  }

  const korrekturen: KorrekturPosition[] = reise.korrekturen
    .filter((k) => k.betragCent > 0)
    .map((k) => ({
      key: 'korrektur:' + k.id,
      art: k.art,
      text: k.beschreibung || (k.art === 'vorschuss' ? 'Vorschuss' : k.art === 'erstattung' ? 'Erstattung durch Dritte' : 'Kürzung'),
      betragCent: k.betragCent,
      ust: k.ust,
    }));

  const trinkgeldCent = reise.bewirtungen.reduce((x, b) => x + (sumBrutto(b.betraege) + (b.trinkgeldCent || 0) > 0 ? b.trinkgeldCent || 0 : 0), 0);
  const summen = summieren(positionen, korrekturen, naechte, fruehstueckAbzugCent, { kmGesamt, kmCent, belegCent }, trinkgeldCent);
  return { reise, ctx, vma, positionen, korrekturen, summen, beginn: vma.beginn, ende: vma.ende };
}

function ustAufteilung(pos: Position[], abzuege: KorrekturPosition[] = []): UstAufteilung[] {
  const brutto = new Map<UstKey, Cent>();
  for (const p of pos) for (const b of p.betraege) brutto.set(b.ust, (brutto.get(b.ust) ?? 0) + b.bruttoCent);
  for (const k of abzuege) brutto.set(k.ust, (brutto.get(k.ust) ?? 0) - k.betragCent);
  return UST_ORDER.filter((k) => brutto.has(k) && brutto.get(k) !== 0).map((k) => splitBrutto(k, brutto.get(k)!));
}

function summieren(
  positionen: Position[],
  korrekturen: KorrekturPosition[],
  naechte: number,
  fruehstueckAbzugCent: Cent,
  fahrt: Summen['fahrt'],
  trinkgeld: Cent,
): Summen {
  const bereiche = { fahrt: 0, uebernachtung: 0, vma: 0, sonstige: 0, bewirtung: 0 } as Record<Bereich, Cent>;
  for (const p of positionen) bereiche[p.bereich] += p.bruttoCent;
  const reisePos = positionen.filter((p) => p.bereich !== 'bewirtung');
  const bewPos = positionen.filter((p) => p.bereich === 'bewirtung');
  const minderungen = korrekturen.filter((k) => k.art !== 'vorschuss');
  const korrekturenCent = minderungen.reduce((s, k) => s + k.betragCent, 0);
  const vorschussCent = korrekturen.filter((k) => k.art === 'vorschuss').reduce((s, k) => s + k.betragCent, 0);
  const reisekostenBrutto = bereiche.fahrt + bereiche.uebernachtung + bereiche.vma + bereiche.sonstige;

  const ustReise = ustAufteilung(reisePos, minderungen);
  const vorsteuerReise = ustReise.reduce((s, u) => s + (u.ust === '19' || u.ust === '7' ? u.steuer : 0), 0);

  const ustBew = ustAufteilung(bewPos);
  const vorsteuerBew = ustBew.reduce((s, u) => s + u.steuer, 0);
  const basisBew = ustBew.reduce((s, u) => s + u.netto, 0);
  const abziehbar = Math.round(basisBew * 0.7);

  const privatCent = positionen.filter((p) => p.bezahlt === 'privat').reduce((s, p) => s + p.bruttoCent, 0);
  const firmaCent = positionen.filter((p) => p.bezahlt === 'firma').reduce((s, p) => s + p.bruttoCent, 0);
  const reisekostenNachKorrektur = reisekostenBrutto - korrekturenCent;

  return {
    bereiche,
    reisekostenBrutto,
    korrekturenCent,
    vorschussCent,
    reisekostenNachKorrektur,
    ustReise,
    vorsteuerReise,
    nettoReise: reisekostenNachKorrektur - vorsteuerReise,
    bewirtung: {
      bruttoCent: bereiche.bewirtung,
      trinkgeldCent: trinkgeld,
      ust: ustBew,
      vorsteuerCent: vorsteuerBew,
      basisCent: basisBew,
      abziehbarCent: abziehbar,
      nichtAbziehbarCent: basisBew - abziehbar,
    },
    gesamtBrutto: reisekostenNachKorrektur + bereiche.bewirtung,
    privatCent,
    firmaCent,
    auszahlungCent: privatCent - korrekturenCent - vorschussCent,
    fahrt,
    uebernachtungen: { naechte, fruehstueckAbzugCent },
  };
}

/** Datum, nach dem eine Reise einem Zeitraum zugeordnet wird (Reiseende, sonst Beginn/Erstellung) */
export function stichtag(reise: Reise): string {
  const ends = reise.strecken.map((s) => s.ankunft).filter(Boolean).sort();
  const starts = reise.strecken.map((s) => s.abfahrt).filter(Boolean).sort();
  return datePart(ends[ends.length - 1] || starts[0] || reise.uebernachtungen[0]?.abreise || reise.erstelltAm);
}

export function reiseZeitraum(reise: Reise): { beginn?: string; ende?: string } {
  const starts = reise.strecken.map((s) => s.abfahrt).filter((x) => x && x.length > 10).sort();
  const ends = reise.strecken.map((s) => s.ankunft).filter((x) => x && x.length > 10).sort();
  return { beginn: starts[0], ende: ends[ends.length - 1] };
}
