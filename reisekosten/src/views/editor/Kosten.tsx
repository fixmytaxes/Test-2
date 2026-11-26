import type { Bewirtung, Korrektur, KorrekturArt, Kosten as KostenT, KostenKategorie, Reise, UstKey } from '../../types';
import { datePart, fmtDate } from '../../lib/dates';
import { KOSTEN_KATEGORIEN } from '../../lib/defaults';
import { fmtEUR, sumBrutto, UST_LABEL } from '../../lib/money';
import { reiseZeitraum } from '../../lib/totals';
import { uid } from '../../lib/util';
import { Anhaenge, BetragEditor, BezahltWahl } from '../../components/felder';
import { DateInput, Field, Hinweis, Icon, MoneyInput, Section, Select, TextArea, TextInput } from '../../components/ui';

type Upd = (fn: (r: Reise) => Reise) => void;

const erstesDatum = (r: Reise) => datePart(reiseZeitraum(r).beginn) || datePart(new Date().toISOString());

export function WeitereKosten({ r, ro, update }: { r: Reise; ro: boolean; update: Upd }) {
  const setze = (id: string, p: Partial<KostenT>) => update((x) => ({ ...x, kosten: x.kosten.map((k) => (k.id === id ? { ...k, ...p } : k)) }));
  const summe = r.kosten.reduce((t, k) => t + sumBrutto(k.betraege), 0);
  const neu = () =>
    update((x) => ({
      ...x,
      kosten: [...x.kosten, { id: uid(), kategorie: 'seminar', beschreibung: '', datum: erstesDatum(x), betraege: [{ ust: '19', bruttoCent: 0 }], bezahlt: 'privat', belege: [] }],
    }));
  return (
    <Section id="sec-kosten" titel="Fortbildung & weitere Kosten" icon="receipt" anzahl={r.kosten.length} summe={fmtEUR(summe)} untertitel="Seminar-, Tagungs- und Fortbildungskosten, Parken, Maut, Nebenkosten">
      <div className="karten">
        {r.kosten.map((k, i) => (
          <article className="karte" id={'cost-' + k.id} key={k.id}>
            <header className="karte-kopf">
              <span className="karte-nr">{i + 1}</span>
              <div className="karte-titel">
                <strong>{k.beschreibung || KOSTEN_KATEGORIEN[k.kategorie].label}</strong>
                <small>
                  {KOSTEN_KATEGORIEN[k.kategorie].label}
                  {k.datum ? ' · ' + fmtDate(k.datum) : ''}
                </small>
              </div>
              {!ro && (
                <button type="button" className="icon-btn" aria-label="Kosten löschen" onClick={() => update((x) => ({ ...x, kosten: x.kosten.filter((y) => y.id !== k.id) }))}>
                  <Icon name="trash" />
                </button>
              )}
            </header>
            <div className="karte-inhalt">
              <div className="grid-2">
                <Field label="Kategorie" pflicht>
                  {(id) => (
                    <Select<KostenKategorie>
                      id={id}
                      value={k.kategorie}
                      onChange={(v) => setze(k.id, { kategorie: v, betraege: sumBrutto(k.betraege) > 0 ? k.betraege : [{ ust: KOSTEN_KATEGORIEN[v].ust, bruttoCent: 0 }] })}
                      options={(Object.keys(KOSTEN_KATEGORIEN) as KostenKategorie[]).map((c) => ({ value: c, label: KOSTEN_KATEGORIEN[c].label }))}
                    />
                  )}
                </Field>
                <Field label="Datum" pflicht>
                  {(id) => <DateInput id={id} value={k.datum} onChange={(v) => setze(k.id, { datum: v })} />}
                </Field>
              </div>
              <Field label="Beschreibung" pflicht>
                {(id) => <TextInput id={id} value={k.beschreibung} onChange={(v) => setze(k.id, { beschreibung: v })} placeholder="z. B. Teilnahmegebühr Fachseminar Umsatzsteuer" />}
              </Field>
              <BetragEditor werte={k.betraege} onChange={(b) => setze(k.id, { betraege: b })} standardUst={KOSTEN_KATEGORIEN[k.kategorie].ust} />
              <BezahltWahl value={k.bezahlt} onChange={(v) => setze(k.id, { bezahlt: v })} />
              <Anhaenge werte={k.belege} onChange={(b) => setze(k.id, { belege: b })} ro={ro} pflichtHinweis />
            </div>
          </article>
        ))}
      </div>
      {!ro && (
        <div className="aktionen-zeile">
          <button type="button" className="btn" onClick={neu}>
            <Icon name="plus" /> Kosten hinzufügen
          </button>
        </div>
      )}
    </Section>
  );
}

