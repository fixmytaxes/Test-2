import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Reise, StartTyp } from '../types';
import { useStore } from '../store';
import { fmtDate, fmtDateTime, fmtIsoLocal } from '../lib/dates';
import { STATUS_LABEL } from '../lib/defaults';
import { fmtEUR, UST_LABEL } from '../lib/money';
import { BEREICH_LABEL, berechne, type Abrechnung } from '../lib/totals';
import { pruefeReise, type Pruefung } from '../lib/validation';
import { Anhaenge, OrtFelder } from '../components/felder';
import { Badge, Field, Hinweis, Icon, Modal, Section, Segmented, TextArea, TextInput } from '../components/ui';
import { navigate } from '../router';
import { PdfButtons, SendenDialog, StornoDialog } from './editor/Aktionen';
import { Bewirtungen, Korrekturen, WeitereKosten } from './editor/Kosten';
import { Strecken } from './editor/Strecken';
import { Uebernachtungen } from './editor/Uebernachtungen';
import { Verpflegung } from './editor/Verpflegung';

export const STATUS_BADGE: Record<Reise['status'], 'neutral' | 'ok' | 'warn' | 'info' | 'aus'> = {
  entwurf: 'warn',
  abgeschlossen: 'info',
  eingereicht: 'ok',
  storniert: 'aus',
};

