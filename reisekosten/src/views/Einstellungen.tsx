import { useMemo, useRef, useState } from 'react';
import type { Einstellungen as E, KmFahrzeug, KontoKey } from '../types';
import { useStore } from '../store';
import { countryOptions } from '../data/countries';
import { sicherungEinlesen, sicherungErstellen } from '../lib/backup';
import { KM_LABEL, KONTO_LABEL, standardKonten } from '../lib/defaults';
import { herunterladen, serverStatus } from '../lib/export';
import { fmtEUR, fmtNum2 } from '../lib/money';
import { alleTabellen, EINGEBAUTE_TABELLEN, INLAND_GESETZLICH, parseTabelle } from '../lib/rates';
import { normalize } from '../lib/util';
import { Checkbox, CountrySelect, DecimalInput, Field, Hinweis, Icon, Modal, MoneyInput, Section, Segmented, TextArea, TextInput } from '../components/ui';

export function Einstellungen() {
  const store = useStore();
  const e = store.einstellungen;
  const aendern = (fn: (x: E) => E) => void store.setzeEinstellungen(fn(store.einstellungen));

  const firma = (p: Partial<E['firma']>) => aendern((x) => ({ ...x, firma: { ...x.firma, ...p } }));
  const reisender = (p: Partial<E['reisender']>) => aendern((x) => ({ ...x, reisender: { ...x.reisender, ...p } }));
  const datev = (p: Partial<E['datev']>) => aendern((x) => ({ ...x, datev: { ...x.datev, ...p } }));

  return (
    <div className="seite einstellungen">
      <div className="seite-kopf">
        <div>
          <h1>Einstellungen</h1>
          <p className="muted">Änderungen werden automatisch gespeichert. Bereits abgeschlossene Abrechnungen behalten ihre Werte.</p>
        </div>
      </div>
      {!store.persistent && <Hinweis art="fehler">Dieser Browser erlaubt keine dauerhafte Speicherung (z. B. privater Modus). Daten gehen beim Schließen verloren – bitte regelmäßig sichern.</Hinweis>}

      <Section titel="Unternehmen" icon="home" untertitel="Firmensitz – Standard-Startpunkt und Rechnungsempfänger">
        <Field label="Name des Unternehmens" pflicht>
          {(id) => <TextInput id={id} value={e.firma.name} onChange={(v) => firma({ name: v })} autoComplete="organization" />}
        </Field>
        <Field label="Straße, Hausnr.">{(id) => <TextInput id={id} value={e.firma.strasse} onChange={(v) => firma({ strasse: v })} />}</Field>
        <div className="ort-zeile">
          <Field label="PLZ" className="plz">
            {(id) => <TextInput id={id} value={e.firma.plz} onChange={(v) => firma({ plz: v })} inputMode="numeric" />}
          </Field>
          <Field label="Ort" className="ort">
            {(id) => <TextInput id={id} value={e.firma.ort} onChange={(v) => firma({ ort: v })} />}
          </Field>
        </div>
        <div className="grid-2">
          <Field label="USt-IdNr.">{(id) => <TextInput id={id} value={e.firma.ustId} onChange={(v) => firma({ ustId: v.toUpperCase() })} placeholder="DE123456789" />}</Field>
          <Field label="Steuernummer">{(id) => <TextInput id={id} value={e.firma.steuernummer} onChange={(v) => firma({ steuernummer: v })} />}</Field>
        </div>
        {!e.firma.ustId && !e.firma.steuernummer && !e.reisender.steuernummer && <p className="klein-hinweis">Für eine gültige E-Rechnung (EN 16931) wird eine Steuernummer oder USt-IdNr. benötigt.</p>}
      </Section>

      <Section titel="Reisender" icon="users" untertitel="Erscheint auf der Abrechnung; in der E-Rechnung als Rechnungssteller">
        <Field label="Name" pflicht>
          {(id) => <TextInput id={id} value={e.reisender.name} onChange={(v) => reisender({ name: v })} autoComplete="name" />}
        </Field>
        <Field label="Rolle">
          {() => (
            <Segmented
              klein
              label="Rolle"
              value={e.reisender.typ}
              onChange={(v) => aendern((x) => ({ ...x, reisender: { ...x.reisender, typ: v }, konten: standardKonten(x.kontenrahmen, v) }))}
              options={[
                { value: 'unternehmer', label: 'Unternehmer/Inhaber' },
                { value: 'arbeitnehmer', label: 'Geschäftsführer/Arbeitnehmer' },
              ]}
            />
          )}
        </Field>
        <div className="grid-2">
          <Field label="E-Mail">{(id) => <TextInput id={id} type="email" value={e.reisender.email} onChange={(v) => reisender({ email: v })} autoComplete="email" />}</Field>
          <Field label="IBAN für Erstattungen">{(id) => <TextInput id={id} value={e.reisender.iban} onChange={(v) => reisender({ iban: v.toUpperCase() })} placeholder="DE…" />}</Field>
        </div>
        <Field label="Steuernummer des Reisenden (optional)" hinweis="Ohne Angabe wird in der E-Rechnung die Steuernummer des Unternehmens verwendet.">
          {(id) => <TextInput id={id} value={e.reisender.steuernummer} onChange={(v) => reisender({ steuernummer: v })} />}
        </Field>
        <fieldset className="gruppe">
          <legend>Wohnanschrift (für Reisen ab Wohnung)</legend>
          <Field label="Straße, Hausnr.">{(id) => <TextInput id={id} value={e.wohnung.strasse} onChange={(v) => aendern((x) => ({ ...x, wohnung: { ...x.wohnung, strasse: v } }))} />}</Field>
          <div className="ort-zeile">
            <Field label="PLZ" className="plz">
              {(id) => <TextInput id={id} value={e.wohnung.plz} onChange={(v) => aendern((x) => ({ ...x, wohnung: { ...x.wohnung, plz: v } }))} inputMode="numeric" />}
            </Field>
            <Field label="Ort" className="ort">
              {(id) => <TextInput id={id} value={e.wohnung.ort} onChange={(v) => aendern((x) => ({ ...x, wohnung: { ...x.wohnung, ort: v } }))} />}
            </Field>
            <Field label="Land" className="land">
              {(id) => <CountrySelect id={id} value={e.wohnung.land || 'DE'} onChange={(v) => aendern((x) => ({ ...x, wohnung: { ...x.wohnung, land: v } }))} />}
            </Field>
          </div>
        </fieldset>
      </Section>

      <Section titel="Kilometersätze" icon="car" untertitel="Gesetzlich: 0,30 €/km Pkw, 0,20 €/km andere motorbetriebene Fahrzeuge" offen={false}>
        {(Object.keys(KM_LABEL) as KmFahrzeug[]).map((k) => (
          <Field key={k} label={KM_LABEL[k]} hinweis={k === 'fahrrad' ? 'Für Fahrräder gibt es keine gesetzliche Pauschale – ggf. tatsächliche Kosten ansetzen.' : undefined}>
            {(id) => <DecimalInput id={id} value={e.kmSaetze[k] / 100} digits={3} onChange={(v) => aendern((x) => ({ ...x, kmSaetze: { ...x.kmSaetze, [k]: Math.round((v ?? 0) * 10000) / 100 } }))} suffix="€/km" />}
          </Field>
        ))}
        <button type="button" className="link-btn" onClick={() => aendern((x) => ({ ...x, kmSaetze: { pkw: 30, fahrgemeinschaft: 30, motorrad: 20, fahrrad: 0 } }))}>
          <Icon name="undo" size={14} /> Gesetzliche Sätze wiederherstellen
        </button>
      </Section>

      <Pauschalen e={e} aendern={aendern} />

      <Section titel="DATEV Unternehmen online" icon="send" untertitel="Versand der Abrechnung per Upload-Mail">
        <Field label="DATEV Upload-Mail-Adresse" hinweis="In DATEV Unternehmen online (Bereich Belege) die Upload Mail für den Belegtyp „Rechnungseingang“ einrichten. Die Adresse endet auf @uploadmail.datev.de.">
          {(id) => <TextInput id={id} type="email" value={e.datev.email} onChange={(v) => datev({ email: v.trim() })} placeholder="…@uploadmail.datev.de" />}
        </Field>
        <Field label="Kopie an (optional)">{(id) => <TextInput id={id} type="email" value={e.datev.cc} onChange={(v) => datev({ cc: v.trim() })} />}</Field>
        <Field label="Betreff" hinweis="Platzhalter: {nummer}, {reise}, {reisender}">
          {(id) => <TextInput id={id} value={e.datev.betreff} onChange={(v) => datev({ betreff: v })} />}
        </Field>
        <Checkbox checked={e.datev.belegeAnhaengen} onChange={(v) => datev({ belegeAnhaengen: v })} label="Belege als Anlagen in die PDF einbinden" />
        <Checkbox checked={e.datev.xmlSeparat} onChange={(v) => datev({ xmlSeparat: v })} label="XML zusätzlich als eigene Datei senden" hinweis="Die XML steckt bereits in der PDF (ZUGFeRD/Factur-X). Als zusätzliche Datei legt DATEV einen zweiten Beleg an." />
        <ServerEinstellungen e={e} aendern={aendern} />
      </Section>

      <Section titel="Buchhaltung" icon="receipt" untertitel="Kontenvorschläge für Berechnungsteil und E-Rechnung" offen={false}>
        <Field label="Kontenrahmen">
          {() => (
            <Segmented
              klein
              label="Kontenrahmen"
              value={e.kontenrahmen}
              onChange={(v) => aendern((x) => ({ ...x, kontenrahmen: v, konten: standardKonten(v, x.reisender.typ) }))}
              options={[
                { value: 'SKR03', label: 'SKR 03' },
                { value: 'SKR04', label: 'SKR 04' },
              ]}
            />
          )}
        </Field>
        <div className="konten">
          {(Object.keys(KONTO_LABEL) as KontoKey[]).map((k) => (
            <Field key={k} label={KONTO_LABEL[k]}>
              {(id) => <TextInput id={id} value={e.konten[k]} onChange={(v) => aendern((x) => ({ ...x, konten: { ...x.konten, [k]: v.trim() } }))} inputMode="numeric" />}
            </Field>
          ))}
        </div>
        <p className="klein-hinweis">Vorschläge nach DATEV-Standardkontenrahmen ({e.reisender.typ === 'unternehmer' ? 'Reisekosten Unternehmer' : 'Reisekosten Arbeitnehmer'}). Bitte mit der Steuerberatung abstimmen.</p>
        <Field label="Nummernkreis">
          {() => (
            <div className="grid-2">
              <TextInput aria-label="Präfix" value={e.nummernkreis.praefix} onChange={(v) => aendern((x) => ({ ...x, nummernkreis: { ...x.nummernkreis, praefix: v.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) } }))} />
              <span className="muted nummer-vorschau">
                z. B. {e.nummernkreis.praefix || 'RK'}-{new Date().getFullYear()}-{'1'.padStart(e.nummernkreis.stellen, '0')}
              </span>
            </div>
          )}
        </Field>
      </Section>

      <Datensicherung />

      <Section titel="Rechtliche Grundlagen" icon="info" offen={false}>
        <ul className="rechtliches">
          <li>Fahrtkosten: tatsächliche Kosten oder Kilometerpauschale 0,30 €/km (Pkw) bzw. 0,20 €/km – § 9 Abs. 1 Satz 3 Nr. 4a EStG i. V. m. § 5 BRKG; für Unternehmer über § 4 Abs. 5 Satz 1 Nr. 5 EStG.</li>
          <li>Verpflegungsmehraufwand Inland: 14 € (An-/Abreisetag, mehr als 8 Stunden), 28 € (24 Stunden) – § 9 Abs. 4a EStG. Ausland: BMF-Schreiben vom 05.12.2025 (ab 01.01.2026).</li>
          <li>Kürzung bei gestellten Mahlzeiten: Frühstück 20 %, Mittag- und Abendessen je 40 % der vollen Tagespauschale.</li>
          <li>Übernachtung: tatsächliche Kosten; Frühstück gehört nicht dazu.</li>
          <li>Bewirtung: 70 % abziehbar, Aufzeichnung von Anlass und Teilnehmern – § 4 Abs. 5 Satz 1 Nr. 2 EStG.</li>
          <li>Ab 2026 gilt für Speisen in der Gastronomie 7 % USt, für Getränke 19 %.</li>
        </ul>
        <p className="klein-hinweis">Die App ersetzt keine steuerliche Beratung. Prüfen Sie Sonderfälle (z. B. Dreimonatsfrist, doppelte Haushaltsführung) mit Ihrer Steuerberatung.</p>
      </Section>
    </div>
  );
}

