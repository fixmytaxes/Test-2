# Zeiterfassung – automatisches Arbeitsprotokoll für Windows

Das Programm läuft unauffällig im Hintergrund und notiert jede Sekunde, **welches Fenster gerade im
Vordergrund ist**: Programm, Fenstertitel und bei Browsern die Website. Daraus erstellt es auf Knopfdruck einen
Bericht, der zeigt,

- wie lange Sie an welchem **Mandanten bzw. Projekt** gearbeitet haben (z. B. „DATEV Kanzlei-Rechnungswesen bei
  Mandant 10001“ gegenüber „Mandant 10002“),
- wie lange Sie welche **Anwendung** genutzt haben (DATEV Arbeitsplatz, Rechnungswesen, Einkommensteuer,
  Outlook, Excel, Chrome …) und welche **Websites**,
- wann der PC **eingeschaltet, aber nicht benutzt** wurde (keine Maus-/Tastatureingabe, Sperrbildschirm) und wann
  er aus bzw. im Standby war,
- einen **Tagesverlauf** mit Zeitblöcken – als Vorlage für die Leistungserfassung.

Alle Daten bleiben **ausschließlich lokal auf Ihrem PC**. Es wird nichts ins Internet übertragen.

## Installation

### Variante A: fertige `Zeiterfassung.exe` (empfohlen)

1. Auf GitHub im Repository auf **Actions** → **„Zeiterfassung – Windows-Programm bauen“** klicken und den
   neuesten erfolgreichen (grünen) Lauf öffnen.
