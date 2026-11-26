import type { Einstellungen, Kostenart, Ort, Reise, Richtung, Teilstrecke, Verkehrsmittel } from '../../types';
import { countryName } from '../../data/countries';
import { fmtHours, hoursBetween, toMs } from '../../lib/dates';
import { KOSTENART_LABEL, VERKEHRSMITTEL, VERKEHRSMITTEL_ORDER } from '../../lib/defaults';
import { fmtEUR, fmtNum2, sumBrutto } from '../../lib/money';
import { kmBetrag } from '../../lib/totals';
import { uid } from '../../lib/util';
import { Anhaenge, BetragEditor, BezahltWahl, mapsLink, OrtFelder } from '../../components/felder';
import { DateTimeInput, DecimalInput, Field, Hinweis, Icon, Section, Segmented, TextInput } from '../../components/ui';

export function startOrt(r: Reise, e: Einstellungen): Ort {
  if (r.start.typ === 'abweichend' && r.start.ort) return { ...r.start.ort, bezeichnung: undefined };
  if (r.start.typ === 'wohnung') return { strasse: e.wohnung.strasse, plz: e.wohnung.plz, ort: e.wohnung.ort, land: e.wohnung.land || 'DE' };
  return { strasse: e.firma.strasse, plz: e.firma.plz, ort: e.firma.ort, land: e.firma.land || 'DE' };
}

// Teilstrecken übernehmen nur Ort und Land; die Anschrift kann je Strecke ergänzt werden
const kurzOrt = (o: Ort): Ort => ({ ort: o.ort, land: o.land || 'DE' });

export function neueStrecke(r: Reise, e: Einstellungen, richtung?: Richtung): Teilstrecke {
  const sorted = [...r.strecken].sort((a, b) => (a.abfahrt || '').localeCompare(b.abfahrt || ''));
  const prev = sorted[sorted.length - 1];
  const vm: Verkehrsmittel = prev?.verkehrsmittel ?? 'pkw';
  const info = VERKEHRSMITTEL[vm];
  const zielLand = r.ziel.land || 'DE';
  return {
    id: uid(),
    richtung: richtung ?? prev?.richtung ?? 'hin',
    von: prev ? { ...prev.nach } : kurzOrt(startOrt(r, e)),
    nach: prev ? { ort: '', land: zielLand } : kurzOrt(r.ziel),
    verkehrsmittel: vm,
    abfahrt: prev?.ankunft ?? '',
    ankunft: '',
    kostenart: info.kostenart,
    betraege: [],
    bezahlt: 'privat',
    belege: [],
  };
}

/** Legt die Rückreise als umgekehrte Hinreise an */
export function rueckreise(r: Reise): Teilstrecke[] {
  const hin = r.strecken.filter((s) => s.richtung === 'hin').sort((a, b) => (a.abfahrt || '').localeCompare(b.abfahrt || ''));
  return hin.reverse().map((s) => ({
    id: uid(),
    richtung: 'rueck' as const,
    von: { ...s.nach },
    nach: { ...s.von },
    verkehrsmittel: s.verkehrsmittel,
    abfahrt: '',
    ankunft: '',
    kostenart: s.kostenart,
    km: s.kostenart === 'km' ? s.km : undefined,
    betraege: s.kostenart === 'beleg' ? [{ ust: s.betraege[0]?.ust ?? VERKEHRSMITTEL[s.verkehrsmittel].ust, bruttoCent: 0 }] : [],
    bezahlt: s.bezahlt,
    belege: [],
  }));
}

