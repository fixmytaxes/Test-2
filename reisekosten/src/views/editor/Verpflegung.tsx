import type { Reise, TagAngabe } from '../../types';
import { countryName } from '../../data/countries';
import { fmtDayShort, fmtHours } from '../../lib/dates';
import { fmtEUR } from '../../lib/money';
import type { VmaErgebnis } from '../../lib/perdiem';
import { staedte } from '../../lib/rates';
import type { EinstellungsSnapshot } from '../../types';
import { CountrySelect, Hinweis, Section, Select } from '../../components/ui';
import { cx } from '../../lib/util';

export function Verpflegung({ r, vma, ctx, ro, update }: { r: Reise; vma: VmaErgebnis; ctx: EinstellungsSnapshot; ro: boolean; update: (fn: (r: Reise) => Reise) => void }) {
  const setzeTag = (d: string, p: Partial<TagAngabe>) =>
    update((x) => {
      const t = { ...(x.tage[d] ?? {}), ...p };
      (Object.keys(t) as (keyof TagAngabe)[]).forEach((k) => t[k] === undefined && delete t[k]);
      return { ...x, tage: { ...x.tage, [d]: t } };
    });
  const autoText = vma.mitUebernachtung ? 'ja' : 'nein';
  return (
    <Section id="sec-vma" titel="Verpflegungsmehraufwand" icon="food" summe={fmtEUR(vma.summeCent)} untertitel="Automatisch aus Reisezeiten und Reiseland berechnet">
      <div className="vma-optionen">
        <label className="inline-feld">
          <span>Übernachtung auswärts</span>
          <Select
            value={r.uebernachtungAuswaerts}
            onChange={(v) => update((x) => ({ ...x, uebernachtungAuswaerts: v }))}
            options={[
              { value: 'auto', label: `Automatisch (${autoText})` },
              { value: 'ja', label: 'Ja' },
              { value: 'nein', label: 'Nein' },
            ]}
          />
        </label>
        {vma.dauerStunden > 0 && (
          <span className="vma-dauer">
            Abwesenheit gesamt <strong>{fmtHours(vma.dauerStunden)}</strong>
          </span>
        )}
      </div>
      {vma.hinweise.map((h) => (
        <Hinweis key={h} art="warn">
          {h}
        </Hinweis>
      ))}
      {vma.tage.length > 0 && (
        <div className="vma-tage">
          {vma.tage.map((t) => {
            const angabe = r.tage[t.datum] ?? {};
            const cities = staedte(t.land, Number(t.datum.slice(0, 4)), ctx);
            return (
              <div className={cx('vma-tag', t.ausgeschlossen && 'aus')} key={t.datum}>
                <div className="vma-tag-kopf">
                  <strong>{fmtDayShort(t.datum)}</strong>
                  <span className="muted">
                    {fmtHours(t.stunden)} · {t.artText}
                  </span>
                  <span className="vma-betrag">{fmtEUR(t.betragCent)}</span>
                </div>
                <div className="vma-tag-felder">
                  <label className="inline-feld">
                    <span>Land</span>
                    <CountrySelect value={angabe.land ?? ''} onChange={(v) => setzeTag(t.datum, { land: v || undefined, ort: undefined })} leer={`Automatisch: ${countryName(t.landAuto)}`} />
                  </label>
                  {cities.length > 0 && (
                    <label className="inline-feld">
                      <span>Ort</span>
                      <Select
                        value={t.stadt ?? ''}
                        onChange={(v) => setzeTag(t.datum, { ort: v })}
                        options={[{ value: '', label: 'Übriges Land' }, ...cities.map((c) => ({ value: c, label: c }))]}
                      />
                    </label>
                  )}
                  <div className="mahlzeiten" role="group" aria-label="Gestellte Mahlzeiten">
                    {(
                      [
                        ['fruehstueck', 'Frühstück', t.fruehstueck],
                        ['mittag', 'Mittag', t.mittag],
                        ['abend', 'Abend', t.abend],
                      ] as const
                    ).map(([k, label, wert]) => (
                      <label key={k} className={cx('chip', wert && 'an')}>
                        <input type="checkbox" checked={wert} disabled={ro} onChange={(e) => setzeTag(t.datum, { [k]: e.target.checked })} />
                        {label}
                      </label>
                    ))}
                    <label className={cx('chip', 'chip-aus', t.ausgeschlossen && 'an')}>
                      <input type="checkbox" checked={t.ausgeschlossen} disabled={ro} onChange={(e) => setzeTag(t.datum, { ausschliessen: e.target.checked || undefined })} />
                      Kein VMA
                    </label>
                  </div>
                </div>
                <div className="vma-rechnung muted">
                  Pauschale {fmtEUR(t.pauschaleCent)} ({t.landName}
                  {t.stadt ? ' – ' + t.stadt : ''}: {fmtEUR(t.vollCent)} / {fmtEUR(t.teilCent)})
                  {t.kuerzungCent > 0 && <> · Kürzung − {fmtEUR(t.kuerzungCent)}</>}
                  {t.fruehstueckAuto && angabe.fruehstueck === undefined && <> · Frühstück laut Hotel</>}
                  {t.hinweise.length > 0 && <> · {t.hinweise.join('; ')}</>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="klein-hinweis">
        Gestellte Mahlzeiten (z. B. Frühstück im Hotelpreis, Verpflegung durch Veranstalter) kürzen die Pauschale um 20 % (Frühstück) bzw. 40 % (Mittag-/Abendessen) der vollen Tagespauschale. „Kein VMA“ schließt einen Tag aus (z. B. privater Aufenthalt, Dreimonatsfrist).
      </p>
    </Section>
  );
}
