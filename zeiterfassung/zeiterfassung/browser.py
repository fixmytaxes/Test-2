"""Adresse (URL) aus der Adressleiste des Browsers lesen – optional.

Nutzt die Windows-Bedienungshilfen-Schnittstelle (UI Automation) über das
Paket `uiautomation`. Ist es nicht installiert oder schlägt die Abfrage fehl,
läuft die Aufzeichnung ohne Adresse weiter (der Seitentitel steht ohnehin im
Fenstertitel). Die Abfrage läuft in einem eigenen Thread, damit ein hängender
Browser die Aufzeichnung nicht blockiert.
"""

from __future__ import annotations

import logging
import queue
import threading
from typing import Optional
from urllib.parse import urlsplit

log = logging.getLogger(__name__)

BROWSERS = frozenset(
    {"chrome.exe", "msedge.exe", "firefox.exe", "brave.exe", "opera.exe", "vivaldi.exe", "iexplore.exe"}
)


def normalize_address(value: str, mode: str) -> str:
    """Text aus der Adressleiste -> Domain bzw. vollständige Adresse ("" wenn keine Adresse)."""
    value = (value or "").strip()
    if not value or " " in value or "." not in value and "://" not in value:
        return ""
    if mode == "voll":
        return value[:1000]
    candidate = value if "://" in value else "https://" + value
    try:
        host = urlsplit(candidate).hostname or ""
    except ValueError:
        return ""
    if host.startswith("www."):
        host = host[4:]
    return host


def domain_of(address: str) -> str:
    """Domain aus einer gespeicherten Adresse (egal ob Domain oder volle URL)."""
    return normalize_address(address, "domain") if address else ""


class BrowserUrlResolver:
    def __init__(self, mode_getter):
        self._mode_getter = mode_getter
        self._cache: dict[tuple[int, str], str] = {}
        self._pending: set[tuple[int, str]] = set()
        self._queue: "queue.Queue[tuple[int, str]]" = queue.Queue()
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self.available: Optional[bool] = None  # None = noch nicht geprüft
        self.error: str = ""

    def lookup(self, hwnd: int, process: str, title: str) -> str:
        mode = self._mode_getter()
        if mode == "aus" or not hwnd or (process or "").lower() not in BROWSERS or self.available is False:
            return ""
        key = (hwnd, title)
        with self._lock:
            if key in self._cache:
                return normalize_address(self._cache[key], mode)
            if key in self._pending:
                return ""
            self._pending.add(key)
        self._ensure_thread()
        self._queue.put(key)
        return ""

    def _ensure_thread(self) -> None:
        if self._thread is None:
            self._thread = threading.Thread(target=self._worker, name="BrowserAdresse", daemon=True)
            self._thread.start()

    def _worker(self) -> None:
        try:
            import uiautomation as auto  # type: ignore
        except Exception as exc:  # Paket fehlt oder COM nicht verfügbar
            self.available = False
            self.error = f"Browser-Adressen nicht verfügbar: {exc}"
            log.warning(self.error)
            return
        self.available = True
        try:
            auto.SetGlobalSearchTimeout(1.0)
        except Exception:
            pass
        with auto.UIAutomationInitializerInThread():
            while True:
                hwnd, title = self._queue.get()
                value = ""
                try:
                    value = self._read_address(auto, hwnd)
                except Exception as exc:
                    log.debug("Adresse nicht lesbar (%s): %s", title, exc)
                with self._lock:
                    if len(self._cache) > 1000:
                        self._cache.clear()
                    self._cache[(hwnd, title)] = value
                    self._pending.discard((hwnd, title))

    @staticmethod
    def _read_address(auto, hwnd: int) -> str:
        window = auto.ControlFromHandle(hwnd)
        if window is None:
            return ""
        edit = window.EditControl(foundIndex=1)
        if not edit.Exists(0, 0):
            return ""
        return edit.GetValuePattern().Value or ""