export function Strecken({ r, e, ro, update }: { r: Reise; e: Einstellungen; ro: boolean; update: (fn: (r: Reise) => Reise) => void }) {
  const setze = (id: string, p: Partial<Teilstrecke>) => update((x) => ({ ...x, strecken: x.strecken.map((s) => (s.id === id ? { ...s, ...p } : s)) }));
  const summe = r.strecken.reduce((t, s) => {
    const vm = VERKEHRSMITTEL[s.verkehrsmittel];
    return t + (s.kostenart === 'km' ? kmBetrag(s.km, e.kmSaetze[vm.km ?? 'pkw']) : s.kostenart === 'beleg' ? sumBrutto(s.betraege) : 0);
  }, 0);
  const sorted = [...r.strecken].sort((a, b) => (a.abfahrt || '9').localeCompare(b.abfahrt || '9'));
  const hatHin = r.strecken.some((s) => s.richtung === 'hin');
  const hatRueck = r.strecken.some((s) => s.richtung === 'rueck');
  const route = sorted.length ? [sorted[0].von.ort, ...sorted.map((s) => s.nach.ort)].filter(Boolean) : [];

  return (
    <Section id="sec-strecken" titel="Fahrten & Teilstrecken" icon="car" anzahl={r.strecken.length} summe={fmtEUR(summe)} untertitel="Hinreise, Fahrten vor Ort und Rückreise">
      {route.length > 1 && (
        <div className="route" aria-label="Reiseverlauf">
          {route.map((o, i) => (
            <span key={i} className="route-teil">
              {i > 0 && <Icon name="arrow" size={14} />}
              <span>{o}</span>
            </span>
          ))}
        </div>
      )}
      {!r.strecken.length && (
        <Hinweis>
          Erfassen Sie jede Teilstrecke einzeln, z. B. <em>Wiesbaden → Frankfurt (Pkw)</em>, <em>Frankfurt → Wien (Flug)</em>, <em>Wien → Innsbruck (Mietwagen)</em>. Aus Abfahrts- und Ankunftszeiten berechnet die App die Abwesenheit und den Verpflegungsmehraufwand.
        </Hinweis>
      )}
      <div className="karten">
        {r.strecken.map((s) => (
          <StreckenKarte
            key={s.id}
            s={s}
            nr={r.strecken.indexOf(s) + 1}
            e={e}
            ro={ro}
            setze={(p) => setze(s.id, p)}
            entfernen={() => update((x) => ({ ...x, strecken: x.strecken.filter((y) => y.id !== s.id) }))}
          />
        ))}
      </div>
      {!ro && (
        <div className="aktionen-zeile">
          <button type="button" className="btn btn-primaer" onClick={() => update((x) => ({ ...x, strecken: [...x.strecken, neueStrecke(x, e)] }))}>
            <Icon name="plus" /> {r.strecken.length ? 'Weitere Teilstrecke' : 'Erste Teilstrecke erfassen'}
          </button>
          {hatHin && !hatRueck && (
            <button type="button" className="btn" onClick={() => update((x) => ({ ...x, strecken: [...x.strecken, ...rueckreise(x)] }))}>
              <Icon name="undo" /> Rückreise anlegen
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

function StreckenKarte({ s, nr, e, ro, setze, entfernen }: { s: Teilstrecke; nr: number; e: Einstellungen; ro: boolean; setze: (p: Partial<Teilstrecke>) => void; entfernen: () => void }) {
  const vm = VERKEHRSMITTEL[s.verkehrsmittel];
  const satz = e.kmSaetze[vm.km ?? 'pkw'] ?? 30;
  const dauer = s.abfahrt.length > 10 && s.ankunft.length > 10 ? hoursBetween(toMs(s.abfahrt), toMs(s.ankunft)) : NaN;
  const waehleVm = (v: Verkehrsmittel) => {
    const info = VERKEHRSMITTEL[v];
    const ustNeu = s.betraege.length && sumBrutto(s.betraege) > 0 ? s.betraege : [{ ust: info.ust, bruttoCent: 0 }];
    setze({ verkehrsmittel: v, kostenart: info.kostenart, betraege: info.kostenart === 'beleg' ? ustNeu : s.betraege });
  };
  const kostenarten: Kostenart[] = vm.km ? ['km', 'beleg', 'keine'] : ['beleg', 'keine'];
  return (
    <article className="karte" id={'leg-' + s.id}>
      <header className="karte-kopf">
        <span className="karte-nr">{nr}</span>
        <div className="karte-titel">
          <strong>
            {s.von.ort || 'Start'} <Icon name="arrow" size={14} /> {s.nach.ort || 'Ziel'}
          </strong>
          <small>
            {vm.label}
            {s.nach.land && s.nach.land !== 'DE' ? ` · ${countryName(s.nach.land)}` : ''}
            {Number.isFinite(dauer) && dauer > 0 ? ` · ${fmtHours(dauer)}` : ''}
          </small>
        </div>
        {!ro && (
          <button type="button" className="icon-btn" onClick={entfernen} aria-label={`Teilstrecke ${nr} löschen`}>
            <Icon name="trash" />
          </button>
        )}
      </header>
      <div className="karte-inhalt">
        <Segmented
          klein
          label="Abschnitt"
          value={s.richtung}
          onChange={(v) => setze({ richtung: v })}
          options={[
            { value: 'hin', label: 'Hinreise' },
            { value: 'vorort', label: 'Vor Ort' },
            { value: 'rueck', label: 'Rückreise' },
          ]}
        />
        <Field label="Verkehrsmittel" pflicht>
          {() => (
            <div className="vm-auswahl" role="radiogroup" aria-label="Verkehrsmittel">
              {VERKEHRSMITTEL_ORDER.map((v) => (
                <button type="button" key={v} role="radio" aria-checked={s.verkehrsmittel === v} className={s.verkehrsmittel === v ? 'aktiv' : ''} onClick={() => waehleVm(v)}>
                  <Icon name={VERKEHRSMITTEL[v].icon} size={20} />
                  <span>{VERKEHRSMITTEL[v].kurz}</span>
                </button>
              ))}
            </div>
          )}
        </Field>
        <div className="grid-2">
          <fieldset className="gruppe">
            <legend>Von</legend>
            <OrtFelder ort={s.von} onChange={(o) => setze({ von: o })} pflicht labelOrt="Startort" />
          </fieldset>
          <fieldset className="gruppe">
            <legend>Nach</legend>
            <OrtFelder ort={s.nach} onChange={(o) => setze({ nach: o })} pflicht labelOrt="Zielort" />
          </fieldset>
        </div>
        <div className="grid-2">
          <Field label="Abfahrt" pflicht hinweis="Datum und Uhrzeit (Ortszeit)">
            {(id) => <DateTimeInput id={id} value={s.abfahrt} onChange={(v) => setze({ abfahrt: v, ankunft: s.ankunft || (v.length > 10 ? v.slice(0, 11) : s.ankunft) })} />}
          </Field>
          <Field label="Ankunft" pflicht fehler={Number.isFinite(dauer) && dauer <= 0} hinweis={Number.isFinite(dauer) && dauer <= 0 ? 'Ankunft muss nach der Abfahrt liegen' : undefined}>
            {(id) => <DateTimeInput id={id} value={s.ankunft} onChange={(v) => setze({ ankunft: v })} min={s.abfahrt} />}
          </Field>
        </div>
        <Field label="Kosten">
          {() => <Segmented klein label="Kostenart" value={s.kostenart} onChange={(v) => setze({ kostenart: v, betraege: v === 'beleg' && !s.betraege.length ? [{ ust: vm.ust === '0' && v === 'beleg' && vm.km ? '19' : vm.ust, bruttoCent: 0 }] : s.betraege })} options={kostenarten.map((k) => ({ value: k, label: KOSTENART_LABEL[k] }))} />}
        </Field>
        {s.kostenart === 'km' && (
          <div className="km-zeile">
            <Field label="Gefahrene Kilometer" pflicht>
              {(id) => <DecimalInput id={id} value={s.km} onChange={(v) => setze({ km: v })} suffix="km" placeholder="0" />}
            </Field>
            <div className="km-ergebnis">
              <span>
                {fmtNum2(satz)} €/km
              </span>
              <strong>{fmtEUR(kmBetrag(s.km, satz))}</strong>
            </div>
            {s.von.ort && s.nach.ort && (
              <a className="link-btn" href={mapsLink(s.von, s.nach)} target="_blank" rel="noreferrer">
                <Icon name="map" size={15} /> Entfernung in Karten nachsehen
              </a>
            )}
          </div>
        )}
        {s.kostenart === 'beleg' && (
          <>
            <BetragEditor werte={s.betraege} onChange={(b) => setze({ betraege: b })} standardUst={vm.ust} label="Ticketpreis / Kosten (brutto)" />
            <BezahltWahl value={s.bezahlt} onChange={(v) => setze({ bezahlt: v })} />
          </>
        )}
        {vm.hinweis && <p className="klein-hinweis">{vm.hinweis}</p>}
        <Anhaenge werte={s.belege} onChange={(b) => setze({ belege: b })} ro={ro} label="Ticket / Beleg" pflichtHinweis={s.kostenart === 'beleg'} />
        <Field label="Notiz">{(id) => <TextInput id={id} value={s.notiz} onChange={(v) => setze({ notiz: v })} placeholder="z. B. Flugnummer, Mitfahrer, Umweg-Grund" />}</Field>
      </div>
    </article>
  );
}
