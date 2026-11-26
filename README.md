# Apps in diesem Repository

| App | Ordner | Zweck |
| --- | --- | --- |
| **Thekenkasse** | Hauptverzeichnis (diese Datei) | Kasse für Getränkeverkauf und Thekendienst |
| **Reisekosten** | [`reisekosten/`](reisekosten/README.md) | Reisekostenabrechnung für Unternehmer mit Verpflegungspauschalen, PDF mit E-Rechnung (ZUGFeRD/Factur-X) und Versand an DATEV Unternehmen online |

# Thekenkasse

Eine schlanke Kassen-App für Getränkeverkauf und Thekendienst – gemacht für das iPad, funktioniert aber genauso auf dem Handy oder am Laptop. Die App läuft komplett im Browser, braucht keinen Server und funktioniert nach dem ersten Aufruf auch offline.

## Funktionen

**Kasse (Startseite)**
- Kacheln für alle Artikel, farbig und nach Kategorien gruppiert (z. B. Getränke, Essen). Ein Tipp = ein Stück.
- Die Bestellung erscheint rechts (iPad) bzw. unten (Handy) mit Mengen-Tasten `−`/`+` und der Summe.
- „Leeren“ und jede Buchung lassen sich über „Rückgängig“ sofort zurücknehmen.

**Barzahlung mit Rückgeld**
- Gegebenes Geld per Schnellauswahl mit Bildern von Scheinen (5–100 €) und Münzen (10 ct–2 €) – mehrfach tippen addiert (z. B. 20 € + 5 €).
- Alternativ Betrag über das Ziffernfeld eintippen.
- Rückgeld wird sofort groß angezeigt, inklusive Stückelung (z. B. „1× 10 €, 1× 50 ct“).
- Ohne Eingabe bucht „Passend erhalten“ den exakten Betrag in einem Schritt.
- Mit Hardware-Tastatur: Ziffern, Komma, Rücktaste, Enter und Esc funktionieren.

**Deckel**
- „Auf Deckel“ schreibt die Bestellung auf einen bestehenden oder neuen Deckel (Name eintippen).
- Die Deckel-Übersicht zeigt jeden offenen Deckel als Bierdeckel mit Strichliste und Gesamtbetrag.
- Im Deckel: alle Bestellungen mit Uhrzeit, Storno einzelner Einträge, Umbenennen, Löschen und „Kassieren“ (gleiche Barzahlung mit Rückgeld wie an der Kasse).

**Abrechnung**
- Umsatz gesamt (bar und Deckel), Bareinnahmen, offene Deckel und Kassen-Soll (Anfangsbestand + Bareinnahmen).
- Kassensturz: gezählten Bestand eingeben, Differenz wird berechnet.
- Verkaufte Artikel je Kategorie mit Menge und Umsatz.
- Belegjournal mit Uhrzeit, Zahlungsart und Storno-Funktion (stornierte Belege bleiben sichtbar, zählen aber nicht).
- CSV-Export (Semikolon-getrennt, Excel-tauglich) und Drucken.
- „Abend abschließen“ archiviert die Abrechnung und beginnt eine neue. Offene Deckel bleiben bestehen. Frühere Abrechnungen bleiben einsehbar.

**Sortiment & Einstellungen**
- Artikel anlegen, bearbeiten, ausblenden, sortieren und löschen; Name, Preis, Kategorie und Kachelfarbe frei wählbar.
- Kategorien anlegen, umbenennen und sortieren (z. B. „Cocktails“, „Snacks“).
- Negative Preise sind möglich, z. B. für eine Pfandrückgabe.
- Kachelgröße (klein/mittel/groß), Farbschema (automatisch/hell/dunkel), „Bildschirm anlassen“.
- Sicherung als JSON exportieren/importieren, um alles auf ein anderes Gerät zu übertragen.

## Android-App (APK)

`dist/Thekenkasse.apk` ist eine fertige Android-App für Android 7 und neuer. Sie läuft komplett offline.

1. `Thekenkasse.apk` auf dem Android-Gerät herunterladen und antippen.
2. Android fragt, ob der Browser bzw. die Dateien-App „unbekannte Apps installieren“ darf: in den Einstellungen erlauben und zurückgehen.
3. **Installieren** tippen. Warnt Google Play Protect vor einer unbekannten App, über „Weitere Details“ → „Trotzdem installieren“ fortfahren.
4. Die App **Thekenkasse** erscheint bei den anderen Apps und startet im Vollbild.

Die Daten liegen im App-Speicher des Geräts. „CSV exportieren“ und „Sicherung exportieren“ öffnen den Android-Dialog zum Speichern (z. B. in „Downloads“ oder Google Drive), „Drucken“ nutzt den Android-Druckdienst oder erstellt ein PDF, und die Zurück-Taste schließt zuerst offene Dialoge.

Gebaut wird die App mit `python3 tools/build_android.py` (ohne Android Studio, siehe Kopf des Skripts). Updates lassen sich nur mit demselben Signaturschlüssel über die installierte App spielen. Fehlt der Schlüssel, vorher eine Sicherung exportieren, die App deinstallieren, die neue Version installieren und die Sicherung importieren.

## Aufs iPad bringen

Im Ordner `dist/` liegen dafür drei fertige Dateien:

| Datei | Wofür |
| --- | --- |
| `dist/Thekenkasse-iPad.swiftpm.zip` | **Empfohlen:** iPad-App für Apples kostenlose App *Swift Playgrounds*. Läuft lokal und offline, kein Mac nötig. |
| `dist/Thekenkasse.html` | Die komplette App in **einer** Datei. Läuft ohne Internet und ohne Server. |
| `dist/Thekenkasse-WebApp.zip` | Die App als Ordner zum Hochladen auf einen Webspace. Daraus wird eine Home-Bildschirm-App. |

