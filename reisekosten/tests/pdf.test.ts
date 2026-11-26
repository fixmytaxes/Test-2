import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { erzeugePdf } from '../src/lib/pdf';
import { berechne } from '../src/lib/totals';
import { erzeugeXml } from '../src/lib/xml';
import { beispielReise, E } from './helpers';

// 1×1-PNG als Beleg
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

describe('PDF', () => {
  it('erzeugt die Abrechnung mit eingebetteter E-Rechnung und Anlagen', async () => {
    const r = { ...beispielReise(), status: 'abgeschlossen' as const, abgeschlossenAm: '2026-05-15T10:00:00.000Z', pruefsumme: 'ab'.repeat(32) };
    r.strecken[1].belege = [{ id: 'f1', name: 'flugticket.png', typ: 'image/png', groesse: PNG.length }];
    r.anlassDokumente = [{ id: 'f2', name: 'einladung.pdf', typ: 'application/pdf', groesse: 0 }];
    const einl = await PDFDocument.create();
    einl.addPage([300, 400]).drawText('Einladung zum Kongress', { x: 20, y: 350, size: 14 });
    const einlBytes = await einl.save();
    const a = berechne(r, E());
    const xml = erzeugeXml(a, { abrechnungsdatum: '2026-05-15' });
    const bytes = await erzeugePdf(a, {
      belegeAnhaengen: true,
      xml,
      ladeDatei: async (id) => (id === 'f1' ? new Blob([PNG], { type: 'image/png' }) : new Blob([einlBytes], { type: 'application/pdf' })),
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(4);
    const raw = new TextDecoder('latin1').decode(bytes);
    expect(raw).toContain('factur-x.xml');
    expect(raw).toContain('/AFRelationship /Alternative');
    expect(raw).toContain('fx:ConformanceLevel');
    if (process.env.XML_OUT) {
      mkdirSync('tests/out', { recursive: true });
      writeFileSync('tests/out/beispiel.pdf', bytes);
      expect(readFileSync('tests/out/beispiel.pdf').length).toBe(bytes.length);
    }
  });
});
