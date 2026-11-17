"""Einstellungen: TOML-Datei mit Kommentaren, die der Nutzer im Editor bearbeiten kann."""

from __future__ import annotations

import logging
import re
import threading
import tomllib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)

BROWSER_MODES = ("aus", "domain", "voll")

DEFAULT_TEMPLATE = r"""# ==========================================================================
#  Zeiterfassung – Einstellungen
# ==========================================================================
#  Diese Datei können Sie mit dem Editor (Notepad) bearbeiten und speichern.
#  Zeilen, die mit # beginnen, sind Kommentare und werden ignoriert.
#
#  Änderungen gelten sofort für neue Berichte – auch rückwirkend, weil die
#  Zuordnung erst beim Erstellen des Berichts berechnet wird. Die laufende
#  Aufzeichnung übernimmt geänderte Werte innerhalb weniger Sekunden.
#
#  Suchmuster (reguläre Ausdrücke) bitte in einfache Anführungszeichen
#  setzen, z. B. 'Mandant\s+\d+' – dann wird der Backslash genau so
#  übernommen. Groß-/Kleinschreibung spielt bei Suchmustern keine Rolle.
# ==========================================================================

[aufzeichnung]
# Wie oft (in Sekunden) das aktive Fenster abgefragt wird.
abfrage_intervall_sekunden = 1

# Nach wie vielen Minuten ohne Maus- oder Tastatureingabe der PC als
# "inaktiv" gilt. Die Inaktivität wird rückwirkend ab der letzten Eingabe
# gezählt (wer 5 Minuten weg war, bekommt 5 Minuten "inaktiv").
inaktiv_nach_minuten = 5

# Programme, bei denen auch ohne Eingabe KEINE Inaktivität gezählt wird,
# solange sie im Vordergrund sind (z. B. Videokonferenzen, Präsentationen).
# Beispiel: inaktiv_ausnahmen = ["ms-teams.exe", "Teams.exe", "Zoom.exe"]
inaktiv_ausnahmen = []

# Adresse im Browser (Chrome, Edge, Firefox, Brave, Opera, Vivaldi) erfassen:
#   "domain" = nur die Website, z. B. "datev.de"  (Standard)
#   "voll"   = komplette Adresse inkl. Unterseite
#   "aus"    = keine Adresse, nur der Seitentitel aus dem Fenstertitel
browser_adresse = "domain"

# Programme, deren Fenstertitel NICHT gespeichert wird (nur der
# Programmname), z. B. Passwort-Manager oder privates Banking-Programm.
# Beispiel: titel_nicht_speichern = ["KeePass.exe"]
titel_nicht_speichern = []


[bericht]
# Ordner für Berichte. Leer lassen = "Dokumente\Zeiterfassung Berichte".
ordner = ""

# Zeitblöcke im Tagesverlauf: Fensterwechsel, die kürzer sind als diese
# Anzahl Sekunden, werden dem umgebenden Block zugeschlagen.
zeitblock_mindestdauer_sekunden = 60

# Zeiten ohne Aufzeichnung (PC aus, Standby, Programm beendet) werden ab
# dieser Länge (Sekunden) als Lücke ausgewiesen.
luecke_ab_sekunden = 120

# Rundung für die Spalte "Stunden gerundet" in Minuten (0 = nicht runden).
rundung_minuten = 15


# --------------------------------------------------------------------------
#  Mandantenliste
# --------------------------------------------------------------------------
#  Nummer = Name. Wird in einem DATEV-Fenster eine Mandantennummer
#  erkannt, erscheint im Bericht dieser Name.
#
#  Mit "suchbegriffe" wird zusätzlich in ALLEN Fenstern gesucht (Outlook,
#  Word, Excel, PDF, Explorer, Browser). So wird z. B. auch eine E-Mail mit
#  dem Betreff "Mustermann – Rückfrage Belege" dem Mandanten zugeordnet.
#  Der vollständige Name wird immer gesucht.
#
#  Beispiele (Raute am Zeilenanfang entfernen und anpassen):
[mandanten]
# "10001" = "Mustermann GmbH"
# "10002" = { name = "Beispiel Bau KG", suchbegriffe = ["Beispiel Bau", "BspBau"] }
# "10003" = { name = "Müller, Erika", suchbegriffe = ["Erika Müller"] }


[zuordnung]
# Mandantennamen und Suchbegriffe in allen Fenstern suchen (true/false).
mandantennamen_in_allen_fenstern_suchen = true

# Eingebaute Erkennung von DATEV-Mandantennummern verwenden (true/false).
# Erkannt werden u. a. "Mandant 10001", "12345/10001" (Berater/Mandant)
# und "- 10001 Mustermann GmbH" in Fenstertiteln von DATEV-Programmen.
standard_regeln_verwenden = true

# Zusätzliche DATEV-Programmnamen, die im Fenstertitel gesucht werden.
# Beispiel: datev_programme = ["Kanzleiorganisation"]
datev_programme = []


# --------------------------------------------------------------------------
#  Eigene Zuordnungsregeln (Mandant / Projekt)
# --------------------------------------------------------------------------
#  Werden VOR allen anderen Regeln geprüft, die erste passende gewinnt.
#  Bedingungen (alle optional – alle angegebenen müssen zutreffen):
#    titel     = Suchmuster im Fenstertitel
#    prozess   = Suchmuster im Programmdateinamen, z. B. 'excel\.exe'
#    anwendung = Suchmuster im erkannten Anwendungsnamen, z. B. 'Outlook'
#    adresse   = Suchmuster in der Browser-Adresse, z. B. 'elster\.de'
#  zuordnung = Bezeichnung, unter der die Zeit im Bericht erscheint.
#
# [[regel]]
# titel = 'Jahresabschluss 2025'
# zuordnung = "10001 Mustermann GmbH – Jahresabschluss 2025"
#
# [[regel]]
# adresse = 'elster\.de'
# zuordnung = "ELSTER / Finanzverwaltung"
#
# [[regel]]
# adresse = 'amazon\.|ebay\.|spiegel\.de'
# zuordnung = "Privat"


# --------------------------------------------------------------------------
#  Eigene Muster zur Erkennung der Mandantennummer
# --------------------------------------------------------------------------
#  Falls die eingebaute Erkennung bei Ihren DATEV-Programmen nicht greift:
#  DATEV-Fenster anklicken, im Zeiterfassungs-Fenster unter "Aktuelles
#  Fenster" den Fenstertitel ablesen und ein passendes Muster anlegen.
#  (?P<nr>...) markiert die Nummer, (?P<name>...) optional den Namen.
#    nur_datev = true  -> Muster nur in DATEV-Fenstern anwenden
#
# [[mandant_muster]]
# muster = 'Mdt\.?\s*(?P<nr>\d+)'
# nur_datev = true


# --------------------------------------------------------------------------
#  Anwendungsnamen anpassen
# --------------------------------------------------------------------------
#  Bedingungen wie oben (titel, prozess, pfad); name = Anzeigename.
#
# [[anwendung]]
# prozess = 'mstsc\.exe'
# titel = 'DATEVasp'
# name = "DATEV (Remote)"
"""


