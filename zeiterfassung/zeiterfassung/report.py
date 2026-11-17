"""Auswertung: aus den Rohdaten werden Summen, Zeitblöcke und Pausen berechnet."""

from __future__ import annotations

import math
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, time as dtime, timedelta
from typing import Optional

from .classify import Classifier, WindowInfo
from .config import Config
from .db import ACTIVE, IDLE, LOCKED, PAUSED, Database, Segment

GAP = "gap"  # keine Aufzeichnung (PC aus, Standby, Programm nicht gestartet)
UNASSIGNED = "(nicht zugeordnet)"
NO_TITLE = "(ohne Fenstertitel)"

STATE_LABELS = {
    ACTIVE: "Aktiv",
    IDLE: "Inaktiv – PC an, keine Eingabe",
    LOCKED: "PC gesperrt",
    PAUSED: "Aufzeichnung pausiert (privat)",
    GAP: "Keine Aufzeichnung – PC aus / Standby",
}
STATE_SHORT = {ACTIVE: "Aktiv", IDLE: "Inaktiv", LOCKED: "Gesperrt", PAUSED: "Pausiert", GAP: "Keine Aufzeichnung"}


@dataclass
class Item:
    """Ein auf den Berichtszeitraum und den Kalendertag zugeschnittener, zugeordneter Abschnitt."""

    start: datetime
    end: datetime
    state: str
    anwendung: str = ""
    zuordnung: str = ""
    titel: str = ""
    domain: str = ""
    quelle: str = ""
    segment: Optional[Segment] = None

    @property
    def secs(self) -> float:
        return max(0.0, (self.end - self.start).total_seconds())


@dataclass
class Block:
    """Zusammengefasster Zeitblock im Tagesverlauf."""

    start: datetime
    end: datetime
    state: str
    zuordnung: str = ""
    anwendung: str = ""
    apps: Counter = field(default_factory=Counter)
    titles: Counter = field(default_factory=Counter)

    @property
    def secs(self) -> float:
        return max(0.0, (self.end - self.start).total_seconds())

    @property
    def key(self) -> tuple:
        if self.state != ACTIVE:
            return (self.state,)
        if self.zuordnung:
            return (ACTIVE, "z", self.zuordnung)
        return (ACTIVE, "a", self.anwendung)

    def absorb(self, other: "Block") -> None:
        self.start = min(self.start, other.start)
        self.end = max(self.end, other.end)
        self.apps.update(other.apps)
        self.titles.update(other.titles)

    @property
    def label(self) -> str:
        """Bezeichnung für den Tagesverlauf."""
        if self.state != ACTIVE:
            return STATE_LABELS[self.state]
        return self.zuordnung or self.anwendung

    @property
    def main_title(self) -> str:
        if not self.titles:
            return ""
        (_app, title), _secs = self.titles.most_common(1)[0]
        return title


@dataclass
class DaySummary:
    day: date
    first: datetime
    last: datetime
    totals: dict  # Status -> Sekunden (inkl. GAP)

    @property
    def span(self) -> float:
        return (self.last - self.first).total_seconds()


@dataclass
class Report:
    von: date
    bis: date
    created: datetime
    config: Config
    items: list
    days: list
    blocks: dict              # date -> list[Block]
    totals: dict              # Status -> Sekunden
    by_zuordnung: list        # [(zuordnung, sekunden)]
    by_day_zuordnung: list    # [(datum, zuordnung, sekunden)]
    by_app: list              # [(anwendung, sekunden)]
    by_zuordnung_app: list    # [(zuordnung, anwendung, sekunden)]
    details: list             # [(anwendung, zuordnung, domain, titel, sekunden)]
    websites: list            # [(domain, sekunden)]

    @property
    def single_day(self) -> bool:
        return self.von == self.bis

    @property
    def pauses(self) -> list:
        return [b for day in sorted(self.blocks) for b in self.blocks[day] if b.state != ACTIVE]

    @property
    def active_total(self) -> float:
        return self.totals.get(ACTIVE, 0.0)


# --- Hilfsfunktionen ------------------------------------------------------------

def round_hours(secs: float, minutes: int) -> float:
    hours = secs / 3600.0
    if minutes <= 0:
        return round(hours, 2)
    unit = minutes / 60.0
    return round(math.floor(hours / unit + 0.5) * unit, 2)


