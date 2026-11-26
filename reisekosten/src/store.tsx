import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Anhang, Einstellungen, Reise, VersandEintrag } from './types';
import { db, type Backend } from './lib/db';
import { mitStandards, snapshotVon, standardEinstellungen } from './lib/defaults';
import { nowIso, today } from './lib/dates';
import { aufbereiten } from './lib/images';
import { clone, sha256Hex, uid } from './lib/util';

interface Toast {
  id: number;
  text: string;
  art: 'info' | 'ok' | 'fehler';
}

interface StoreValue {
  bereit: boolean;
  persistent: boolean;
  einstellungen: Einstellungen;
  setzeEinstellungen: (e: Einstellungen) => Promise<void>;
  reisen: Reise[];
  speichereReise: (r: Reise) => Promise<void>;
  loescheReise: (id: string) => Promise<void>;
  abschliessen: (id: string) => Promise<Reise>;
  stornieren: (id: string, grund: string, neuErzeugen: boolean) => Promise<string | undefined>;
  versandVermerken: (id: string, eintrag: VersandEintrag, alsEingereicht: boolean) => Promise<void>;
  speichereDatei: (file: File) => Promise<{ anhang: Anhang; hinweis?: string }>;
  ladeDatei: (id: string) => Promise<Blob | undefined>;
  backend: () => Promise<Backend>;
  neuLaden: () => Promise<void>;
  toast: (text: string, art?: Toast['art']) => void;
  toasts: Toast[];
}

const Ctx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider fehlt');
  return v;
}

/** Inhalt, über den beim Abschluss die Prüfsumme gebildet wird */
function pruefInhalt(r: Reise): string {
  const { nummer, name, anlass, anlassDokumente, ziel, start, kostenstelle, uebernachtungAuswaerts, strecken, uebernachtungen, kosten, bewirtungen, korrekturen, tage, abrechnungsdatum, snapshot } = r;
  return JSON.stringify({ nummer, name, anlass, anlassDokumente, ziel, start, kostenstelle, uebernachtungAuswaerts, strecken, uebernachtungen, kosten, bewirtungen, korrekturen, tage, abrechnungsdatum, snapshot });
}

