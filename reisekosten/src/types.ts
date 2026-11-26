// Datenmodell der Reisekosten-App. Alle Geldbeträge in Cent (ganze Zahlen), Datum/Uhrzeit als lokale
// Zeit ohne Zeitzone ("2026-03-12T07:30" bzw. "2026-03-12").

export type Cent = number;

/** Umsatzsteuer-Schlüssel eines Betrags: 19 %, 7 %, 0 % (ohne USt/steuerfrei) oder ausländische USt (kein Vorsteuerabzug). */
export type UstKey = '19' | '7' | '0' | 'ausl';

export interface Betragszeile {
  ust: UstKey;
  bruttoCent: Cent;
}

export type Bezahlt = 'privat' | 'firma';

/** Verweis auf eine gespeicherte Datei (Beleg, Einladung …); der Inhalt liegt in IndexedDB. */
export interface Anhang {
  id: string;
  name: string;
  typ: string;
  groesse: number;
}

export interface Ort {
  bezeichnung?: string;
  strasse?: string;
  plz?: string;
  ort: string;
  /** ISO-3166-Ländercode, z. B. "DE", "AT" */
  land: string;
}

export type Verkehrsmittel =
  | 'pkw'
  | 'firmenwagen'
  | 'fahrgemeinschaft'
  | 'motorrad'
  | 'oepnv'
  | 'bahn'
  | 'flug'
  | 'fahrrad'
  | 'mietwagen'
  | 'taxi'
  | 'sonstige';

/** km = Kilometerpauschale, beleg = tatsächliche Kosten laut Beleg (Ticket), keine = ohne Kosten */
export type Kostenart = 'km' | 'beleg' | 'keine';

export type Richtung = 'hin' | 'vorort' | 'rueck';

export interface Teilstrecke {
  id: string;
  richtung: Richtung;
  von: Ort;
  nach: Ort;
  verkehrsmittel: Verkehrsmittel;
  abfahrt: string;
  ankunft: string;
  kostenart: Kostenart;
  km?: number;
  betraege: Betragszeile[];
  bezahlt: Bezahlt;
  belege: Anhang[];
  notiz?: string;
}

export type Fruehstueck = 'nein' | 'inklusive' | 'separat';

export interface Uebernachtung {
  id: string;
  bezeichnung: string;
  ort: Ort;
  anreise: string;
  abreise: string;
  betraege: Betragszeile[];
  fruehstueck: Fruehstueck;
  /** gesondert ausgewiesenes Frühstück (brutto) – wird nicht als Übernachtungskosten angesetzt */
  fruehstueckCent?: Cent;
  fruehstueckUst?: UstKey;
  bezahlt: Bezahlt;
  belege: Anhang[];
  notiz?: string;
}

export type KostenKategorie =
  | 'fortbildung'
  | 'seminar'
  | 'messe'
  | 'parken'
  | 'maut'
  | 'kraftstoff'
  | 'gepaeck'
  | 'kommunikation'
  | 'nebenkosten'
  | 'sonstige';

export interface Kosten {
  id: string;
  kategorie: KostenKategorie;
  beschreibung: string;
  datum: string;
  betraege: Betragszeile[];
  bezahlt: Bezahlt;
  belege: Anhang[];
}

export interface Bewirtung {
  id: string;
  datum: string;
  lokal: string;
  anschrift?: string;
  anlass: string;
  teilnehmer: string;
  betraege: Betragszeile[];
  trinkgeldCent: Cent;
  bezahlt: Bezahlt;
  belege: Anhang[];
}

/** erstattung = Erstattung/Zuschuss Dritter, kuerzung = sonstige Kürzung (z. B. privater Anteil), vorschuss = erhaltener Vorschuss */
export type KorrekturArt = 'erstattung' | 'kuerzung' | 'vorschuss';

export interface Korrektur {
  id: string;
  art: KorrekturArt;
  beschreibung: string;
  betragCent: Cent;
  ust: UstKey;
}