2. Unten unter **Artifacts** „Zeiterfassung-Windows“ herunterladen und entpacken.
3. `Zeiterfassung.exe` in einen festen Ordner legen, z. B. `C:\Programme-Benutzer\Zeiterfassung\` oder
   `Dokumente\Zeiterfassung\`, und per Doppelklick starten.

Keine Installation, keine Administratorrechte nötig. Windows SmartScreen oder der Virenscanner fragen beim ersten
Start ggf. nach, weil das Programm nicht signiert ist („Weitere Informationen“ → „Trotzdem ausführen“). In
Kanzlei-Netzen mit Programm-Freigabeliste muss die Datei ggf. vom IT-Betreuer freigegeben werden.

### Variante B: mit Python starten

Python 3.11 oder neuer von python.org installieren, dann in diesem Ordner:

```
pip install -r requirements.txt
pythonw Zeiterfassung.pyw
```

## Bedienung

Nach dem Start erscheint ein kleines Fenster und ein **Uhr-Symbol im Infobereich** der Taskleiste (unten rechts,
ggf. unter dem Pfeil „^“). Schließen Sie das Fenster mit „X“, läuft die Aufzeichnung im Hintergrund weiter. Ein
Klick auf das Uhr-Symbol öffnet es wieder. „Beenden“ stoppt die Aufzeichnung.

| Bereich | Funktion |
|---|---|
| **Pause (privat)** | Hält die Aufzeichnung an (z. B. private Erledigungen). Die Zeit erscheint im Bericht als „pausiert“, ohne Inhalte. |
| **Heute** | Bisherige aktive, inaktive, gesperrte Zeit und Arbeitsbeginn. |
| **Aktuelles Fenster** | Zeigt live, was gerade erkannt wird: Anwendung, Mandant/Projekt, Fenstertitel, Website. Damit prüfen Sie, ob die Zuordnung stimmt (DATEV-Fenster anklicken und dann auf die Zeiterfassung schauen). |
| **Bericht erstellen** | Heute, Gestern, Woche, Monat oder frei wählbarer Zeitraum. Erstellt eine HTML-Datei (öffnet im Browser, druckbar) und eine Excel-Datei. |
| **Autostart** | Haken setzen → startet bei jeder Windows-Anmeldung automatisch im Hintergrund. |

Berichte werden in `Dokumente\Zeiterfassung Berichte` gespeichert.

### Der Bericht

- **Kennzahlen:** aktiv gearbeitet, inaktiv (PC an, keine Eingabe), gesperrt, erste/letzte Aktivität.
- **Tagesverlauf:** farbige Zeitleiste – je Mandant/Projekt eine Farbe, Inaktivität schraffiert, Sperre grau.
  Mauszeiger auf einen Block zeigt Details.
- **Zeit je Mandant/Projekt:** Dauer, Dezimalstunden, gerundet (Standard: Viertelstunden) und Anteil – inkl. der
  dabei genutzten Programme.
- **Mandanten/Projekte je Tag** (bei Zeiträumen über mehrere Tage).
- **Zeit je Anwendung**, **Websites**, **Anwesenheit am PC** (Beginn, Ende, aktiv, inaktiv, gesperrt, ohne
  Aufzeichnung).
- **Pausen und Zeiten ohne Nutzung**, **Zeitblöcke** (chronologisch) und **Details** je Fenstertitel.

Die Excel-Datei enthält dieselben Tabellen als einzelne Blätter (filterbar) plus alle **Rohdaten**.

## Wie wird erkannt, woran ich gearbeitet habe?

**Inaktivität:** Gibt es länger als 5 Minuten (einstellbar) keine Maus- oder Tastatureingabe, gilt die Zeit **ab
der letzten Eingabe** als „inaktiv“. Wer also 20 Minuten in einer Besprechung war, bekommt 20 Minuten inaktiv – nicht
15. Ist der PC gesperrt (Win+L), zählt das als „gesperrt“. Zeiten, in denen der PC aus oder im Standby war,
erscheinen als „keine Aufzeichnung“.

**Anwendung:** aus der Programmdatei. DATEV-Programme werden am Installationspfad bzw. Hersteller „DATEV eG“
erkannt, das konkrete Programm (Kanzlei-Rechnungswesen, Lohn und Gehalt, LODAS, Einkommensteuer,
Arbeitsplatz, DMS …) am Fenstertitel. Auch DATEV-Programme in Remotedesktop-/DATEVasp-Fenstern werden erkannt,
wenn der Programmname im Fenstertitel steht.

**Mandant / Projekt** – in dieser Reihenfolge:

1. **Eigene Regeln** aus den Einstellungen (z. B. „alles mit *Jahresabschluss 2025* im Titel → Projekt X“,
   „Website elster.de → ELSTER“, „spiegel.de → Privat“).
2. **Mandantennummer im Fenstertitel** von DATEV-Programmen, z. B. `Mandant 10001`, `12345/10001`
   (Berater/Mandant) oder `… - 10001 Mustermann GmbH - …`.
3. **Mandantenliste:** Name bzw. Suchbegriffe eines Mandanten in *beliebigen* Fenstern – E-Mail-Betreff in
   Outlook, Excel-/Word-/PDF-Dateiname, Explorer-Ordner, Browser-Seite.

Weil nur die Rohdaten gespeichert werden und die Zuordnung erst beim Erstellen des Berichts passiert, wirken neue
Regeln und Mandanten **auch rückwirkend**.

## Einstellungen

„Einstellungen bearbeiten“ öffnet die Datei `einstellungen.toml` im Editor. Jede Einstellung ist dort
beschrieben; nach dem Speichern wird sie automatisch übernommen (bei Tippfehlern erscheint ein Hinweis, die
bisherigen Einstellungen bleiben aktiv). Die wichtigsten:

```toml
[aufzeichnung]
inaktiv_nach_minuten = 5
inaktiv_ausnahmen = ["ms-teams.exe"]      # Videokonferenzen nicht als inaktiv zählen
browser_adresse = "domain"                # "domain", "voll" oder "aus"
titel_nicht_speichern = ["KeePass.exe"]   # nur Programmname speichern

[bericht]
rundung_minuten = 15

[mandanten]
"10001" = "Mustermann GmbH"
"10002" = { name = "Beispiel Bau KG", suchbegriffe = ["Beispiel Bau", "BspBau"] }

