import { useMemo, useState } from 'react';
import type { Reise } from '../types';
import { useStore } from '../store';
import { fmtDate, today } from '../lib/dates';
import { STATUS_LABEL } from '../lib/defaults';
import { fmtEUR } from '../lib/money';
import { BEREICH_LABEL, BEREICH_ORDER, berechne, reiseZeitraum, stichtag, type Bereich } from '../lib/totals';
import { Badge, Hinweis, Icon, Leer, Segmented } from '../components/ui';
import { cx } from '../lib/util';
import { STATUS_BADGE } from './ReiseEditor';
import { countryName } from '../data/countries';

type Periode = 'monat' | 'quartal' | 'jahr';
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

interface Zeitraum {
  von: string;
  bis: string;
  label: string;
}

function zeitraum(p: Periode, offset: number): Zeitraum {
  const [y, m] = today().split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (p === 'jahr') {
    const j = y + offset;
    return { von: `${j}-01-01`, bis: `${j}-12-31`, label: String(j) };
  }
  if (p === 'quartal') {
    const qIdx = Math.floor((m - 1) / 3) + offset + y * 4;
    const j = Math.floor(qIdx / 4);
    const q = ((qIdx % 4) + 4) % 4;
    const ende = new Date(Date.UTC(j, q * 3 + 3, 0)).getUTCDate();
    return { von: `${j}-${pad(q * 3 + 1)}-01`, bis: `${j}-${pad(q * 3 + 3)}-${pad(ende)}`, label: `${q + 1}. Quartal ${j}` };
  }
  const idx = y * 12 + (m - 1) + offset;
  const j = Math.floor(idx / 12);
  const mo = idx % 12;
  const ende = new Date(Date.UTC(j, mo + 1, 0)).getUTCDate();
  return { von: `${j}-${pad(mo + 1)}-01`, bis: `${j}-${pad(mo + 1)}-${pad(ende)}`, label: `${MONATE[mo]} ${j}` };
}

const KURZ: Record<Bereich, string> = { fahrt: 'Fahrt', uebernachtung: 'Übernachtung', vma: 'Verpflegung', sonstige: 'Sonstiges', bewirtung: 'Bewirtung' };
const VORHER: Record<Periode, string> = { monat: 'Vormonat', quartal: 'Vorquartal', jahr: 'Vorjahr' };