def fmt_dur(secs: float, seconds: bool = False) -> str:
    """Dauer als h:mm (bzw. h:mm:ss)."""
    total = int(round(secs))
    if not seconds:
        total = int(round(secs / 60.0)) * 60
    h, rest = divmod(total, 3600)
    m, s = divmod(rest, 60)
    return f"{h}:{m:02d}:{s:02d}" if seconds else f"{h}:{m:02d}"


def fmt_hours(secs: float, digits: int = 2) -> str:
    return f"{secs / 3600.0:.{digits}f}".replace(".", ",")


def fmt_num(value: float, digits: int = 2) -> str:
    return f"{value:.{digits}f}".replace(".", ",")


WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]


def fmt_day(d: date, long: bool = False) -> str:
    if long:
        return f"{WEEKDAYS[d.weekday()]}, {d:%d.%m.%Y}"
    return f"{WEEKDAYS[d.weekday()][:2]} {d:%d.%m.%Y}"


def _sorted_counter(counter: dict, last: Optional[str] = None) -> list:
    rows = sorted(counter.items(), key=lambda kv: (kv[0] == last, -kv[1], kv[0]))
    return [(k, v) for k, v in rows if v >= 0.5]


# --- Aufbau ------------------------------------------------------------------------

def _split_by_day(start: datetime, end: datetime):
    while start < end:
        midnight = datetime.combine(start.date() + timedelta(days=1), dtime.min)
        part_end = min(end, midnight)
        yield start, part_end
        start = part_end


def build_items(segments: list, classifier: Classifier, range_start: datetime, range_end: datetime) -> list:
    items = []
    for seg in segments:
        start = max(datetime.fromtimestamp(seg.start), range_start)
        end = min(datetime.fromtimestamp(seg.end), range_end)
        if end <= start:
            continue
        if seg.state == ACTIVE:
            c = classifier.classify(
                WindowInfo(seg.process, seg.exe_path, seg.product, seg.company, seg.title, seg.url)
            )
            info = dict(anwendung=c.anwendung, zuordnung=c.zuordnung, titel=c.titel, domain=c.domain, quelle=c.quelle)
        else:
            info = {}
        for s, e in _split_by_day(start, end):
            items.append(Item(s, e, seg.state, segment=seg, **info))
    items.sort(key=lambda it: (it.start, it.end))
    return items


def _merge_same(blocks: list) -> list:
    merged: list = []
    for b in blocks:
        if merged and merged[-1].key == b.key and (b.start - merged[-1].end).total_seconds() < 1:
            merged[-1].absorb(b)
        else:
            merged.append(b)
    return merged


def build_blocks(items: list, min_secs: float, gap_min: float) -> list:
    """Zeitblöcke eines Tages: gleiche Zuordnung zusammenfassen, kurze Wechsel glätten."""
    raw: list = []
    prev_end: Optional[datetime] = None
    for it in items:
        if prev_end is not None and (it.start - prev_end).total_seconds() >= 1:
            raw.append(Block(prev_end, it.start, GAP))
        b = Block(it.start, it.end, it.state, it.zuordnung, it.anwendung)
        if it.state == ACTIVE:
            b.apps[it.anwendung] += it.secs
            b.titles[(it.anwendung, it.titel or NO_TITLE)] += it.secs
        raw.append(b)
        prev_end = it.end if prev_end is None else max(prev_end, it.end)

    def short(b: Block) -> bool:
        return b.secs < (gap_min if b.state == GAP else min_secs)

    blocks = _merge_same(raw)
    for _ in range(20):
        changed = False
        # 1) kurzer Block zwischen zwei gleichen Blöcken -> alle drei zusammenfassen
        i = 1
        while i < len(blocks) - 1:
            if short(blocks[i]) and blocks[i - 1].key == blocks[i + 1].key:
                blocks[i - 1].absorb(blocks[i])
                blocks[i - 1].absorb(blocks[i + 1])
                del blocks[i:i + 2]
                changed = True
            else:
                i += 1
        # 2) übrige kurze Blöcke dem Nachbarn zuschlagen (bevorzugt einem aktiven)
        i = 0
        while i < len(blocks) and len(blocks) > 1:
            b = blocks[i]
            if not short(b):
                i += 1
                continue
            prev = blocks[i - 1] if i > 0 else None
            nxt = blocks[i + 1] if i + 1 < len(blocks) else None
            if prev is not None and (prev.state == ACTIVE or nxt is None or nxt.state != ACTIVE):
                prev.absorb(b)
            else:
                nxt.absorb(b)
            del blocks[i]
            changed = True
        blocks = _merge_same(blocks)
        if not changed:
            break
    return blocks