### Empfohlen: iPad-App mit Swift Playgrounds

1. **Swift Playgrounds** aus dem App Store laden (kostenlos, von Apple).
2. `Thekenkasse-iPad.swiftpm.zip` aufs iPad bringen und in der **Dateien**-App sichern, z. B. unter „Auf meinem iPad“.
3. In der Dateien-App auf die ZIP-Datei tippen. Sie wird entpackt, es erscheint **Thekenkasse** (`Thekenkasse.swiftpm`).
4. Auf **Thekenkasse** tippen. Das Projekt öffnet sich in Swift Playgrounds. Falls nicht: In Swift Playgrounds über „Öffnen“ bzw. das Ordnersymbol zur Datei navigieren.
5. Oben auf **▶︎ Ausführen** tippen. Über das Vollbild-Symbol blendest du den Code aus und nutzt die Kasse im Vollbild.
6. **Einmal testen:** etwas buchen, Swift Playgrounds ganz schließen, neu öffnen und ausführen. Unter *Sortiment → Daten* muss „… erhalten geblieben“ stehen.

Die App speichert alles im eigenen Speicher auf dem iPad, ohne Internet. Exportierte Abrechnungen und Sicherungen öffnen das iPad-Teilen-Menü (In „Dateien“ sichern, AirDrop, Mail). „Drucken“ nutzt AirPrint oder erstellt ein PDF. „Bildschirm anlassen“ verhindert die automatische Sperre.

Das Projekt liegt im Ordner `ios/Thekenkasse.swiftpm/`. `ThekenkasseApp.swift` ist die App-Hülle, `WebApp.swift` enthält die Oberfläche und wird von `tools/build.py` erzeugt.

### Einzeldatei `Thekenkasse.html`

1. Die Datei aufs iPad übertragen (AirDrop, Mail, iCloud Drive oder USB) und in der **Dateien**-App ablegen.
2. Mit einer App öffnen, die lokale HTML-Dateien mit JavaScript ausführen kann (im App Store unter „HTML Viewer“ zu finden). Safari selbst öffnet lokale HTML-Dateien auf dem iPad nicht zuverlässig.
3. **Einmal testen:** einen Artikel buchen, die App schließen, neu öffnen und unter *Sortiment → Daten* nachsehen. Steht dort „… erhalten geblieben“, speichert die App dauerhaft.

Ob die Daten dauerhaft gespeichert werden, hängt von der App ab, mit der du die Datei öffnest. Exportiere deshalb nach jedem Einsatz die Abrechnung (CSV) und gelegentlich eine Sicherung.

### Web-App mit eigenem App-Icon

1. `Thekenkasse-WebApp.zip` entpacken und den Ordner `Thekenkasse` auf einen beliebigen Webspace mit HTTPS hochladen (siehe „Bereitstellen“).
2. Die Adresse auf dem iPad in **Safari** öffnen → **Teilen** → **Zum Home-Bildschirm**.
3. Die App startet jetzt im Vollbild mit eigenem Icon, funktioniert offline, und die Daten bleiben dauerhaft auf dem iPad gespeichert.

> Die Daten liegen immer nur auf dem jeweiligen Gerät. Mit *Sortiment → Daten → Sicherung exportieren/importieren* überträgst du alles auf ein anderes Gerät.

## Bereitstellen

Die App besteht nur aus statischen Dateien und läuft auf jedem Webspace.

**GitHub Pages:** Im Repository unter *Settings → Pages* bei *Build and deployment* „Deploy from a branch“ wählen, Branch `main` und Ordner `/ (root)` auswählen. Nach kurzer Zeit ist die App unter `https://<benutzer>.github.io/<repository>/` erreichbar.

**Lokal testen:**

```bash
python3 -m http.server 8000
# danach http://localhost:8000 im Browser öffnen
```

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Grundgerüst der App |
| `styles.css` | Gestaltung inkl. Hell-/Dunkelmodus und Tablet-/Handy-Layout |
| `app.js` | Gesamte Logik: Kasse, Zahlung, Deckel, Abrechnung, Sortiment, Speicherung |
| `sw.js` | Service Worker für den Offline-Betrieb |
| `manifest.webmanifest`, `icons/` | App-Name und Icons für den Home-Bildschirm |
| `fonts/` | Schrift „Barlow Semi Condensed“ (SIL Open Font License 1.1, siehe `fonts/OFL.txt`) |
| `ios/Thekenkasse.swiftpm/` | iPad-App für Swift Playgrounds (App-Hülle in Swift, Oberfläche eingebettet) |
| `android/` | Android-App: Manifest, Ressourcen, Icons und App-Hülle (`MainActivity.java`) |
| `tools/build_android.py` | Baut `dist/Thekenkasse.apk` |
| `tools/build.py` | Erzeugt `ios/…/WebApp.swift` und alle Dateien in `dist/` (`python3 tools/build.py`) |

## Wie gebucht wird

- **Bar**: Beleg mit Artikeln, gegebenem Betrag und Rückgeld; zählt zu Umsatz und Bareinnahmen.
- **Auf Deckel**: Beleg mit Artikeln; zählt zum Umsatz, aber noch nicht zu den Bareinnahmen.
- **Deckel kassiert**: Zahlung des Deckel-Gesamtbetrags; zählt zu den Bareinnahmen.

Damit gilt: *Kassen-Soll = Anfangsbestand + Barverkäufe + kassierte Deckel.*
