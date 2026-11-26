import type {
  Einstellungen,
  EinstellungsSnapshot,
  Kostenart,
  KostenKategorie,
  KontoKey,
  Reise,
  UstKey,
  Verkehrsmittel,
  KmFahrzeug,
} from '../types';
import { nowIso } from './dates';
import { INLAND_GESETZLICH } from './rates';
import { uid } from './util';

export interface VerkehrsmittelInfo {
  label: string;
  kurz: string;
  icon: string;
  kostenart: Kostenart;
  ust: UstKey;
  km?: KmFahrzeug;
  hinweis?: string;
}

export const VERKEHRSMITTEL: Record<Verkehrsmittel, VerkehrsmittelInfo> = {
  pkw: { label: 'Eigener Pkw', kurz: 'Pkw', icon: 'car', kostenart: 'km', ust: '0', km: 'pkw' },
  fahrgemeinschaft: {
    label: 'Fahrgemeinschaft',
    kurz: 'Fahrgem.',
    icon: 'users',
    kostenart: 'km',
    ust: '0',
    km: 'fahrgemeinschaft',
    hinweis: 'Als Fahrer mit eigenem Pkw: Kilometerpauschale. Als Mitfahrer: tatsächliche Kostenbeteiligung oder „ohne Kosten“.',
  },
  oepnv: { label: 'Öffentlicher Nahverkehr', kurz: 'ÖPNV', icon: 'bus', kostenart: 'beleg', ust: '7' },
  bahn: { label: 'Bahn (Fernverkehr)', kurz: 'Bahn', icon: 'train', kostenart: 'beleg', ust: '7' },
  flug: {
    label: 'Flugzeug',
    kurz: 'Flug',
    icon: 'plane',
    kostenart: 'beleg',
    ust: '0',
    hinweis: 'Grenzüberschreitende Flüge sind umsatzsteuerfrei; Inlandsflüge enthalten 19 % USt.',
  },
  fahrrad: { label: 'Fahrrad', kurz: 'Rad', icon: 'bike', kostenart: 'km', ust: '0', km: 'fahrrad' },
  mietwagen: { label: 'Mietwagen', kurz: 'Mietwagen', icon: 'key', kostenart: 'beleg', ust: '19' },
  taxi: { label: 'Taxi', kurz: 'Taxi', icon: 'taxi', kostenart: 'beleg', ust: '7', hinweis: 'Taxifahrten bis 50 km bzw. innerhalb einer Gemeinde: 7 %, sonst 19 %.' },
  motorrad: { label: 'Motorrad/Motorroller', kurz: 'Motorrad', icon: 'moto', kostenart: 'km', ust: '0', km: 'motorrad' },
  firmenwagen: {
    label: 'Firmenwagen',
    kurz: 'Firmenwagen',
    icon: 'car',
    kostenart: 'keine',
    ust: '19',
    hinweis: 'Kosten des Firmenwagens laufen über die Kfz-Konten. Die Strecke wird nur dokumentiert; Tankbelege ggf. unter „Weitere Kosten“.',
  },
  sonstige: { label: 'Sonstige', kurz: 'Sonstige', icon: 'dots', kostenart: 'beleg', ust: '19' },
};

export const VERKEHRSMITTEL_ORDER: Verkehrsmittel[] = [
  'pkw',
  'fahrgemeinschaft',
  'oepnv',
  'bahn',
  'flug',
  'fahrrad',
  'mietwagen',
  'taxi',
  'motorrad',
  'firmenwagen',
  'sonstige',
];

export const KOSTENART_LABEL: Record<Kostenart, string> = {
  km: 'Kilometerpauschale',
  beleg: 'Ticket / Beleg',
  keine: 'ohne Kosten',
};

export const KM_LABEL: Record<KmFahrzeug, string> = {
  pkw: 'Pkw (eigenes Fahrzeug)',
  fahrgemeinschaft: 'Fahrgemeinschaft (als Fahrer)',
  motorrad: 'Motorrad / Motorroller / Moped',
  fahrrad: 'Fahrrad',
};

export const KOSTEN_KATEGORIEN: Record<KostenKategorie, { label: string; ust: UstKey; konto: KontoKey }> = {
  fortbildung: { label: 'Fortbildung', ust: '19', konto: 'fortbildung' },
  seminar: { label: 'Seminar-/Tagungsgebühr', ust: '19', konto: 'fortbildung' },
  messe: { label: 'Messe-/Eintrittskosten', ust: '19', konto: 'sonstige' },
  parken: { label: 'Parkgebühren', ust: '19', konto: 'fahrt' },
  maut: { label: 'Maut / Vignette', ust: '19', konto: 'fahrt' },
  kraftstoff: { label: 'Kraftstoff / Laden', ust: '19', konto: 'fahrt' },
  gepaeck: { label: 'Gepäck / Aufbewahrung', ust: '19', konto: 'sonstige' },
  kommunikation: { label: 'Telefon / Internet', ust: '19', konto: 'sonstige' },
  nebenkosten: { label: 'Reisenebenkosten', ust: '19', konto: 'sonstige' },
  sonstige: { label: 'Sonstige Kosten', ust: '19', konto: 'sonstige' },
};

