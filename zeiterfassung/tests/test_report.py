import tomllib
from datetime import date, datetime, timedelta

import pytest
from openpyxl import load_workbook

from zeiterfassung.config import Config, DEFAULT_TEMPLATE, ConfigError, ConfigStore, load_config, parse_config
from zeiterfassung.db import ACTIVE, IDLE, LOCKED, Database
from zeiterfassung.demo import DEMO_CONFIG, create_demo_db
from zeiterfassung.export import create_report
from zeiterfassung.report import (
    GAP,
    UNASSIGNED,
    build_report,
    fmt_dur,
    parse_date,
    period,
    round_hours,
)
from zeiterfassung.report_html import render_html

DAY = date(2026, 11, 16)
NOW = datetime(2026, 11, 20, 12)

REWE = dict(process="Rewe.exe", exe_path=r"C:\DATEV\Rewe.exe", company="DATEV eG")
OUTLOOK = dict(process="OUTLOOK.EXE")


def ts(h, m, s=0, day=DAY):
    return datetime(day.year, day.month, day.day, h, m, s).timestamp()


@pytest.fixture
def db(tmp_path):
    d = Database(tmp_path / "r.db")
    yield d
    d.close()


def add(db, start, end, state=ACTIVE, **info):
    db.insert(start, end, state, info)


def test_totals_blocks_and_gaps(db):
    add(db, ts(8, 0), ts(9, 0), title="Kanzlei-Rechnungswesen - 10001 Mustermann GmbH", **REWE)
    add(db, ts(9, 0), ts(9, 0, 30), title="Posteingang - Outlook", **OUTLOOK)  # kurz -> wird geglättet
    add(db, ts(9, 0, 30), ts(9, 30), title="Kanzlei-Rechnungswesen - 10001 Mustermann GmbH", **REWE)
    add(db, ts(9, 30), ts(9, 45), IDLE)
    add(db, ts(9, 45), ts(10, 0), title="Posteingang - Outlook", **OUTLOOK)
    # 30 Minuten keine Aufzeichnung (PC aus)
    add(db, ts(10, 30), ts(10, 40), LOCKED)
    add(db, ts(10, 40), ts(11, 0), title="Kanzlei-Rechnungswesen - 10002 Beispiel KG", **REWE)

    r = build_report(db, Config(), DAY, DAY, now=NOW)
    assert dict(r.by_zuordnung) == pytest.approx({
        "10001 Mustermann GmbH": 89.5 * 60, "10002 Beispiel KG": 20 * 60, UNASSIGNED: 15.5 * 60})
    assert list(dict(r.by_zuordnung))[-1] == UNASSIGNED  # "nicht zugeordnet" steht unten
    day = r.days[0]
    assert (day.first.hour, day.last.hour) == (8, 11)
    assert day.totals[ACTIVE] == pytest.approx(125 * 60)
    assert day.totals[IDLE] == pytest.approx(15 * 60)
    assert day.totals[LOCKED] == pytest.approx(10 * 60)
    assert day.totals[GAP] == pytest.approx(30 * 60)

    blocks = [(b.start.strftime("%H:%M"), b.end.strftime("%H:%M"), b.state, b.label) for b in r.blocks[DAY]]
    assert blocks == [
        ("08:00", "09:30", ACTIVE, "10001 Mustermann GmbH"),
        ("09:30", "09:45", IDLE, "Inaktiv – PC an, keine Eingabe"),
        ("09:45", "10:00", ACTIVE, "Microsoft Outlook"),
        ("10:00", "10:30", GAP, "Keine Aufzeichnung – PC aus / Standby"),
        ("10:30", "10:40", LOCKED, "PC gesperrt"),
        ("10:40", "11:00", ACTIVE, "10002 Beispiel KG"),
    ]
    assert [b.state for b in r.pauses] == [IDLE, GAP, LOCKED]


def test_segment_over_midnight_is_split(db):
    add(db, ts(23, 0), ts(1, 0, day=DAY + timedelta(days=1)), title="Kanzlei-Rechnungswesen - 10001 X", **REWE)
    r = build_report(db, Config(), DAY, DAY + timedelta(days=1), now=NOW)
    assert [d.day for d in r.days] == [DAY, DAY + timedelta(days=1)]
    assert [d.totals[ACTIVE] for d in r.days] == [3600, 3600]
    only_first = build_report(db, Config(), DAY, DAY, now=NOW)
    assert only_first.totals[ACTIVE] == 3600


def test_report_stops_at_now(db):
    add(db, ts(8, 0), ts(12, 0), title="x", **OUTLOOK)
    r = build_report(db, Config(), DAY, DAY, now=datetime(2026, 11, 16, 10, 0))
    assert r.totals[ACTIVE] == 7200


