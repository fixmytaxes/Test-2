import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { countryOptions } from '../data/countries';
import { centToInput, fmtDecimal, parseDecimal, parseEuro } from '../lib/money';
import { cx } from '../lib/util';

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  plus: 'M12 5v14M5 12h14',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  car: 'M5 17h14M6.5 17v2M17.5 17v2M3.5 13.5 5.4 8a2 2 0 0 1 1.9-1.4h9.4A2 2 0 0 1 18.6 8l1.9 5.5V17H3.5zM7 13.5h.01M17 13.5h.01',
  users: 'M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.4M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  bus: 'M6 18v2M18 18v2M5 4h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM4 12h16M8 15h.01M16 15h.01',
  train: 'M7 3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM4 11h16M8 21l2-4M16 21l-2-4M8 14h.01M16 14h.01',
  plane: 'M10.5 13.5 4 17l1 1.5 7-1.5 3 4h2l-1.5-5L20 13a1.5 1.5 0 0 0-1-2.5l-4 .5L9.5 5H8l2 6.5-4-.5L4.5 9H3l1.5 4z',
  bike: 'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM18.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M12 14.5 9 8M14 5h2.5',
  key: 'M14.5 9.5a4.5 4.5 0 1 1-1.3-3.2L21 14v3h-3v-2h-2v-2h-2l-.8-.8',
  taxi: 'M5 17h14M6.5 17v2M17.5 17v2M3.5 13.5 5.4 8a2 2 0 0 1 1.9-1.4h9.4A2 2 0 0 1 18.6 8l1.9 5.5V17H3.5zM9.5 6.6 10 4h4l.5 2.6',
  moto: 'M5 17.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 17.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 14.5h6l3-5h3l2 5M14 9.5 12.5 6H10',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  clip: 'M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6',
  check: 'M5 12.5 10 17l9-10',
  x: 'M6 6l12 12M18 6 6 18',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  share: 'M12 15V3M8 7l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6',
  bed: 'M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-8v6M7 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  food: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1.5-3 4-3 7h3v11',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  pin: 'M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  info: 'M12 16v-4.5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  minus: 'M5 12h14',
  euro: 'M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10h9M4 14h9',
  server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  chevron: 'M9 6l6 6-6 6',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
};

export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={cx('icon', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.dots} />
    </svg>
  );
}

export function Pflicht() {
  return (
    <>
      <span className="pflicht" title="Pflichtangabe (gesetzliche Mindestanforderung)" aria-hidden="true">
        *
      </span>
      <span className="sr-only"> (Pflichtangabe)</span>
    </>
  );
}

interface FieldProps {
  label: ReactNode;
  pflicht?: boolean;
  hinweis?: ReactNode;
  children: (id: string) => ReactNode;
  className?: string;
  fehler?: boolean;
}

export function Field({ label, pflicht, hinweis, children, className, fehler }: FieldProps) {
  const id = useId();
  return (
    <div className={cx('field', className, fehler && 'field-fehler')}>
      <label htmlFor={id}>
        {label}
        {pflicht && <Pflicht />}
      </label>
      {children(id)}
      {hinweis && <div className="field-hinweis">{hinweis}</div>}
    </div>
  );
}

type InputBase = { id?: string; placeholder?: string; autoComplete?: string; required?: boolean; className?: string; 'aria-label'?: string };

