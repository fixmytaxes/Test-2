"""Zuordnung der Rohdaten zu Anwendung und Mandant/Projekt.

Reihenfolge der Mandant-/Projekt-Zuordnung:
 1. eigene Regeln aus den Einstellungen ([[regel]])
 2. eigene Muster für Mandantennummern ([[mandant_muster]])
 3. eingebaute Muster (DATEV-Fenster, "Mandant 10001" überall)
 4. Mandantennamen/Suchbegriffe aus der Mandantenliste in allen Fenstern
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from .browser import BROWSERS, domain_of
from .config import Config, normalize_nr

# Bekannte Programme mit festem Anzeigenamen (unabhängig von der Sprache)
KNOWN_APPS = {
    "chrome.exe": "Google Chrome",
    "msedge.exe": "Microsoft Edge",
    "firefox.exe": "Mozilla Firefox",
    "brave.exe": "Brave",
    "opera.exe": "Opera",
    "vivaldi.exe": "Vivaldi",
    "iexplore.exe": "Internet Explorer",
    "outlook.exe": "Microsoft Outlook",
    "olk.exe": "Microsoft Outlook (neu)",
    "excel.exe": "Microsoft Excel",
    "winword.exe": "Microsoft Word",
    "powerpnt.exe": "Microsoft PowerPoint",
    "onenote.exe": "Microsoft OneNote",
    "msaccess.exe": "Microsoft Access",
    "teams.exe": "Microsoft Teams",
    "ms-teams.exe": "Microsoft Teams",
    "explorer.exe": "Windows-Explorer",
    "acrord32.exe": "Adobe Acrobat Reader",
    "acrobat.exe": "Adobe Acrobat",
    "notepad.exe": "Editor",
    "mstsc.exe": "Remotedesktop",
    "msrdc.exe": "Remotedesktop",
    "wfica32.exe": "Citrix",
    "cdviewer.exe": "Citrix",
    "zoom.exe": "Zoom",
    "thunderbird.exe": "Mozilla Thunderbird",
    "searchhost.exe": "Windows-Suche",
    "searchapp.exe": "Windows-Suche",
    "shellexperiencehost.exe": "Windows-Oberfläche",
    "startmenuexperiencehost.exe": "Windows-Startmenü",
    "taskmgr.exe": "Task-Manager",
}

# Programme, in denen entfernte DATEV-Anwendungen laufen können (DATEVasp, Terminalserver)
REMOTE_PROCESSES = frozenset({"mstsc.exe", "msrdc.exe", "wfica32.exe", "cdviewer.exe", "vmconnect.exe"})

# DATEV-Programmnamen, die im Fenstertitel gesucht werden. Spezifische zuerst,
# "Arbeitsplatz" zuletzt, weil darin oft andere Programme geöffnet sind.
DATEV_PROGRAMME = [
    "Kanzlei-Rechnungswesen",
    "Rechnungswesen",
    "Anlagenbuchführung",
    "Kostenrechnung",
    "Bilanzbericht",
    "Jahresabschluss",
    "E-Bilanz",
    "Abschlussprüfung",
    "Lohn und Gehalt",
    "LODAS",
    "Personalwirtschaft",
    "Einkommensteuer",
    "Körperschaftsteuer",
    "Gewerbesteuer",
    "Umsatzsteuer",
    "Feststellungserklärung",
    "Erbschaftsteuer",
    "Schenkungsteuer",
    "Grundsteuer",
    "Steuerkonto online",
    "Wirtschaftsberatung",
    "Unternehmensplanung",
    "Kanzleimanagement",
    "Eigenorganisation",
    "Dokumentenablage",
    "DMS",
    "Unternehmen online",
    "Belegtransfer",
    "Zahlungsverkehr",
    "Auftragswesen",
    "Mittelstand",
    "Rechnungsschreibung",
    "Kassenbuch",
    "Fristenkontrolle",
    "Leistungserfassung",
    "Honorarabrechnung",
    "Postbuch",
    "Arbeitsplatz",
]

# Namensteil hinter einer Mandantennummer, bis zum nächsten Trenner " - " / " | " / "]" / Ende
_NAME_TAIL = r"(?:\s+(?P<name>[^\W\d_][^|\[\]()]*?)(?=\s+[-–—|]\s|\s*[\[\]()]|\s*$))?"
_NOT_YEAR = r"(?!(?:19|20)\d{2}(?!\d))"

# (Muster, nur in DATEV-Fenstern?)
BUILTIN_MANDANT_PATTERNS = [
    # "Mandant 10001", "Mandant: 10001", "Mandanten-Nr. 10001", "Mandantennummer 10001", "Mdt. 10001"
    # (gilt in allen Fenstern)
    (
        re.compile(
            r"(?i:\b(?:Mandant(?:en)?(?:[-\s]?(?:Nr\.?|nummer))?|Mdt\.?))\s*[:#]?\s*"
            r"(?:\d{4,7}\s*/\s*)?(?P<nr>\d{1,5})(?![\d.,])(?:\s*/\s*(?:19|20)\d{2}(?!\d))?" + _NAME_TAIL
        ),
        False,
    ),
    # "12345/10001" oder "12345 / 10001 / 2026" (Beraternummer/Mandantennummer[/Jahr])
    (
        re.compile(
            r"(?<![\d/.])\d{4,7}\s*/\s*(?P<nr>\d{1,5})(?![\d.])(?:\s*/\s*(?:19|20)\d{2}(?!\d))?" + _NAME_TAIL
        ),
        True,
    ),
    # "Kanzlei-Rechnungswesen - 10001 Mustermann GmbH - ..." bzw. "10001 Mustermann GmbH - ..."
    (
        re.compile(
            r"(?:^|\s[-–—|:]\s|\[)\s*" + _NOT_YEAR + r"(?P<nr>\d{3,5})\s+"
            r"(?P<name>[^\W\d_][^|\[\]()]*?)(?=\s+[-–—|]\s|\s*[\[\]()]|\s*$)"
        ),
        True,
    ),
]

_INVISIBLE = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u200e\u200f\ufeff"), None)
_APP_SUFFIX = re.compile(
    r"\s+[-–—]\s+(?:Google Chrome|Microsoft\s*Edge|Mozilla Firefox|Brave|Opera|Vivaldi|Internet Explorer"
    r"|Excel|Word|PowerPoint|Outlook|OneNote|Access|Editor|Notepad|Adobe Acrobat(?: Reader)?(?: \w+)?"
    r"|Microsoft Teams)\s*$",
    re.IGNORECASE,
)
_BROWSER_PROFILE = re.compile(r"\s+[-–—]\s+(?:Persönlich|Personal|Arbeit|Work|Geschäftlich|Profil \d+|Profile \d+)\s*$", re.I)
_MORE_PAGES = re.compile(r"\s+(?:und|and)\s+\d+\s+(?:weitere|more)\s+(?:Seiten?|pages?)", re.I)
_NOTIFICATIONS = re.compile(r"^\(\d+\+?\)\s+")


def clean_title(title: str) -> str:
    """Fenstertitel ohne Programmnamen-Anhang, Benachrichtigungszähler etc."""
    t = (title or "").translate(_INVISIBLE).strip()
    for _ in range(2):
        t = _APP_SUFFIX.sub("", t)
        t = _BROWSER_PROFILE.sub("", t)
    t = _MORE_PAGES.sub("", t)
    t = _NOTIFICATIONS.sub("", t)
    return t.strip()


@dataclass(frozen=True)
class WindowInfo:
    process: str = ""
    exe_path: str = ""
    product: str = ""
    company: str = ""
    title: str = ""
    url: str = ""


@dataclass(frozen=True)
class Classification:
    anwendung: str      # z. B. "DATEV Kanzlei-Rechnungswesen", "Google Chrome"
    zuordnung: str      # Mandant/Projekt, "" = nicht zugeordnet
    titel: str          # bereinigter Fenstertitel
    domain: str         # Website (nur Browser)
    datev: bool
    quelle: str         # wodurch zugeordnet (für die Fehlersuche)


class Classifier:
    def __init__(self, config: Config):
        self.cfg = config
        self._cache: dict[WindowInfo, Classification] = {}
        programmes = list(config.datev_programme) + DATEV_PROGRAMME
        self._datev_programmes = [
            (p, re.compile(r"(?<!\w)" + re.escape(p) + r"(?!\w)", re.IGNORECASE)) for p in programmes
        ]
        self._name_search = []
        if config.namen_ueberall_suchen:
            for m in config.mandanten.values():
                terms = [t for t in [m.name, *m.suchbegriffe] if t and len(t.strip()) >= 3]
                if terms:
                    pattern = re.compile(
                        # Unterstrich zählt als Trenner (Dateinamen wie "10001_Mustermann_BWA.pdf")
                        r"(?<![^\W_])(?:" + "|".join(re.escape(t.strip()) for t in terms) + r")(?![^\W_])",
                        re.IGNORECASE,
                    )
                    self._name_search.append((m, pattern))

    # --- Anwendung -----------------------------------------------------------
    def _datev_programme(self, title: str) -> Optional[str]:
        for name, pattern in self._datev_programmes:
            if pattern.search(title):
                return name
        return None

    def is_datev(self, w: WindowInfo) -> bool:
        process = w.process.lower()
        if process in BROWSERS:
            return False
        if "datev" in w.exe_path.lower() or "datev" in w.company.lower() or "datev" in w.product.lower():
            return True
        if process in REMOTE_PROCESSES:
            return "datev" in w.title.lower() or self._datev_programme(w.title) is not None
        return False

    def anwendung(self, w: WindowInfo, datev: bool) -> str:
        for rule in self.cfg.anwendung_regeln:
            if rule.prozess and not rule.prozess.search(w.process):
                continue
            if rule.titel and not rule.titel.search(w.title):
                continue
            if rule.pfad and not rule.pfad.search(w.exe_path):
                continue
            return rule.name
        process = w.process.lower()
        if datev:
            programme = self._datev_programme(w.title)
            if programme:
                return f"DATEV {programme}"
            product = w.product.strip()
            if product and process not in REMOTE_PROCESSES:
                return product if product.lower().startswith("datev") else f"DATEV {product}"
            return "DATEV"
        if process in KNOWN_APPS:
            return KNOWN_APPS[process]
        if w.product.strip():
            return w.product.strip()
        if w.process:
            return w.process[:-4] if process.endswith(".exe") else w.process
        return "(unbekannt)"

    # --- Mandant/Projekt -------------------------------------------------------
    def _label(self, nr: str, name: str) -> str:
        nr = normalize_nr(nr)
        mandant = self.cfg.mandanten.get(nr)
        if mandant and mandant.name:
            name = mandant.name
        name = (name or "").strip(" -–,;:")
        return f"{nr} {name}" if name else f"Mandant {nr}"

    def zuordnung(self, w: WindowInfo, anwendung: str, datev: bool) -> tuple[str, str]:
        for rule in self.cfg.regeln:
            if rule.titel and not rule.titel.search(w.title):
                continue
            if rule.prozess and not rule.prozess.search(w.process):
                continue
            if rule.anwendung and not rule.anwendung.search(anwendung):
                continue
            if rule.adresse and not rule.adresse.search(w.url):
                continue
            return rule.zuordnung, "eigene Regel"

        patterns = [(m.muster, m.nur_datev, "eigenes Muster") for m in self.cfg.mandant_muster]
        if self.cfg.standard_regeln:
            patterns += [(p, only_datev, "Mandantennummer im Titel") for p, only_datev in BUILTIN_MANDANT_PATTERNS]
        for pattern, only_datev, source in patterns:
            if only_datev and not datev:
                continue
            match = pattern.search(w.title)
            if match:
                groups = match.groupdict()
                return self._label(groups.get("nr") or "", groups.get("name") or ""), source

        for mandant, pattern in self._name_search:
            if pattern.search(w.title) or (w.url and pattern.search(w.url)):
                return self._label(mandant.nr, mandant.name), "Mandantenliste"
        return "", ""

    # --- gesamt ------------------------------------------------------------------
    def classify(self, w: WindowInfo) -> Classification:
        cached = self._cache.get(w)
        if cached is not None:
            return cached
        datev = self.is_datev(w)
        anwendung = self.anwendung(w, datev)
        zuordnung, quelle = self.zuordnung(w, anwendung, datev)
        result = Classification(
            anwendung=anwendung,
            zuordnung=zuordnung,
            titel=clean_title(w.title),
            domain=domain_of(w.url),
            datev=datev,
            quelle=quelle,
        )
        if len(self._cache) > 20000:
            self._cache.clear()
        self._cache[w] = result
        return result
