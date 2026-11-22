# Bonarchiv – digitale Kassenbons scannen, ablegen, wiederfinden

Android-App, die digitale Kassenbons per QR-Code übernimmt, einheitlich benennt, Geschäften und Kategorien zuordnet und über die gekauften Artikel durchsuchbar macht. Alles bleibt auf dem Gerät – ohne Konto, ohne Server.

## Installieren

`dist/Bonarchiv.apk` (Android 7.0 und neuer, ca. 0,9 MB)

1. `Bonarchiv.apk` auf das Android-Gerät laden und antippen.
2. Android fragt, ob der Browser bzw. die Dateien-App „unbekannte Apps installieren“ darf: erlauben und zurückgehen.
3. **Installieren** tippen. Warnt Google Play Protect vor einer unbekannten App: „Weitere Details“ → „Trotzdem installieren“.
4. Beim ersten Scannen fragt die App nach der Kamera.

## So funktioniert es an der Kasse

1. Mittlere Taste **Scannen** antippen (oder in *Mehr* „Scanner beim Öffnen starten“ einschalten).
2. QR-Code am Kassendisplay oder auf dem Bon scannen.
3. Die App lädt den Beleg herunter, erkennt **Geschäft, Datum, Uhrzeit, Betrag, Artikel, MwSt. und Zahlungsart** und schlägt eine Kategorie vor.
4. Kurz prüfen, **Speichern** – fertig. (Mit „Ohne Rückfrage speichern“ entfällt auch dieser Schritt.)

Kein Netz im Laden? Der Beleg wird als „ausstehend“ gemerkt und automatisch nachgeladen, sobald wieder Internet da ist.

## Was erkannt wird

| QR-Code bzw. Datei | Ergebnis |
| --- | --- |
| Link auf eine **PDF**, JSON- oder XML-Datei | Datei wird geladen und ausgewertet (Text der PDF mit pdf.js) |
| Link auf eine **Beleg-Webseite** | Ein PDF-Link auf der Seite wird automatisch gefunden. Sonst öffnet sich ein eingebauter Browser: Jeder Download (auch per JavaScript erzeugte PDFs) wird übernommen, oder „Als Beleg speichern“ sichert die Seite als Bild samt Text. |
| **TSE-QR-Code** auf Papierbons (DSFinV-K, `V0;…`) | Datum, Uhrzeit, Betrag je Steuersatz, Zahlungsart. Das Geschäft trägt man einmal ein – die App merkt es sich für die Kasse (TSE-Seriennummer). |
| **JSON-Beleg** (z. B. DFKA-Taxonomie) | Geschäft, Datum, Summe, Positionen, MwSt., Zahlungsart |
| **XRechnung / ZUGFeRD / Factur-X** (auch als XML in der PDF) | Verkäufer, Rechnungsdatum, Brutto, Positionen, MwSt. |
| Bild (PNG/JPG) | Wird abgelegt; ein enthaltener TSE-QR-Code wird gelesen |

Bekannte Ketten (REWE, EDEKA, ALDI, Lidl, Kaufland, dm, Rossmann, IKEA, Aral, MediaMarkt …) werden mit einheitlichem Namen und passender Kategorie erkannt, unbekannte Geschäfte über den Kopf des Bons und Stichwörter (Bäckerei, Apotheke, Restaurant …).

## Funktionen