def build_report(
    db: Database,
    config: Config,
    von: date,
    bis: date,
    now: Optional[datetime] = None,
) -> Report:
    now = now or datetime.now()
    range_start = datetime.combine(von, dtime.min)
    range_end = min(datetime.combine(bis + timedelta(days=1), dtime.min), max(now, range_start))
    segments = db.segments_between(range_start.timestamp(), range_end.timestamp())
    classifier = Classifier(config)
    items = build_items(segments, classifier, range_start, range_end)

    by_day: dict = defaultdict(list)
    for it in items:
        by_day[it.start.date()].append(it)

    days, blocks = [], {}
    totals: Counter = Counter()
    for d in sorted(by_day):
        day_items = by_day[d]
        t: Counter = Counter()
        for it in day_items:
            t[it.state] += it.secs
        first = day_items[0].start
        last = max(it.end for it in day_items)
        covered = sum(t.values())
        t[GAP] = max(0.0, (last - first).total_seconds() - covered)
        days.append(DaySummary(d, first, last, dict(t)))
        totals.update(t)
        blocks[d] = build_blocks(day_items, config.zeitblock_mindestdauer, config.luecke_ab)

    by_z: Counter = Counter()
    by_dz: Counter = Counter()
    by_app: Counter = Counter()
    by_za: Counter = Counter()
    details: Counter = Counter()
    websites: Counter = Counter()
    for it in items:
        if it.state != ACTIVE:
            continue
        z = it.zuordnung or UNASSIGNED
        by_z[z] += it.secs
        by_dz[(it.start.date(), z)] += it.secs
        by_app[it.anwendung] += it.secs
        by_za[(z, it.anwendung)] += it.secs
        details[(it.anwendung, z, it.domain, it.titel or NO_TITLE)] += it.secs
        if it.domain:
            websites[it.domain] += it.secs

    by_zuordnung = _sorted_counter(by_z, last=UNASSIGNED)
    z_order = {z: i for i, (z, _s) in enumerate(by_zuordnung)}
    by_day_zuordnung = sorted(
        ((d, z, s) for (d, z), s in by_dz.items() if s >= 0.5), key=lambda r: (r[0], z_order.get(r[1], 999))
    )
    by_zuordnung_app = sorted(
        ((z, a, s) for (z, a), s in by_za.items() if s >= 0.5), key=lambda r: (z_order.get(r[0], 999), -r[2])
    )
    detail_rows = sorted(
        ((a, z, dom, ti, s) for (a, z, dom, ti), s in details.items() if s >= 0.5), key=lambda r: -r[4]
    )

    return Report(
        von=von,
        bis=bis,
        created=now,
        config=config,
        items=items,
        days=days,
        blocks=blocks,
        totals=dict(totals),
        by_zuordnung=by_zuordnung,
        by_day_zuordnung=by_day_zuordnung,
        by_app=_sorted_counter(by_app),
        by_zuordnung_app=by_zuordnung_app,
        details=detail_rows,
        websites=_sorted_counter(websites),
    )


# --- Zeiträume für die Schnellauswahl ---------------------------------------------

def period(name: str, today: Optional[date] = None) -> tuple[date, date]:
    today = today or date.today()
    if name == "heute":
        return today, today
    if name == "gestern":
        d = today - timedelta(days=1)
        return d, d
    if name == "woche":
        return today - timedelta(days=today.weekday()), today
    if name == "letzte-woche":
        start = today - timedelta(days=today.weekday() + 7)
        return start, start + timedelta(days=6)
    if name == "monat":
        return today.replace(day=1), today
    if name == "letzter-monat":
        end = today.replace(day=1) - timedelta(days=1)
        return end.replace(day=1), end
    raise ValueError(f"Unbekannter Zeitraum: {name}")


def parse_date(text: str) -> date:
    """Akzeptiert 17.11.2026, 17.11.26 und 2026-11-17."""
    text = text.strip()
    for fmt in ("%d.%m.%Y", "%d.%m.%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Ungültiges Datum: {text!r} (bitte TT.MM.JJJJ)")
