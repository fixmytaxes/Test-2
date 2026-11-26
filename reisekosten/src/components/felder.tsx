import { useEffect, useRef, useState } from 'react';
import type { Anhang, Betragszeile, Bezahlt, Ort, UstKey } from '../types';
import { useStore } from '../store';
import { fmtGroesse, istBild, istPdf } from '../lib/images';
import { android, blobZuBase64 } from '../lib/plattform';
import { fmtEUR, sumBrutto, UST_LABEL } from '../lib/money';
import { CountrySelect, Field, Icon, MoneyInput, Segmented, Select, TextInput } from './ui';

/** Belege/Dokumente: Datei hochladen oder mit der Kamera fotografieren */
export function Anhaenge({ werte, onChange, ro, label = 'Belege', pflichtHinweis }: { werte: Anhang[]; onChange: (a: Anhang[]) => void; ro?: boolean; label?: string; pflichtHinweis?: boolean }) {
  const { speichereDatei, ladeDatei, toast } = useStore();
  const datei = useRef<HTMLInputElement>(null);
  const kamera = useRef<HTMLInputElement>(null);
  const [laedt, setLaedt] = useState(false);

  const hinzu = async (files: FileList | null) => {
    if (!files?.length) return;
    setLaedt(true);
    try {
      const neu: Anhang[] = [];
      for (const f of Array.from(files)) {
        if (f.size > 25 * 1024 * 1024) {
          toast(`${f.name} ist größer als 25 MB und wurde nicht übernommen.`, 'fehler');
          continue;
        }
        const { anhang, hinweis } = await speichereDatei(f);
        if (hinweis) toast(hinweis, 'fehler');
        neu.push(anhang);
      }
      if (neu.length) onChange([...werte, ...neu]);
    } catch (e) {
      toast('Datei konnte nicht gespeichert werden: ' + (e as Error).message, 'fehler');
    } finally {
      setLaedt(false);
      if (datei.current) datei.current.value = '';
      if (kamera.current) kamera.current.value = '';
    }
  };

  return (
    <div className="anhaenge">
      <div className="anhaenge-kopf">
        <span className="anhaenge-label">
          <Icon name="clip" size={15} /> {label}
          {pflichtHinweis && !werte.length && <span className="fehlt">fehlt</span>}
        </span>
        {!ro && (
          <div className="anhaenge-btns">
            <button type="button" className="btn btn-klein" onClick={() => kamera.current?.click()} disabled={laedt}>
              <Icon name="camera" size={16} /> Foto
            </button>
            <button type="button" className="btn btn-klein" onClick={() => datei.current?.click()} disabled={laedt}>
              <Icon name="file" size={16} /> Datei
            </button>
            <input ref={kamera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => hinzu(e.target.files)} />
            <input ref={datei} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => hinzu(e.target.files)} />
          </div>
        )}
      </div>
      {laedt && <div className="anhaenge-laedt">Wird gespeichert …</div>}
      {werte.length > 0 && (
        <ul className="anhang-liste">
          {werte.map((a) => (
            <AnhangKachel key={a.id} a={a} ladeDatei={ladeDatei} onRemove={ro ? undefined : () => onChange(werte.filter((x) => x.id !== a.id))} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AnhangKachel({ a, ladeDatei, onRemove }: { a: Anhang; ladeDatei: (id: string) => Promise<Blob | undefined>; onRemove?: () => void }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let u: string | undefined;
    let aktiv = true;
    void ladeDatei(a.id).then((b) => {
      if (b && aktiv) {
        u = URL.createObjectURL(b);
        setUrl(u);
      }
    });
    return () => {
      aktiv = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [a.id, ladeDatei]);
  return (
    <li className="anhang">
      <a
        className="anhang-link"
        href={url}
        target="_blank"
        rel="noreferrer"
        title={`${a.name} öffnen`}
        onClick={(ev) => {
          const app = android();
          if (!app) return;
          ev.preventDefault();
          void ladeDatei(a.id).then(async (b) => b && app.openFile(a.name, a.typ || b.type, await blobZuBase64(b)));
        }}
      >
        {istBild(a.typ) && url ? <img src={url} alt="" /> : <span className="anhang-typ">{istPdf(a.typ) ? 'PDF' : <Icon name="file" />}</span>}
        <span className="anhang-name">
          {a.name}
          <small>{fmtGroesse(a.groesse)}</small>
        </span>
      </a>
      {onRemove && (
        <button type="button" className="icon-btn" onClick={onRemove} aria-label={`${a.name} entfernen`}>
          <Icon name="x" size={16} />
        </button>
      )}
    </li>
  );
}

const UST_OPTIONEN: { value: UstKey; label: string }[] = (['19', '7', '0', 'ausl'] as UstKey[]).map((k) => ({ value: k, label: UST_LABEL[k] }));

/** Bruttobetrag mit Umsatzsteuersatz; optional auf mehrere Steuersätze aufteilbar */
export function BetragEditor({ werte, onChange, standardUst, label = 'Betrag (brutto)', pflicht = true, hinweis }: { werte: Betragszeile[]; onChange: (b: Betragszeile[]) => void; standardUst: UstKey; label?: string; pflicht?: boolean; hinweis?: string }) {
  const zeilen = werte.length ? werte : [{ ust: standardUst, bruttoCent: 0 }];
  const setze = (i: number, z: Partial<Betragszeile>) => onChange(zeilen.map((x, j) => (i === j ? { ...x, ...z } : x)));
  return (
    <div className="betrag-editor">
      {zeilen.map((z, i) => (
        <div className="betrag-zeile" key={i}>
          <Field label={i === 0 ? label : `Teilbetrag ${i + 1}`} pflicht={pflicht && i === 0} hinweis={i === 0 ? hinweis : undefined}>
            {(id) => <MoneyInput id={id} value={z.bruttoCent} onChange={(c) => setze(i, { bruttoCent: c })} placeholder="0,00" />}
          </Field>
          <Field label="Umsatzsteuer">{(id) => <Select id={id} value={z.ust} onChange={(v) => setze(i, { ust: v })} options={UST_OPTIONEN} />}</Field>
          {zeilen.length > 1 && (
            <button type="button" className="icon-btn betrag-weg" aria-label="Teilbetrag entfernen" onClick={() => onChange(zeilen.filter((_, j) => j !== i))}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      ))}
      <div className="betrag-fuss">
        <button type="button" className="link-btn" onClick={() => onChange([...zeilen, { ust: zeilen[0].ust === '19' ? '7' : '19', bruttoCent: 0 }])}>
          <Icon name="plus" size={14} /> Weiteren Steuersatz
        </button>
        {zeilen.length > 1 && <span className="betrag-summe">Summe {fmtEUR(sumBrutto(zeilen))}</span>}
      </div>
    </div>
  );
}

export function BezahltWahl({ value, onChange }: { value: Bezahlt; onChange: (v: Bezahlt) => void }) {
  return (
    <Field label="Bezahlt">
      {() => (
        <Segmented
          klein
          label="Bezahlt"
          value={value}
          onChange={onChange}
          options={[
            { value: 'privat', label: 'Privat verauslagt' },
            { value: 'firma', label: 'Firmenkarte/-konto' },
          ]}
        />
      )}
    </Field>
  );
}

/** Ortsangabe: Ort und Land, optional mit Anschrift */
export function OrtFelder({ ort, onChange, pflicht, mitAdresse, kurz, labelOrt = 'Ort', mitBezeichnung, liste }: { ort: Ort; onChange: (o: Ort) => void; pflicht?: boolean; mitAdresse?: boolean; kurz?: boolean; labelOrt?: string; mitBezeichnung?: string; liste?: string }) {
  const [adresse, setAdresse] = useState(!!(mitAdresse || ort.strasse || ort.plz));
  const set = (p: Partial<Ort>) => onChange({ ...ort, ...p });
  return (
    <div className="ort-felder">
      {mitBezeichnung && (
        <Field label={mitBezeichnung} className="span-2">
          {(id) => <TextInput id={id} value={ort.bezeichnung} onChange={(v) => set({ bezeichnung: v })} placeholder="z. B. Firma, Hotel, Messegelände" />}
        </Field>
      )}
      {adresse && (
        <Field label="Straße, Hausnr." className="span-2">
          {(id) => <TextInput id={id} value={ort.strasse} onChange={(v) => set({ strasse: v })} autoComplete="street-address" />}
        </Field>
      )}
      <div className="ort-zeile">
        {adresse && (
          <Field label="PLZ" className="plz">
            {(id) => <TextInput id={id} value={ort.plz} onChange={(v) => set({ plz: v })} inputMode="numeric" autoComplete="postal-code" />}
          </Field>
        )}
        <Field label={labelOrt} pflicht={pflicht} className="ort">
          {(id) => <TextInput id={id} value={ort.ort} onChange={(v) => set({ ort: v })} list={liste} autoComplete="address-level2" />}
        </Field>
        <Field label="Land" pflicht={pflicht} className="land">
          {(id) => <CountrySelect id={id} value={ort.land || 'DE'} onChange={(v) => set({ land: v })} />}
        </Field>
      </div>
      {!adresse && !kurz && (
        <button type="button" className="link-btn" onClick={() => setAdresse(true)}>
          <Icon name="plus" size={14} /> Anschrift ergänzen
        </button>
      )}
    </div>
  );
}

export function mapsLink(von: Ort, nach: Ort): string {
  const t = (o: Ort) => [o.strasse, [o.plz, o.ort].filter(Boolean).join(' '), o.land].filter(Boolean).join(', ');
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(t(von))}&destination=${encodeURIComponent(t(nach))}`;
}
