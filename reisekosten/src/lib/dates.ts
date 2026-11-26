// Lokale Datums-/Zeitangaben ohne Zeitzone. Gerechnet wird intern in UTC-Millisekunden, damit
// Sommer-/Winterzeit die Stundenberechnung nicht verfälscht.

const MS_H = 3600_000;
const MS_D = 24 * MS_H;

/** "2026-03-12T07:30" bzw. "2026-03-12" → ms (als UTC interpretiert) oder NaN */
export function toMs(s: string | undefined): number {
  if (!s) return NaN;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s);
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}

export const pad = (n: number) => String(n).padStart(2, '0');

export function msToDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function msToDateTime(ms: number): string {
  const d = new Date(ms);
  return `${msToDate(ms)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export const datePart = (s: string | undefined) => (s ?? '').slice(0, 10);
export const timePart = (s: string | undefined) => (s ?? '').slice(11, 16);

export function addDays(date: string, n: number): string {
  return msToDate(toMs(date) + n * MS_D);
}

/** Alle Kalendertage von a bis b (inklusive) */
export function daysBetween(a: string, b: string): string[] {
  const out: string[] = [];
  let t = toMs(datePart(a));
  const end = toMs(datePart(b));
  if (!Number.isFinite(t) || !Number.isFinite(end)) return out;
  for (let i = 0; t <= end && i < 400; i++, t += MS_D) out.push(msToDate(t));
  return out;
}

export const hoursBetween = (a: number, b: number) => (b - a) / MS_H;
export { MS_H, MS_D };

const WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** "12.03.2026" */
export function fmtDate(s: string | undefined): string {
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : s;
}

/** "Do, 12.03." */
export function fmtDayShort(s: string): string {
  const ms = toMs(s);
  if (!Number.isFinite(ms)) return s;
  const d = new Date(ms);
  return `${WOCHENTAG[d.getUTCDay()]}, ${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.`;
}

/** "12.03.2026, 07:30" */
export function fmtDateTime(s: string | undefined): string {
  if (!s) return '';
  const t = timePart(s);
  return t ? `${fmtDate(s)}, ${t}` : fmtDate(s);
}

/** Dauer in Stunden als "10:45 h" */
export function fmtHours(h: number): string {
  if (!Number.isFinite(h)) return '';
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)}:${pad(total % 60)} h`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Heutiges Datum lokal als "YYYY-MM-DD" */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtIsoLocal(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
