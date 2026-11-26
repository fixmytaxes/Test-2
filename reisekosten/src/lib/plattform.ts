// Brücke zur Android-App (WebView). In der Android-App stellt die native Hülle window.ReisekostenAndroid bereit:
// Dateien speichern (Android-Dateidialog), mit einer anderen App öffnen (z. B. PDF-Viewer) und per
// E-Mail-App teilen (Empfänger, Betreff und Anhänge vorbelegt).
export interface AndroidBruecke {
  saveFile(name: string, mime: string, base64: string): void;
  openFile(name: string, mime: string, base64: string): void;
  /** JSON: { files: [{ name, mime, base64 }], subject, text, email } – true, wenn ein Ziel gewählt werden konnte */
  shareFiles(json: string): boolean;
  appVersion?(): string;
}

declare global {
  interface Window {
    ReisekostenAndroid?: AndroidBruecke;
    /** Zurück-Taste unter Android: true, wenn die App den Schritt selbst behandelt hat */
    __reisekostenBack?: () => boolean;
  }
}

export const android = (): AndroidBruecke | undefined => (typeof window !== 'undefined' ? window.ReisekostenAndroid : undefined);
export const istAndroid = (): boolean => !!android();

export function blobZuBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] ?? '');
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(b);
  });
}

/** Zurück-Taste: erst offene Dialoge schließen, dann eine Seite zurück, auf der Übersicht die App verlassen */
export function zurueckTasteEinrichten() {
  window.__reisekostenBack = () => {
    if (document.querySelector('.modal')) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      return true;
    }
    const h = location.hash.replace(/^#\/?/, '');
    if (!h) return false;
    if (history.length > 1) history.back();
    else location.hash = '#/';
    return true;
  };
}