export function Bewirtungen({ r, ro, update }: { r: Reise; ro: boolean; update: Upd }) {
  const setze = (id: string, p: Partial<Bewirtung>) => update((x) => ({ ...x, bewirtungen: x.bewirtungen.map((b) => (b.id === id ? { ...b, ...p } : b)) }));
  const summe = r.bewirtungen.reduce((t, b) => t + sumBrutto(b.betraege) + (b.trinkgeldCent || 0), 0);
  const neu = () =>
    update((x) => {
      const datum = erstesDatum(x);
      const ausland = (x.ziel.land || 'DE') !== 'DE';
      // Seit 1.1.2026: Speisen in der Gastronomie 7 %, Getränke 19 %
      const betraege: Bewirtung['betraege'] = ausland ? [{ ust: 'ausl', bruttoCent: 0 }] : datum >= '2026-01-01' ? [{ ust: '7', bruttoCent: 0 }, { ust: '19', bruttoCent: 0 }] : [{ ust: '19', bruttoCent: 0 }];
      return { ...x, bewirtungen: [...x.bewirtungen, { id: uid(), datum, lokal: '', anschrift: '', anlass: '', teilnehmer: '', betraege, trinkgeldCent: 0, bezahlt: 'privat', belege: [] }] };
    });
  return (
    <Section id="sec-bewirtung" titel="Bewirtungen" icon="food" anzahl={r.bewirtungen.length} summe={fmtEUR(summe)} untertitel="Geschäftsessen – werden getrennt ausgewiesen (70 % abziehbar)">
      <div className="karten">
        {r.bewirtungen.map((b, i) => (
          <article className="karte" id={'host-' + b.id} key={b.id}>
            <header className="karte-kopf">
              <span className="karte-nr">{i + 1}</span>
              <div className="karte-titel">
                <strong>{b.lokal || 'Bewirtung'}</strong>
                <small>
                  {b.anlass || 'Anlass'}
                  {b.datum ? ' · ' + fmtDate(b.datum) : ''}
                </small>
              </div>
              {!ro && (
                <button type="button" className="icon-btn" aria-label="Bewirtung löschen" onClick={() => update((x) => ({ ...x, bewirtungen: x.bewirtungen.filter((y) => y.id !== b.id) }))}>
                  <Icon name="trash" />
                </button>
              )}
            </header>
            <div className="karte-inhalt">
              <div className="grid-2">
                <Field label="Datum" pflicht>
                  {(id) => <DateInput id={id} value={b.datum} onChange={(v) => setze(b.id, { datum: v })} />}
                </Field>
                <Field label="Gaststätte" pflicht>
                  {(id) => <TextInput id={id} value={b.lokal} onChange={(v) => setze(b.id, { lokal: v })} placeholder="Name des Restaurants" />}
                </Field>
              </div>
              <Field label="Anschrift der Gaststätte">{(id) => <TextInput id={id} value={b.anschrift} onChange={(v) => setze(b.id, { anschrift: v })} />}</Field>
              <Field label="Anlass der Bewirtung" pflicht hinweis="Konkreter geschäftlicher Anlass, z. B. „Besprechung Jahresabschluss 2025“">
                {(id) => <TextInput id={id} value={b.anlass} onChange={(v) => setze(b.id, { anlass: v })} />}
              </Field>
              <Field label="Bewirtete Personen (inkl. Gastgeber)" pflicht hinweis="Namen und ggf. Firma, je Zeile oder durch Komma getrennt">
                {(id) => <TextArea id={id} value={b.teilnehmer} onChange={(v) => setze(b.id, { teilnehmer: v })} rows={2} />}
              </Field>
              <BetragEditor werte={b.betraege} onChange={(x) => setze(b.id, { betraege: x })} standardUst="7" label="Rechnungsbetrag (brutto)" hinweis="Seit 2026: Speisen 7 %, Getränke 19 %" />
              <Field label="Trinkgeld" hinweis="Vom Empfänger auf dem Beleg quittieren lassen">
                {(id) => <MoneyInput id={id} value={b.trinkgeldCent} onChange={(c) => setze(b.id, { trinkgeldCent: c })} />}
              </Field>
              <BezahltWahl value={b.bezahlt} onChange={(v) => setze(b.id, { bezahlt: v })} />
              <Anhaenge werte={b.belege} onChange={(x) => setze(b.id, { belege: x })} ro={ro} label="Bewirtungsbeleg" pflichtHinweis />
            </div>
          </article>
        ))}
      </div>
      {!ro && (
        <div className="aktionen-zeile">
          <button type="button" className="btn" onClick={neu}>
            <Icon name="plus" /> Bewirtung hinzufügen
          </button>
        </div>
      )}
    </Section>
  );
}