/** Manuelle Angaben je Kalendertag für den Verpflegungsmehraufwand. undefined = automatisch. */
export interface TagAngabe {
  land?: string;
  /** Stadt mit eigener Pauschale; '' = übriges Land */
  ort?: string;
  fruehstueck?: boolean;
  mittag?: boolean;
  abend?: boolean;
  /** Tag ohne Verpflegungsmehraufwand (z. B. privater Tag, Dreimonatsfrist) */
  ausschliessen?: boolean;
}

export type Status = 'entwurf' | 'abgeschlossen' | 'eingereicht' | 'storniert';

export interface VersandEintrag {
  zeitpunkt: string;
  weg: 'email' | 'teilen' | 'download' | 'manuell';
  empfaenger?: string;
  dateien?: string[];
  storno?: boolean;
}

export type StartTyp = 'firmensitz' | 'wohnung' | 'abweichend';

export interface Reise {
  id: string;
  status: Status;
  nummer?: string;
  name: string;
  anlass: string;
  anlassDokumente: Anhang[];
  ziel: Ort;
  start: { typ: StartTyp; ort?: Ort };
  kostenstelle?: string;
  uebernachtungAuswaerts: 'auto' | 'ja' | 'nein';
  strecken: Teilstrecke[];
  uebernachtungen: Uebernachtung[];
  kosten: Kosten[];
  bewirtungen: Bewirtung[];
  korrekturen: Korrektur[];
  tage: Record<string, TagAngabe>;
  notiz?: string;
  erstelltAm: string;
  geaendertAm: string;
  abgeschlossenAm?: string;
  abrechnungsdatum?: string;
  eingereichtAm?: string;
  storniertAm?: string;
  stornoGrund?: string;
  /** Nummer der durch diese Reise ersetzten (stornierten) Abrechnung */
  ersetzt?: string;
  /** id der neu erzeugten Reise nach Storno */
  ersetztDurch?: string;
  /** Beim Abschluss eingefrorene Einstellungen – spätere Änderungen wirken nicht zurück. */
  snapshot?: EinstellungsSnapshot;
  /** SHA-256 über den Inhalt beim Abschluss */
  pruefsumme?: string;
  versand: VersandEintrag[];
}

export interface Firma {
  name: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  ustId: string;
  steuernummer: string;
}

export interface Reisender {
  name: string;
  strasse: string;
  plz: string;
  ort: string;
  email: string;
  iban: string;
  steuernummer: string;
  typ: 'unternehmer' | 'arbeitnehmer';
}

export type KmFahrzeug = 'pkw' | 'motorrad' | 'fahrrad' | 'fahrgemeinschaft';

export type KontoKey =
  | 'fahrt'
  | 'km'
  | 'uebernachtung'
  | 'vma'
  | 'sonstige'
  | 'fortbildung'
  | 'bewirtung'
  | 'bewirtungNichtAbziehbar';

export interface RateTable {
  jahr: number;
  quelle: string;
  /** [Land, Ländername, Ort|null, 24 h, An-/Abreisetag bzw. > 8 h, Übernachtung, Hinweis?] in Cent */
  zeilen: [string, string, string | null, number, number, number, string?][];
  zuordnung: Record<string, string>;
  ersatzLand: string;
}

export interface Einstellungen {
  firma: Firma;
  reisender: Reisender;
  wohnung: Ort;
  /** Cent pro km (Nachkommastellen erlaubt) */
  kmSaetze: Record<KmFahrzeug, number>;
  inland: { vollCent: Cent; teilCent: Cent };
  nummernkreis: { praefix: string; stellen: number };
  datev: {
    email: string;
    cc: string;
    betreff: string;
    xmlSeparat: boolean;
    belegeAnhaengen: boolean;
  };
  server: { url: string; token: string };
  kontenrahmen: 'SKR03' | 'SKR04';
  konten: Record<KontoKey, string>;
  zusatzTabellen: RateTable[];
  onboardingErledigt: boolean;
}

export type EinstellungsSnapshot = Pick<
  Einstellungen,
  'firma' | 'reisender' | 'wohnung' | 'kmSaetze' | 'inland' | 'kontenrahmen' | 'konten' | 'zusatzTabellen'
>;
