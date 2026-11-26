import { describe, expect, it } from 'vitest';
import { berechneVma } from '../src/lib/perdiem';
import { pauschaleFuer } from '../src/lib/rates';
import { E, hotel, leg, reise } from './helpers';

const ctx = E();

describe('Verpflegungsmehraufwand Inland', () => {
  it('eintägig mehr als 8 Stunden: 14 €', () => {
    const r = reise({ strecken: [leg('Wiesbaden', 'DE', 'Köln', 'DE', '2026-03-02T07:00', '2026-03-02T10:00'), leg('Köln', 'DE', 'Wiesbaden', 'DE', '2026-03-02T15:00', '2026-03-02T17:30')] });
    const v = berechneVma(r, ctx);
    expect(v.tage).toHaveLength(1);
    expect(v.tage[0].stunden).toBeCloseTo(10.5);
    expect(v.summeCent).toBe(1400);
  });

  it('eintägig bis 8 Stunden: keine Pauschale', () => {
    const r = reise({ strecken: [leg('Wiesbaden', 'DE', 'Mainz', 'DE', '2026-03-02T09:00', '2026-03-02T09:30'), leg('Mainz', 'DE', 'Wiesbaden', 'DE', '2026-03-02T16:30', '2026-03-02T17:00')] });
    expect(berechneVma(r, ctx).summeCent).toBe(0);
  });

  it('mehrtägig mit Übernachtung: 14 + 28 + 14 €, Frühstück kürzt je 5,60 €', () => {
    const strecken = [leg('Wiesbaden', 'DE', 'Hamburg', 'DE', '2026-03-02T15:00', '2026-03-02T20:00'), leg('Hamburg', 'DE', 'Wiesbaden', 'DE', '2026-03-04T10:00', '2026-03-04T15:00')];
    const ohne = berechneVma(reise({ strecken, uebernachtungen: [hotel('Hamburg', 'DE', '2026-03-02', '2026-03-04', 30000)] }), ctx);
    expect(ohne.tage.map((t) => t.betragCent)).toEqual([1400, 2800, 1400]);
    expect(ohne.tage.map((t) => t.art)).toEqual(['anreise', 'zwischentag', 'abreise']);
    const mit = berechneVma(reise({ strecken, uebernachtungen: [hotel('Hamburg', 'DE', '2026-03-02', '2026-03-04', 30000, 'inklusive')] }), ctx);
    expect(mit.tage.map((t) => t.kuerzungCent)).toEqual([0, 560, 560]);
    expect(mit.summeCent).toBe(5600 - 1120);
  });

  it('Mahlzeitenkürzung höchstens bis 0 €', () => {
    const r = reise({
      strecken: [leg('A', 'DE', 'B', 'DE', '2026-03-02T07:00', '2026-03-02T09:00'), leg('B', 'DE', 'A', 'DE', '2026-03-02T17:00', '2026-03-02T19:00')],
      tage: { '2026-03-02': { mittag: true, abend: true } },
    });
    const v = berechneVma(r, ctx);
    expect(v.tage[0].pauschaleCent).toBe(1400);
    expect(v.tage[0].kuerzungCent).toBe(1400);
    expect(v.summeCent).toBe(0);
  });

  it('über Mitternacht ohne Übernachtung: Stunden zusammenrechnen, Pauschale beim überwiegenden Tag', () => {
    const r = reise({ strecken: [leg('A', 'DE', 'B', 'DE', '2026-03-02T20:00', '2026-03-02T23:00'), leg('B', 'DE', 'A', 'DE', '2026-03-03T07:00', '2026-03-03T10:00')] });
    const v = berechneVma(r, ctx);
    expect(v.mitUebernachtung).toBe(false);
    expect(v.tage.map((t) => t.betragCent)).toEqual([0, 1400]);
    expect(v.tage[1].art).toBe('zusammengefasst');
  });
});

