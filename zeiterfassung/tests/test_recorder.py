from dataclasses import replace

import pytest

from zeiterfassung.config import Config
from zeiterfassung.db import ACTIVE, IDLE, LOCKED, PAUSED, Database
from zeiterfassung.recorder import Recorder, Snapshot

T0 = 1_800_000_000.0

CHROME = Snapshot(hwnd=1, pid=10, process="chrome.exe", exe_path=r"C:\Chrome\chrome.exe", title="Seite A - Google Chrome")
REWE = Snapshot(hwnd=2, pid=20, process="Rewe.exe", exe_path=r"C:\DATEV\Rewe.exe", company="DATEV eG",
                title="Kanzlei-Rechnungswesen - 10001 Mustermann GmbH")


@pytest.fixture
def db(tmp_path):
    d = Database(tmp_path / "t.db")
    yield d
    d.close()


def run(rec, start, seconds, snap, idle_from=None):
    """Simuliert sekündliche Abfragen. idle_from: Zeitpunkt der letzten Eingabe."""
    t = start
    while t < start + seconds:
        idle = 0.0 if idle_from is None else max(0.0, t - idle_from)
        rec.observe(t, replace(snap, idle_seconds=idle))
        t += 1
    return t


def rows(db):
    return [(round(s.start - T0), round(s.end - T0), s.state, s.process) for s in db.segments_between(0, 1e12)]


def test_window_switch_creates_segments(db):
    rec = Recorder(db, Config())
    t = run(rec, T0, 60, CHROME)
    t = run(rec, t, 30, REWE)
    rec.stop(t)
    assert rows(db) == [(0, 60, ACTIVE, "chrome.exe"), (60, 90, ACTIVE, "Rewe.exe")]


def test_idle_is_counted_back_to_last_input(db):
    cfg = Config(inaktiv_nach_sekunden=300)
    rec = Recorder(db, cfg)
    # Nutzer arbeitet 100 s, letzte Eingabe bei T0+100, dann geht er weg
    t = run(rec, T0, 500, REWE, idle_from=T0 + 100)
    # wieder da
    t = run(rec, t, 20, REWE)
    rec.stop(t)
    assert rows(db) == [(0, 100, ACTIVE, "Rewe.exe"), (100, 500, IDLE, ""), (500, 520, ACTIVE, "Rewe.exe")]


def test_title_changes_without_input_are_removed_when_idle(db):
    cfg = Config(inaktiv_nach_sekunden=300)
    rec = Recorder(db, cfg)
    t = run(rec, T0, 100, CHROME)
    # ohne Eingabe ändert sich der Titel (z. B. automatisch neu ladende Seite)
    t = run(rec, t, 150, replace(CHROME, title="Seite B - Google Chrome"), idle_from=T0 + 100)
    t = run(rec, t, 200, replace(CHROME, title="Seite C - Google Chrome"), idle_from=T0 + 100)
    rec.stop(t)
    assert rows(db) == [(0, 100, ACTIVE, "chrome.exe"), (100, 450, IDLE, "")]


def test_sleep_gap_closes_segment(db):
    rec = Recorder(db, Config())
    t = run(rec, T0, 60, CHROME)
    # PC war 1 Stunde im Standby, danach ohne Eingabe seit vor dem Standby
    t2 = t + 3600
    rec.observe(t2, replace(CHROME, idle_seconds=4000))
    rec.observe(t2 + 1, replace(CHROME, idle_seconds=4001))
    rec.observe(t2 + 2, CHROME)
    rec.stop(t2 + 10)
    assert rows(db) == [
        (0, 59, ACTIVE, "chrome.exe"),
        (3660, 3662, IDLE, ""),
        (3662, 3670, ACTIVE, "chrome.exe"),
    ]


def test_locked_and_paused(db):
    rec = Recorder(db, Config())
    t = run(rec, T0, 10, CHROME)
    t = run(rec, t, 20, replace(CHROME, locked=True))
    rec.paused = True
    t = run(rec, t, 30, CHROME)
    rec.paused = False
    t = run(rec, t, 5, CHROME)
    rec.stop(t)
    assert [r[2] for r in rows(db)] == [ACTIVE, LOCKED, PAUSED, ACTIVE]
    assert rows(db)[2][:2] == (30, 60)


def test_idle_after_lock_does_not_reach_back_into_lock(db):
    rec = Recorder(db, Config(inaktiv_nach_sekunden=300))
    t = run(rec, T0, 10, CHROME, idle_from=T0 + 5)
    t = run(rec, t, 600, replace(CHROME, locked=True), idle_from=T0 + 5)
    # entsperrt (ohne Eingabe gemessen, z. B. Fingerabdruck) -> Inaktivität erst ab Entsperren
    t = run(rec, t, 400, CHROME, idle_from=T0 + 5)
    rec.stop(t)
    r = rows(db)
    assert r[0][:3] == (0, 10, ACTIVE)
    assert r[1][:3] == (10, 609, LOCKED)  # letzte Abfrage im gesperrten Zustand
    assert r[2][2] == IDLE and r[2][0] >= 609


def test_idle_exceptions(db):
    cfg = Config(inaktiv_nach_sekunden=60, inaktiv_ausnahmen=frozenset({"ms-teams.exe"}))
    rec = Recorder(db, cfg)
    teams = Snapshot(hwnd=5, process="ms-teams.exe", title="Besprechung")
    t = run(rec, T0, 300, teams, idle_from=T0)
    rec.stop(t)
    assert rows(db) == [(0, 300, ACTIVE, "ms-teams.exe")]


def test_title_not_stored_for_private_programs(db):
    cfg = Config(titel_nicht_speichern=frozenset({"keepass.exe"}))
    rec = Recorder(db, cfg)
    t = run(rec, T0, 5, Snapshot(hwnd=3, process="KeePass.exe", title="Bank-Passwort"))
    rec.stop(t)
    assert db.segments_between(0, 1e12)[0].title == ""


def test_url_is_attached_to_segment(db):
    rec = Recorder(db, Config())
    rec.observe(T0, CHROME)
    rec.observe(T0 + 1, CHROME, url="datev.de")
    rec.observe(T0 + 2, CHROME, url="datev.de")
    rec.stop(T0 + 3)
    segs = db.segments_between(0, 1e12)
    assert len(segs) == 1 and segs[0].url == "datev.de"


def test_state_totals(db):
    rec = Recorder(db, Config(inaktiv_nach_sekunden=60))
    t = run(rec, T0, 200, CHROME, idle_from=T0 + 50)
    rec.stop(t)
    totals = db.state_totals(T0, T0 + 1000)
    assert totals[ACTIVE] == pytest.approx(50)
    assert totals[IDLE] == pytest.approx(150)