export function ReiseEditor({ id }: { id: string }) {
  const store = useStore();
  const { einstellungen: e } = store;
  const gespeichert = store.reisen.find((x) => x.id === id);
  const [r, setR] = useState<Reise | undefined>(gespeichert);
  const [dialog, setDialog] = useState<null | 'abschluss' | 'senden' | 'storno' | 'stornoSenden' | 'loeschen'>(null);
  const timer = useRef<number>();
  const offen = useRef<Reise>();

  // Bei Statuswechsel (Abschluss, Versand, Storno) gespeicherte Fassung übernehmen
  useEffect(() => {
    setR(gespeichert);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, gespeichert?.status, gespeichert?.nummer, gespeichert?.versand?.length, !!gespeichert]);

  const speichern = useCallback(async () => {
    window.clearTimeout(timer.current);
    const x = offen.current;
    offen.current = undefined;
    if (x) {
      try {
        await store.speichereReise(x);
      } catch (err) {
        store.toast((err as Error).message, 'fehler');
      }
    }
  }, [store]);

  useEffect(() => () => void speichern(), [speichern]);

  const update = useCallback(
    (fn: (r: Reise) => Reise) => {
      setR((prev) => {
        if (!prev || prev.status !== 'entwurf') return prev;
        const n = fn(prev);
        offen.current = n;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void speichern(), 450);
        return n;
      });
    },
    [speichern],
  );

  const a = useMemo(() => (r ? berechne(r, e) : undefined), [r, e]);
  const pruefung = useMemo(() => (r ? pruefeReise(r, e) : undefined), [r, e]);

  if (!store.bereit) return null;
  if (!r || !a || !pruefung) {
    return (
      <div className="seite">
        <Hinweis art="warn">Diese Reise wurde nicht gefunden.</Hinweis>
        <a className="btn" href="#/reisen">
          Zur Liste
        </a>
      </div>
    );
  }

  const ro = r.status !== 'entwurf';
  const set = (p: Partial<Reise>) => update((x) => ({ ...x, ...p }));

  return (
    <div className="seite editor">
      <div className="editor-kopf">
        <button type="button" className="icon-btn" onClick={() => navigate('/reisen')} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <div className="editor-titel">
          <h1>{r.name || 'Neue Reise'}</h1>
          <div className="editor-meta">
            <Badge art={STATUS_BADGE[r.status]} icon={r.status === 'entwurf' ? 'edit' : r.status === 'storniert' ? 'x' : 'lock'}>
              {STATUS_LABEL[r.status]}
            </Badge>
            {r.nummer && <span className="nummer">Nr. {r.nummer}</span>}
            {r.ersetzt && <span className="muted">ersetzt Nr. {r.ersetzt}</span>}
          </div>
        </div>
      </div>

      {ro && <StatusBanner r={r} onSenden={() => setDialog('senden')} onStorno={() => setDialog('storno')} onStornoSenden={() => setDialog('stornoSenden')} />}

      <div className="editor-raster">
        <fieldset className="editor-felder" disabled={ro}>
          <Section id="sec-reise" titel="Reisedaten" icon="pin" untertitel="Name, Anlass, Ziel und Startpunkt">
            <Field label="Name der Reise" pflicht>
              {(fid) => <TextInput id={fid} value={r.name} onChange={(v) => set({ name: v })} placeholder="z. B. Fachkongress Innsbruck" />}
            </Field>
            <Field label="Anlass der Reise (betrieblicher Zweck)" pflicht hinweis="Konkret: Kunde, Projekt, Veranstaltung – Grundlage für die betriebliche Veranlassung.">
              {(fid) => <TextArea id={fid} value={r.anlass} onChange={(v) => set({ anlass: v })} rows={2} placeholder="z. B. Teilnahme am Steuerfachkongress, Besprechung mit Mandant XY" />}
            </Field>
            <Anhaenge werte={r.anlassDokumente} onChange={(d) => set({ anlassDokumente: d })} ro={ro} label="Nachweis des Anlasses (optional: Einladung, Programm, Broschüre)" />
            <fieldset className="gruppe">
              <legend>
                Reiseziel <span className="muted">(Tätigkeitsort)</span>
              </legend>
              <OrtFelder ort={r.ziel} onChange={(o) => set({ ziel: o })} pflicht mitAdresse mitBezeichnung="Bezeichnung (Kunde, Veranstaltung, Messe)" />
            </fieldset>
            <Field label="Startpunkt der Reise">
              {() => (
                <Segmented<StartTyp>
                  klein
                  label="Startpunkt"
                  value={r.start.typ}
                  onChange={(v) => set({ start: { typ: v, ort: v === 'abweichend' ? r.start.ort ?? { ort: '', land: 'DE' } : r.start.ort } })}
                  options={[
                    { value: 'firmensitz', label: 'Firmensitz' },
                    { value: 'wohnung', label: 'Wohnung' },
                    { value: 'abweichend', label: 'Abweichend' },
                  ]}
                />
              )}
            </Field>
            {r.start.typ === 'abweichend' ? (
              <OrtFelder ort={r.start.ort ?? { ort: '', land: 'DE' }} onChange={(o) => set({ start: { typ: 'abweichend', ort: o } })} pflicht mitAdresse />
            ) : (
              <p className="klein-hinweis">
                {r.start.typ === 'firmensitz'
                  ? e.firma.ort
                    ? `${e.firma.name}, ${e.firma.strasse}, ${e.firma.plz} ${e.firma.ort}`
                    : 'Firmensitz bitte in den Einstellungen hinterlegen.'
                  : e.wohnung.ort
                    ? `${e.wohnung.strasse}, ${e.wohnung.plz} ${e.wohnung.ort}`
                    : 'Wohnanschrift bitte in den Einstellungen hinterlegen.'}
              </p>
            )}
            <div className="grid-2">
              <Field label="Kostenstelle / Projekt">{(fid) => <TextInput id={fid} value={r.kostenstelle} onChange={(v) => set({ kostenstelle: v })} />}</Field>
              <Field label="Bemerkung">{(fid) => <TextInput id={fid} value={r.notiz} onChange={(v) => set({ notiz: v })} />}</Field>
            </div>
          </Section>

          <Strecken r={r} e={e} ro={ro} update={update} />
          <Uebernachtungen r={r} ro={ro} update={update} />
          <Verpflegung r={r} vma={a.vma} ctx={a.ctx} ro={ro} update={update} />
          <WeitereKosten r={r} ro={ro} update={update} />
          <Bewirtungen r={r} ro={ro} update={update} />
          <Korrekturen r={r} ro={ro} update={update} />
        </fieldset>

        <aside className="editor-seite">
          <Zusammenfassung a={a} pruefung={ro ? undefined : pruefung} />
          <div className="seite-aktionen">
            <PdfButtons r={r} />
            {r.status === 'entwurf' && (
              <>
                <button type="button" className="btn btn-primaer btn-gross" onClick={() => setDialog('abschluss')} disabled={pruefung.fehler.length > 0}>
                  <Icon name="lock" /> Abrechnung abschließen
                </button>
                <button type="button" className="btn btn-text-gefahr" onClick={() => setDialog('loeschen')}>
                  <Icon name="trash" /> Entwurf löschen
                </button>
              </>
            )}
          </div>
          {r.versand.length > 0 && <Versandprotokoll r={r} />}
        </aside>
      </div>

      {r.status === 'entwurf' && (
        <div className="abschluss-leiste">
          <div>
            <small>Gesamt</small>
            <strong>{fmtEUR(a.summen.gesamtBrutto)}</strong>
          </div>
          <div>
            <small>Auszahlung</small>
            <strong>{fmtEUR(a.summen.auszahlungCent)}</strong>
          </div>
          <button
            type="button"
            className="btn btn-primaer"
            onClick={() => {
              if (pruefung.fehler.length) document.getElementById('zusammenfassung')?.scrollIntoView({ behavior: 'smooth' });
              else setDialog('abschluss');
            }}
          >
            {pruefung.fehler.length ? (
              <>
                <Icon name="alert" /> {pruefung.fehler.length} offen
              </>
            ) : (
              <>
                <Icon name="lock" /> Abschließen
              </>
            )}
          </button>
        </div>
      )}

      {dialog === 'abschluss' && (
        <AbschlussDialog
          r={r}
          a={a}
          pruefung={pruefung}
          onClose={() => setDialog(null)}
          onDone={async () => {
            await speichern();
            try {
              const fertig = await store.abschliessen(r.id);
              store.toast(`Abrechnung ${fertig.nummer} abgeschlossen`, 'ok');
              setDialog('senden');
            } catch (err) {
              store.toast((err as Error).message, 'fehler');
              setDialog(null);
            }
          }}
        />
      )}
      {dialog === 'senden' && <SendenDialog r={store.reisen.find((x) => x.id === r.id) ?? r} onClose={() => setDialog(null)} />}
      {dialog === 'stornoSenden' && <SendenDialog r={r} storno onClose={() => setDialog(null)} />}
      {dialog === 'storno' && (
        <StornoDialog
          r={r}
          onClose={() => setDialog(null)}
          onDone={(neuId) => {
            setDialog(null);
            if (neuId) navigate('/reise/' + neuId);
          }}
        />
      )}
      {dialog === 'loeschen' && (
        <Modal
          titel="Entwurf löschen?"
          onClose={() => setDialog(null)}
          aktionen={
            <>
              <button type="button" className="btn" onClick={() => setDialog(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-gefahr"
                onClick={async () => {
                  offen.current = undefined;
                  window.clearTimeout(timer.current);
                  await store.loescheReise(r.id);
                  store.toast('Entwurf gelöscht');
                  navigate('/reisen');
                }}
              >
                Löschen
              </button>
            </>
          }
        >
          <p>Der Entwurf „{r.name || 'Neue Reise'}“ und seine Belege werden endgültig gelöscht.</p>
        </Modal>
      )}
    </div>
  );
}

function StatusBanner({ r, onSenden, onStorno, onStornoSenden }: { r: Reise; onSenden: () => void; onStorno: () => void; onStornoSenden: () => void }) {
  const stornoGesendet = r.versand.some((v) => v.storno);
  const warEingereicht = r.versand.some((v) => !v.storno && (v.weg === 'email' || v.weg === 'manuell'));
  return (
    <div className={`status-banner status-${r.status}`}>
      <div className="status-text">
        <Icon name={r.status === 'storniert' ? 'x' : 'lock'} />
        <div>
          {r.status === 'abgeschlossen' && (
            <>
              <strong>Abgeschlossen am {fmtIsoLocal(r.abgeschlossenAm)}</strong>
              <span>Noch nicht eingereicht. Die Abrechnung ist unveränderbar – Korrekturen nur über Storno.</span>
            </>
          )}
          {r.status === 'eingereicht' && (
            <>
              <strong>Eingereicht am {fmtIsoLocal(r.eingereichtAm)}</strong>
              <span>Abgeschlossen am {fmtIsoLocal(r.abgeschlossenAm)} · unveränderbar</span>
            </>
          )}
          {r.status === 'storniert' && (
            <>
              <strong>Storniert am {fmtIsoLocal(r.storniertAm)}</strong>
              <span>Grund: {r.stornoGrund}</span>
            </>
          )}
        </div>
      </div>
      <div className="status-aktionen">
        {r.status === 'abgeschlossen' && (
          <button type="button" className="btn btn-primaer" onClick={onSenden}>
            <Icon name="send" /> An DATEV senden
          </button>
        )}
        {r.status === 'eingereicht' && (
          <button type="button" className="btn" onClick={onSenden}>
            <Icon name="send" /> Erneut senden
          </button>
        )}
        {(r.status === 'abgeschlossen' || r.status === 'eingereicht') && (
          <button type="button" className="btn btn-text-gefahr" onClick={onStorno}>
            <Icon name="undo" /> Stornieren
          </button>
        )}
        {r.status === 'storniert' && (
          <>
            <PdfButtons r={r} storno />
            <button type="button" className={warEingereicht && !stornoGesendet ? 'btn btn-primaer' : 'btn'} onClick={onStornoSenden}>
              <Icon name="send" /> Stornobeleg an DATEV
            </button>
            {r.ersetztDurch && (
              <a className="btn" href={'#/reise/' + r.ersetztDurch}>
                <Icon name="arrow" /> Zur neuen Abrechnung
              </a>
            )}
          </>
        )}
      </div>
      {r.status === 'storniert' && warEingereicht && !stornoGesendet && <Hinweis art="warn">Die ursprüngliche Abrechnung wurde eingereicht – bitte den Stornobeleg an DATEV senden.</Hinweis>}
    </div>
  );
}

function Zusammenfassung({ a, pruefung }: { a: Abrechnung; pruefung?: Pruefung }) {
  const s = a.summen;
  const springe = (ziel?: string) => {
    if (!ziel) return;
    if (ziel === 'einstellungen') return navigate('/einstellungen');
    const el = document.getElementById(ziel);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('blink');
    setTimeout(() => el?.classList.remove('blink'), 1600);
  };
  return (
    <div className="zusammenfassung" id="zusammenfassung">
      <h2>Abrechnung</h2>
      {a.beginn && (
        <p className="muted zeitraum">
          {fmtDateTime(a.beginn)} – {fmtDateTime(a.ende)}
        </p>
      )}
      <dl className="summen">
        {(['fahrt', 'uebernachtung', 'vma', 'sonstige'] as const).map((b) => (
          <div key={b}>
            <dt>{BEREICH_LABEL[b]}</dt>
            <dd>{fmtEUR(s.bereiche[b])}</dd>
          </div>
        ))}
        {s.korrekturenCent > 0 && (
          <div>
            <dt>Kürzungen/Erstattungen</dt>
            <dd>− {fmtEUR(s.korrekturenCent)}</dd>
          </div>
        )}
        <div className="summe">
          <dt>Reisekosten</dt>
          <dd>{fmtEUR(s.reisekostenNachKorrektur)}</dd>
        </div>
        <div>
          <dt>Bewirtung (gesondert)</dt>
          <dd>{fmtEUR(s.bereiche.bewirtung)}</dd>
        </div>
        {s.vorschussCent > 0 && (
          <div>
            <dt>Vorschuss</dt>
            <dd>− {fmtEUR(s.vorschussCent)}</dd>
          </div>
        )}
        {s.firmaCent > 0 && (
          <div>
            <dt>Von Firma bezahlt</dt>
            <dd>{fmtEUR(s.firmaCent)}</dd>
          </div>
        )}
        <div className="summe gross">
          <dt>{s.auszahlungCent >= 0 ? 'Auszahlung an Reisenden' : 'Rückzahlung'}</dt>
          <dd>{fmtEUR(Math.abs(s.auszahlungCent))}</dd>
        </div>
      </dl>
      {s.ustReise.some((u) => u.steuer) && (
        <details className="ust-details">
          <summary>Vorsteuer {fmtEUR(s.vorsteuerReise + s.bewirtung.vorsteuerCent)}</summary>
          <ul>
            {s.ustReise.map((u) => (
              <li key={u.ust}>
                {UST_LABEL[u.ust]}: netto {fmtEUR(u.netto)}, USt {fmtEUR(u.steuer)}
              </li>
            ))}
            {s.bewirtung.bruttoCent > 0 && (
              <li>
                Bewirtung: Vorsteuer {fmtEUR(s.bewirtung.vorsteuerCent)}, 70 % abziehbar {fmtEUR(s.bewirtung.abziehbarCent)}
              </li>
            )}
          </ul>
        </details>
      )}
      {pruefung && (
        <div className="pruefung">
          {pruefung.fehler.length === 0 ? (
            <Hinweis art="ok">Alle Pflichtangaben vollständig.</Hinweis>
          ) : (
            <div className="pruefung-liste fehler">
              <strong>
                <Icon name="alert" size={15} /> Fehlende Pflichtangaben
              </strong>
              <ul>
                {pruefung.fehler.map((f, i) => (
                  <li key={i}>
                    <button type="button" className="link-btn" onClick={() => springe(f.ziel)}>
                      {f.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pruefung.warnungen.length > 0 && (
            <div className="pruefung-liste warn">
              <strong>
                <Icon name="info" size={15} /> Hinweise
              </strong>
              <ul>
                {pruefung.warnungen.map((f, i) => (
                  <li key={i}>
                    <button type="button" className="link-btn" onClick={() => springe(f.ziel)}>
                      {f.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AbschlussDialog({ r, a, pruefung, onClose, onDone }: { r: Reise; a: Abrechnung; pruefung: Pruefung; onClose: () => void; onDone: () => void }) {
  const [laeuft, setLaeuft] = useState(false);
  return (
    <Modal
      titel="Abrechnung abschließen"
      onClose={onClose}
      aktionen={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-primaer"
            disabled={laeuft}
            onClick={() => {
              setLaeuft(true);
              onDone();
            }}
          >
            <Icon name="lock" /> Endgültig abschließen
          </button>
        </>
      }
    >
      <p>
        „{r.name}“ erhält eine fortlaufende Abrechnungsnummer und das Abrechnungsdatum {fmtDate(new Date().toISOString())}. Danach sind keine Änderungen mehr möglich – nur Storno und Neuerstellung.
      </p>
      <dl className="summen kompakt">
        <div>
          <dt>Reisekosten</dt>
          <dd>{fmtEUR(a.summen.reisekostenNachKorrektur)}</dd>
        </div>
        <div>
          <dt>Bewirtung</dt>
          <dd>{fmtEUR(a.summen.bereiche.bewirtung)}</dd>
        </div>
        <div className="summe">
          <dt>Auszahlung</dt>
          <dd>{fmtEUR(a.summen.auszahlungCent)}</dd>
        </div>
      </dl>
      {pruefung.warnungen.length > 0 && (
        <Hinweis art="warn">
          <strong>{pruefung.warnungen.length} Hinweis(e):</strong>
          <ul>
            {pruefung.warnungen.slice(0, 6).map((w, i) => (
              <li key={i}>{w.text}</li>
            ))}
          </ul>
        </Hinweis>
      )}
    </Modal>
  );
}

function Versandprotokoll({ r }: { r: Reise }) {
  const WEG = { email: 'E-Mail', teilen: 'Geteilt', download: 'Heruntergeladen', manuell: 'Als eingereicht markiert' };
  return (
    <div className="protokoll">
      <h3>Versandprotokoll</h3>
      <ul>
        {[...r.versand].reverse().map((v, i) => (
          <li key={i}>
            <strong>
              {v.storno ? 'Storno · ' : ''}
              {WEG[v.weg]}
            </strong>
            <span>
              {fmtIsoLocal(v.zeitpunkt)}
              {v.empfaenger ? ' · ' + v.empfaenger : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