class ConfigError(Exception):
    """Die Einstellungsdatei enthält einen Fehler."""


@dataclass
class Mandant:
    nr: str
    name: str
    suchbegriffe: list[str] = field(default_factory=list)


@dataclass
class ZuordnungRegel:
    zuordnung: str
    titel: Optional[re.Pattern] = None
    prozess: Optional[re.Pattern] = None
    anwendung: Optional[re.Pattern] = None
    adresse: Optional[re.Pattern] = None


@dataclass
class MandantMuster:
    muster: re.Pattern
    nur_datev: bool = True


@dataclass
class AnwendungRegel:
    name: str
    titel: Optional[re.Pattern] = None
    prozess: Optional[re.Pattern] = None
    pfad: Optional[re.Pattern] = None


@dataclass
class Config:
    # Aufzeichnung
    intervall: float = 1.0
    inaktiv_nach_sekunden: float = 300.0
    inaktiv_ausnahmen: frozenset = frozenset()
    browser_adresse: str = "domain"
    titel_nicht_speichern: frozenset = frozenset()
    # Bericht
    berichtsordner: Optional[Path] = None
    zeitblock_mindestdauer: float = 60.0
    luecke_ab: float = 120.0
    rundung_minuten: int = 15
    # Zuordnung
    mandanten: dict = field(default_factory=dict)  # nr -> Mandant
    namen_ueberall_suchen: bool = True
    standard_regeln: bool = True
    datev_programme: list = field(default_factory=list)
    regeln: list = field(default_factory=list)
    mandant_muster: list = field(default_factory=list)
    anwendung_regeln: list = field(default_factory=list)