export function TextInput({ value, onChange, ...rest }: InputBase & { value: string | undefined; onChange: (v: string) => void; type?: string; list?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  return <input type={rest.type ?? 'text'} {...rest} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}

export function TextArea({ value, onChange, rows = 2, ...rest }: InputBase & { value: string | undefined; onChange: (v: string) => void; rows?: number }) {
  return <textarea rows={rows} {...rest} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}

/** Eingabe eines Geldbetrags in Euro (deutsches Format), Wert in Cent */
export function MoneyInput({ value, onChange, ...rest }: InputBase & { value: number | undefined; onChange: (c: number) => void }) {
  const [text, setText] = useState(centToInput(value));
  const fokus = useRef(false);
  useEffect(() => {
    if (!fokus.current) setText(centToInput(value));
  }, [value]);
  return (
    <div className="money">
      <input
        {...rest}
        inputMode="decimal"
        value={text}
        onFocus={() => (fokus.current = true)}
        onChange={(e) => {
          setText(e.target.value);
          const c = parseEuro(e.target.value);
          onChange(c === null ? 0 : Math.max(0, c));
        }}
        onBlur={() => {
          fokus.current = false;
          setText(centToInput(value));
        }}
      />
      <span className="money-suffix">€</span>
    </div>
  );
}

export function DecimalInput({ value, onChange, suffix, digits = 1, ...rest }: InputBase & { value: number | undefined; onChange: (v: number | undefined) => void; suffix?: string; digits?: number }) {
  const [text, setText] = useState(fmtDecimal(value, digits));
  const fokus = useRef(false);
  useEffect(() => {
    if (!fokus.current) setText(fmtDecimal(value, digits));
  }, [value, digits]);
  return (
    <div className="money">
      <input
        {...rest}
        inputMode="decimal"
        value={text}
        onFocus={() => (fokus.current = true)}
        onChange={(e) => {
          setText(e.target.value);
          const v = parseDecimal(e.target.value);
          onChange(v === null ? undefined : Math.max(0, v));
        }}
        onBlur={() => {
          fokus.current = false;
          setText(fmtDecimal(value, digits));
        }}
      />
      {suffix && <span className="money-suffix">{suffix}</span>}
    </div>
  );
}

/** Datum und Uhrzeit als zwei native Felder (gut bedienbar auf dem Smartphone) */
export function DateTimeInput({ value, onChange, id, min }: { value: string; onChange: (v: string) => void; id?: string; min?: string }) {
  const d = (value || '').slice(0, 10);
  const t = (value || '').slice(11, 16);
  const set = (nd: string, nt: string) => onChange(nd ? (nt ? `${nd}T${nt}` : nd) : '');
  return (
    <div className="datetime">
      <input id={id} type="date" value={d} min={min?.slice(0, 10)} onChange={(e) => set(e.target.value, t)} aria-label="Datum" />
      <input type="time" value={t} onChange={(e) => set(d, e.target.value)} aria-label="Uhrzeit" />
    </div>
  );
}

export function DateInput({ value, onChange, id, min }: { value: string | undefined; onChange: (v: string) => void; id?: string; min?: string }) {
  return <input id={id} type="date" value={value ?? ''} min={min} onChange={(e) => onChange(e.target.value)} />;
}

export function Select<T extends string>({ value, onChange, options, id, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; id?: string; className?: string }) {
  return (
    <select id={id} className={className} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function CountrySelect({ value, onChange, id, leer }: { value: string; onChange: (v: string) => void; id?: string; leer?: string }) {
  const opts = countryOptions();
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {leer !== undefined && <option value="">{leer}</option>}
      {opts.map((o) => (
        <option key={o.code} value={o.code}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label, klein }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; icon?: string }[]; label: string; klein?: boolean }) {
  return (
    <div className={cx('segmented', klein && 'segmented-klein')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.value} role="radio" aria-checked={value === o.value} className={cx(value === o.value && 'aktiv')} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={16} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, hinweis }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hinweis?: ReactNode }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hinweis && <small>{hinweis}</small>}
      </span>
    </label>
  );
}

export function Section({ id, titel, icon, summe, anzahl, children, aktion, offen: offenStart = true, untertitel }: { id?: string; titel: ReactNode; icon?: string; summe?: ReactNode; anzahl?: number; children: ReactNode; aktion?: ReactNode; offen?: boolean; untertitel?: ReactNode }) {
  const [offen, setOffen] = useState(offenStart);
  return (
    <section id={id} className={cx('section', !offen && 'zu')}>
      <header className="section-kopf">
        <button type="button" className="section-toggle" onClick={() => setOffen(!offen)} aria-expanded={offen}>
          {icon && (
            <span className="section-icon">
              <Icon name={icon} />
            </span>
          )}
          <span className="section-titel">
            <span>{titel}</span>
            {untertitel && <small>{untertitel}</small>}
          </span>
          {anzahl !== undefined && anzahl > 0 && <span className="zaehler">{anzahl}</span>}
          {summe !== undefined && <span className="section-summe">{summe}</span>}
          <Icon name={offen ? 'up' : 'down'} className="section-chevron" />
        </button>
        {aktion}
      </header>
      {offen && <div className="section-inhalt">{children}</div>}
    </section>
  );
}

export function Badge({ children, art = 'neutral', icon }: { children: ReactNode; art?: 'neutral' | 'ok' | 'warn' | 'fehler' | 'info' | 'aus'; icon?: string }) {
  return (
    <span className={cx('badge', 'badge-' + art)}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

export function Modal({ titel, children, onClose, aktionen, breit }: { titel: ReactNode; children: ReactNode; onClose: () => void; aktionen?: ReactNode; breit?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-hg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('modal', breit && 'modal-breit')} role="dialog" aria-modal="true">
        <div className="modal-kopf">
          <h2>{titel}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-inhalt">{children}</div>
        {aktionen && <div className="modal-aktionen">{aktionen}</div>}
      </div>
    </div>
  );
}

export function Leer({ icon, titel, text, aktion }: { icon: string; titel: string; text?: ReactNode; aktion?: ReactNode }) {
  return (
    <div className="leer">
      <span className="leer-icon">
        <Icon name={icon} size={26} />
      </span>
      <strong>{titel}</strong>
      {text && <p>{text}</p>}
      {aktion}
    </div>
  );
}

export function Hinweis({ art = 'info', children, icon }: { art?: 'info' | 'warn' | 'fehler' | 'ok'; children: ReactNode; icon?: string }) {
  return (
    <div className={cx('hinweis', 'hinweis-' + art)}>
      <Icon name={icon ?? (art === 'ok' ? 'check' : art === 'info' ? 'info' : 'alert')} size={17} />
      <div>{children}</div>
    </div>
  );
}
