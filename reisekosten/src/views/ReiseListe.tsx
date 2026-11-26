import { useMemo, useState } from 'react';
import type { Status } from '../types';
import { useStore } from '../store';
import { fmtEUR } from '../lib/money';
import { berechne, stichtag } from '../lib/totals';
import { normalize } from '../lib/util';
import { Icon, Leer, Segmented } from '../components/ui';
import { ReiseZeile } from './Dashboard';

type Filter = 'alle' | Status;

export function ReiseListe() {
  const { reisen, einstellungen: e, bereit } = useStore();
  const [filter, setFilter] = useState<Filter>('alle');
  const [suche, setSuche] = useState('');
  const liste = useMemo(
    () =>
      reisen
        .map((r) => ({ r, a: berechne(r, e), tag: stichtag(r) }))
        .filter((x) => filter === 'alle' || x.r.status === filter)
        .filter((x) => {
          const q = normalize(suche);
          if (!q) return true;
          return normalize([x.r.name, x.r.anlass, x.r.ziel.ort, x.r.ziel.bezeichnung, x.r.nummer].join(' ')).includes(q);
        })
        .sort((a, b) => b.tag.localeCompare(a.tag) || b.r.erstelltAm.localeCompare(a.r.erstelltAm)),
    [reisen, e, filter, suche],
  );
  const anzahl = (s: Status) => reisen.filter((r) => r.status === s).length;
  const summe = liste.filter((x) => x.r.status !== 'storniert').reduce((s, x) => s + x.a.summen.gesamtBrutto, 0);
  if (!bereit) return null;
  return (
    <div className="seite">
      <div className="seite-kopf">
        <div>
          <h1>Reisen</h1>
          <p className="muted">
            {liste.length} {liste.length === 1 ? 'Reise' : 'Reisen'} · {fmtEUR(summe)}
          </p>
        </div>
        <a className="btn btn-primaer" href="#/neu">
          <Icon name="plus" /> Neue Reise
        </a>
      </div>
      <div className="filter-leiste">
        <div className="suche">
          <Icon name="list" size={16} />
          <input type="search" placeholder="Suchen: Name, Ziel, Nummer …" value={suche} onChange={(ev) => setSuche(ev.target.value)} aria-label="Reisen durchsuchen" />
        </div>
        <Segmented<Filter>
          klein
          label="Status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'alle', label: 'Alle' },
            { value: 'entwurf', label: `Entwürfe ${anzahl('entwurf') || ''}` },
            { value: 'abgeschlossen', label: `Offen ${anzahl('abgeschlossen') || ''}` },
            { value: 'eingereicht', label: 'Eingereicht' },
            { value: 'storniert', label: 'Storniert' },
          ]}
        />
      </div>
      {liste.length ? (
        <ul className="reise-liste">
          {liste.map(({ r, a }) => (
            <ReiseZeile key={r.id} r={r} betrag={a.summen.gesamtBrutto} />
          ))}
        </ul>
      ) : (
        <Leer icon="list" titel={reisen.length ? 'Keine passenden Reisen' : 'Noch keine Reisen erfasst'} aktion={!reisen.length ? <a className="btn btn-primaer" href="#/neu"><Icon name="plus" /> Neue Reise</a> : undefined} />
      )}
    </div>
  );
}