def normalize_nr(nr: str) -> str:
    """Mandantennummern ohne führende Nullen vergleichen ("010001" == "10001")."""
    nr = str(nr).strip()
    return str(int(nr)) if nr.isdigit() else nr


def _compile(pattern, where: str) -> Optional[re.Pattern]:
    if pattern is None or pattern == "":
        return None
    if not isinstance(pattern, str):
        raise ConfigError(f"{where}: Suchmuster muss Text sein, gefunden: {pattern!r}")
    try:
        return re.compile(pattern, re.IGNORECASE)
    except re.error as exc:
        raise ConfigError(f"{where}: ungültiges Suchmuster {pattern!r} ({exc})") from None


def _num(section: dict, key: str, default, where: str, minimum=None):
    value = section.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ConfigError(f"[{where}] {key}: Zahl erwartet, gefunden: {value!r}")
    if minimum is not None and value < minimum:
        raise ConfigError(f"[{where}] {key}: muss mindestens {minimum} sein")
    return value


def _str_list(section: dict, key: str, where: str) -> list[str]:
    value = section.get(key, [])
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise ConfigError(f"[{where}] {key}: Liste von Texten erwartet, z. B. [\"a\", \"b\"]")
    return [v for v in value if v.strip()]


def _bool(section: dict, key: str, default: bool, where: str) -> bool:
    value = section.get(key, default)
    if not isinstance(value, bool):
        raise ConfigError(f"[{where}] {key}: true oder false erwartet, gefunden: {value!r}")
    return value


def parse_config(data: dict) -> Config:
    cfg = Config()

    a = data.get("aufzeichnung", {})
    cfg.intervall = float(_num(a, "abfrage_intervall_sekunden", 1, "aufzeichnung", 0.2))
    cfg.inaktiv_nach_sekunden = float(_num(a, "inaktiv_nach_minuten", 5, "aufzeichnung", 0.5)) * 60
    cfg.inaktiv_ausnahmen = frozenset(p.lower() for p in _str_list(a, "inaktiv_ausnahmen", "aufzeichnung"))
    mode = str(a.get("browser_adresse", "domain")).lower()
    if mode not in BROWSER_MODES:
        raise ConfigError('[aufzeichnung] browser_adresse: erlaubt sind "aus", "domain" oder "voll"')
    cfg.browser_adresse = mode
    cfg.titel_nicht_speichern = frozenset(
        p.lower() for p in _str_list(a, "titel_nicht_speichern", "aufzeichnung")
    )

    b = data.get("bericht", {})
    ordner = str(b.get("ordner", "") or "").strip()
    cfg.berichtsordner = Path(ordner).expanduser() if ordner else None
    cfg.zeitblock_mindestdauer = float(_num(b, "zeitblock_mindestdauer_sekunden", 60, "bericht", 0))
    cfg.luecke_ab = float(_num(b, "luecke_ab_sekunden", 120, "bericht", 1))
    cfg.rundung_minuten = int(_num(b, "rundung_minuten", 15, "bericht", 0))

    mandanten = data.get("mandanten", {})
    if not isinstance(mandanten, dict):
        raise ConfigError("[mandanten]: Einträge im Format \"10001\" = \"Name\" erwartet")
    for nr, value in mandanten.items():
        where = f"[mandanten] {nr}"
        if isinstance(value, str):
            m = Mandant(normalize_nr(nr), value.strip())
        elif isinstance(value, dict):
            name = value.get("name", "")
            if not isinstance(name, str):
                raise ConfigError(f"{where}: name muss Text sein")
            m = Mandant(normalize_nr(nr), name.strip(), _str_list(value, "suchbegriffe", where))
        else:
            raise ConfigError(f"{where}: Text oder {{ name = ..., suchbegriffe = [...] }} erwartet")
        cfg.mandanten[m.nr] = m

    z = data.get("zuordnung", {})
    cfg.namen_ueberall_suchen = _bool(z, "mandantennamen_in_allen_fenstern_suchen", True, "zuordnung")
    cfg.standard_regeln = _bool(z, "standard_regeln_verwenden", True, "zuordnung")
    cfg.datev_programme = _str_list(z, "datev_programme", "zuordnung")

    for i, r in enumerate(_table_list(data, "regel"), 1):
        where = f"[[regel]] Nr. {i}"
        ziel = r.get("zuordnung")
        if not isinstance(ziel, str) or not ziel.strip():
            raise ConfigError(f"{where}: 'zuordnung' fehlt")
        rule = ZuordnungRegel(
            zuordnung=ziel.strip(),
            titel=_compile(r.get("titel"), where),
            prozess=_compile(r.get("prozess"), where),
            anwendung=_compile(r.get("anwendung"), where),
            adresse=_compile(r.get("adresse"), where),
        )
        if not any((rule.titel, rule.prozess, rule.anwendung, rule.adresse)):
            raise ConfigError(f"{where}: mindestens eine Bedingung (titel, prozess, anwendung, adresse) angeben")
        cfg.regeln.append(rule)

    for i, r in enumerate(_table_list(data, "mandant_muster"), 1):
        where = f"[[mandant_muster]] Nr. {i}"
        pattern = _compile(r.get("muster"), where)
        if pattern is None:
            raise ConfigError(f"{where}: 'muster' fehlt")
        if "nr" not in pattern.groupindex:
            raise ConfigError(f"{where}: das Muster braucht eine Gruppe (?P<nr>...) für die Nummer")
        cfg.mandant_muster.append(MandantMuster(pattern, _bool(r, "nur_datev", True, where)))

    for i, r in enumerate(_table_list(data, "anwendung"), 1):
        where = f"[[anwendung]] Nr. {i}"
        name = r.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ConfigError(f"{where}: 'name' fehlt")
        rule = AnwendungRegel(
            name=name.strip(),
            titel=_compile(r.get("titel"), where),
            prozess=_compile(r.get("prozess"), where),
            pfad=_compile(r.get("pfad"), where),
        )
        if not any((rule.titel, rule.prozess, rule.pfad)):
            raise ConfigError(f"{where}: mindestens eine Bedingung (titel, prozess, pfad) angeben")
        cfg.anwendung_regeln.append(rule)

    return cfg


