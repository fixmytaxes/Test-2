import { neueReise, standardEinstellungen } from '../src/lib/defaults';
import type { Reise, Teilstrecke, Uebernachtung, Verkehrsmittel } from '../src/types';
import { uid } from '../src/lib/util';

export function leg(von: string, vonLand: string, nach: string, nachLand: string, ab: string, an: string, vm: Verkehrsmittel = 'pkw', extra: Partial<Teilstrecke> = {}): Teilstrecke {
  return {
    id: uid(),
    richtung: 'hin',
    von: { ort: von, land: vonLand },
    nach: { ort: nach, land: nachLand },
    verkehrsmittel: vm,
    abfahrt: ab,
    ankunft: an,
    kostenart: vm === 'pkw' ? 'km' : 'beleg',
    betraege: [],
    bezahlt: 'privat',
    belege: [],
    ...extra,
  };
}

export function hotel(ort: string, land: string, an: string, ab: string, brutto: number, fruehstueck: Uebernachtung['fruehstueck'] = 'nein'): Uebernachtung {
  return { id: uid(), bezeichnung: 'Hotel', ort: { ort, land }, anreise: an, abreise: ab, betraege: [{ ust: land === 'DE' ? '7' : 'ausl', bruttoCent: brutto }], fruehstueck, bezahlt: 'privat', belege: [] };
}

export function reise(p: Partial<Reise>): Reise {
  return { ...neueReise(), name: 'Test', anlass: 'Kundentermin', ziel: { ort: 'X', land: 'DE' }, ...p };
}

export const E = () => {
  const e = standardEinstellungen();
  e.firma = { ...e.firma, name: 'Muster GmbH', strasse: 'Hauptstr. 1', plz: '65183', ort: 'Wiesbaden', ustId: 'DE123456789', steuernummer: '040 123 45678' };
  e.reisender = { ...e.reisender, name: 'Max Muster', email: 'max@example.com' };
  return e;
};

export function beispielReise(): Reise {
  const r = reise({
    nummer: 'RK-2026-0001',
    name: 'Fachkongress Innsbruck',
    anlass: 'Teilnahme am Steuerfachkongress',
    ziel: { bezeichnung: 'Congress Innsbruck', strasse: 'Rennweg 3', plz: '6020', ort: 'Innsbruck', land: 'AT' },
    abrechnungsdatum: '2026-05-15',
    strecken: [
      leg('Wiesbaden', 'DE', 'Frankfurt am Main', 'DE', '2026-05-11T06:00', '2026-05-11T06:45', 'pkw', { km: 40 }),
      leg('Frankfurt am Main', 'DE', 'Wien', 'AT', '2026-05-11T08:00', '2026-05-11T09:30', 'flug', { betraege: [{ ust: '0', bruttoCent: 18990 }] }),
      leg('Wien', 'AT', 'Innsbruck', 'AT', '2026-05-11T10:30', '2026-05-11T15:30', 'mietwagen', { betraege: [{ ust: 'ausl', bruttoCent: 21480 }], bezahlt: 'firma' }),
      leg('Innsbruck', 'AT', 'Wien', 'AT', '2026-05-13T08:00', '2026-05-13T13:00', 'mietwagen', { kostenart: 'keine' }),
      leg('Wien', 'AT', 'Frankfurt am Main', 'DE', '2026-05-13T15:00', '2026-05-13T16:30', 'flug', { betraege: [{ ust: '0', bruttoCent: 15990 }] }),
      leg('Frankfurt am Main', 'DE', 'Wiesbaden', 'DE', '2026-05-13T17:00', '2026-05-13T17:45', 'pkw', { km: 40 }),
    ],
    uebernachtungen: [hotel('Innsbruck', 'AT', '2026-05-11', '2026-05-13', 36000, 'inklusive')],
    kosten: [
      { id: 'k1', kategorie: 'seminar', beschreibung: 'Kongressgebühr', datum: '2026-05-12', betraege: [{ ust: '19', bruttoCent: 59500 }], bezahlt: 'privat', belege: [] },
      { id: 'k2', kategorie: 'parken', beschreibung: 'Parkhaus Flughafen', datum: '2026-05-13', betraege: [{ ust: '19', bruttoCent: 4500 }], bezahlt: 'privat', belege: [] },
    ],
    bewirtungen: [
      { id: 'b1', datum: '2026-05-12', lokal: 'Gasthof Weisses Rössl', anlass: 'Mandantengespräch', teilnehmer: 'Max Muster, Erika Beispiel', betraege: [{ ust: 'ausl', bruttoCent: 8640 }], trinkgeldCent: 500, bezahlt: 'privat', belege: [] },
    ],
    korrekturen: [
      { id: 'c1', art: 'erstattung', beschreibung: 'Reisekostenzuschuss Veranstalter', betragCent: 5000, ust: '0' },
      { id: 'c2', art: 'vorschuss', beschreibung: 'Barvorschuss', betragCent: 20000, ust: '0' },
    ],
  });
  return r;
}