export const KONTO_LABEL: Record<KontoKey, string> = {
  fahrt: 'Fahrtkosten (Belege)',
  km: 'Fahrtkosten (Kilometerpauschale)',
  uebernachtung: 'Übernachtungskosten',
  vma: 'Verpflegungsmehraufwand',
  sonstige: 'Reisenebenkosten / Sonstige',
  fortbildung: 'Fortbildungskosten',
  bewirtung: 'Bewirtungskosten (abziehbar 70 %)',
  bewirtungNichtAbziehbar: 'Bewirtungskosten (nicht abziehbar 30 %)',
};

/** Kontenvorschläge (DATEV-Standardkontenrahmen) – bitte mit der Buchhaltung abstimmen. */
export function standardKonten(rahmen: 'SKR03' | 'SKR04', typ: 'unternehmer' | 'arbeitnehmer'): Record<KontoKey, string> {
  if (rahmen === 'SKR03') {
    return typ === 'unternehmer'
      ? { fahrt: '4673', km: '4673', uebernachtung: '4676', vma: '4674', sonstige: '4670', fortbildung: '4945', bewirtung: '4650', bewirtungNichtAbziehbar: '4654' }
      : { fahrt: '4663', km: '4668', uebernachtung: '4666', vma: '4664', sonstige: '4660', fortbildung: '4945', bewirtung: '4650', bewirtungNichtAbziehbar: '4654' };
  }
  return typ === 'unternehmer'
    ? { fahrt: '6673', km: '6673', uebernachtung: '6680', vma: '6674', sonstige: '6670', fortbildung: '6821', bewirtung: '6640', bewirtungNichtAbziehbar: '6644' }
    : { fahrt: '6663', km: '6668', uebernachtung: '6660', vma: '6664', sonstige: '6650', fortbildung: '6821', bewirtung: '6640', bewirtungNichtAbziehbar: '6644' };
}

export function standardEinstellungen(): Einstellungen {
  return {
    firma: { name: '', strasse: '', plz: '', ort: '', land: 'DE', ustId: '', steuernummer: '' },
    reisender: { name: '', strasse: '', plz: '', ort: '', email: '', iban: '', steuernummer: '', typ: 'unternehmer' },
    wohnung: { strasse: '', plz: '', ort: '', land: 'DE' },
    // § 9 Abs. 1 Satz 3 Nr. 4a EStG i. V. m. § 5 Abs. 2 BRKG: 0,30 €/km (Pkw), 0,20 €/km (andere motorbetriebene Fahrzeuge)
    kmSaetze: { pkw: 30, fahrgemeinschaft: 30, motorrad: 20, fahrrad: 0 },
    inland: { ...INLAND_GESETZLICH },
    nummernkreis: { praefix: 'RK', stellen: 4 },
    datev: {
      email: '',
      cc: '',
      betreff: 'Reisekostenabrechnung {nummer} – {reise}',
      xmlSeparat: false,
      belegeAnhaengen: true,
    },
    server: { url: '', token: '' },
    kontenrahmen: 'SKR03',
    konten: standardKonten('SKR03', 'unternehmer'),
    zusatzTabellen: [],
    onboardingErledigt: false,
  };
}

export function snapshotVon(e: Einstellungen): EinstellungsSnapshot {
  return JSON.parse(
    JSON.stringify({
      firma: e.firma,
      reisender: e.reisender,
      wohnung: e.wohnung,
      kmSaetze: e.kmSaetze,
      inland: e.inland,
      kontenrahmen: e.kontenrahmen,
      konten: e.konten,
      zusatzTabellen: e.zusatzTabellen,
    }),
  );
}

/** Ergänzt fehlende Felder (z. B. nach einem Update) */
export function mitStandards(e: Partial<Einstellungen> | undefined): Einstellungen {
  const d = standardEinstellungen();
  if (!e) return d;
  return {
    ...d,
    ...e,
    firma: { ...d.firma, ...e.firma },
    reisender: { ...d.reisender, ...e.reisender },
    wohnung: { ...d.wohnung, ...e.wohnung },
    kmSaetze: { ...d.kmSaetze, ...e.kmSaetze },
    inland: { ...d.inland, ...e.inland },
    nummernkreis: { ...d.nummernkreis, ...e.nummernkreis },
    datev: { ...d.datev, ...e.datev },
    server: { ...d.server, ...e.server },
    konten: { ...d.konten, ...e.konten },
    zusatzTabellen: e.zusatzTabellen ?? [],
  };
}

export function neueReise(): Reise {
  const t = nowIso();
  return {
    id: uid(),
    status: 'entwurf',
    name: '',
    anlass: '',
    anlassDokumente: [],
    ziel: { bezeichnung: '', strasse: '', plz: '', ort: '', land: 'DE' },
    start: { typ: 'firmensitz' },
    uebernachtungAuswaerts: 'auto',
    strecken: [],
    uebernachtungen: [],
    kosten: [],
    bewirtungen: [],
    korrekturen: [],
    tage: {},
    erstelltAm: t,
    geaendertAm: t,
    versand: [],
  };
}

export const STATUS_LABEL: Record<Reise['status'], string> = {
  entwurf: 'Entwurf',
  abgeschlossen: 'Abgeschlossen',
  eingereicht: 'Eingereicht',
  storniert: 'Storniert',
};
