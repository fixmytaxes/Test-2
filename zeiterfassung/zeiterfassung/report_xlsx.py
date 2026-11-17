"""Excel-Export (.xlsx) des Berichts mit mehreren Tabellenblättern."""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from .db import ACTIVE, IDLE, LOCKED, PAUSED
from .report import GAP, STATE_LABELS, STATE_SHORT, Report, fmt_day, round_hours

HEADER_FONT = Font(bold=True, color="FFFFFF")
HEADER_FILL = PatternFill("solid", fgColor="2A78D6")
SUM_FONT = Font(bold=True)
DUR_FMT = "[h]:mm"
DUR_FMT_S = "[h]:mm:ss"
HOURS_FMT = "0.00"
DATE_FMT = "DD.MM.YYYY"
TIME_FMT = "HH:MM"
DATETIME_FMT = "DD.MM.YYYY HH:MM:SS"
PCT_FMT = "0.0%"


def _td(secs: float) -> timedelta:
    return timedelta(seconds=round(secs))


def _sheet(wb: Workbook, title: str, headers: list, widths: list, first: bool = False):
    ws = wb.active if first else wb.create_sheet()
    ws.title = title
    ws.append(headers)
    for col, width in enumerate(widths, 1):
        cell = ws.cell(row=1, column=col)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(vertical="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(col)].width = width
    ws.freeze_panes = "A2"
    return ws


def _formats(ws, start_row: int, formats: dict) -> None:
    for row in ws.iter_rows(min_row=start_row):
        for col, fmt in formats.items():
            row[col - 1].number_format = fmt


def _finish(ws, formats: dict, sum_row: bool = False) -> None:
    _formats(ws, 2, formats)
    last = ws.max_row - (1 if sum_row else 0)
    if last >= 2:
        ws.auto_filter.ref = f"A1:{get_column_letter(ws.max_column)}{last}"
    if sum_row and ws.max_row >= 2:
        for cell in ws[ws.max_row]:
            cell.font = SUM_FONT


def write_xlsx(report: Report, path: Path) -> Path:
    wb = Workbook()
    minutes = report.config.rundung_minuten
    total = report.active_total

    # 1) Mandanten / Projekte
    ws = _sheet(wb, "Mandanten-Projekte",
                ["Mandant / Projekt", "Dauer", "Stunden", f"Stunden gerundet ({minutes} Min.)", "Anteil"],
                [48, 12, 10, 16, 10], first=True)
    for z, secs in report.by_zuordnung:
        ws.append([z, _td(secs), round(secs / 3600, 2), round_hours(secs, minutes), secs / total if total else 0])
    n = ws.max_row
    ws.append(["Summe aktiv", f"=SUM(B2:B{n})", f"=SUM(C2:C{n})", f"=SUM(D2:D{n})", 1 if total else 0])
    _finish(ws, {2: DUR_FMT, 3: HOURS_FMT, 4: HOURS_FMT, 5: PCT_FMT}, sum_row=True)

    # 2) je Tag
    ws = _sheet(wb, "Je Tag", ["Datum", "Mandant / Projekt", "Dauer", "Stunden", f"Stunden gerundet ({minutes} Min.)"],
                [12, 48, 12, 10, 16])
    for d, z, secs in report.by_day_zuordnung:
        ws.append([d, z, _td(secs), round(secs / 3600, 2), round_hours(secs, minutes)])
    _finish(ws, {1: DATE_FMT, 3: DUR_FMT, 4: HOURS_FMT, 5: HOURS_FMT})

    # 3) Anwendungen
    ws = _sheet(wb, "Anwendungen", ["Anwendung", "Dauer", "Stunden", "Anteil"], [40, 12, 10, 10])
    for app, secs in report.by_app:
        ws.append([app, _td(secs), round(secs / 3600, 2), secs / total if total else 0])
    n = ws.max_row
    ws.append(["Summe aktiv", f"=SUM(B2:B{n})", f"=SUM(C2:C{n})", 1 if total else 0])
    _finish(ws, {2: DUR_FMT, 3: HOURS_FMT, 4: PCT_FMT}, sum_row=True)

    # 4) Mandant x Anwendung
    ws = _sheet(wb, "Mandant x Anwendung", ["Mandant / Projekt", "Anwendung", "Dauer", "Stunden"], [48, 40, 12, 10])
    for z, app, secs in report.by_zuordnung_app:
        ws.append([z, app, _td(secs), round(secs / 3600, 2)])
    _finish(ws, {3: DUR_FMT, 4: HOURS_FMT})

    # 5) Anwesenheit je Tag
    ws = _sheet(wb, "Anwesenheit",
                ["Datum", "Wochentag", "Beginn", "Ende", "Zeitspanne", "Aktiv", "Inaktiv", "Gesperrt", "Pausiert",
                 "Ohne Aufzeichnung"],
                [12, 12, 9, 9, 12, 12, 12, 12, 12, 16])
    for d in report.days:
        t = d.totals
        ws.append([d.day, fmt_day(d.day, long=True).split(",")[0], d.first.time(), d.last.time(), _td(d.span),
                   _td(t.get(ACTIVE, 0)), _td(t.get(IDLE, 0)), _td(t.get(LOCKED, 0)), _td(t.get(PAUSED, 0)),
                   _td(t.get(GAP, 0))])
    n = ws.max_row
    if n >= 2:
        ws.append(["Summe", "", "", ""] + [f"=SUM({c}2:{c}{n})" for c in "EFGHIJ"])
    _finish(ws, {1: DATE_FMT, 3: TIME_FMT, 4: TIME_FMT, **{c: DUR_FMT for c in range(5, 11)}}, sum_row=n >= 2)

    # 6) Zeitblöcke
    ws = _sheet(wb, "Zeitbloecke",
                ["Datum", "Beginn", "Ende", "Dauer", "Status", "Mandant / Projekt", "Anwendungen", "Hauptfenster"],
                [12, 9, 9, 10, 26, 40, 50, 60])
    for day in sorted(report.blocks):
        for b in report.blocks[day]:
            apps = ", ".join(f"{a} ({int(s // 60)} Min.)" for a, s in b.apps.most_common(4)) if b.state == ACTIVE else ""
            ws.append([day, b.start.time(), b.end.time(), _td(b.secs), STATE_SHORT[b.state],
                       b.zuordnung if b.state == ACTIVE else "", apps, b.main_title])
    _finish(ws, {1: DATE_FMT, 2: TIME_FMT, 3: TIME_FMT, 4: DUR_FMT})

    # 7) Pausen
    ws = _sheet(wb, "Pausen", ["Datum", "Von", "Bis", "Dauer", "Art"], [12, 9, 9, 10, 40])
    for b in report.pauses:
        ws.append([b.start.date(), b.start.time(), b.end.time(), _td(b.secs), STATE_LABELS[b.state]])
    _finish(ws, {1: DATE_FMT, 2: TIME_FMT, 3: TIME_FMT, 4: DUR_FMT})

    # 8) Details
    ws = _sheet(wb, "Details", ["Anwendung", "Mandant / Projekt", "Website", "Fenstertitel", "Dauer", "Stunden"],
                [32, 40, 24, 80, 11, 10])
    for app, z, dom, title, secs in report.details:
        ws.append([app, z, dom, title, _td(secs), round(secs / 3600, 3)])
    _finish(ws, {5: DUR_FMT_S, 6: "0.000"})

    # 9) Rohdaten
    ws = _sheet(wb, "Rohdaten",
                ["Beginn", "Ende", "Sekunden", "Status", "Anwendung", "Mandant / Projekt", "erkannt durch",
                 "Fenstertitel", "Website / Adresse", "Programmdatei", "Pfad", "Dateibeschreibung", "Hersteller"],
                [19, 19, 9, 12, 30, 36, 20, 70, 28, 18, 50, 28, 20])
    for it in report.items:
        seg = it.segment
        ws.append([
            it.start, it.end, round(it.secs, 1), STATE_SHORT[it.state], it.anwendung, it.zuordnung, it.quelle,
            seg.title if seg else "", seg.url if seg else "", seg.process if seg else "",
            seg.exe_path if seg else "", seg.product if seg else "", seg.company if seg else "",
        ])
    _finish(ws, {1: DATETIME_FMT, 2: DATETIME_FMT})

    wb.properties.title = "Zeiterfassung"
    wb.properties.created = datetime.now()
    path = Path(path)
    wb.save(path)
    return path
