"""Programmstart und Befehlszeile.

  Zeiterfassung                      Oberfläche öffnen und aufzeichnen
  Zeiterfassung --minimiert          im Hintergrund starten (Autostart)
  Zeiterfassung bericht [--zeitraum heute|gestern|woche|letzte-woche|monat|letzter-monat]
                        [--von TT.MM.JJJJ] [--bis TT.MM.JJJJ] [--ordner PFAD] [--nicht-oeffnen]
  Zeiterfassung aufzeichnen          ohne Oberfläche aufzeichnen (Strg+C beendet)
  Zeiterfassung demo                 Beispielbericht mit erfundenen Daten
  Zeiterfassung selbsttest [--ausgabe DATEI]
"""

from __future__ import annotations

import argparse
import logging
import os
import platform
import sys
import tempfile
import time
import traceback
from datetime import date, datetime, timedelta
from logging.handlers import RotatingFileHandler
from pathlib import Path

from . import APP_NAME, __version__, paths, winapi
from .config import ConfigError, ConfigStore, load_config
from .report import parse_date, period

log = logging.getLogger("zeiterfassung")


def _setup_logging(verbose: bool = False) -> None:
    handler = RotatingFileHandler(paths.log_path(), maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root = logging.getLogger()
    root.setLevel(logging.DEBUG if verbose else logging.INFO)
    root.addHandler(handler)
    if sys.stderr is not None:
        console = logging.StreamHandler()
        console.setLevel(logging.WARNING)
        root.addHandler(console)


def _ensure_streams() -> None:
    """Als .exe ohne Konsole sind stdout/stderr None – auf das Nirwana umlenken."""
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w", encoding="utf-8")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w", encoding="utf-8")


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog=APP_NAME, description="Automatische Zeiterfassung für Windows")
    p.add_argument("--minimiert", action="store_true", help="im Hintergrund starten")
    p.add_argument("--debug", action="store_true", help="ausführliches Protokoll")
    sub = p.add_subparsers(dest="befehl")

    b = sub.add_parser("bericht", help="Bericht erstellen")
    b.add_argument("--zeitraum", choices=["heute", "gestern", "woche", "letzte-woche", "monat", "letzter-monat"])
    b.add_argument("--von", help="TT.MM.JJJJ")
    b.add_argument("--bis", help="TT.MM.JJJJ")
    b.add_argument("--ordner", help="Zielordner")
    b.add_argument("--nicht-oeffnen", action="store_true")

    sub.add_parser("aufzeichnen", help="ohne Oberfläche aufzeichnen")

    d = sub.add_parser("demo", help="Beispielbericht erzeugen")
    d.add_argument("--ordner")
    d.add_argument("--nicht-oeffnen", action="store_true")

    t = sub.add_parser("selbsttest", help="Funktionen prüfen")
    t.add_argument("--ausgabe")
    t.add_argument("--sekunden", type=float, default=3.0)
    return p


def _cmd_report(args) -> int:
    from .export import create_report, open_path

    try:
        cfg = load_config(paths.config_path())
    except ConfigError as exc:
        winapi.message_box(f"Fehler in den Einstellungen:\n{exc}", icon=0x10)
        return 2
    if args.von or args.bis:
        von = parse_date(args.von or args.bis)
        bis = parse_date(args.bis or args.von)
    else:
        von, bis = period(args.zeitraum or "heute")
    html, xlsx = create_report(paths.db_path(), cfg, min(von, bis), max(von, bis),
                               folder=Path(args.ordner) if args.ordner else None)
    print(html)
    if xlsx:
        print(xlsx)
    if not args.nicht_oeffnen:
        open_path(html)
    return 0


def _cmd_demo(args) -> int:
    import tomllib

    from .config import parse_config
    from .demo import DEMO_CONFIG, create_demo_db
    from .export import create_report, open_path

    folder = Path(args.ordner) if args.ordner else Path(tempfile.mkdtemp(prefix="zeiterfassung-demo-"))
    folder.mkdir(parents=True, exist_ok=True)
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    days = [monday + timedelta(days=i) for i in range(5)]
    db = create_demo_db(folder / "demo.db", days)
    cfg = parse_config(tomllib.loads(DEMO_CONFIG))
    html, xlsx = create_report(db, cfg, days[0], days[0], folder=folder, now=datetime.combine(days[-1], datetime.max.time()))
    create_report(db, cfg, days[0], days[-1], folder=folder, now=datetime.combine(days[-1], datetime.max.time()))
    print(html)
    if not args.nicht_oeffnen:
        open_path(html)
    return 0


