"""Hintergrund-Thread, der jede Sekunde das aktive Fenster abfragt und speichert."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .browser import BrowserUrlResolver
from .config import ConfigStore
from .db import ACTIVE, Database
from .recorder import Recorder, Snapshot

log = logging.getLogger(__name__)

CONFIG_CHECK_SECONDS = 5.0


@dataclass
class Status:
    running: bool = False
    paused: bool = False
    state: str = ""
    since: float = 0.0                 # Start der Aufzeichnung
    snapshot: Optional[Snapshot] = None  # letztes fremdes Fenster (nicht die Zeiterfassung selbst)
    url: str = ""
    error: str = ""
    errors: int = field(default=0)


class Tracker(threading.Thread):
    def __init__(self, db_path: Path, store: ConfigStore, provider):
        super().__init__(name="Aufzeichnung", daemon=True)
        self.db_path = db_path
        self.store = store
        self.provider = provider
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._status = Status()
        self._paused = False
        self.resolver = BrowserUrlResolver(lambda: self.store.config.browser_adresse)

    # --- Steuerung aus der Oberfläche ---------------------------------------------
    def stop(self, timeout: float = 5.0) -> None:
        self._stop_event.set()
        if self.is_alive():
            self.join(timeout)

    def set_paused(self, paused: bool) -> None:
        with self._lock:
            self._paused = paused
            self._status.paused = paused

    def status(self) -> Status:
        with self._lock:
            return Status(**vars(self._status))

    # --- Thread ------------------------------------------------------------------
    def run(self) -> None:
        db = Database(self.db_path)
        recorder = Recorder(db, self.store.config)
        own_pid = getattr(self.provider, "own_pid", None)
        last_config_check = 0.0
        with self._lock:
            self._status.running = True
            self._status.since = time.time()
        log.info("Aufzeichnung gestartet")
        try:
            while not self._stop_event.is_set():
                started = time.monotonic()
                try:
                    if started - last_config_check >= CONFIG_CHECK_SECONDS:
                        last_config_check = started
                        self.store.maybe_reload()
                        recorder.config = self.store.config
                    with self._lock:
                        recorder.paused = self._paused
                    snap = self.provider.snapshot()
                    url = self.resolver.lookup(snap.hwnd, snap.process, snap.title)
                    state = recorder.observe(time.time(), snap, url)
                    with self._lock:
                        self._status.state = state
                        if snap.pid != own_pid:
                            self._status.snapshot = snap
                            self._status.url = url if state == ACTIVE else ""
                        self._status.error = ""
                except Exception as exc:  # Aufzeichnung darf nie ganz abbrechen
                    log.exception("Fehler bei der Aufzeichnung")
                    with self._lock:
                        self._status.error = str(exc)
                        self._status.errors += 1
                interval = max(0.2, self.store.config.intervall)
                self._stop_event.wait(max(0.05, interval - (time.monotonic() - started)))
        finally:
            try:
                recorder.stop(time.time())
            except Exception:
                log.exception("Fehler beim Abschließen der Aufzeichnung")
            db.close()
            with self._lock:
                self._status.running = False
            log.info("Aufzeichnung beendet")