[[regel]]
titel = 'Jahresabschluss 2025'
zuordnung = "10001 Mustermann GmbH – Jahresabschluss 2025"

[[regel]]
adresse = 'amazon\.|ebay\.'
zuordnung = "Privat"
```

### DATEV-Mandanten werden nicht erkannt?

Die Fenstertitel unterscheiden sich je nach DATEV-Programm und -Version. So passen Sie die Erkennung an:

1. Das DATEV-Programm mit einem Mandanten öffnen und anklicken.
2. Im Zeiterfassungs-Fenster unter **Aktuelles Fenster** den Fenstertitel ablesen (oder „Fenstertitel kopieren“).
3. In den Einstellungen ein Muster anlegen, z. B. für den Titel `Rechnungswesen Mdt. 10001 (2026)`:

```toml
[[mandant_muster]]
muster = 'Mdt\.\s*(?P<nr>\d+)'
nur_datev = true
```

`(?P<nr>…)` markiert die Mandantennummer, optional `(?P<name>…)` den Namen. Den Namen aus der Mandantenliste
verwendet der Bericht automatisch.

## Speicherorte

| Was | Wo |
|---|---|
| Aufzeichnung (SQLite-Datenbank) | `%LOCALAPPDATA%\Zeiterfassung\zeiterfassung.db` |
| Einstellungen | `%LOCALAPPDATA%\Zeiterfassung\einstellungen.toml` |
| Protokoll (bei Problemen) | `%LOCALAPPDATA%\Zeiterfassung\zeiterfassung.log` |
| Berichte | `Dokumente\Zeiterfassung Berichte\` |

Der Datenordner lässt sich auch über den Knopf „Datenordner“ öffnen. Zum Löschen aller Aufzeichnungen das Programm
beenden und `zeiterfassung.db` löschen.

## Datenschutz und Hinweise

- Fenstertitel können Mandantennamen, E-Mail-Betreffs und Dateinamen enthalten. Die Datenbank liegt nur lokal im
  Benutzerprofil und wird nicht übertragen. Für Programme mit sensiblen Titeln gibt es `titel_nicht_speichern`,
  für private Zeit den Pause-Knopf.
- Das Programm ist für die **eigene** Zeiterfassung gedacht. Soll es auf PCs von Mitarbeitenden laufen, ist das
  eine Verhaltens- und Leistungskontrolle: vorher Datenschutz (DSGVO, Information der Beschäftigten) und ggf.
  Mitbestimmung (§ 87 Abs. 1 Nr. 6 BetrVG) klären.
- Erfasst wird nur das Fenster im Vordergrund – kein Tastaturinhalt, keine Bildschirmfotos.
- Die Browser-Adresse wird über die Windows-Bedienungshilfen-Schnittstelle gelesen. Falls der Browser dadurch
  spürbar langsamer wird, `browser_adresse = "aus"` setzen – der Seitentitel steht weiterhin im Fenstertitel.

## Für Entwickler

```
pip install -r requirements.txt pytest
python -m pytest            # Tests (laufen auch unter Linux/macOS)
python -m zeiterfassung demo        # Beispielbericht mit erfundenen Daten
python -m zeiterfassung selbsttest  # prüft die Windows-Abfragen
python -m zeiterfassung aufzeichnen # Aufzeichnung ohne Oberfläche, Ausgabe in der Konsole
python -m zeiterfassung bericht --zeitraum woche
```

Aufbau: `winapi.py` (Windows-Abfragen per ctypes) → `recorder.py` (Zeitabschnitte, Inaktivität, Standby) →
`db.py` (SQLite) → `classify.py` (Anwendung, DATEV, Mandant) → `report.py` (Summen, Zeitblöcke) →
`report_html.py` / `report_xlsx.py`. Die Oberfläche steckt in `gui.py`. Die `.exe` baut der GitHub-Workflow
`.github/workflows/zeiterfassung-windows.yml` mit PyInstaller auf einem Windows-Rechner und testet sie dort.
