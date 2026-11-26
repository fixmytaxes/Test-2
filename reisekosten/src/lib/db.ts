// Lokale Speicherung in IndexedDB: Reisen, Dateien (Belege) und Einstellungen bleiben auf dem Gerät.
// Ist IndexedDB nicht verfügbar (z. B. privater Modus mancher Browser), wird im Arbeitsspeicher gearbeitet.
import type { Einstellungen, Reise } from '../types';

const DB_NAME = 'reisekosten';
const DB_VERSION = 1;

export interface DateiEintrag {
  id: string;
  name: string;
  typ: string;
  groesse: number;
  blob: Blob;
  erstelltAm: string;
}

type MetaKey = 'einstellungen' | 'zaehler';

interface Backend {
  persistent: boolean;
  alleReisen(): Promise<Reise[]>;
  speichereReise(r: Reise): Promise<void>;
  loescheReise(id: string): Promise<void>;
  datei(id: string): Promise<DateiEintrag | undefined>;
  speichereDatei(d: DateiEintrag): Promise<void>;
  loescheDatei(id: string): Promise<void>;
  alleDateiIds(): Promise<string[]>;
  meta<T>(key: MetaKey): Promise<T | undefined>;
  setzeMeta<T>(key: MetaKey, value: T): Promise<void>;
  /** Vergibt die nächste Nummer und speichert die Reise in einer Transaktion */
  abschliessen(r: Reise, jahr: number, format: (n: number) => string, mindestens: number): Promise<Reise>;
  allesLoeschen(): Promise<void>;
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaktion abgebrochen'));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('reisen')) db.createObjectStore('reisen', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('dateien')) db.createObjectStore('dateien', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('Datenbank blockiert'));
  });
}

class IdbBackend implements Backend {
  persistent = true;
  constructor(private db: IDBDatabase) {}
  private store(name: string, mode: IDBTransactionMode = 'readonly') {
    return this.db.transaction(name, mode).objectStore(name);
  }
  alleReisen() {
    return req(this.store('reisen').getAll()) as Promise<Reise[]>;
  }
  async speichereReise(r: Reise) {
    await req(this.store('reisen', 'readwrite').put(r));
  }
  async loescheReise(id: string) {
    await req(this.store('reisen', 'readwrite').delete(id));
  }
  datei(id: string) {
    return req(this.store('dateien').get(id)) as Promise<DateiEintrag | undefined>;
  }
  async speichereDatei(d: DateiEintrag) {
    await req(this.store('dateien', 'readwrite').put(d));
  }
  async loescheDatei(id: string) {
    await req(this.store('dateien', 'readwrite').delete(id));
  }
  async alleDateiIds() {
    return (await req(this.store('dateien').getAllKeys())) as string[];
  }
  async meta<T>(key: MetaKey) {
    const row = (await req(this.store('meta').get(key))) as { key: string; value: T } | undefined;
    return row?.value;
  }
  async setzeMeta<T>(key: MetaKey, value: T) {
    await req(this.store('meta', 'readwrite').put({ key, value }));
  }
  async abschliessen(r: Reise, jahr: number, format: (n: number) => string, mindestens: number) {
    const tx = this.db.transaction(['reisen', 'meta'], 'readwrite');
    const meta = tx.objectStore('meta');
    const row = (await req(meta.get('zaehler'))) as { key: string; value: Record<string, number> } | undefined;
    const zaehler = { ...(row?.value ?? {}) };
    const n = Math.max(zaehler[jahr] ?? 0, mindestens) + 1;
    zaehler[jahr] = n;
    const fertig: Reise = { ...r, nummer: format(n) };
    meta.put({ key: 'zaehler', value: zaehler });
    tx.objectStore('reisen').put(fertig);
    await txDone(tx);
    return fertig;
  }
  async allesLoeschen() {
    const tx = this.db.transaction(['reisen', 'dateien', 'meta'], 'readwrite');
    tx.objectStore('reisen').clear();
    tx.objectStore('dateien').clear();
    tx.objectStore('meta').clear();
    await txDone(tx);
  }
}

class MemoryBackend implements Backend {
  persistent = false;
  reisen = new Map<string, Reise>();
  dateien = new Map<string, DateiEintrag>();
  metaMap = new Map<string, unknown>();
  async alleReisen() {
    return [...this.reisen.values()].map((r) => structuredClone(r));
  }
  async speichereReise(r: Reise) {
    this.reisen.set(r.id, structuredClone(r));
  }
  async loescheReise(id: string) {
    this.reisen.delete(id);
  }
  async datei(id: string) {
    return this.dateien.get(id);
  }
  async speichereDatei(d: DateiEintrag) {
    this.dateien.set(d.id, d);
  }
  async loescheDatei(id: string) {
    this.dateien.delete(id);
  }
  async alleDateiIds() {
    return [...this.dateien.keys()];
  }
  async meta<T>(key: MetaKey) {
    return this.metaMap.get(key) as T | undefined;
  }
  async setzeMeta<T>(key: MetaKey, value: T) {
    this.metaMap.set(key, value);
  }
  async abschliessen(r: Reise, jahr: number, format: (n: number) => string, mindestens: number) {
    const zaehler = { ...((this.metaMap.get('zaehler') as Record<string, number>) ?? {}) };
    const n = Math.max(zaehler[jahr] ?? 0, mindestens) + 1;
    zaehler[jahr] = n;
    this.metaMap.set('zaehler', zaehler);
    const fertig = { ...r, nummer: format(n) };
    this.reisen.set(r.id, structuredClone(fertig));
    return fertig;
  }
  async allesLoeschen() {
    this.reisen.clear();
    this.dateien.clear();
    this.metaMap.clear();
  }
}

let backend: Promise<Backend> | null = null;

export function db(): Promise<Backend> {
  if (!backend) {
    backend = (async () => {
      try {
        if (typeof indexedDB === 'undefined') throw new Error('kein IndexedDB');
        const d = await openDb();
        // Probe-Schreibzugriff (manche Umgebungen öffnen, verweigern aber das Schreiben)
        const b = new IdbBackend(d);
        await b.setzeMeta('zaehler', (await b.meta('zaehler')) ?? {});
        try {
          await navigator.storage?.persist?.();
        } catch {
          /* optional */
        }
        return b;
      } catch {
        return new MemoryBackend();
      }
    })();
  }
  return backend;
}

export type { Backend, MetaKey };
export type { Einstellungen };
