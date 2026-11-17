"""Beispieldaten für einen typischen Kanzlei-Arbeitstag (zum Ausprobieren des Berichts)."""

from __future__ import annotations

from datetime import date, datetime, time as dtime, timedelta
from pathlib import Path

from .db import ACTIVE, IDLE, LOCKED, Database

DATEV = dict(
    process="Rewe.exe",
    exe_path=r"C:\Program Files (x86)\DATEV\PROGRAMM\RWAPPLIC\Rewe.exe",
    product="Kanzlei-Rechnungswesen",
    company="DATEV eG",
)
ARBEITSPLATZ = dict(
    process="DATEV.Arbeitsplatz.exe",
    exe_path=r"C:\Program Files (x86)\DATEV\PROGRAMM\Arbeitsplatz\DATEV.Arbeitsplatz.exe",
    product="DATEV Arbeitsplatz",
    company="DATEV eG",
)
EST = dict(
    process="Est.exe",
    exe_path=r"C:\Program Files (x86)\DATEV\PROGRAMM\EST\Est.exe",
    product="Einkommensteuer",
    company="DATEV eG",
)
CHROME = dict(process="chrome.exe", exe_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
              product="Google Chrome", company="Google LLC")
OUTLOOK = dict(process="OUTLOOK.EXE", exe_path=r"C:\Program Files\Microsoft Office\root\Office16\OUTLOOK.EXE",
               product="Microsoft Outlook", company="Microsoft Corporation")
EXCEL = dict(process="EXCEL.EXE", exe_path=r"C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE",
             product="Microsoft Excel", company="Microsoft Corporation")
EXPLORER = dict(process="explorer.exe", exe_path=r"C:\Windows\explorer.exe", product="Windows-Explorer",
                company="Microsoft Corporation")
ACROBAT = dict(process="Acrobat.exe", exe_path=r"C:\Program Files\Adobe\Acrobat DC\Acrobat\Acrobat.exe",
               product="Adobe Acrobat", company="Adobe Inc.")

# (Minuten, Status, Programm, Fenstertitel, Adresse)
DAY_PLAN = [
    (6, ACTIVE, OUTLOOK, "Posteingang - kanzlei@example.de - Outlook", ""),
    (3, ACTIVE, OUTLOOK, "Mustermann – Rückfrage Bankbelege Oktober - Nachricht (HTML)", ""),
    (4, ACTIVE, ARBEITSPLATZ, "DATEV Arbeitsplatz - Mandantenübersicht", ""),
    (38, ACTIVE, DATEV, "Kanzlei-Rechnungswesen - 12345/10001/2026 Mustermann GmbH - Buchen", ""),
    (0.5, ACTIVE, OUTLOOK, "Posteingang - kanzlei@example.de - Outlook", ""),
    (21, ACTIVE, DATEV, "Kanzlei-Rechnungswesen - 12345/10001/2026 Mustermann GmbH - Buchen", ""),
    (7, ACTIVE, ACROBAT, "Kontoauszug_10-2026_Mustermann.pdf - Adobe Acrobat", ""),
    (12, ACTIVE, DATEV, "Kanzlei-Rechnungswesen - 12345/10001/2026 Mustermann GmbH - Kontenblatt", ""),
    (9, IDLE, None, "", ""),
    (5, ACTIVE, CHROME, "DATEV Hilfe-Center - Google Chrome", "apps.datev.de"),
    (31, ACTIVE, DATEV, "Kanzlei-Rechnungswesen - 12345/10002/2026 Beispiel Bau KG - Buchen", ""),
    (9, ACTIVE, EXCEL, "Beispiel Bau - OPOS Abstimmung.xlsx - Excel", ""),
    (18, ACTIVE, DATEV, "Kanzlei-Rechnungswesen - 12345/10002/2026 Beispiel Bau KG - Buchen", ""),
    (36, LOCKED, None, "", ""),
    (4, ACTIVE, OUTLOOK, "Posteingang - kanzlei@example.de - Outlook", ""),
    (6, ACTIVE, CHROME, "ELSTER - Ihr Online-Finanzamt - Google Chrome", "elster.de"),
    (42, ACTIVE, EST, "Einkommensteuer 2025 - 12345/10003 Müller, Erika", ""),
    (4, ACTIVE, EXPLORER, "10003 Müller Erika", ""),
    (16, ACTIVE, EST, "Einkommensteuer 2025 - 12345/10003 Müller, Erika", ""),
    (14, IDLE, None, "", ""),
    (11, ACTIVE, CHROME, "Bundesfinanzministerium - Schreiben zur Grundsteuer - Google Chrome", "bundesfinanzministerium.de"),
    (3, ACTIVE, CHROME, "Nachrichten - SPIEGEL - Google Chrome", "spiegel.de"),
    (25, ACTIVE, DATEV, "Kanzlei-Rechnungswesen - 12345/10004 Schmidt Elektro OHG - Auswertungen", ""),
    (8, ACTIVE, OUTLOOK, "AW: Schmidt Elektro BWA 10/2026 - Nachricht (HTML)", ""),
    (6, ACTIVE, OUTLOOK, "Posteingang - kanzlei@example.de - Outlook", ""),
]

DEMO_CONFIG = """
[mandanten]
"10001" = { name = "Mustermann GmbH", suchbegriffe = ["Mustermann"] }
"10002" = { name = "Beispiel Bau KG", suchbegriffe = ["Beispiel Bau"] }
"10003" = { name = "Müller, Erika", suchbegriffe = ["Müller Erika", "Erika Müller"] }
"10004" = { name = "Schmidt Elektro OHG", suchbegriffe = ["Schmidt Elektro"] }

[[regel]]
adresse = 'spiegel\\.de'
zuordnung = "Privat"
"""


def fill_demo(db: Database, day: date, start: dtime = dtime(8, 2)) -> None:
    t = datetime.combine(day, start)
    for minutes, state, prog, title, url in DAY_PLAN:
        end = t + timedelta(minutes=minutes)
        info = dict(prog or {}, title=title, url=url)
        db.insert(t.timestamp(), end.timestamp(), state, info)
        t = end


def create_demo_db(path: Path, days: list) -> Path:
    if path.exists():
        path.unlink()
    db = Database(path)
    for i, d in enumerate(days):
        fill_demo(db, d, dtime(8, 2 + i * 7 % 40))
    db.close()
    return path