- **Belege**: chronologische Zeitleiste nach Monaten mit Monats- und Jahressumme, Filter nach Kategorie, „geschäftlich“ und „ausstehend“.
- **Geschäfte**: alle Geschäfte mit Anzahl, Summe und letztem Einkauf; je Geschäft die letzten Einkäufe, Jahressumme, Ø pro Einkauf und „Häufig gekauft“. Umbenennen führt Geschäfte zusammen.
- **Kategorien**: Lebensmittel, Drogerie, Gastronomie, Tanken & Mobilität, Kleidung, Elektronik, Haus & Garten, Gesundheit, Freizeit, Sonstiges – frei änderbar (Name, Farbe, Symbol). Die Kategorie eines Geschäfts merkt sich die App.
- **Suche**: über gekaufte Artikel aller Belege („Milch“), kombinierbar mit dem Geschäft („rewe milch“), außerdem Geschäft, Betrag („12,99“), Notiz und den vollständigen Belegtext. Treffer führen direkt zur Position im Beleg.
- **Belegansicht**: Original-PDF bzw. Bild, Artikelliste, MwSt.-Tabelle, Notiz, Herkunft (Link, TSE), Öffnen in anderer App, Teilen, Bearbeiten, Löschen.
- **Einheitliche Dateinamen** beim Teilen und Exportieren: `2026-11-22_REWE_23,45EUR.pdf`.
- **Duplikate** werden erkannt (gleiche Datei, gleicher Link, gleiche TSE-Signatur oder gleiche Eckdaten).
- **Import** über „Teilen“ / „Öffnen mit“ aus jeder App (z. B. Downloads, Mail), über die Dateiauswahl, aus einem Screenshot mit QR-Code oder per eingefügtem Link; außerdem manuelle Erfassung.
- **Export für Steuer & Buchhaltung**: Zeitraum (Monat, Quartal, Jahr, frei), nur geschäftliche oder eine Kategorie; ZIP mit Ordnern nach Monat oder Geschäft plus `belege.csv` (Excel-tauglich, mit MwSt. 19 %/7 %) – speichern oder direkt teilen.
- **Sicherung**: alle Belege und Einstellungen als ZIP; Wiederherstellen ergänzt fehlende Belege.
- Hell-/Dunkelmodus, Beispielbelege zum Ausprobieren.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `web/index.html`, `web/styles.css`, `web/app.js` | Oberfläche (läuft offline in der WebView der App) |
| `web/parser.js` | Belegerkennung: TSE-QR, JSON, XML/XRechnung/ZUGFeRD, Text aus PDF und Webseiten |
| `web/vendor/pdfjs/` | pdf.js 4.10.38 (Mozilla, Apache-2.0) zum Lesen und Anzeigen von PDFs |
| `web/dev-bridge.js` | Ersatz für die App-Funktionen zum Testen im Browser (nicht in der APK) |
| `android/src/de/bonarchiv/app/MainActivity.java` | App-Hülle: WebView, Brücke zur Oberfläche, Speicher, Teilen, Export, Sicherung |
| `android/src/…/ScannerActivity.java`, `QrDecoder.java` | Kamera-Scanner mit ZXing (`android/libs/zxing-core-3.5.3.jar`, Apache-2.0) |
| `android/src/…/BrowserActivity.java` | Eingebauter Browser für Beleg-Webseiten (eigener Prozess) |
| `android/src/…/Downloader.java`, `FileStore.java`, `DocProvider.java` | Download, Dateiablage mit Typ-Erkennung und SHA-256, Weitergabe an andere Apps |
| `tools/build_android.py` | Baut `dist/Bonarchiv.apk` ohne Android Studio |
| `tests/` | Tests (siehe unten) |

Die Oberfläche läuft unter der festen Adresse `https://appassets.androidplatform.net/`, die die App selbst bedient; Belegdateien liegen im privaten App-Speicher (`files/docs`), die Belegdaten in `files/bonarchiv.json` (mit Sicherheitskopie). Fremde Webseiten werden nie in der Haupt-WebView geladen.

## Bauen und testen

```bash
# Werkzeuge (Ubuntu/Debian)
sudo apt-get install openjdk-17-jdk-headless aapt dalvik-exchange zipalign apksigner android-sdk-platform-23

python3 bonarchiv/tools/build_android.py      # → bonarchiv/dist/Bonarchiv.apk
bash bonarchiv/tests/run_tests.sh             # Parser-, Java- und Oberflächentests
```

- `tests/parser.test.js` – Belegerkennung mit typischen Bons (REWE, Lidl, ALDI, dm, Restaurant, Tankstelle), TSE-Code, JSON, XRechnung, ZUGFeRD.
- `tests/java/JvmTest.java` – QR-Erkennung aus Kamerabildern (auch invertiert und am Bildrand) und Dateityp-Erkennung.
- `tests/e2e.js` – kompletter Ablauf im Browser (Playwright) mit echten PDF-Bons: Teilen, Scannen (PDF-Link, Beleg-Webseite, TSE), Duplikate, Offline-Nachladen, Artikelsuche, Geschäfte, Bearbeiten, Export, Löschen, Neustart, Dunkelmodus.

Zum Ausprobieren im Browser: `python3 -m http.server -d bonarchiv/web 8000` und `http://localhost:8000` öffnen (ohne Kamera; QR-Inhalte lassen sich einfügen).

Die APK wird mit `android/keystore/bonarchiv.jks` signiert. Der Schlüssel entsteht beim ersten Bauen und liegt nicht im Repository. Updates lassen sich nur mit demselben Schlüssel installieren – sonst vorher eine Sicherung erstellen, die App neu installieren und die Sicherung wiederherstellen.

## Hinweise

- Die Erkennung arbeitet mit Regeln, nicht mit einer Cloud-KI. Bei ungewöhnlichen Belegen bitte Betrag und Datum vor dem Speichern prüfen; die Originaldatei bleibt immer unverändert erhalten.
- Bilder werden nicht per Texterkennung (OCR) gelesen – Angaben zu reinen Fotobelegen trägt man selbst ein.
- Für die steuerliche Aufbewahrung gilt: Das Original (PDF/XML) wird unverändert archiviert; Bearbeitungen betreffen nur die Angaben in der App.