def _table_list(data: dict, key: str) -> list[dict]:
    value = data.get(key, [])
    if isinstance(value, dict):
        value = [value]
    if not isinstance(value, list) or not all(isinstance(v, dict) for v in value):
        raise ConfigError(f"[[{key}]]: ungültiger Aufbau")
    return value


def read_text(path: Path) -> str:
    raw = path.read_bytes()
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        # Ältere Editoren speichern ggf. in ANSI (Windows-1252)
        return raw.decode("cp1252")


def load_config(path: Path) -> Config:
    """Lädt die Einstellungen; legt die Datei mit Standardwerten an, falls sie fehlt."""
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(DEFAULT_TEMPLATE, encoding="utf-8")
    try:
        data = tomllib.loads(read_text(path))
    except tomllib.TOMLDecodeError as exc:
        raise ConfigError(f"Formatfehler in {path.name}: {exc}") from None
    return parse_config(data)


class ConfigStore:
    """Hält die aktuellen Einstellungen und lädt sie bei Änderungen der Datei neu."""

    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()
        self._mtime = None
        self.error: Optional[str] = None
        try:
            self._config = load_config(path)
            self._mtime = self._current_mtime()
        except ConfigError as exc:
            log.error("Einstellungen fehlerhaft: %s", exc)
            self.error = str(exc)
            self._config = Config()
            self._mtime = self._current_mtime()

    def _current_mtime(self):
        try:
            return self.path.stat().st_mtime
        except OSError:
            return None

    @property
    def config(self) -> Config:
        with self._lock:
            return self._config

    def reload(self) -> Optional[str]:
        """Lädt neu. Gibt eine Fehlermeldung zurück (alte Einstellungen bleiben dann aktiv)."""
        mtime = self._current_mtime()
        try:
            cfg = load_config(self.path)
        except ConfigError as exc:
            with self._lock:
                self._mtime = mtime
                self.error = str(exc)
            log.error("Einstellungen fehlerhaft, bisherige bleiben aktiv: %s", exc)
            return str(exc)
        with self._lock:
            self._config = cfg
            self._mtime = mtime
            self.error = None
        log.info("Einstellungen neu geladen")
        return None

    def maybe_reload(self) -> bool:
        """Lädt neu, wenn die Datei seit dem letzten Laden geändert wurde."""
        if self._current_mtime() != self._mtime:
            self.reload()
            return True
        return False
