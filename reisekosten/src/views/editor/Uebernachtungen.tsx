import type { Fruehstueck, Reise, Uebernachtung, UstKey } from '../../types';
import { addDays, datePart, fmtDate } from '../../lib/dates';
import { fmtEUR, sumBrutto, UST_LABEL } from '../../lib/money';
import { reiseZeitraum } from '../../lib/totals';
import { uid } from '../../lib/util';
import { Anhaenge, BetragEditor, BezahltWahl, OrtFelder } from '../../components/felder';
import { DateInput, Field, Hinweis, Icon, MoneyInput, Section, Segmented, Select, TextInput } from '../../components/ui';

export function Uebernachtungen({ r, ro, update }: { r: Reise; ro: boolean; update: (fn: (r: Reise) => Reise) => void }) {
  const setze = (id: string, p: Partial<Uebernachtung>) => update((x) => ({ ...x, uebernachtungen: x.uebernachtungen.map((u) => (u.id === id ? { ...u, ...p } : u)) }));
  const summe = r.uebernachtungen.reduce((t, u) => t + sumBrutto(u.betraege) - (u.fruehstueck === 'separat' ? u.fruehstueckCent || 0 : 0), 0);
  const neu = () =>
    update((x) => {
      const { beginn, ende } = reiseZeitraum(x);
      const an = datePart(beginn);
      const ab = datePart(ende) && datePart(ende) > an ? datePart(ende) : an ? addDays(an, 1) : '';
      const u: Uebernachtung = {
        id: uid(),
        bezeichnung: '',
        ort: { ort: x.ziel.ort, land: x.ziel.land || 'DE', plz: x.ziel.plz },
        anreise: an,
        abreise: ab,
        betraege: [{ ust: (x.ziel.land || 'DE') === 'DE' ? '7' : 'ausl', bruttoCent: 0 }],
        fruehstueck: 'nein',
        bezahlt: 'privat',
        belege: [],
      };
      return { ...x, uebernachtungen: [...x.uebernachtungen, u] };
    });
  return (
    <Section id="sec-uebernachtungen" titel="Übernachtungen" icon="bed" anzahl={r.uebernachtungen.length} summe={fmtEUR(summe)} untertitel="Hotel, Pension – tatsächliche Kosten laut Rechnung">
      <div className="karten">
        {r.uebernachtungen.map((u, i) => {
          const naechte = u.anreise && u.abreise ? Math.max(0, Math.round((Date.parse(u.abreise) - Date.parse(u.anreise)) / 86400000)) : 0;
          const inland = (u.ort.land || 'DE') === 'DE';
          return (
            <article className="karte" id={'stay-' + u.id} key={u.id}>
              <header className="karte-kopf">
                <span className="karte-nr">{i + 1}</span>
                <div className="karte-titel">
                  <strong>{u.bezeichnung || 'Unterkunft'}</strong>
                  <small>
                    {u.ort.ort || 'Ort'} · {naechte} {naechte === 1 ? 'Nacht' : 'Nächte'}
                    {u.anreise ? ` · ${fmtDate(u.anreise)} – ${fmtDate(u.abreise)}` : ''}
                  </small>
                </div>
                {!ro && (
                  <button type="button" className="icon-btn" aria-label="Übernachtung löschen" onClick={() => update((x) => ({ ...x, uebernachtungen: x.uebernachtungen.filter((y) => y.id !== u.id) }))}>
                    <Icon name="trash" />
                  </button>
                )}
              </header>
              <div className="karte-inhalt">
                <Field label="Unterkunft (Hotel, Pension …)" pflicht>
                  {(id) => <TextInput id={id} value={u.bezeichnung} onChange={(v) => setze(u.id, { bezeichnung: v })} placeholder="z. B. Hotel am Congress" />}
                </Field>
                <OrtFelder ort={u.ort} onChange={(o) => setze(u.id, { ort: o })} pflicht />
                <div className="grid-2">
                  <Field label="Anreise" pflicht>
                    {(id) => <DateInput id={id} value={u.anreise} onChange={(v) => setze(u.id, { anreise: v })} />}
                  </Field>
                  <Field label="Abreise" pflicht>
                    {(id) => <DateInput id={id} value={u.abreise} min={u.anreise} onChange={(v) => setze(u.id, { abreise: v })} />}
                  </Field>
                </div>
                <BetragEditor werte={u.betraege} onChange={(b) => setze(u.id, { betraege: b })} standardUst={inland ? '7' : 'ausl'} label="Rechnungsbetrag (brutto)" hinweis={inland ? 'Übernachtung 7 %, Nebenleistungen (z. B. Parken) 19 %' : 'Ausländische Umsatzsteuer ist im Inland nicht als Vorsteuer abziehbar.'} />
                <Field label="Frühstück">
                  {() => (
                    <Segmented<Fruehstueck>
                      klein
                      label="Frühstück"
                      value={u.fruehstueck}
                      onChange={(v) => setze(u.id, { fruehstueck: v, fruehstueckUst: u.fruehstueckUst ?? (inland ? '7' : 'ausl') })}
                      options={[
                        { value: 'nein', label: 'Ohne' },
                        { value: 'inklusive', label: 'Im Preis enthalten' },
                        { value: 'separat', label: 'Gesondert ausgewiesen' },
                      ]}
                    />
                  )}
                </Field>
                {u.fruehstueck === 'inklusive' && <p className="klein-hinweis">Der Verpflegungsmehraufwand wird an den Folgetagen automatisch um 20 % der Tagespauschale gekürzt.</p>}
                {u.fruehstueck === 'separat' && (
                  <div className="grid-2">
                    <Field label="Frühstück laut Rechnung (brutto)" pflicht hinweis="Wird von den Übernachtungskosten abgezogen – durch die Verpflegungspauschale abgegolten.">
                      {(id) => <MoneyInput id={id} value={u.fruehstueckCent} onChange={(c) => setze(u.id, { fruehstueckCent: c })} />}
                    </Field>
                    <Field label="USt Frühstück">
                      {(id) => <Select<UstKey> id={id} value={u.fruehstueckUst ?? '7'} onChange={(v) => setze(u.id, { fruehstueckUst: v })} options={(['19', '7', '0', 'ausl'] as UstKey[]).map((k) => ({ value: k, label: UST_LABEL[k] }))} />}
                    </Field>
                  </div>
                )}
                <BezahltWahl value={u.bezahlt} onChange={(v) => setze(u.id, { bezahlt: v })} />
                <Anhaenge werte={u.belege} onChange={(b) => setze(u.id, { belege: b })} ro={ro} label="Hotelrechnung" pflichtHinweis />
              </div>
            </article>
          );
        })}
      </div>
      {!r.uebernachtungen.length && <Hinweis>Unternehmer setzen Übernachtungskosten in tatsächlicher Höhe an (Pauschalen gelten nur für steuerfreie Arbeitgebererstattungen).</Hinweis>}
      {!ro && (
        <div className="aktionen-zeile">
          <button type="button" className="btn" onClick={neu}>
            <Icon name="plus" /> Übernachtung hinzufügen
          </button>
        </div>
      )}
    </Section>
  );
}
