import pytest

from zeiterfassung.browser import normalize_address
from zeiterfassung.classify import Classifier, WindowInfo, clean_title
from zeiterfassung.config import parse_config

DATEV = dict(
    process="Rewe.exe",
    exe_path=r"C:\Program Files (x86)\DATEV\PROGRAMM\RWAPPLIC\Rewe.exe",
    company="DATEV eG",
    product="Kanzlei-Rechnungswesen",
)


@pytest.fixture
def classifier():
    cfg = parse_config({
        "mandanten": {
            "10002": {"name": "Beispiel Bau KG", "suchbegriffe": ["Beispiel Bau"]},
            "010003": "Müller-Lüdenscheidt GmbH",
            "10007": {"name": "Mustermann GmbH", "suchbegriffe": ["Mustermann"]},
        },
        "regel": [
            {"adresse": r"spiegel\.de", "zuordnung": "Privat"},
            {"titel": "Jahresabschluss 2025", "prozess": r"excel\.exe", "zuordnung": "JA 2025"},
        ],
    })
    return Classifier(cfg)


@pytest.mark.parametrize("title, app, zuordnung", [
    ("Kanzlei-Rechnungswesen - 10001 Mustermann GmbH - Buchen", "DATEV Kanzlei-Rechnungswesen", "10001 Mustermann GmbH"),
    ("Kanzlei-Rechnungswesen - [12345/10002/2026] Buchungsstapel", "DATEV Kanzlei-Rechnungswesen", "10002 Beispiel Bau KG"),
    ("12345 / 10003 / 2026 Müller-Lüdenscheidt GmbH - Kanzlei-Rechnungswesen", "DATEV Kanzlei-Rechnungswesen",
     "10003 Müller-Lüdenscheidt GmbH"),
    ("Einkommensteuer 2025 - 10004 Mustermann, Max", "DATEV Einkommensteuer", "10004 Mustermann, Max"),
    ("DATEV Arbeitsplatz - Mandantenübersicht", "DATEV Arbeitsplatz", ""),
    ("DATEV Arbeitsplatz - Mandant 10005 Schmidt OHG", "DATEV Arbeitsplatz", "10005 Schmidt OHG"),
    ("Buchungsstapel 3 Bank - Rechnungswesen", "DATEV Rechnungswesen", ""),
    ("Lohn und Gehalt - 12345/10006", "DATEV Lohn und Gehalt", "Mandant 10006"),
])
def test_datev_windows(classifier, title, app, zuordnung):
    c = classifier.classify(WindowInfo(title=title, **DATEV))
    assert c.datev
    assert c.anwendung == app
    assert c.zuordnung == zuordnung


def test_remote_datev_window(classifier):
    c = classifier.classify(WindowInfo(process="mstsc.exe", title="Lohn und Gehalt - 12345/10006 Bäckerei Korn (Remote)"))
    assert c.anwendung == "DATEV Lohn und Gehalt"
    assert c.zuordnung == "10006 Bäckerei Korn"


def test_name_search_in_other_programs(classifier):
    c = classifier.classify(WindowInfo(process="OUTLOOK.EXE", title="AW: Beispiel Bau - Rückfrage Belege - Nachricht"))
    assert (c.anwendung, c.zuordnung, c.quelle) == ("Microsoft Outlook", "10002 Beispiel Bau KG", "Mandantenliste")
    c = classifier.classify(WindowInfo(process="Acrobat.exe", product="Adobe Acrobat",
                                       title="10007_Mustermann_Kontoauszug.pdf - Adobe Acrobat"))
    assert c.zuordnung == "10007 Mustermann GmbH"
    # kein Treffer innerhalb eines längeren Wortes
    c = classifier.classify(WindowInfo(process="OUTLOOK.EXE", title="Mustermannstraße 5"))
    assert c.zuordnung == ""


def test_numbers_in_non_datev_windows_are_ignored(classifier):
    c = classifier.classify(WindowInfo(process="EXCEL.EXE", title="Umsatz 12345/2026 - 10001 Test.xlsx - Excel"))
    assert c.zuordnung == ""
    c = classifier.classify(WindowInfo(process="EXCEL.EXE", title="Mandant 10002 Auswertung.xlsx - Excel"))
    assert c.zuordnung == "10002 Beispiel Bau KG"


def test_own_rules_first(classifier):
    c = classifier.classify(WindowInfo(process="chrome.exe", title="SPIEGEL - Google Chrome", url="spiegel.de"))
    assert c.zuordnung == "Privat" and c.quelle == "eigene Regel" and c.domain == "spiegel.de"
    c = classifier.classify(WindowInfo(process="EXCEL.EXE", title="Jahresabschluss 2025 Mustermann.xlsx - Excel"))
    assert c.zuordnung == "JA 2025"


def test_browsers_are_never_datev(classifier):
    c = classifier.classify(WindowInfo(process="msedge.exe", title="DATEV Unternehmen online - Microsoft\u200b Edge",
                                       url="duo.datev.de"))
    assert not c.datev and c.anwendung == "Microsoft Edge" and c.titel == "DATEV Unternehmen online"


def test_unknown_program_uses_file_description(classifier):
    c = classifier.classify(WindowInfo(process="foo.exe", product="Foo Pro 2026", title="x"))
    assert c.anwendung == "Foo Pro 2026"
    c = classifier.classify(WindowInfo(process="bar.exe", title="x"))
    assert c.anwendung == "bar"


@pytest.mark.parametrize("raw, clean", [
    ("(3) Posteingang - Google Chrome", "Posteingang"),
    ("DATEV Hilfe-Center und 3 weitere Seiten - Persönlich - Microsoft\u200b Edge", "DATEV Hilfe-Center"),
    ("Mappe1.xlsx - Excel", "Mappe1.xlsx"),
    ("Posteingang - max@example.de - Outlook", "Posteingang - max@example.de"),
    ("Kanzlei-Rechnungswesen - 10001", "Kanzlei-Rechnungswesen - 10001"),
])
def test_clean_title(raw, clean):
    assert clean_title(raw) == clean


@pytest.mark.parametrize("value, mode, expected", [
    ("datev.de/web/de/startseite/", "domain", "datev.de"),
    ("https://www.elster.de/eportal/start", "domain", "elster.de"),
    ("https://www.elster.de/eportal/start", "voll", "https://www.elster.de/eportal/start"),
    ("suche nach etwas", "domain", ""),
    ("", "domain", ""),
])
def test_normalize_address(value, mode, expected):
    assert normalize_address(value, mode) == expected
