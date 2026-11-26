// Erzeugt die Exportdateien einer Abrechnung (PDF mit eingebetteter E-Rechnung, XML) und verschickt sie.
import type { Einstellungen, Reise } from '../types';
import { today } from './dates';
import { dateiBasis, erzeugePdf } from './pdf';
import { berechne } from './totals';
import { erzeugeXml } from './xml';
import { android, blobZuBase64 } from './plattform';

export interface Exportdatei {
  name: string;
  typ: string;
  blob: Blob;
}

async function bildZuJpeg(blob: Blob): Promise<Uint8Array | null> {
  try {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0);
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.88));
    return out ? new Uint8Array(await out.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

export async function erzeugeExport(
  reise: Reise,
  e: Einstellungen,
  ladeDatei: (id: string) => Promise<Blob | undefined>,
  o: { storno?: boolean; mitBelegen?: boolean } = {},
): Promise<{ pdf: Exportdatei; xml: Exportdatei }> {
  const a = berechne(reise, e);
  const datum = o.storno ? (reise.storniertAm ?? new Date().toISOString()).slice(0, 10) : reise.abrechnungsdatum ?? today();
  const xml = erzeugeXml(a, { abrechnungsdatum: datum, storno: o.storno });
  const bytes = await erzeugePdf(a, {
    storno: o.storno,
    belegeAnhaengen: o.mitBelegen ?? e.datev.belegeAnhaengen,
    xml,
    ladeDatei,
    bildZuJpeg,
  });
  const basis = dateiBasis(reise, o.storno);
  return {
    pdf: { name: basis + '.pdf', typ: 'application/pdf', blob: new Blob([bytes], { type: 'application/pdf' }) },
    xml: { name: basis + '.xml', typ: 'application/xml', blob: new Blob([xml], { type: 'application/xml' }) },
  };
}

export function herunterladen(d: Exportdatei) {
  const app = android();
  if (app) {
    void blobZuBase64(d.blob).then((b64) => app.saveFile(d.name, d.typ, b64));
    return;
  }
  const url = URL.createObjectURL(d.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = d.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function oeffnen(d: Exportdatei | Blob) {
  const app = android();
  if (app) {
    const blob = d instanceof Blob ? d : d.blob;
    const name = d instanceof Blob ? 'Dokument.pdf' : d.name;
    void blobZuBase64(blob).then((b64) => app.openFile(name, blob.type || 'application/pdf', b64));
    return;
  }
  const blob = d instanceof Blob ? d : d.blob;
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w && !(d instanceof Blob)) herunterladen(d);
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export function betreff(e: Einstellungen, r: Reise, storno = false): string {
  const vorlage = e.datev.betreff || 'Reisekostenabrechnung {nummer} – {reise}';
  return (storno ? 'STORNO ' : '') + vorlage.replace('{nummer}', r.nummer ?? '').replace('{reise}', r.name).replace('{reisender}', e.reisender.name);
}

export function serverUrl(e: Einstellungen): string {
  const u = (e.server.url || '').trim().replace(/\/+$/, '');
  return u || '';
}

export async function serverStatus(e: Einstellungen): Promise<{ ok: boolean; mail: boolean; text: string }> {
  if (android() && !serverUrl(e)) return { ok: false, mail: false, text: 'Kein Versand-Server eingerichtet' };
  try {
    const res = await fetch(`${serverUrl(e)}/api/health`, { headers: e.server.token ? { 'X-App-Token': e.server.token } : {} });
    if (!res.ok) return { ok: false, mail: false, text: `Server antwortet mit ${res.status}` };
    const j = (await res.json()) as { ok: boolean; mail: boolean; from?: string };
    return { ok: !!j.ok, mail: !!j.mail, text: j.mail ? `Versand bereit${j.from ? ' (Absender ' + j.from + ')' : ''}` : 'Server erreichbar, aber kein SMTP-Zugang eingerichtet' };
  } catch {
    return { ok: false, mail: false, text: 'Kein Versand-Server erreichbar' };
  }
}

/** Sendet die Dateien per E-Mail über den Versand-Server der App (SMTP). */
export async function sendeMail(e: Einstellungen, an: string, betreffText: string, text: string, dateien: Exportdatei[]): Promise<void> {
  const attachments = await Promise.all(dateien.map(async (d) => ({ filename: d.name, contentType: d.typ, base64: await blobZuBase64(d.blob) })));
  const res = await fetch(`${serverUrl(e)}/api/mail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(e.server.token ? { 'X-App-Token': e.server.token } : {}) },
    body: JSON.stringify({ to: an, cc: e.datev.cc || undefined, subject: betreffText, text, attachments }),
  });
  if (!res.ok) {
    let msg = `Versand fehlgeschlagen (${res.status})`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

/** Teilen über das Betriebssystem (z. B. Mail-App auf dem Smartphone). Unter Android mit vorbelegtem Empfänger. */
export async function teilen(dateien: Exportdatei[], titel: string, text: string, an?: string): Promise<boolean> {
  const app = android();
  if (app) {
    const files = await Promise.all(dateien.map(async (d) => ({ name: d.name, mime: d.typ, base64: await blobZuBase64(d.blob) })));
    return app.shareFiles(JSON.stringify({ files, subject: titel, text, email: an || '' }));
  }
  const files = dateien.map((d) => new File([d.blob], d.name, { type: d.typ }));
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files })) return false;
  try {
    await nav.share({ files, title: titel, text });
    return true;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    return false;
  }
}

export function kannTeilen(): boolean {
  if (android()) return true;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    return !!nav.share && !!nav.canShare?.({ files: [new File(['x'], 'x.pdf', { type: 'application/pdf' })] });
  } catch {
    return false;
  }
}

export function mailText(e: Einstellungen, r: Reise, betragText: string, storno = false): string {
  return [
    storno ? `Storno der Reisekostenabrechnung ${r.nummer}` : `Reisekostenabrechnung ${r.nummer ?? ''}`,
    `Reise: ${r.name}`,
    `Reisender: ${e.reisender.name}`,
    `Betrag: ${betragText}`,
    '',
    'Die PDF enthält die strukturierten Rechnungsdaten (factur-x.xml, EN 16931).',
    'Erstellt mit der Reisekosten-App.',
  ].join('\n');
}
