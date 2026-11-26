import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { splitBrutto } from '../src/lib/money';
import { berechne } from '../src/lib/totals';
import { erzeugeXml } from '../src/lib/xml';
import { beispielReise, E } from './helpers';

const e = E();

describe('Umsatzsteueraufteilung', () => {
  it('findet einen Nettobetrag, der exakt zum Brutto passt', () => {
    expect(splitBrutto('19', 11900)).toMatchObject({ netto: 10000, steuer: 1900, rundung: 0 });
    expect(splitBrutto('7', 10700)).toMatchObject({ netto: 10000, steuer: 700, rundung: 0 });
    for (let b = 1; b < 3000; b++) {
      const s = splitBrutto('19', b);
      expect(s.netto + s.steuer).toBe(b);
      expect(s.steuerEN).toBe(Math.round(s.netto * 0.19));
      expect(Math.abs(s.rundung)).toBeLessThanOrEqual(1);
    }
  });
});

describe('Abrechnung', () => {
  const a = berechne(beispielReise(), e);
  it('summiert die Bereiche', () => {
    const s = a.summen;
    expect(s.fahrt.kmGesamt).toBe(80);
    expect(s.bereiche.fahrt).toBe(2400 + 18990 + 21480 + 15990);
    expect(s.bereiche.uebernachtung).toBe(36000);
    expect(s.bereiche.vma).toBe(11600 - 2000);
    expect(s.bereiche.sonstige).toBe(64000);
    expect(s.bereiche.bewirtung).toBe(9140);
    expect(s.korrekturenCent).toBe(5000);
    expect(s.reisekostenNachKorrektur).toBe(s.reisekostenBrutto - 5000);
  });
  it('ermittelt Vorsteuer und Bewirtung 70/30', () => {
    const u19 = a.summen.ustReise.find((u) => u.ust === '19')!;
    expect(u19).toMatchObject({ brutto: 64000, netto: 53782, steuer: 10218, steuerEN: 10219, rundung: -1 });
    expect(a.summen.bewirtung.vorsteuerCent).toBe(0);
    expect(a.summen.bewirtung.basisCent).toBe(9140);
    expect(a.summen.bewirtung.abziehbarCent).toBe(6398);
    expect(a.summen.bewirtung.nichtAbziehbarCent).toBe(2742);
  });
  it('berechnet den Auszahlungsbetrag', () => {
    const s = a.summen;
    expect(s.firmaCent).toBe(21480);
    expect(s.privatCent + s.firmaCent).toBe(s.reisekostenBrutto + s.bereiche.bewirtung);
    expect(s.auszahlungCent).toBe(s.privatCent - 5000 - 20000);
  });
  it('erzeugt eine in sich stimmige E-Rechnung', () => {
    const xml = erzeugeXml(a, { abrechnungsdatum: '2026-05-15' });
    const num = (tag: string) => Number(new RegExp(`<ram:${tag}[^>]*>([-0-9.]+)<`).exec(xml)![1]);
    const lines = [...xml.matchAll(/<ram:LineTotalAmount>([-0-9.]+)</g)].map((m) => Number(m[1]));
    const lineSum = lines.slice(0, -1).reduce((s, x) => s + x, 0);
    expect(lineSum).toBeCloseTo(num('LineTotalAmount') === lines[0] ? lineSum : lines[lines.length - 1], 2);
    const total = lines[lines.length - 1];
    expect(total).toBeCloseTo(lineSum, 2);
    expect(num('TaxBasisTotalAmount')).toBeCloseTo(total - num('AllowanceTotalAmount'), 2);
    expect(num('GrandTotalAmount')).toBeCloseTo(num('TaxBasisTotalAmount') + num('TaxTotalAmount'), 2);
    expect(num('DuePayableAmount') * 100).toBeCloseTo(a.summen.auszahlungCent, 0);
    expect(xml).toContain('<ram:ID>RK-2026-0001</ram:ID>');
    expect(xml).toContain('<ram:CategoryCode>S</ram:CategoryCode>');
    expect(xml).toContain('<ram:CategoryCode>E</ram:CategoryCode>');
    if (process.env.XML_OUT) {
      mkdirSync('tests/out', { recursive: true });
      writeFileSync('tests/out/beispiel.xml', xml);
      writeFileSync('tests/out/storno.xml', erzeugeXml(a, { abrechnungsdatum: '2026-05-20', storno: true }));
    }
  });
});
