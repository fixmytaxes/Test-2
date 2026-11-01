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

## Auf dem iPad oder iPhone nutzen

1. Die App über eine HTTPS-Adresse bereitstellen (siehe unten) und in **Safari** öffnen.
2. **Teilen** → **Zum Home-Bildschirm**.
3. Die App startet jetzt wie eine normale App im Vollbild und funktioniert auch ohne Internet.

> Wichtig: Die Daten liegen nur auf dem jeweiligen Gerät. Als Home-Bildschirm-App bleiben sie dauerhaft erhalten. Exportiere nach jedem Einsatz die CSV-Abrechnung und gelegentlich eine Sicherung.

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

## Wie gebucht wird

- **Bar**: Beleg mit Artikeln, gegebenem Betrag und Rückgeld; zählt zu Umsatz und Bareinnahmen.
- **Auf Deckel**: Beleg mit Artikeln; zählt zum Umsatz, aber noch nicht zu den Bareinnahmen.
- **Deckel kassiert**: Zahlung des Deckel-Gesamtbetrags; zählt zu den Bareinnahmen.

Damit gilt: *Kassen-Soll = Anfangsbestand + Barverkäufe + kassierte Deckel.*
