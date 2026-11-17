"""Bericht erzeugen, als HTML und Excel speichern und öffnen."""

from __future__ import annotations

import logging
import os
import subprocess
import sys
import webbrowser
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from . import paths
from .config import Config
from .db import Database
from .report import build_report
from .report_html import render_html

log = logging.getLogger(__name__)


def report_folder(config: Config, override: Optional[Path] = None) -> Path:
    folder = override or config.berichtsordner or paths.default_report_dir()
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _base_name(von: date, bis: date) -> str:
    if von == bis:
        return f"Zeiterfassung_{von:%Y-%m-%d}"
    return f"Zeiterfassung_{von:%Y-%m-%d}_bis_{bis:%Y-%m-%d}"


def _writable(path: Path) -> Path:
    """Ist die Datei z. B. noch in Excel geöffnet, wird ein neuer Name mit Uhrzeit verwendet."""
    if not path.exists():
        return path
    try:
        with open(path, "a"):
            pass
        return path
    except PermissionError:
        return path.with_name(f"{path.stem}_{datetime.now():%H%M%S}{path.suffix}")


def create_report(
    db_path: Path,
    config: Config,
    von: date,
    bis: date,
    folder: Optional[Path] = None,
    now: Optional[datetime] = None,
) -> tuple[Path, Optional[Path]]:
    """Erstellt HTML (immer) und Excel (wenn openpyxl verfügbar). Gibt die Pfade zurück."""
    db = Database(db_path)
    try:
        report = build_report(db, config, von, bis, now=now)
    finally:
        db.close()
    folder = report_folder(config, folder)
    base = _base_name(von, bis)

    xlsx_path: Optional[Path] = None
    try:
        from .report_xlsx import write_xlsx

        xlsx_path = write_xlsx(report, _writable(folder / f"{base}.xlsx"))
    except ImportError:
        log.warning("openpyxl nicht installiert – Excel-Export übersprungen")

    html_path = _writable(folder / f"{base}.html")
    html_path.write_text(render_html(report, xlsx_path.name if xlsx_path else ""), encoding="utf-8")
    log.info("Bericht erstellt: %s", html_path)
    return html_path, xlsx_path


def open_path(path: Path) -> None:
    """Datei oder Ordner mit dem Standardprogramm öffnen."""
    try:
        if sys.platform == "win32":
            os.startfile(str(path))  # type: ignore[attr-defined]
        elif path.suffix.lower() in (".html", ".htm"):
            webbrowser.open(path.resolve().as_uri())
        else:
            subprocess.Popen(["xdg-open", str(path)])
    except Exception:
        log.exception("Konnte %s nicht öffnen", path)


def edit_text_file(path: Path) -> None:
    """Textdatei im Editor öffnen (Windows: Notepad, weil .toml oft keine Zuordnung hat)."""
    if sys.platform == "win32":
        subprocess.Popen(["notepad.exe", str(path)])
    else:
        open_path(path)