export function Dashboard() {
  const { reisen, einstellungen: e, bereit } = useStore();
  const [periode, setPeriode] = useState<Periode>('monat');
  const [offset, setOffset] = useState(0);
  const [tabelle, setTabelle] = useState(false);

  const berechnet = useMemo(() => reisen.map((r) => ({ r, a: berechne(r, e), tag: stichtag(r) })), [reisen, e]);
  const akt = zeitraum(periode, offset);
  const vor = zeitraum(periode, offset - 1);

  const summe = (z: Zeitraum) => {
    const liste = berechnet.filter((x) => x.r.status !== 'storniert' && x.tag >= z.von && x.tag <= z.bis);
    const bereiche = Object.fromEntries(BEREICH_ORDER.map((b) => [b, 0])) as Record<Bereich, number>;
    let gesamt = 0;
    let vorsteuer = 0;
    for (const { a } of liste) {
      for (const b of BEREICH_ORDER) bereiche[b] += a.summen.bereiche[b];
      gesamt += a.summen.gesamtBrutto;
      vorsteuer += a.summen.vorsteuerReise + a.summen.bewirtung.vorsteuerCent;
    }
    return { anzahl: liste.length, entwuerfe: liste.filter((x) => x.r.status === 'entwurf').length, bereiche, gesamt, vorsteuer };
  };
  const sA = summe(akt);
  const sV = summe(vor);

  const entwuerfe = berechnet.filter((x) => x.r.status === 'entwurf').sort((a, b) => b.r.geaendertAm.localeCompare(a.r.geaendertAm));
  const nichtEingereicht = berechnet.filter((x) => x.r.status === 'abgeschlossen');
  const stornoOffen = berechnet.filter((x) => x.r.status === 'storniert' && x.r.versand.some((v) => !v.storno && (v.weg === 'email' || v.weg === 'manuell')) && !x.r.versand.some((v) => v.storno));
  const letzte = [...berechnet].sort((a, b) => b.tag.localeCompare(a.tag)).slice(0, 6);
  const einrichtungFehlt = !e.firma.name || !e.reisender.name;

  if (!bereit) return null;

  return (
    <div className="seite dashboard">
      <div className="seite-kopf">
        <div>
          <h1>Übersicht</h1>
          <p className="muted">{e.firma.name || 'Reisekosten'}{e.reisender.name ? ' · ' + e.reisender.name : ''}</p>
        </div>
        <a className="btn btn-primaer" href="#/neu">
          <Icon name="plus" /> Neue Reise
        </a>
      </div>

      {einrichtungFehlt && (
        <Hinweis art="warn" icon="settings">
          <strong>Erst einrichten:</strong> Unternehmen (Firmensitz) und Reisenden in den <a href="#/einstellungen">Einstellungen</a> hinterlegen – sie erscheinen auf jeder Abrechnung und in der E-Rechnung.
        </Hinweis>
      )}

      {(entwuerfe.length > 0 || nichtEingereicht.length > 0 || stornoOffen.length > 0) && (
        <section className="offen">
          <h2>Offene Punkte</h2>
          <div className="offen-raster">
            {nichtEingereicht.length > 0 && (
              <OffenKarte art="warn" icon="send" titel={`${nichtEingereicht.length} ${nichtEingereicht.length === 1 ? 'Abrechnung' : 'Abrechnungen'} noch nicht eingereicht`} liste={nichtEingereicht.map((x) => ({ r: x.r, betrag: x.a.summen.gesamtBrutto }))} />
            )}
            {entwuerfe.length > 0 && (
              <OffenKarte art="info" icon="edit" titel={`${entwuerfe.length} ${entwuerfe.length === 1 ? 'Reise' : 'Reisen'} noch nicht abgeschlossen`} liste={entwuerfe.map((x) => ({ r: x.r, betrag: x.a.summen.gesamtBrutto }))} />
            )}
            {stornoOffen.length > 0 && <OffenKarte art="fehler" icon="undo" titel="Stornobeleg noch nicht an DATEV gesendet" liste={stornoOffen.map((x) => ({ r: x.r, betrag: x.a.summen.gesamtBrutto }))} />}
          </div>
        </section>
      )}

      <section className="vergleich">
        <div className="vergleich-kopf">
          <h2>Reisekosten im Vergleich</h2>
          <Segmented
            klein
            label="Zeitraum"
            value={periode}
            onChange={(v) => {
              setPeriode(v);
              setOffset(0);
            }}
            options={[
              { value: 'monat', label: 'Monat' },
              { value: 'quartal', label: 'Quartal' },
              { value: 'jahr', label: 'Jahr' },
            ]}
          />
        </div>
        <div className="periode-nav">
          <button type="button" className="icon-btn" onClick={() => setOffset(offset - 1)} aria-label="Vorheriger Zeitraum">
            <Icon name="back" />
          </button>
          <div>
            <strong>{akt.label}</strong>
            <small>
              im Vergleich zu {VORHER[periode]} ({vor.label})
            </small>
          </div>
          <button type="button" className="icon-btn" onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label="Nächster Zeitraum">
            <Icon name="arrow" />
          </button>
        </div>

        <div className="kpis">
          <Kpi label="Kosten gesamt" wert={fmtEUR(sA.gesamt)} delta={delta(sA.gesamt, sV.gesamt)} vorher={fmtEUR(sV.gesamt)} />
          <Kpi label="Reisen" wert={String(sA.anzahl)} delta={sA.anzahl - sV.anzahl} vorher={String(sV.anzahl)} absolut />
          <Kpi label="Ø je Reise" wert={fmtEUR(sA.anzahl ? Math.round(sA.gesamt / sA.anzahl) : 0)} vorher={fmtEUR(sV.anzahl ? Math.round(sV.gesamt / sV.anzahl) : 0)} delta={delta(sA.anzahl ? sA.gesamt / sA.anzahl : 0, sV.anzahl ? sV.gesamt / sV.anzahl : 0)} />
          <Kpi label="Vorsteuer" wert={fmtEUR(sA.vorsteuer)} vorher={fmtEUR(sV.vorsteuer)} />
        </div>

        <div className="chart-kopf">
          <div className="legende" aria-hidden={tabelle}>
            <span>
              <i className="swatch s1" /> {akt.label}
            </span>
            <span>
              <i className="swatch s2" /> {vor.label}
            </span>
          </div>
          <button type="button" className="link-btn" onClick={() => setTabelle(!tabelle)}>
            <Icon name={tabelle ? 'chevron' : 'list'} size={14} /> {tabelle ? 'Als Diagramm' : 'Als Tabelle'}
          </button>
        </div>
        {sA.gesamt === 0 && sV.gesamt === 0 ? (
          <p className="muted leer-chart">Keine Reisen in diesen Zeiträumen.</p>
        ) : tabelle ? (
          <table className="tabelle">
            <thead>
              <tr>
                <th>Kostenart</th>
                <th className="r">{akt.label}</th>
                <th className="r">{vor.label}</th>
                <th className="r">Veränderung</th>
              </tr>
            </thead>
            <tbody>
              {BEREICH_ORDER.map((b) => (
                <tr key={b}>
                  <td>{BEREICH_LABEL[b]}</td>
                  <td className="r">{fmtEUR(sA.bereiche[b])}</td>
                  <td className="r">{fmtEUR(sV.bereiche[b])}</td>
                  <td className="r">{fmtDelta(delta(sA.bereiche[b], sV.bereiche[b]))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <VergleichChart zeilen={BEREICH_ORDER.map((b) => ({ label: KURZ[b], a: sA.bereiche[b], v: sV.bereiche[b] }))} labelA={akt.label} labelV={vor.label} />
        )}
        {(sA.entwuerfe > 0 || sV.entwuerfe > 0) && <p className="klein-hinweis">Enthält noch nicht abgeschlossene Entwürfe. Zuordnung nach Reiseende, stornierte Abrechnungen sind nicht enthalten.</p>}
      </section>

      <section className="letzte">
        <div className="vergleich-kopf">
          <h2>Letzte Reisen</h2>
          <a className="link-btn" href="#/reisen">
            Alle anzeigen <Icon name="chevron" size={14} />
          </a>
        </div>
        {letzte.length ? (
          <ul className="reise-liste">
            {letzte.map(({ r, a }) => (
              <ReiseZeile key={r.id} r={r} betrag={a.summen.gesamtBrutto} />
            ))}
          </ul>
        ) : (
          <Leer icon="plane" titel="Noch keine Reisen erfasst" text="Legen Sie Ihre erste Reise an – Teilstrecken, Übernachtungen und Belege lassen sich jederzeit ergänzen." aktion={<a className="btn btn-primaer" href="#/neu"><Icon name="plus" /> Neue Reise</a>} />
        )}
      </section>
    </div>
  );
}

function delta(a: number, v: number): number | null {
  if (!v) return a ? null : 0;
  return ((a - v) / v) * 100;
}

function fmtDelta(d: number | null): string {
  if (d === null) return 'neu';
  if (Math.abs(d) < 0.05) return '±0 %';
  return `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('de-DE', { maximumFractionDigits: 0 })} %`;
}

function Kpi({ label, wert, delta: d, vorher, absolut, hoeherIstGut }: { label: string; wert: string; delta?: number | null; vorher: string; absolut?: boolean; hoeherIstGut?: boolean }) {
  const richtung = d === undefined || d === null || Math.abs(d) < 0.05 ? 0 : d > 0 ? 1 : -1;
  const gut = hoeherIstGut === undefined ? null : richtung === 0 ? null : (richtung > 0) === hoeherIstGut;
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-wert">{wert}</strong>
      <span className="kpi-delta">
        {d !== undefined && (
          <span className={cx('delta', gut === true && 'gut', gut === false && 'schlecht')}>
            {richtung !== 0 && <Icon name={richtung > 0 ? 'up' : 'down'} size={13} />}
            {absolut ? (d === 0 ? '±0' : `${(d as number) > 0 ? '+' : '−'}${Math.abs(d as number)}`) : fmtDelta(d)}
          </span>
        )}
        <span className="muted">vorher {vorher}</span>
      </span>
    </div>
  );
}

/** Horizontale Balken: aktueller Zeitraum gegen Vergleichszeitraum je Kostenart */
function VergleichChart({ zeilen, labelA, labelV }: { zeilen: { label: string; a: number; v: number }[]; labelA: string; labelV: string }) {
  const max = Math.max(1, ...zeilen.flatMap((z) => [z.a, z.v]));
  return (
    <div className="hbar" role="img" aria-label={`Kosten je Kostenart: ${labelA} im Vergleich zu ${labelV}`}>
      {zeilen.map((z) => (
        <div className="hbar-zeile" key={z.label} tabIndex={0}>
          <span className="hbar-label">{z.label}</span>
          <div className="hbar-balken">
            <div className="hbar-spur">
              <span className="bar s1" style={{ width: `${(z.a / max) * 100}%` }} />
              <span className="hbar-wert">{fmtEUR(z.a)}</span>
            </div>
            <div className="hbar-spur">
              <span className="bar s2" style={{ width: `${(z.v / max) * 100}%` }} />
            </div>
          </div>
          <div className="tip" role="tooltip">
            <strong>{z.label}</strong>
            <span>
              <i className="key s1" /> <b>{fmtEUR(z.a)}</b> {labelA}
            </span>
            <span>
              <i className="key s2" /> <b>{fmtEUR(z.v)}</b> {labelV}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OffenKarte({ art, icon, titel, liste }: { art: 'warn' | 'info' | 'fehler'; icon: string; titel: string; liste: { r: Reise; betrag: number }[] }) {
  return (
    <div className={cx('offen-karte', 'offen-' + art)}>
      <div className="offen-titel">
        <Icon name={icon} />
        <strong>{titel}</strong>
      </div>
      <ul>
        {liste.slice(0, 4).map(({ r, betrag }) => (
          <li key={r.id}>
            <a href={'#/reise/' + r.id}>
              <span>
                {r.nummer ? <b>{r.nummer}</b> : null} {r.name || 'Neue Reise'}
              </span>
              <span className="betrag">{fmtEUR(betrag)}</span>
            </a>
          </li>
        ))}
        {liste.length > 4 && (
          <li className="muted">
            <a href="#/reisen">… und {liste.length - 4} weitere</a>
          </li>
        )}
      </ul>
    </div>
  );
}

export function ReiseZeile({ r, betrag }: { r: Reise; betrag: number }) {
  const { beginn, ende } = reiseZeitraum(r);
  const datum = beginn ? (fmtDate(beginn) === fmtDate(ende) ? fmtDate(beginn) : `${fmtDate(beginn)} – ${fmtDate(ende)}`) : 'ohne Termin';
  return (
    <li>
      <a className="reise-zeile" href={'#/reise/' + r.id}>
        <span className="reise-icon">
          <Icon name={r.strecken.some((s) => s.verkehrsmittel === 'flug') ? 'plane' : r.strecken.some((s) => s.verkehrsmittel === 'bahn' || s.verkehrsmittel === 'oepnv') ? 'train' : 'car'} />
        </span>
        <span className="reise-info">
          <strong>{r.name || 'Neue Reise'}</strong>
          <small>
            {datum}
            {r.ziel.ort ? ' · ' + r.ziel.ort : ''}
            {r.ziel.land && r.ziel.land !== 'DE' ? ` (${countryName(r.ziel.land)})` : ''}
          </small>
        </span>
        <span className="reise-rechts">
          <strong className={cx(r.status === 'storniert' && 'durch')}>{fmtEUR(betrag)}</strong>
          <span className="reise-status">
            {r.nummer && <small>{r.nummer}</small>}
            <Badge art={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
          </span>
        </span>
      </a>
    </li>
  );
}