function Pauschalen({ e, aendern }: { e: E; aendern: (fn: (x: E) => E) => void }) {
  const [suche, setSuche] = useState('');
  const [importOffen, setImportOffen] = useState(false);
  const tabellen = alleTabellen(e);
  const aktuell = tabellen[tabellen.length - 1];
  const treffer = useMemo(() => {
    const q = normalize(suche);
    if (!q) return [];
    return aktuell.zeilen.filter((z) => normalize(z[1] + ' ' + (z[2] ?? '')).includes(q)).slice(0, 12);
  }, [suche, aktuell]);
  return (
    <Section titel="Verpflegungspauschalen" icon="food" untertitel={`Inland 28 €/14 € · Ausland: ${tabellen.map((t) => t.jahr).join(', ')}`} offen={false}>
      <div className="grid-2">
        <Field label="Inland: 24 Stunden abwesend">{(id) => <MoneyInput id={id} value={e.inland.vollCent} onChange={(c) => aendern((x) => ({ ...x, inland: { ...x.inland, vollCent: c } }))} />}</Field>
        <Field label="Inland: An-/Abreisetag, mehr als 8 Std.">{(id) => <MoneyInput id={id} value={e.inland.teilCent} onChange={(c) => aendern((x) => ({ ...x, inland: { ...x.inland, teilCent: c } }))} />}</Field>
      </div>
      {(e.inland.vollCent !== INLAND_GESETZLICH.vollCent || e.inland.teilCent !== INLAND_GESETZLICH.teilCent) && (
        <Hinweis art="warn">
          Abweichend von den gesetzlichen Pauschalen ({fmtEUR(INLAND_GESETZLICH.vollCent)} / {fmtEUR(INLAND_GESETZLICH.teilCent)}).{' '}
          <button type="button" className="link-btn" onClick={() => aendern((x) => ({ ...x, inland: { ...INLAND_GESETZLICH } }))}>
            Zurücksetzen
          </button>
        </Hinweis>
      )}
      <Field label={`Auslandspauschalen nachschlagen (${aktuell.jahr})`} hinweis={aktuell.quelle}>
        {(id) => <TextInput id={id} type="search" value={suche} onChange={setSuche} placeholder="Land oder Stadt, z. B. Österreich, Paris" />}
      </Field>
      {treffer.length > 0 && (
        <table className="tabelle">
          <thead>
            <tr>
              <th>Land / Ort</th>
              <th className="r">24 Std.</th>
              <th className="r">An-/Abreise</th>
              <th className="r">Übernachtung*</th>
            </tr>
          </thead>
          <tbody>
            {treffer.map((z) => (
              <tr key={z[0] + (z[2] ?? '')}>
                <td>
                  {z[1]}
                  {z[2] ? ' – ' + z[2] : ''}
                </td>
                <td className="r">{fmtNum2(z[3])} €</td>
                <td className="r">{fmtNum2(z[4])} €</td>
                <td className="r">{fmtNum2(z[5])} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="klein-hinweis">* Übernachtungspauschalen gelten nur für steuerfreie Arbeitgebererstattungen; Unternehmer setzen tatsächliche Kosten an. Nicht aufgeführte Länder: Luxemburg-Satz.</p>
      <div className="tabellen-liste">
        {tabellen.map((t) => (
          <div key={t.jahr} className="tabellen-eintrag">
            <span>
              <strong>{t.jahr}</strong> · {t.zeilen.length} Einträge · {t.quelle}
            </span>
            {e.zusatzTabellen.some((z) => z.jahr === t.jahr) && (
              <button type="button" className="link-btn gefahr" onClick={() => aendern((x) => ({ ...x, zusatzTabellen: x.zusatzTabellen.filter((z) => z.jahr !== t.jahr) }))}>
                Entfernen
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="btn" onClick={() => setImportOffen(true)}>
        <Icon name="plus" /> Tabelle für weiteres Jahr importieren
      </button>
      {importOffen && <TabellenImport onClose={() => setImportOffen(false)} onImport={(t) => aendern((x) => ({ ...x, zusatzTabellen: [...x.zusatzTabellen.filter((z) => z.jahr !== t.jahr), t] }))} />}
      <p className="klein-hinweis">Eingebaut: {EINGEBAUTE_TABELLEN.map((t) => `${t.jahr} (${t.quelle})`).join(', ')}. Für Jahre ohne Tabelle verwendet die App die letzte verfügbare und weist darauf hin.</p>
    </Section>
  );
}

function TabellenImport({ onClose, onImport }: { onClose: () => void; onImport: (t: ReturnType<typeof parseTabelle>['tabelle']) => void }) {
  const { toast } = useStore();
  const [jahr, setJahr] = useState(String(new Date().getFullYear() + 1));
  const [text, setText] = useState('');
  const namen = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of countryOptions()) m.set(normalize(o.name), o.code);
    for (const t of EINGEBAUTE_TABELLEN) for (const z of t.zeilen) m.set(normalize(z[1]), z[0]);
    return m;
  }, []);
  const ergebnis = useMemo(() => (text.trim() ? parseTabelle(text, Number(jahr), (n) => namen.get(normalize(n)) ?? null) : null), [text, jahr, namen]);
  return (
    <Modal
      titel="Auslandspauschalen importieren"
      onClose={onClose}
      breit
      aktionen={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-primaer"
            disabled={!ergebnis || ergebnis.tabelle.zeilen.length < 10 || !/^\d{4}$/.test(jahr)}
            onClick={() => {
              onImport(ergebnis!.tabelle);
              toast(`Tabelle ${jahr} mit ${ergebnis!.tabelle.zeilen.length} Einträgen übernommen`, 'ok');
              onClose();
            }}
          >
            Übernehmen
          </button>
        </>
      }
    >
      <p>Eine Zeile je Land bzw. Stadt, Spalten durch Semikolon oder Tabulator getrennt (z. B. aus Excel kopiert):</p>
      <pre className="code">Land;Ort;24 Std.;An-/Abreisetag;Übernachtung{'\n'}Österreich;;50,00;33,00;117,00{'\n'}Frankreich;Paris;58,00;39,00;159,00</pre>
      <Field label="Gültig für das Jahr" pflicht>
        {(id) => <TextInput id={id} value={jahr} onChange={setJahr} inputMode="numeric" />}
      </Field>
      <Field label="Tabelle">{(id) => <TextArea id={id} value={text} onChange={setText} rows={8} />}</Field>
      {ergebnis && (
        <Hinweis art={ergebnis.fehler.length ? 'warn' : 'ok'}>
          {ergebnis.tabelle.zeilen.length} Einträge erkannt.
          {ergebnis.fehler.length > 0 && (
            <ul>
              {ergebnis.fehler.slice(0, 8).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </Hinweis>
      )}
    </Modal>
  );
}

function ServerEinstellungen({ e, aendern }: { e: E; aendern: (fn: (x: E) => E) => void }) {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <fieldset className="gruppe">
      <legend>Versand-Server (SMTP)</legend>
      <p className="klein-hinweis">Für den direkten E-Mail-Versand läuft die App mit dem mitgelieferten Server (siehe README). Ohne Server lassen sich die Dateien teilen oder herunterladen.</p>
      <div className="grid-2">
        <Field label="Server-Adresse" hinweis="Leer lassen, wenn die App vom Server selbst ausgeliefert wird">
          {(id) => <TextInput id={id} value={e.server.url} onChange={(v) => aendern((x) => ({ ...x, server: { ...x.server, url: v.trim() } }))} placeholder="https://reisekosten.example.de" />}
        </Field>
        <Field label="Zugangs-Token" hinweis="Wie APP_TOKEN auf dem Server">
          {(id) => <TextInput id={id} type="password" value={e.server.token} onChange={(v) => aendern((x) => ({ ...x, server: { ...x.server, token: v.trim() } }))} autoComplete="off" />}
        </Field>
      </div>
      <button type="button" className="btn" onClick={async () => setStatus((await serverStatus(e)).text)}>
        <Icon name="server" /> Verbindung testen
      </button>
      {status && <p className="klein-hinweis">{status}</p>}
    </fieldset>
  );
}

function Datensicherung() {
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [bestaetigen, setBestaetigen] = useState<null | 'import' | 'loeschen'>(null);
  const [datei, setDatei] = useState<File | null>(null);
  return (
    <Section titel="Datensicherung" icon="download" untertitel="Alle Daten liegen nur auf diesem Gerät" offen={false}>
      <p className="klein-hinweis">Reisen, Belege und Einstellungen werden lokal im Browser gespeichert. Erstellen Sie regelmäßig eine Sicherung – auch, um die Daten auf ein anderes Gerät zu übertragen. Abgeschlossene Abrechnungen (PDF) unterliegen den Aufbewahrungspflichten.</p>
      <div className="aktionen-zeile">
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const blob = await sicherungErstellen(await store.backend());
            herunterladen({ name: `Reisekosten-Sicherung_${new Date().toISOString().slice(0, 10)}.json`, typ: 'application/json', blob });
          }}
        >
          <Icon name="download" /> Sicherung herunterladen
        </button>
        <button type="button" className="btn" onClick={() => input.current?.click()}>
          <Icon name="share" /> Sicherung einlesen
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) {
              setDatei(f);
              setBestaetigen('import');
            }
            ev.target.value = '';
          }}
        />
        <button type="button" className="btn btn-text-gefahr" onClick={() => setBestaetigen('loeschen')}>
          <Icon name="trash" /> Alle Daten löschen
        </button>
      </div>
      {bestaetigen && (
        <Modal
          titel={bestaetigen === 'import' ? 'Sicherung einlesen?' : 'Alle Daten löschen?'}
          onClose={() => setBestaetigen(null)}
          aktionen={
            <>
              <button type="button" className="btn" onClick={() => setBestaetigen(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-gefahr"
                onClick={async () => {
                  try {
                    const b = await store.backend();
                    if (bestaetigen === 'import' && datei) {
                      const n = await sicherungEinlesen(b, datei);
                      store.toast(`${n.reisen} Reisen und ${n.dateien} Belege eingelesen`, 'ok');
                    } else {
                      await b.allesLoeschen();
                      store.toast('Alle Daten gelöscht');
                    }
                    await store.neuLaden();
                  } catch (err) {
                    store.toast((err as Error).message, 'fehler');
                  }
                  setBestaetigen(null);
                }}
              >
                {bestaetigen === 'import' ? 'Ersetzen' : 'Endgültig löschen'}
              </button>
            </>
          }
        >
          <p>{bestaetigen === 'import' ? `Alle vorhandenen Daten auf diesem Gerät werden durch den Inhalt von „${datei?.name}“ ersetzt.` : 'Alle Reisen, Belege und Einstellungen auf diesem Gerät werden gelöscht. Abgeschlossene Abrechnungen vorher sichern!'}</p>
        </Modal>
      )}
    </Section>
  );
}
