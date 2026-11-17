"""Kernlogik der Aufzeichnung: aus regelmäßigen Momentaufnahmen werden Zeitabschnitte.

Unabhängig von Windows, damit sie mit künstlichen Momentaufnahmen getestet
werden kann. Die Windows-Abfragen stecken in `winapi.py`.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

from .config import Config
from .db import ACTIVE, IDLE, LOCKED, PAUSED, Database

log = logging.getLogger(__name__)

FLUSH_SECONDS = 5.0       # so oft wird das Ende des laufenden Abschnitts gespeichert
MIN_SLEEP_GAP = 30.0      # längere Pausen zwischen zwei Abfragen = Standby/Ruhezustand
MAX_TITLE = 500


@dataclass
class Snapshot:
    """Momentaufnahme: welches Fenster ist vorne, wie lange keine Eingabe, gesperrt?"""

    hwnd: int = 0
    pid: int = 0
    process: str = ""     # z. B. "chrome.exe"
    exe_path: str = ""    # vollständiger Pfad der Programmdatei
    product: str = ""     # Dateibeschreibung, z. B. "Google Chrome"
    company: str = ""     # Hersteller, z. B. "DATEV eG"
    title: str = ""       # Fenstertitel
    idle_seconds: float = 0.0
    locked: bool = False


@dataclass
class OpenSegment:
    row_id: int
    start: float
    end: float
    state: str
    key: tuple
    url: str = ""
    dirty: bool = False


@dataclass
class Recorder:
    db: Database
    config: Config
    paused: bool = False
    current: Optional[OpenSegment] = None
    last_tick: Optional[float] = None
    # Frühester Zeitpunkt, ab dem rückwirkend Inaktivität gezählt werden darf
    # (Programmstart, Aufwachen aus Standby, Ende von Sperre/Pause).
    floor: Optional[float] = None
    last_flush: float = 0.0
    last_state: str = field(default="")

    def _sleep_gap(self) -> float:
        return max(MIN_SLEEP_GAP, self.config.intervall * 10)

    def _state_for(self, snap: Snapshot) -> tuple[str, tuple, dict]:
        cfg = self.config
        if self.paused:
            return PAUSED, (PAUSED,), {}
        if snap.locked:
            return LOCKED, (LOCKED,), {}
        process = (snap.process or "").strip()
        if snap.idle_seconds >= cfg.inaktiv_nach_sekunden and process.lower() not in cfg.inaktiv_ausnahmen:
            return IDLE, (IDLE,), {}
        title = "" if process.lower() in cfg.titel_nicht_speichern else (snap.title or "")[:MAX_TITLE]
        info = {
            "process": process,
            "exe_path": snap.exe_path or "",
            "product": snap.product or "",
            "company": snap.company or "",
            "title": title,
        }
        key = (ACTIVE, process.lower(), (snap.exe_path or "").lower(), title)
        return ACTIVE, key, info

    def observe(self, now: float, snap: Snapshot, url: Optional[str] = None) -> str:
        """Verarbeitet eine Momentaufnahme. Gibt den erkannten Status zurück."""
        # Standby/Ruhezustand: zwischen zwei Abfragen ist zu viel Zeit vergangen.
        if self.last_tick is not None and now - self.last_tick > self._sleep_gap():
            log.info("Lücke von %.0f s erkannt (Standby?)", now - self.last_tick)
            self._close(self.last_tick)
            self.floor = now
        if self.floor is None:
            self.floor = now

        state, key, info = self._state_for(snap)

        if state == IDLE:
            if self.current is None or self.current.state != IDLE:
                idle_start = min(now, max(now - snap.idle_seconds, self.floor))
                self._enter_idle(idle_start)
        elif self.current is None or self.current.key != key:
            self._close(now)
            self._open(now, state, key, info)

        cur = self.current
        if url and state == ACTIVE and cur.url != url:
            cur.url = url
            cur.dirty = True
        cur.end = max(cur.end, now)
        if cur.dirty or now - self.last_flush >= FLUSH_SECONDS:
            self._flush(now)

        if state != ACTIVE:
            self.floor = now
        self.last_tick = now
        self.last_state = state
        return state

    def stop(self, now: Optional[float] = None) -> None:
        """Laufenden Abschnitt abschließen (Programmende)."""
        end = now if now is not None else self.last_tick
        if end is not None:
            self._close(end)

    # --- intern ------------------------------------------------------------
    def _open(self, start: float, state: str, key: tuple, info: dict) -> None:
        row_id = self.db.insert(start, start, state, info)
        self.current = OpenSegment(row_id, start, start, state, key)
        self.last_flush = start

    def _flush(self, now: float) -> None:
        cur = self.current
        if cur is None:
            return
        self.db.update(cur.row_id, cur.end, cur.url)
        cur.dirty = False
        self.last_flush = now

    def _close(self, end: float) -> None:
        cur = self.current
        if cur is None:
            return
        cur.end = max(cur.start, end)
        if cur.end - cur.start < 0.05:
            self.db.delete(cur.row_id)
        else:
            self.db.update(cur.row_id, cur.end, cur.url)
        self.current = None

    def _enter_idle(self, idle_start: float) -> None:
        """Wechsel in "inaktiv": Zeit seit der letzten Eingabe zählt rückwirkend als inaktiv."""
        cur = self.current
        if cur is not None:
            if cur.state == ACTIVE and cur.start >= idle_start:
                self.db.delete(cur.row_id)
                self.current = None
            else:
                self._close(max(idle_start, cur.start))
        # Bereits abgeschlossene aktive Abschnitte seit der letzten Eingabe kürzen
        self.db.cut_active_after(idle_start)
        self._open(idle_start, IDLE, (IDLE,), {})