def test_demo_report_files(tmp_path):
    days = [DAY + timedelta(days=i) for i in range(3)]
    dbp = create_demo_db(tmp_path / "demo.db", days)
    cfg = parse_config(tomllib.loads(DEMO_CONFIG))
    html, xlsx = create_report(dbp, cfg, days[0], days[-1], folder=tmp_path, now=NOW)
    text = html.read_text(encoding="utf-8")
    assert "10001 Mustermann GmbH" in text and "Tagesverlauf" in text and "<svg" in text
    wb = load_workbook(xlsx)
    assert wb.sheetnames[:3] == ["Mandanten-Projekte", "Je Tag", "Anwendungen"]
    ws = wb["Mandanten-Projekte"]
    names = [row[0].value for row in ws.iter_rows(min_row=2)]
    assert "10002 Beispiel Bau KG" in names and names[-1] == "Summe aktiv"
    assert wb["Rohdaten"].max_row > 10


def test_empty_report_renders(db):
    r = build_report(db, Config(), DAY, DAY, now=NOW)
    assert "Keine Daten" in render_html(r)


def test_html_escapes_titles(db):
    add(db, ts(8, 0), ts(9, 0), title="<script>alert(1)</script>", **OUTLOOK)
    html = render_html(build_report(db, Config(), DAY, DAY, now=NOW))
    assert "<script>alert(1)" not in html


@pytest.mark.parametrize("secs, minutes, expected", [
    (3600, 15, 1.0), (3600 + 7 * 60, 15, 1.0), (3600 + 8 * 60, 15, 1.25), (50 * 60, 0, 0.83), (6 * 60, 6, 0.1),
])
def test_round_hours(secs, minutes, expected):
    assert round_hours(secs, minutes) == expected


def test_fmt_dur():
    assert fmt_dur(3 * 3600 + 42 * 60 + 20) == "3:42"
    assert fmt_dur(59, seconds=True) == "0:00:59"


def test_periods():
    wed = date(2026, 11, 18)
    assert period("woche", wed) == (date(2026, 11, 16), wed)
    assert period("letzte-woche", wed) == (date(2026, 11, 9), date(2026, 11, 15))
    assert period("letzter-monat", wed) == (date(2026, 10, 1), date(2026, 10, 31))
    assert parse_date("17.11.2026") == parse_date("2026-11-17") == parse_date("17.11.26")


def test_default_template_is_valid(tmp_path):
    cfg = parse_config(tomllib.loads(DEFAULT_TEMPLATE))
    assert cfg.inaktiv_nach_sekunden == 300 and cfg.browser_adresse == "domain" and cfg.mandanten == {}
    path = tmp_path / "einstellungen.toml"
    load_config(path)  # legt die Datei an
    assert path.read_text(encoding="utf-8") == DEFAULT_TEMPLATE


def test_uncommented_examples_are_valid():
    """Entfernt man die Rauten vor den Beispielen, muss die Datei gültig bleiben."""
    lines = []
    for line in DEFAULT_TEMPLATE.splitlines():
        stripped = line[2:]
        if line.startswith("# ") and not stripped.startswith(" ") and (
            stripped.startswith(("[[", '"1000', "titel =", "adresse =", "zuordnung =", "muster =", "nur_datev =",
                                 "prozess =", "name ="))
        ):
            lines.append(stripped)
        else:
            lines.append(line)
    cfg = parse_config(tomllib.loads("\n".join(lines)))
    assert len(cfg.mandanten) == 3 and len(cfg.regeln) == 3 and len(cfg.mandant_muster) == 1
    assert len(cfg.anwendung_regeln) == 1


@pytest.mark.parametrize("text, fragment", [
    ('[aufzeichnung]\nbrowser_adresse = "alles"', "browser_adresse"),
    ("[[regel]]\ntitel = '('\nzuordnung = \"x\"", "ungültiges Suchmuster"),
    ("[[regel]]\nzuordnung = \"x\"", "mindestens eine Bedingung"),
    ("[[mandant_muster]]\nmuster = '\\d+'", "(?P<nr>"),
    ("[aufzeichnung]\ninaktiv_nach_minuten = \"fünf\"", "Zahl erwartet"),
])
def test_config_errors(text, fragment):
    with pytest.raises(ConfigError, match=None) as exc:
        parse_config(tomllib.loads(text))
    assert fragment in str(exc.value)


def test_config_store_keeps_old_config_on_error(tmp_path):
    path = tmp_path / "e.toml"
    path.write_text("[aufzeichnung]\ninaktiv_nach_minuten = 10\n", encoding="utf-8")
    store = ConfigStore(path)
    assert store.config.inaktiv_nach_sekunden == 600
    path.write_text("[aufzeichnung\nkaputt", encoding="utf-8")
    assert store.reload() is not None
    assert store.config.inaktiv_nach_sekunden == 600 and store.error
    path.write_text("[aufzeichnung]\ninaktiv_nach_minuten = 2\n", encoding="utf-8")
    assert store.reload() is None
    assert store.config.inaktiv_nach_sekunden == 120 and store.error is None


def test_config_ansi_encoded_file(tmp_path):
    path = tmp_path / "ansi.toml"
    path.write_bytes('[mandanten]\n"1" = "Müller"\n'.encode("cp1252"))
    assert load_config(path).mandanten["1"].name == "Müller"