export function referenzierteDateien(reisen: Reise[]): Set<string> {
  const ids = new Set<string>();
  for (const r of reisen) {
    for (const a of r.anlassDokumente) ids.add(a.id);
    for (const x of [...r.strecken, ...r.uebernachtungen, ...r.kosten, ...r.bewirtungen]) for (const a of x.belege) ids.add(a.id);
  }
  return ids;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [bereit, setBereit] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [einstellungen, setE] = useState<Einstellungen>(standardEinstellungen());
  const [reisen, setReisen] = useState<Reise[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reisenRef = useRef<Reise[]>([]);
  reisenRef.current = reisen;
  const toastId = useRef(0);

  const toast = useCallback((text: string, art: Toast['art'] = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, art }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), art === 'fehler' ? 6000 : 3500);
  }, []);

  const laden = useCallback(async () => {
    const b = await db();
    setPersistent(b.persistent);
    const e = mitStandards(await b.meta<Einstellungen>('einstellungen'));
    const rs = (await b.alleReisen()).map((r) => ({ ...r, versand: r.versand ?? [], tage: r.tage ?? {} }));
    setE(e);
    setReisen(rs);
    setBereit(true);
    // Verwaiste Dateien aufräumen (z. B. entfernte Belege aus Entwürfen)
    try {
      const refs = referenzierteDateien(rs);
      for (const id of await b.alleDateiIds()) if (!refs.has(id)) await b.loescheDatei(id);
    } catch {
      /* unkritisch */
    }
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  const setzeEinstellungen = useCallback(async (e: Einstellungen) => {
    setE(e);
    await (await db()).setzeMeta('einstellungen', e);
  }, []);

  const ersetze = (r: Reise) => setReisen((rs) => (rs.some((x) => x.id === r.id) ? rs.map((x) => (x.id === r.id ? r : x)) : [...rs, r]));

  const speichereReise = useCallback(async (r: Reise) => {
    const alt = reisenRef.current.find((x) => x.id === r.id);
    if (alt && alt.status !== 'entwurf') throw new Error('Abgeschlossene Abrechnungen können nicht geändert werden.');
    const neu = { ...r, geaendertAm: nowIso() };
    ersetze(neu);
    await (await db()).speichereReise(neu);
  }, []);

  const loescheReise = useCallback(async (id: string) => {
    const r = reisenRef.current.find((x) => x.id === id);
    if (!r) return;
    if (r.status !== 'entwurf') throw new Error('Nur Entwürfe können gelöscht werden. Abgeschlossene Abrechnungen werden storniert.');
    const b = await db();
    await b.loescheReise(id);
    const rest = reisenRef.current.filter((x) => x.id !== id);
    setReisen(rest);
    const refs = referenzierteDateien(rest);
    for (const a of referenzierteDateien([r])) if (!refs.has(a)) await b.loescheDatei(a);
  }, []);

  const abschliessen = useCallback(
    async (id: string) => {
      const r = reisenRef.current.find((x) => x.id === id);
      if (!r || r.status !== 'entwurf') throw new Error('Reise ist kein Entwurf.');
      const datum = today();
      const jahr = Number(datum.slice(0, 4));
      const { praefix, stellen } = einstellungen.nummernkreis;
      const p = (praefix || 'RK').trim();
      const format = (n: number) => `${p}-${jahr}-${String(n).padStart(stellen || 4, '0')}`;
      // höchste bereits vorhandene Nummer dieses Jahres (z. B. nach Import einer Sicherung)
      const re = new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${jahr}-(\\d+)$`);
      const mindestens = Math.max(0, ...reisenRef.current.map((x) => Number(re.exec(x.nummer ?? '')?.[1] ?? 0)));
      const b = await db();
      const basis: Reise = { ...r, status: 'abgeschlossen', abgeschlossenAm: nowIso(), abrechnungsdatum: datum, snapshot: snapshotVon(einstellungen), geaendertAm: nowIso() };
      let fertig = await b.abschliessen(basis, jahr, format, mindestens);
      fertig = { ...fertig, pruefsumme: await sha256Hex(pruefInhalt(fertig)) };
      await b.speichereReise(fertig);
      ersetze(fertig);
      return fertig;
    },
    [einstellungen],
  );

  const stornieren = useCallback(async (id: string, grund: string, neuErzeugen: boolean) => {
    const r = reisenRef.current.find((x) => x.id === id);
    if (!r || (r.status !== 'abgeschlossen' && r.status !== 'eingereicht')) throw new Error('Nur abgeschlossene Abrechnungen können storniert werden.');
    const b = await db();
    let neuId: string | undefined;
    if (neuErzeugen) {
      const t = nowIso();
      const kopie: Reise = {
        ...clone(r),
        id: uid(),
        status: 'entwurf',
        nummer: undefined,
        ersetzt: r.nummer,
        ersetztDurch: undefined,
        snapshot: undefined,
        pruefsumme: undefined,
        abgeschlossenAm: undefined,
        abrechnungsdatum: undefined,
        eingereichtAm: undefined,
        storniertAm: undefined,
        stornoGrund: undefined,
        versand: [],
        erstelltAm: t,
        geaendertAm: t,
      };
      await b.speichereReise(kopie);
      ersetze(kopie);
      neuId = kopie.id;
    }
    const storniert: Reise = { ...r, status: 'storniert', storniertAm: nowIso(), stornoGrund: grund, ersetztDurch: neuId };
    await b.speichereReise(storniert);
    ersetze(storniert);
    return neuId;
  }, []);

  const versandVermerken = useCallback(async (id: string, eintrag: VersandEintrag, alsEingereicht: boolean) => {
    const r = reisenRef.current.find((x) => x.id === id);
    if (!r) return;
    const neu: Reise = { ...r, versand: [...(r.versand ?? []), eintrag] };
    if (alsEingereicht && r.status === 'abgeschlossen') {
      neu.status = 'eingereicht';
      neu.eingereichtAm = eintrag.zeitpunkt;
    }
    await (await db()).speichereReise(neu);
    ersetze(neu);
  }, []);

  const speichereDatei = useCallback(async (file: File) => {
    const a = await aufbereiten(file);
    const id = uid();
    await (await db()).speichereDatei({ id, name: a.name, typ: a.typ, groesse: a.blob.size, blob: a.blob, erstelltAm: nowIso() });
    return { anhang: { id, name: a.name, typ: a.typ, groesse: a.blob.size }, hinweis: a.hinweis };
  }, []);

  const ladeDatei = useCallback(async (id: string) => (await (await db()).datei(id))?.blob, []);

  const value = useMemo<StoreValue>(
    () => ({
      bereit,
      persistent,
      einstellungen,
      setzeEinstellungen,
      reisen,
      speichereReise,
      loescheReise,
      abschliessen,
      stornieren,
      versandVermerken,
      speichereDatei,
      ladeDatei,
      backend: db,
      neuLaden: laden,
      toast,
      toasts,
    }),
    [bereit, persistent, einstellungen, setzeEinstellungen, reisen, speichereReise, loescheReise, abschliessen, stornieren, versandVermerken, speichereDatei, ladeDatei, laden, toast, toasts],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
