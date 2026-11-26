import { useEffect, useState } from 'react';
import type { Reise } from '../../types';
import { useStore } from '../../store';
import { nowIso } from '../../lib/dates';
import { betreff, erzeugeExport, herunterladen, kannTeilen, mailText, oeffnen, sendeMail, serverStatus, teilen, type Exportdatei } from '../../lib/export';
import { fmtGroesse } from '../../lib/images';
import { istAndroid } from '../../lib/plattform';
import { fmtEUR } from '../../lib/money';
import { berechne } from '../../lib/totals';
import { Checkbox, Field, Hinweis, Icon, Modal, TextArea, TextInput } from '../../components/ui';

export function useExport(r: Reise) {
  const { einstellungen, ladeDatei, toast } = useStore();
  const [laeuft, setLaeuft] = useState(false);
  const erstelle = async (o: { storno?: boolean; mitBelegen?: boolean } = {}) => {
    setLaeuft(true);
    try {
      return await erzeugeExport(r, einstellungen, ladeDatei, o);
    } catch (e) {
      toast('Export fehlgeschlagen: ' + (e as Error).message, 'fehler');
      throw e;
    } finally {
      setLaeuft(false);
    }
  };
  return { erstelle, laeuft };
}

export function SendenDialog({ r, storno, onClose }: { r: Reise; storno?: boolean; onClose: () => void }) {
  const { einstellungen: e, versandVermerken, toast, ladeDatei } = useStore();
  const [an, setAn] = useState(e.datev.email);
  const [xmlSeparat, setXmlSeparat] = useState(e.datev.xmlSeparat);
  const [mitBelegen, setMitBelegen] = useState(e.datev.belegeAnhaengen);
  const [server, setServer] = useState<{ ok: boolean; mail: boolean; text: string } | null>(null);
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [dateien, setDateien] = useState<Exportdatei[] | null>(null);
  const [geteilt, setGeteilt] = useState(false);
  const a = berechne(r, e);
  const betragText = fmtEUR(a.summen.auszahlungCent);

  useEffect(() => {
    void serverStatus(e).then(setServer);
  }, [e]);

  const baue = async () => {
    const x = await erzeugeExport(r, e, ladeDatei, { storno, mitBelegen });
    const liste = [x.pdf, ...(xmlSeparat ? [x.xml] : [])];
    setDateien(liste);
    return liste;
  };

  const vermerk = (weg: 'email' | 'teilen' | 'download' | 'manuell', liste: Exportdatei[], eingereicht: boolean) =>
    versandVermerken(r.id, { zeitpunkt: nowIso(), weg, empfaenger: weg === 'email' ? an : undefined, dateien: liste.map((d) => d.name), storno }, eingereicht && !storno);

  const run = async (name: string, fn: () => Promise<void>) => {
    setLaeuft(name);
    try {
      await fn();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast((err as Error).message, 'fehler');
    } finally {
      setLaeuft(null);
    }
  };

  const perMail = () =>
    run('mail', async () => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(an.trim())) throw new Error('Bitte eine gültige Empfängeradresse angeben.');
      const liste = await baue();
      const groesse = liste.reduce((s, d) => s + d.blob.size, 0);
      if (groesse > 19 * 1024 * 1024) throw new Error(`Anhänge zu groß (${fmtGroesse(groesse)}). DATEV Upload-Mail erlaubt höchstens 20 MB – Belege ggf. separat senden.`);
      await sendeMail(e, an.trim(), betreff(e, r, storno), mailText(e, r, betragText, storno), liste);
      await vermerk('email', liste, true);
      toast(`Gesendet an ${an.trim()}`, 'ok');
      onClose();
    });

  const perTeilen = () =>
    run('teilen', async () => {
      const liste = await baue();
      const ok = await teilen(liste, betreff(e, r, storno), mailText(e, r, betragText, storno), an.trim());
      if (!ok) throw new Error('Teilen wird auf diesem Gerät nicht unterstützt.');
      await vermerk('teilen', liste, false);
      setGeteilt(true);
    });

  const perDownload = () =>
    run('download', async () => {
      const liste = await baue();
      liste.forEach(herunterladen);
      await vermerk('download', liste, false);
      setGeteilt(true);
    });

  const mailto = `mailto:${encodeURIComponent(an.trim())}?subject=${encodeURIComponent(betreff(e, r, storno))}&body=${encodeURIComponent(mailText(e, r, betragText, storno) + '\n\n(Bitte die heruntergeladenen Dateien anhängen.)')}`;
  const mailBereit = server?.ok && server.mail;

  return (
    <Modal titel={storno ? 'Stornobeleg an DATEV senden' : 'An DATEV Unternehmen online senden'} onClose={onClose}>
      <p className="muted">
        Die PDF enthält die strukturierten Rechnungsdaten (<code>factur-x.xml</code>, EN 16931). DATEV Unternehmen online erkennt sie als E-Rechnung und übernimmt Beträge, Steuersätze und Leistungsbeschreibungen.
      </p>
      <Field label="Empfänger (DATEV Upload-Mail-Adresse)" hinweis={!e.datev.email ? 'Tipp: Adresse dauerhaft in den Einstellungen hinterlegen.' : undefined}>
        {(id) => <TextInput id={id} type="email" value={an} onChange={setAn} placeholder="…@uploadmail.datev.de" autoComplete="email" />}
      </Field>
      <Checkbox checked={mitBelegen} onChange={setMitBelegen} label="Belege als Anlagen in die PDF einbinden" />
      <Checkbox checked={xmlSeparat} onChange={setXmlSeparat} label="XML zusätzlich als eigene Datei anhängen" hinweis="Achtung: DATEV legt dann zwei Belege an (PDF und XML)." />
      {server && (
        <Hinweis art={mailBereit ? 'ok' : 'info'} icon="server">
          {mailBereit
            ? server.text
            : istAndroid()
              ? 'Ohne Versand-Server öffnet die App Ihr E-Mail-Programm – Empfänger, Betreff und Anhänge sind schon eingetragen.'
              : `${server.text}. Sie können die Dateien teilen oder herunterladen und selbst per E-Mail senden.`}
        </Hinweis>
      )}
      <div className="dialog-btns">
        {(mailBereit || !istAndroid()) && (
          <button type="button" className="btn btn-primaer" disabled={!mailBereit || !!laeuft} onClick={perMail}>
            <Icon name="send" /> {laeuft === 'mail' ? 'Wird gesendet …' : 'Per E-Mail senden'}
          </button>
        )}
        {kannTeilen() && (
          <button type="button" className={!mailBereit && istAndroid() ? 'btn btn-primaer' : 'btn'} disabled={!!laeuft} onClick={perTeilen}>
            <Icon name={istAndroid() ? 'send' : 'share'} /> {laeuft === 'teilen' ? 'Wird erstellt …' : istAndroid() ? 'Mit E-Mail-App senden' : 'Teilen (Mail-App)'}
          </button>
        )}
        <button type="button" className="btn" disabled={!!laeuft} onClick={perDownload}>
          <Icon name="download" /> {laeuft === 'download' ? 'Wird erstellt …' : 'Herunterladen'}
        </button>
      </div>
      {geteilt && dateien && (
        <div className="nach-teilen">
          <Hinweis>
            {dateien.length} Datei(en) erstellt: {dateien.map((d) => `${d.name} (${fmtGroesse(d.blob.size)})`).join(', ')}.{' '}
            <a href={mailto}>E-Mail-Programm öffnen</a>
          </Hinweis>
          {!storno && r.status === 'abgeschlossen' && (
            <button
              type="button"
              className="btn btn-primaer"
              onClick={async () => {
                await vermerk('manuell', dateien, true);
                toast('Als eingereicht markiert', 'ok');
                onClose();
              }}
            >
              <Icon name="check" /> Versendet – als eingereicht markieren
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

export function StornoDialog({ r, onClose, onDone }: { r: Reise; onClose: () => void; onDone: (neuId?: string) => void }) {
  const { stornieren, toast } = useStore();
  const [grund, setGrund] = useState('');
  const [neu, setNeu] = useState(true);
  const [laeuft, setLaeuft] = useState(false);
  return (
    <Modal
      titel={`Abrechnung ${r.nummer} stornieren`}
      onClose={onClose}
      aktionen={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-gefahr"
            disabled={!grund.trim() || laeuft}
            onClick={async () => {
              setLaeuft(true);
              try {
                const id = await stornieren(r.id, grund.trim(), neu);
                toast(`Abrechnung ${r.nummer} storniert`, 'ok');
                onDone(id);
              } catch (e) {
                toast((e as Error).message, 'fehler');
              } finally {
                setLaeuft(false);
              }
            }}
          >
            Stornieren
          </button>
        </>
      }
    >
      <p>Abgeschlossene Abrechnungen können nicht geändert werden. Die Storno bleibt mit Nummer, Datum und Grund nachvollziehbar erhalten; die Nummer wird nicht erneut vergeben.</p>
      {r.status === 'eingereicht' && (
        <Hinweis art="warn">Diese Abrechnung wurde bereits eingereicht. Senden Sie nach dem Storno den Stornobeleg an DATEV, damit die Buchung rückgängig gemacht wird.</Hinweis>
      )}
      <Field label="Grund der Stornierung" pflicht>
        {(id) => <TextArea id={id} value={grund} onChange={setGrund} rows={2} placeholder="z. B. Hotelrechnung korrigiert" />}
      </Field>
      <Checkbox checked={neu} onChange={setNeu} label="Als neuen Entwurf kopieren" hinweis="Alle Angaben und Belege werden übernommen und können korrigiert werden. Beim Abschluss erhält die Abrechnung eine neue Nummer." />
    </Modal>
  );
}

export function PdfButtons({ r, storno }: { r: Reise; storno?: boolean }) {
  const { erstelle, laeuft } = useExport(r);
  return (
    <>
      <button
        type="button"
        className="btn"
        disabled={laeuft}
        onClick={async () => {
          const x = await erstelle({ storno });
          oeffnen(x.pdf);
        }}
      >
        <Icon name="file" /> {laeuft ? 'Wird erstellt …' : storno ? 'Stornobeleg (PDF)' : r.status === 'entwurf' ? 'PDF-Vorschau' : 'PDF öffnen'}
      </button>
      {r.status !== 'entwurf' && (
        <button
          type="button"
          className="btn"
          disabled={laeuft}
          onClick={async () => {
            const x = await erstelle({ storno });
            herunterladen(x.pdf);
          }}
        >
          <Icon name="download" /> PDF
        </button>
      )}
      {r.status !== 'entwurf' && (
        <button
          type="button"
          className="btn"
          disabled={laeuft}
          onClick={async () => {
            const x = await erstelle({ storno, mitBelegen: false });
            herunterladen(x.xml);
          }}
        >
          <Icon name="download" /> XML
        </button>
      )}
    </>
  );
}
