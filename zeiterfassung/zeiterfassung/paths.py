"""Speicherorte für Datenbank, Einstellungen, Protokoll und Berichte."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from . import APP_NAME


def data_dir() -> Path:
    """Ordner für Datenbank, Einstellungen und Protokoll (nur lokal, nicht synchronisiert)."""
    override = os.environ.get("ZEITERFASSUNG_DATEN")
    if override:
        path = Path(override)
    elif sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        path = Path(base) / APP_NAME
    else:
        base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
        path = Path(base) / "zeiterfassung"
    path.mkdir(parents=True, exist_ok=True)
    return path


def documents_dir() -> Path:
    """Der Ordner "Dokumente" des Benutzers (auch wenn er umgeleitet ist)."""
    if sys.platform == "win32":
        try:
            import ctypes

            buf = ctypes.create_unicode_buffer(1024)
            # CSIDL_PERSONAL = 5 ("Eigene Dokumente")
            if ctypes.windll.shell32.SHGetFolderPathW(None, 5, None, 0, buf) == 0 and buf.value:
                return Path(buf.value)
        except Exception:  # pragma: no cover - nur Windows
            pass
    return Path.home() / "Documents"


def default_report_dir() -> Path:
    return documents_dir() / "Zeiterfassung Berichte"


def db_path() -> Path:
    return data_dir() / "zeiterfassung.db"


def config_path() -> Path:
    return data_dir() / "einstellungen.toml"


def log_path() -> Path:
    return data_dir() / "zeiterfassung.log"
