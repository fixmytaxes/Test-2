// Reisekosten – kleiner Server: liefert die Web-App aus und versendet Abrechnungen per SMTP
// (z. B. an die DATEV Upload-Mail-Adresse). Zugangsdaten nur über Umgebungsvariablen, nie in der App.
//
//   SMTP_HOST, SMTP_PORT (587), SMTP_SECURE (true bei Port 465), SMTP_USER, SMTP_PASS
//   MAIL_FROM            Absender, z. B. "Reisekosten <reisekosten@firma.de>"
//   APP_TOKEN            optional: Token, das die App im Header X-App-Token mitsenden muss
//   MAIL_ALLOWED_TO      optional: erlaubte Empfänger, kommagetrennt (Adressen oder @domain),
//                        Standard: @uploadmail.datev.de sowie die Adressen aus MAIL_ALLOWED_EXTRA
//   MAIL_DRYRUN=1        Testbetrieb: E-Mails werden nicht versendet, nur protokolliert
//   PORT (8787), HOST (0.0.0.0)
import express from 'express';
import nodemailer from 'nodemailer';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const env = process.env;
const PORT = Number(env.PORT || 8787);
const HOST = env.HOST || '0.0.0.0';
const MAX_MB = 20;

const erlaubt = (env.MAIL_ALLOWED_TO || '@uploadmail.datev.de')
  .split(',')
  .concat((env.MAIL_ALLOWED_EXTRA || '').split(','))
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const empfaengerErlaubt = (adr) => {
  const a = String(adr || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) return false;
  return erlaubt.includes('*') || erlaubt.some((e) => (e.startsWith('@') ? a.endsWith(e) : a === e));
};

const dryRun = env.MAIL_DRYRUN === '1';
const smtpBereit = dryRun || !!(env.SMTP_HOST && env.MAIL_FROM);
const transport = dryRun
  ? nodemailer.createTransport({ jsonTransport: true })
  : smtpBereit
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: String(env.SMTP_SECURE || '').toLowerCase() === 'true',
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

const app = express();
app.disable('x-powered-by');
app.use('/api', express.json({ limit: `${Math.ceil(MAX_MB * 1.4)}mb` }));

// CORS, falls App und Server auf verschiedenen Adressen laufen
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-App-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const tokenOk = (req) => !env.APP_TOKEN || req.get('X-App-Token') === env.APP_TOKEN;

app.get('/api/health', (req, res) => {
  if (!tokenOk(req)) return res.status(401).json({ ok: false, error: 'Token fehlt oder ist falsch.' });
  res.json({ ok: true, mail: smtpBereit, from: dryRun ? 'Testbetrieb – kein echter Versand' : smtpBereit ? env.MAIL_FROM : undefined });
});

app.post('/api/mail', async (req, res) => {
  if (!tokenOk(req)) return res.status(401).json({ error: 'Zugangs-Token fehlt oder ist falsch (Einstellungen → Versand-Server).' });
  if (!transport) return res.status(503).json({ error: 'Auf dem Server ist kein SMTP-Zugang eingerichtet.' });
  const { to, cc, subject, text, attachments } = req.body || {};
  if (!empfaengerErlaubt(to)) return res.status(400).json({ error: `Empfänger ${to} ist nicht freigegeben (MAIL_ALLOWED_TO).` });
  if (cc && !empfaengerErlaubt(cc)) return res.status(400).json({ error: `Kopie-Empfänger ${cc} ist nicht freigegeben (MAIL_ALLOWED_TO).` });
  if (!Array.isArray(attachments) || !attachments.length || attachments.length > 10) return res.status(400).json({ error: 'Anhänge fehlen.' });
  const files = attachments.map((a) => ({
    filename: String(a.filename || 'datei').replace(/[\\/\r\n]/g, '_').slice(0, 150),
    content: Buffer.from(String(a.base64 || ''), 'base64'),
    contentType: /^[\w.+-]+\/[\w.+-]+$/.test(a.contentType || '') ? a.contentType : 'application/octet-stream',
  }));
  const groesse = files.reduce((s, f) => s + f.content.length, 0);
  if (groesse > MAX_MB * 1024 * 1024) return res.status(413).json({ error: `Anhänge größer als ${MAX_MB} MB.` });
  try {
    const info = await transport.sendMail({
      from: env.MAIL_FROM || 'Reisekosten <test@localhost>',
      to,
      cc: cc || undefined,
      subject: String(subject || 'Reisekostenabrechnung').replace(/[\r\n]+/g, ' ').slice(0, 200),
      text: String(text || '').slice(0, 5000),
      attachments: files,
    });
    console.log(`[mail${dryRun ? ' TEST – nicht versendet' : ''}] ${new Date().toISOString()} an ${to}: ${files.map((f) => `${f.filename} (${Math.round(f.content.length / 1024)} KB)`).join(', ')}`);
    res.json({ ok: true, messageId: info.messageId });
  } catch (e) {
    console.error('[mail] Fehler', e);
    res.status(502).json({ error: 'Versand fehlgeschlagen: ' + (e?.message || 'unbekannter Fehler') });
  }
});

if (existsSync(root)) {
  app.use(express.static(root, { index: 'index.html', maxAge: '1h', setHeaders: (res, p) => p.endsWith('sw.js') && res.setHeader('Cache-Control', 'no-cache') }));
} else {
  app.get('/', (_req, res) => res.type('text').send('App nicht gebaut – bitte zuerst "npm run build" ausführen.'));
}

app.listen(PORT, HOST, () => {
  console.log(`Reisekosten läuft auf http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}  (SMTP ${dryRun ? 'TESTBETRIEB' : smtpBereit ? 'aktiv' : 'nicht eingerichtet'}, Empfänger: ${erlaubt.join(', ')})`);
});