def _cmd_record(store: ConfigStore) -> int:
    from .tracker import Tracker

    tracker = Tracker(paths.db_path(), store, winapi.make_provider())
    tracker.start()
    print("Aufzeichnung läuft – beenden mit Strg+C")
    try:
        while tracker.is_alive():
            time.sleep(1)
            st = tracker.status()
            snap = st.snapshot
            if snap:
                print(f"\r{st.state:8} {snap.process[:20]:20} {snap.title[:70]:70}", end="", flush=True)
    except KeyboardInterrupt:
        pass
    tracker.stop()
    print()
    return 0


def _cmd_selftest(args) -> int:
    """Prüft Windows-Abfragen, Datenbank, Bericht und optionale Pakete. Ausgabe auch in Datei."""
    lines = [f"{APP_NAME} {__version__} – Selbsttest", f"Python {sys.version.split()[0]} auf {platform.platform()}",
             f"Als .exe: {bool(getattr(sys, 'frozen', False))}"]
    ok = True

    def check(name, func):
        nonlocal ok
        try:
            result = func()
            lines.append(f"[OK]     {name}: {result}")
        except Exception as exc:
            ok = False
            lines.append(f"[FEHLER] {name}: {exc!r}")
            lines.append(traceback.format_exc())

    for mod in ("tkinter", "openpyxl", "pystray", "PIL", "uiautomation"):
        check(f"Paket {mod}", lambda m=mod: __import__(m).__name__)

    provider = winapi.make_provider()
    check("Aktives Fenster", lambda: provider.snapshot())
    if winapi.IS_WINDOWS:
        check("Sekunden ohne Eingabe", winapi.idle_seconds)
        check("Eingabe-Desktop", winapi.input_desktop_name)
        check("Versionsinfo explorer.exe",
              lambda: winapi._version_strings(os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "explorer.exe")))
        check("Einzelinstanz", winapi.acquire_single_instance)

    def record_and_report():
        from .config import Config
        from .db import Database
        from .recorder import Recorder
        from .report import build_report
        from .report_html import render_html
        from .report_xlsx import write_xlsx

        with tempfile.TemporaryDirectory() as tmp:
            db = Database(Path(tmp) / "test.db")
            rec = Recorder(db, Config())
            end = time.time() + max(0.0, args.sekunden)
            n = 0
            while True:
                rec.observe(time.time(), provider.snapshot())
                n += 1
                if time.time() >= end:
                    break
                time.sleep(0.5)
            rec.stop(time.time())
            report = build_report(db, Config(), date.today(), date.today())
            render_html(report)
            write_xlsx(report, Path(tmp) / "test.xlsx")
            count = len(db.segments_between(0, time.time() + 10))
            db.close()
            return f"{n} Abfragen, {count} Abschnitt(e), Bericht OK"

    check("Aufzeichnung + Bericht", record_and_report)

    def browser():
        from .browser import BrowserUrlResolver

        r = BrowserUrlResolver(lambda: "domain")
        r._ensure_thread()
        for _ in range(50):
            if r.available is not None:
                break
            time.sleep(0.1)
        return "verfügbar" if r.available else (r.error or "nicht geprüft")

    check("Browser-Adressen (UI Automation)", browser)

    lines.append("ERGEBNIS: " + ("alles in Ordnung" if ok else "FEHLER gefunden"))
    text = "\n".join(lines)
    print(text)
    if args.ausgabe:
        Path(args.ausgabe).write_text(text, encoding="utf-8")
    return 0 if ok else 1


def main(argv=None) -> int:
    _ensure_streams()
    args = _parser().parse_args(argv)
    _setup_logging(args.debug)

    if args.befehl == "bericht":
        return _cmd_report(args)
    if args.befehl == "demo":
        return _cmd_demo(args)
    if args.befehl == "selbsttest":
        return _cmd_selftest(args)

    # Aufzeichnung (mit oder ohne Oberfläche): nur eine Instanz
    if not winapi.acquire_single_instance():
        if not winapi.signal_show_event():
            winapi.message_box("Die Zeiterfassung läuft bereits.")
        return 0

    store = ConfigStore(paths.config_path())
    if args.befehl == "aufzeichnen":
        return _cmd_record(store)

    try:
        from .gui import run_gui
    except ImportError as exc:  # tkinter fehlt
        winapi.message_box(f"Die Oberfläche kann nicht gestartet werden: {exc}", icon=0x10)
        return 1

    from .tracker import Tracker

    log.info("%s %s gestartet", APP_NAME, __version__)
    tracker = Tracker(paths.db_path(), store, winapi.make_provider())
    tracker.start()
    try:
        run_gui(store, tracker, paths.db_path(), start_hidden=args.minimiert, show_event=winapi.create_show_event())
    except Exception:
        log.exception("Unerwarteter Fehler in der Oberfläche")
        winapi.message_box("Unerwarteter Fehler – Details stehen in zeiterfassung.log im Datenordner.", icon=0x10)
        return 1
    finally:
        tracker.stop()
    return 0
