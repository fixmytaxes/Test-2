// Bereitet hochgeladene oder fotografierte Belege auf: Fotos werden verkleinert und als JPEG gespeichert,
// damit Speicher, PDF und E-Mail (DATEV-Upload-Mail: max. 20 MB) klein bleiben.
const MAX_SEITE = 2200;
const QUALITAET = 0.85;

export interface Aufbereitet {
  blob: Blob;
  name: string;
  typ: string;
  hinweis?: string;
}

function ladeBild(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Bild konnte nicht gelesen werden'));
    };
    img.src = url;
  });
}

export async function aufbereiten(file: File): Promise<Aufbereitet> {
  const typ = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
  if (!typ.startsWith('image/') || typ === 'image/svg+xml' || typ === 'image/gif') {
    return { blob: file, name: file.name, typ: typ || 'application/octet-stream' };
  }
  try {
    const img = await ladeBild(file);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(1, MAX_SEITE / Math.max(w, h));
    const klein = typ === 'image/jpeg' && scale === 1 && file.size < 1_500_000;
    if (klein) return { blob: file, name: file.name, typ };
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITAET));
    if (!blob) throw new Error('Umwandlung fehlgeschlagen');
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return { blob, name, typ: 'image/jpeg' };
  } catch {
    return {
      blob: file,
      name: file.name,
      typ,
      hinweis: 'Das Bildformat kann nicht umgewandelt werden und erscheint ggf. nicht im PDF. Bitte als JPEG/PNG oder PDF hochladen.',
    };
  }
}

export const istBild = (typ: string) => typ.startsWith('image/');
export const istPdf = (typ: string) => typ === 'application/pdf';

export function fmtGroesse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