const ART_LABEL: Record<KorrekturArt, string> = {
  erstattung: 'Erstattung/Zuschuss Dritter',
  kuerzung: 'Kürzung (z. B. privater Anteil)',
  vorschuss: 'Erhaltener Vorschuss',
};

export function Korrekturen({ r, ro, update }: { r: Reise; ro: boolean; update: Upd }) {
  const setze = (id: string, p: Partial<Korrektur>) => update((x) => ({ ...x, korrekturen: x.korrekturen.map((k) => (k.id === id ? { ...k, ...p } : k)) }));
  const summe = r.korrekturen.reduce((t, k) => t + k.betragCent, 0);
  return (
    <Section id="sec-korrekturen" titel="Kürzungen & Erstattungen" icon="minus" anzahl={r.korrekturen.length} summe={summe ? '− ' + fmtEUR(summe) : fmtEUR(0)} untertitel="Erstattungen Dritter, private Anteile, Vorschüsse" offen={r.korrekturen.length > 0}>
      <p className="klein-hinweis">Gestellte Mahlzeiten werden direkt beim Verpflegungsmehraufwand gekürzt. Erstattungen und Kürzungen mindern die abziehbaren Kosten, ein Vorschuss nur den Auszahlungsbetrag.</p>
      <div className="karten">
        {r.korrekturen.map((k) => (
          <div className="korrektur" key={k.id}>
            <Field label="Art">
              {(id) => <Select<KorrekturArt> id={id} value={k.art} onChange={(v) => setze(k.id, { art: v })} options={(Object.keys(ART_LABEL) as KorrekturArt[]).map((a) => ({ value: a, label: ART_LABEL[a] }))} />}
            </Field>
            <Field label="Beschreibung" className="korrektur-text">
              {(id) => <TextInput id={id} value={k.beschreibung} onChange={(v) => setze(k.id, { beschreibung: v })} placeholder="z. B. Fahrtkostenzuschuss Veranstalter" />}
            </Field>
            <Field label="Betrag" pflicht>
              {(id) => <MoneyInput id={id} value={k.betragCent} onChange={(c) => setze(k.id, { betragCent: c })} />}
            </Field>
            <Field label="USt">
              {(id) => <Select<UstKey> id={id} value={k.ust} onChange={(v) => setze(k.id, { ust: v })} options={(['0', '19', '7', 'ausl'] as UstKey[]).map((u) => ({ value: u, label: UST_LABEL[u] }))} />}
            </Field>
            {!ro && (
              <button type="button" className="icon-btn" aria-label="Eintrag löschen" onClick={() => update((x) => ({ ...x, korrekturen: x.korrekturen.filter((y) => y.id !== k.id) }))}>
                <Icon name="trash" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!r.korrekturen.length && ro && <Hinweis>Keine Kürzungen oder Erstattungen.</Hinweis>}
      {!ro && (
        <div className="aktionen-zeile">
          <button type="button" className="btn" onClick={() => update((x) => ({ ...x, korrekturen: [...x.korrekturen, { id: uid(), art: 'erstattung', beschreibung: '', betragCent: 0, ust: '0' }] }))}>
            <Icon name="plus" /> Kürzung / Erstattung hinzufügen
          </button>
        </div>
      )}
    </Section>
  );
}
