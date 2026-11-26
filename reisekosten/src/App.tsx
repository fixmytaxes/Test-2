import { useEffect, useRef } from 'react';
import { useStore } from './store';
import { neueReise } from './lib/defaults';
import { navigate, useRoute } from './router';
import { Icon } from './components/ui';
import { Dashboard } from './views/Dashboard';
import { Einstellungen } from './views/Einstellungen';
import { ReiseEditor } from './views/ReiseEditor';
import { ReiseListe } from './views/ReiseListe';
import { cx } from './lib/util';

function NeueReise() {
  const { speichereReise, bereit, einstellungen } = useStore();
  const angelegt = useRef(false);
  useEffect(() => {
    if (!bereit || angelegt.current) return;
    angelegt.current = true;
    const r = neueReise();
    r.start = { typ: einstellungen.firma.ort ? 'firmensitz' : einstellungen.wohnung.ort ? 'wohnung' : 'firmensitz' };
    void speichereReise(r).then(() => {
      history.replaceState(null, '', '#/reise/' + r.id);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bereit]);
  return null;
}

export function App() {
  const route = useRoute();
  const { toasts, reisen } = useStore();
  const seite = route[0] ?? '';
  const offen = reisen.filter((r) => r.status === 'abgeschlossen').length;
  const nav = [
    { href: '#/', id: '', icon: 'home', label: 'Übersicht' },
    { href: '#/reisen', id: 'reisen', icon: 'list', label: 'Reisen', badge: offen },
    { href: '#/neu', id: 'neu', icon: 'plus', label: 'Neue Reise', primaer: true },
    { href: '#/einstellungen', id: 'einstellungen', icon: 'settings', label: 'Einstellungen' },
  ];
  const aktiv = seite === 'reise' ? 'reisen' : seite;
  return (
    <div className="app">
      <header className="topbar">
        <a className="marke" href="#/" onClick={() => navigate('/')}>
          <span className="marke-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <rect x="2" y="2" width="28" height="28" rx="8" fill="currentColor" />
              <path d="M9 21.5h14M11 18l3.2-6.2a1.6 1.6 0 0 1 1.4-.8h3.1a1.6 1.6 0 0 1 1.4.8L23 18M10 18h14v3.5H10z" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </span>
          <span>Reisekosten</span>
        </a>
        <nav className="nav" aria-label="Bereiche">
          {nav.map((n) => (
            <a key={n.id} href={n.href} className={cx('nav-item', aktiv === n.id && 'aktiv', n.primaer && 'nav-primaer')} aria-current={aktiv === n.id ? 'page' : undefined}>
              <Icon name={n.icon} size={22} />
              <span>{n.label}</span>
              {!!n.badge && <b className="nav-badge">{n.badge}</b>}
            </a>
          ))}
        </nav>
      </header>
      <main className="main">
        {seite === '' && <Dashboard />}
        {seite === 'reisen' && <ReiseListe />}
        {seite === 'neu' && <NeueReise />}
        {seite === 'reise' && route[1] && <ReiseEditor key={route[1]} id={route[1]} />}
        {seite === 'einstellungen' && <Einstellungen />}
      </main>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cx('toast', 'toast-' + t.art)}>
            <Icon name={t.art === 'ok' ? 'check' : t.art === 'fehler' ? 'alert' : 'info'} size={17} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
