"""SQLite-Datenbank mit den aufgezeichneten Zeitabschnitten.

Gespeichert werden nur Rohdaten (Programm, Fenstertitel, Adresse, Status).
Die Zuordnung zu Anwendung und Mandant/Projekt wird erst im Bericht
berechnet – geänderte Regeln wirken dadurch auch rückwirkend.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path

# Status-Werte in der Datenbank
ACTIVE = "active"      # Fenster im Vordergrund, Nutzer arbeitet
IDLE = "idle"          # PC an, aber keine Maus-/Tastatureingabe
LOCKED = "locked"      # PC gesperrt (Win+L / Sperrbildschirm)
PAUSED = "paused"      # Aufzeichnung vom Nutzer pausiert (privat)
STATES = (ACTIVE, IDLE, LOCKED, PAUSED)

SCHEMA = """
CREATE TABLE IF NOT EXISTS segments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    start_ts  REAL NOT NULL,
    end_ts    REAL NOT NULL,
    state     TEXT NOT NULL,
    process   TEXT NOT NULL DEFAULT '',
    exe_path  TEXT NOT NULL DEFAULT '',
    product   TEXT NOT NULL DEFAULT '',
    company   TEXT NOT NULL DEFAULT '',
    title     TEXT NOT NULL DEFAULT '',
    url       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_segments_start ON segments(start_ts);
CREATE INDEX IF NOT EXISTS idx_segments_end ON segments(end_ts);
"""

INFO_FIELDS = ("process", "exe_path", "product", "company", "title", "url")


@dataclass
class Segment:
    id: int
    start: float
    end: float
    state: str
    process: str = ""
    exe_path: str = ""
    product: str = ""
    company: str = ""
    title: str = ""
    url: str = ""

    @property
    def duration(self) -> float:
        return max(0.0, self.end - self.start)


class Database:
    def __init__(self, path: Path | str):
        self.path = str(path)
        self.conn = sqlite3.connect(self.path, timeout=15, isolation_level=None)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA synchronous=NORMAL")
        self.conn.executescript(SCHEMA)

    def close(self) -> None:
        self.conn.close()

    # --- Schreiben (Aufzeichnung) ------------------------------------------
    def insert(self, start: float, end: float, state: str, info: dict) -> int:
        cur = self.conn.execute(
            "INSERT INTO segments (start_ts, end_ts, state, process, exe_path, product, company, title, url)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (start, end, state, *(info.get(k, "") or "" for k in INFO_FIELDS)),
        )
        return int(cur.lastrowid)

    def update(self, seg_id: int, end: float, url: str = "") -> None:
        self.conn.execute("UPDATE segments SET end_ts = ?, url = ? WHERE id = ?", (end, url or "", seg_id))

    def delete(self, seg_id: int) -> None:
        self.conn.execute("DELETE FROM segments WHERE id = ?", (seg_id,))

    def cut_active_after(self, ts: float) -> None:
        """Aktive Abschnitte ab `ts` entfernen bzw. kürzen (rückwirkende Inaktivität)."""
        with self.conn:
            self.conn.execute("DELETE FROM segments WHERE state = ? AND start_ts >= ?", (ACTIVE, ts))
            self.conn.execute(
                "UPDATE segments SET end_ts = ? WHERE state = ? AND start_ts < ? AND end_ts > ?",
                (ts, ACTIVE, ts, ts),
            )

    # --- Lesen (Bericht) ---------------------------------------------------
    def segments_between(self, start: float, end: float) -> list[Segment]:
        rows = self.conn.execute(
            "SELECT id, start_ts, end_ts, state, process, exe_path, product, company, title, url"
            " FROM segments WHERE end_ts > ? AND start_ts < ? ORDER BY start_ts, id",
            (start, end),
        ).fetchall()
        return [Segment(*row) for row in rows]

    def state_totals(self, start: float, end: float) -> dict[str, float]:
        """Summe der Sekunden je Status im Zeitraum (auf den Zeitraum zugeschnitten)."""
        totals = {s: 0.0 for s in STATES}
        for row in self.conn.execute(
            "SELECT state, SUM(MIN(end_ts, ?) - MAX(start_ts, ?)) FROM segments"
            " WHERE end_ts > ? AND start_ts < ? GROUP BY state",
            (end, start, start, end),
        ):
            totals[row[0]] = float(row[1] or 0.0)
        return totals