describe('Verpflegungsmehraufwand Ausland', () => {
  it('Beispiel Wiesbaden – Frankfurt – Wien – Innsbruck (Österreich 2026: 50/33 €)', () => {
    const strecken = [
      leg('Wiesbaden', 'DE', 'Frankfurt am Main', 'DE', '2026-05-11T06:00', '2026-05-11T06:45', 'pkw', { km: 40 }),
      leg('Frankfurt am Main', 'DE', 'Wien', 'AT', '2026-05-11T08:00', '2026-05-11T09:30', 'flug'),
      leg('Wien', 'AT', 'Innsbruck', 'AT', '2026-05-11T10:30', '2026-05-11T15:30', 'mietwagen'),
      leg('Innsbruck', 'AT', 'Wien', 'AT', '2026-05-13T08:00', '2026-05-13T13:00', 'mietwagen', { richtung: 'rueck' }),
      leg('Wien', 'AT', 'Frankfurt am Main', 'DE', '2026-05-13T15:00', '2026-05-13T16:30', 'flug', { richtung: 'rueck' }),
      leg('Frankfurt am Main', 'DE', 'Wiesbaden', 'DE', '2026-05-13T17:00', '2026-05-13T17:45', 'pkw', { km: 40, richtung: 'rueck' }),
    ];
    const v = berechneVma(reise({ strecken, uebernachtungen: [hotel('Innsbruck', 'AT', '2026-05-11', '2026-05-13', 36000, 'inklusive')] }), ctx);
    expect(v.tage.map((t) => t.land)).toEqual(['AT', 'AT', 'AT']);
    expect(v.tage.map((t) => t.pauschaleCent)).toEqual([3300, 5000, 3300]);
    expect(v.tage.map((t) => t.kuerzungCent)).toEqual([0, 1000, 1000]);
    expect(v.summeCent).toBe(11600 - 2000);
  });

  it('Anreisetag: Ort, der vor 24 Uhr erreicht wird – Nachtflug zählt noch als Inland', () => {
    const strecken = [
      leg('Frankfurt', 'DE', 'New York', 'US', '2026-06-01T22:00', '2026-06-02T01:00', 'flug'),
      leg('New York', 'US', 'Frankfurt', 'DE', '2026-06-04T18:00', '2026-06-05T08:00', 'flug'),
    ];
    const v = berechneVma(reise({ strecken, uebernachtungen: [hotel('New York', 'US', '2026-06-02', '2026-06-04', 90000)] }), ctx);
    expect(v.tage.map((t) => t.land)).toEqual(['DE', 'US', 'US', 'US', 'US']);
    expect(v.tage[1].stadt).toBe('New York City');
    expect(v.tage.map((t) => t.pauschaleCent)).toEqual([1400, 6600, 6600, 6600, 4400]);
  });

  it('eintägige Auslandsreise: letzter Tätigkeitsort im Ausland', () => {
    const strecken = [leg('Freiburg', 'DE', 'Basel', 'CH', '2026-02-10T07:00', '2026-02-10T08:00'), leg('Basel', 'CH', 'Freiburg', 'DE', '2026-02-10T18:00', '2026-02-10T19:00')];
    const v = berechneVma(reise({ strecken }), ctx);
    expect(v.tage[0].land).toBe('CH');
    expect(v.summeCent).toBe(4700);
  });

  it('Paris einschließlich Départements 77, 78, 91–95 über die PLZ', () => {
    const strecken = [
      leg('Saarbrücken', 'DE', 'Nanterre', 'FR', '2026-04-01T06:00', '2026-04-01T09:00', 'bahn', { nach: { ort: 'Nanterre', plz: '92000', land: 'FR' } }),
      leg('Nanterre', 'FR', 'Saarbrücken', 'DE', '2026-04-01T17:00', '2026-04-01T20:00', 'bahn'),
    ];
    const v = berechneVma(reise({ strecken }), ctx);
    expect(v.tage[0].stadt).toBe('Paris');
    expect(v.summeCent).toBe(3900);
  });

  it('manuelle Länderwahl je Tag hat Vorrang', () => {
    const strecken = [leg('A', 'DE', 'B', 'DE', '2026-03-02T07:00', '2026-03-02T09:00'), leg('B', 'DE', 'A', 'DE', '2026-03-02T17:00', '2026-03-02T19:00')];
    const v = berechneVma(reise({ strecken, tage: { '2026-03-02': { land: 'FR', ort: '' } } }), ctx);
    expect(v.tage[0].land).toBe('FR');
    expect(v.summeCent).toBe(3600);
  });
});

describe('Pauschalentabelle', () => {
  it('nicht erfasstes Land: Luxemburg', () => {
    const r = pauschaleFuer(2026, 'AF', null, ctx);
    expect(r.vollCent).toBe(6300);
    expect(r.hinweis).toMatch(/Luxemburg/);
  });
  it('Zuordnung laut BMF (Grenada → Trinidad und Tobago)', () => {
    expect(pauschaleFuer(2026, 'GD', null, ctx).vollCent).toBe(6600);
  });
  it('Überseegebiet (Réunion → Frankreich)', () => {
    expect(pauschaleFuer(2026, 'RE', null, ctx).vollCent).toBe(5300);
  });
  it('Jahr ohne Tabelle nutzt die nächstältere und weist darauf hin', () => {
    const r = pauschaleFuer(2027, 'AT', null, ctx);
    expect(r.vollCent).toBe(5000);
    expect(r.hinweis).toMatch(/2027/);
  });
});
