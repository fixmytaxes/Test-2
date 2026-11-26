# Reisekosten

Web-App (PWA) zur Dokumentation und Abrechnung von Reisekosten deutscher Unternehmer. Reisen werden mit allen Teilstrecken, Übernachtungen, Fortbildungs- und Bewirtungskosten erfasst. Die App berechnet den Verpflegungsmehraufwand nach den gesetzlichen und amtlichen Pauschalen. Je Reise entsteht eine fortlaufend nummerierte Abrechnung als PDF mit eingebetteter E-Rechnung (`factur-x.xml`, EN 16931). Sie lässt sich per E-Mail an DATEV Unternehmen online senden.

Die App läuft im Browser auf Smartphone, Tablet und PC und lässt sich auf dem Home-Bildschirm installieren. Alle Daten liegen lokal auf dem Gerät (IndexedDB). Ein kleiner Node-Server liefert die App aus und versendet die E-Mails per SMTP.

## Android-App (APK)

`dist/Reisekosten.apk` im Hauptverzeichnis des Repositorys ist eine fertige Android-App für Android 7.0 und neuer. Sie enthält die komplette App und arbeitet offline.

1. `Reisekosten.apk` auf dem Android-Gerät herunterladen und antippen.
2. Android fragt, ob der Browser bzw. die Dateien-App „unbekannte Apps installieren“ darf: in den Einstellungen erlauben und zurückgehen.
3. **Installieren** tippen. Warnt Google Play Protect vor einer unbekannten App, über „Weitere Details“ → „Trotzdem installieren“ fortfahren.
4. **Reisekosten** erscheint bei den anderen Apps.

So arbeitet die Android-App:
- **Belege**: „Foto“ öffnet die Kamera, „Datei“ den Dateiauswahl-Dialog mit Kamera-Option. Fotos werden verkleinert und in der App gespeichert.
- **An DATEV senden**: „Mit E-Mail-App senden“ öffnet Gmail, Outlook oder eine andere Mail-App. Empfänger (DATEV-Upload-Adresse), Betreff, Text und die PDF sind bereits eingetragen; ein Server ist nicht nötig. Nach dem Versand „Versendet – als eingereicht markieren“ tippen. Ist ein Versand-Server eingerichtet, sendet die App auch direkt.
- **PDF öffnen** zeigt die Abrechnung im PDF-Viewer des Geräts. Herunterladen, XML und Datensicherung öffnen den Android-Dialog „Speichern unter“, z. B. für „Downloads“ oder Google Drive.
- Die **Zurück-Taste** schließt zuerst offene Dialoge.
- Die Daten liegen im App-Speicher des Geräts. Beim Deinstallieren werden sie gelöscht, daher vorher *Einstellungen → Datensicherung* nutzen.

Gebaut wird die App mit `python3 tools/build_android.py`, ohne Android Studio; die Voraussetzungen stehen im Kopf des Skripts. Die Android-Hülle liegt in `android/` (WebView, Kamera, Speichern/Teilen über einen eigenen Content-Provider). Updates lassen sich nur mit demselben Signaturschlüssel über die installierte App spielen. Fehlt der Schlüssel, vorher eine Sicherung exportieren, die App deinstallieren, die neue Version installieren und die Sicherung einlesen.

## Funktionen

**Übersicht (Dashboard)**
- Kosten des aktuellen Monats, Quartals oder Jahres im Vergleich zum Vorzeitraum: Gesamtkosten, Anzahl Reisen, Ø je Reise, Vorsteuer, Balkendiagramm je Kostenart (auch als Tabelle). Mit den Pfeilen blättert man in frühere Zeiträume.
- Offene Punkte: abgeschlossene, aber **noch nicht eingereichte** Abrechnungen, nicht abgeschlossene Entwürfe und fehlende Stornobelege
- Letzte Reisen mit Status und Nummer

**Reise erfassen**
- Name, Anlass (betrieblicher Zweck), Reiseziel mit Anschrift, Startpunkt (Firmensitz, Wohnung oder abweichende Adresse), Kostenstelle, Nachweis des Anlasses als Datei (z. B. Einladung, Broschüre)
- **Teilstrecken**: Verkehrsmittel (eigener Pkw, Fahrgemeinschaft, ÖPNV, Bahn, Flugzeug, Fahrrad, Mietwagen, Taxi, Motorrad, Firmenwagen, Sonstige), von/nach, Abfahrt und Ankunft mit Datum und Uhrzeit. „Weitere Teilstrecke“ übernimmt Ort und Zeit der vorherigen Strecke, „Rückreise anlegen“ dreht die Hinreise um.
  - Beispiel: Wiesbaden → Frankfurt (Pkw), Frankfurt → Wien (Flug), Wien → Innsbruck (Mietwagen)
- Kilometerpauschale (Standard 0,30 €/km, in den Einstellungen änderbar) oder tatsächliche Kosten laut Ticket/Beleg, jeweils mit Umsatzsteuersatz
- **Übernachtungen** mit Frühstücksregelung (im Preis enthalten → Kürzung beim Verpflegungsmehraufwand; gesondert ausgewiesen → Abzug von den Übernachtungskosten)
- **Fortbildung & weitere Kosten** (Seminar-/Tagungsgebühr, Parken, Maut, Gepäck, Nebenkosten …)
- **Bewirtungen** getrennt mit Anlass, Teilnehmern und Trinkgeld; 70/30-Aufteilung, seit 2026 7 % (Speisen) / 19 % (Getränke)
- **Kürzungen & Erstattungen**: Erstattungen/Zuschüsse Dritter, private Anteile, erhaltene Vorschüsse
- Belege und Dokumente per **Datei-Upload oder Kamera**. Fotos werden automatisch verkleinert.
- Pflichtangaben (gesetzliche Mindestanforderungen) sind mit `*` markiert. Vor dem Abschluss prüft die App die Vollständigkeit und weist auf fehlende Belege hin.

**Verpflegungsmehraufwand**
- Automatisch je Kalendertag aus Abfahrts- und Ankunftszeiten und dem Reiseland
- Land und Stadt mit eigener Pauschale (z. B. Paris, New York City) je Tag änderbar. Gestellte Mahlzeiten (Frühstück/Mittag/Abend) und „Kein VMA“ (z. B. Dreimonatsfrist) lassen sich je Tag markieren.

**Abschluss, Storno, Versand**
- „Abrechnung abschließen“ vergibt eine fortlaufende Nummer (`RK-2026-0001`), friert die Berechnungsgrundlagen ein (km-Sätze, Konten, Firmendaten) und bildet eine SHA-256-Prüfsumme. Danach ist die Abrechnung **unveränderbar**.
- Korrekturen nur per **Storno**: mit Grund und Zeitpunkt, wahlweise mit Kopie als neuer Entwurf. Die Nummer wird nicht neu vergeben. Für bereits eingereichte Abrechnungen gibt es einen Stornobeleg (PDF + XML als Gutschrift mit Bezug auf die Originalnummer).
- Bis zum Abschluss bleiben Strecken, Kosten, Bewirtungen usw. jederzeit ergänzbar. Entwürfe werden automatisch gespeichert.
- **PDF-Auswertung**: Reisedaten, Reiseverlauf, Übernachtungen, Verpflegungsmehraufwand je Tag, sonstige Kosten, Bewirtungen (gesondert), Kürzungen. Dazu ein **Berechnungsteil für Steuerberatung/Buchhaltung**:
  - Kostenarten mit Konten
  - Umsatzsteuer je Satz
  - Bewirtung 70/30
  - Zahlungsübersicht/Auszahlungsbetrag
  - Buchungsvorschlag je Konto

  Danach folgen Bestätigungsfeld, Anlagenverzeichnis und die Belege als Anlagen.
- **E-Rechnung**: in die PDF eingebettetes `factur-x.xml` (siehe unten), optional zusätzlich als eigene Datei
- **Versand an DATEV Unternehmen online** per E-Mail an die hinterlegte Upload-Mail-Adresse – direkt über den Server (SMTP), über „Teilen“ (Mail-App am Smartphone) oder per Download. Der Status „Eingereicht“ und ein Versandprotokoll werden gespeichert.

**Einstellungen**
- Unternehmen (Firmensitz, USt-IdNr., Steuernummer), Reisender (Rolle Unternehmer/Arbeitnehmer, IBAN), Wohnanschrift
- Kilometersätze, Inlandspauschalen, Auslandspauschalen nachschlagen und Tabellen weiterer Jahre importieren
- DATEV-Upload-Adresse, Betreff, Anhänge; Versand-Server und Token
- Kontenrahmen SKR 03/04 mit änderbaren Kontenvorschlägen, Nummernkreis
- Datensicherung (Export/Import aller Daten inkl. Belege als JSON)

## Berechnungsgrundlagen

| Thema | Regel |
| --- | --- |
| Fahrtkosten | Tatsächliche Kosten oder 0,30 €/km Pkw, 0,20 €/km andere motorbetriebene Fahrzeuge (§ 9 Abs. 1 S. 3 Nr. 4a EStG i. V. m. § 5 BRKG; für Unternehmer über § 4 Abs. 5 S. 1 Nr. 5 EStG) |
| Verpflegung Inland | 14 € An-/Abreisetag einer mehrtägigen Reise mit Übernachtung und eintägig > 8 Std.; 28 € bei 24 Std. Abwesenheit (§ 9 Abs. 4a EStG, 2026 unverändert). Über Mitternacht ohne Übernachtung: Stunden zusammenrechnen, Pauschale beim Tag mit überwiegender Abwesenheit |
| Verpflegung Ausland | Länderpauschalen laut BMF-Schreiben vom 05.12.2025 (ab 01.01.2026): An- und Zwischentage → Ort, der vor 24 Uhr Ortszeit erreicht wird; Rückreisetag und eintägige Reisen → letzter Tätigkeitsort im Ausland. Nicht erfasste Länder → Luxemburg, Überseegebiete → Mutterland |
| Mahlzeiten | Kürzung um 20 % (Frühstück) bzw. je 40 % (Mittag/Abend) der vollen Tagespauschale des Landes, höchstens bis 0 € |
| Übernachtung | Tatsächliche Kosten laut Rechnung; Frühstück ist kein Übernachtungsaufwand |
| Bewirtung | 70 % abziehbar (§ 4 Abs. 5 S. 1 Nr. 2 EStG), Vorsteuer voll |
| Vorsteuer | Nur aus Belegen mit deutscher USt; Pauschalen ohne Vorsteuer; ausländische USt nicht abziehbar |

Die Auslandstabelle 2026 (166 Länder, 48 Städte) stammt aus dem BMF-Schreiben vom 05.12.2025 (IV C 5 - S 2353/00094/007/012). Die maschinenlesbare Fassung wurde aus dem npm-Paket [`@fin.cx/expenses`](https://www.npmjs.com/package/@fin.cx/expenses) 3.0.0 übernommen (MIT-Lizenz, © 2026 Task Venture Capital GmbH), das sie aus dem BMF-PDF erzeugt. Siehe `src/data/auslandspauschalen-2026.ts` und `tools/gen-rates.mjs`. Für 2027 und spätere Jahre lässt sich die neue BMF-Tabelle in den Einstellungen importieren (CSV/Text: `Land;Ort;24h;An-/Abreise;Übernachtung`). Bis dahin verwendet die App die letzte verfügbare Tabelle und weist darauf hin.

Alle Uhrzeiten sind Ortszeiten ohne Zeitzonenumrechnung, wie im Reisekostenrecht üblich.

## E-Rechnung (factur-x.xml)

Das XML folgt der **UN/CEFACT Cross Industry Invoice (CII D16B)** nach **EN 16931**. Das ist das Format von ZUGFeRD 2.x / Factur-X, Profil EN 16931 („Comfort“). Es ist als `factur-x.xml` (AFRelationship „Alternative“) mit Factur-X-XMP-Metadaten in die PDF eingebettet. Dadurch erkennt DATEV Unternehmen online die Datei wie eine eingehende E-Rechnung.

| Rechnungsfeld | Inhalt |
| --- | --- |
| Rechnungsnummer | Abrechnungsnummer (`RK-2026-0001`, Storno: `…-S`, Typ 381 mit Bezug auf das Original) |
| Rechnungsdatum | Abrechnungsdatum (Tag des Abschlusses) |
| Leistungsdatum / -zeitraum | Reiseende / Reisebeginn bis -ende |
| Verkäufer / Käufer | Reisender (Erstattungsanspruch) / Unternehmen |
| Rechnungszeilen | je Position und Steuersatz, z. B. „Flugticket: Frankfurt – Wien“, „Ticket öffentlicher Nah- und Fernverkehr“, „Übernachtung …“, „Verpflegungsmehraufwand Österreich“; mit Leistungsdatum und Kontovorschlag (BT-133) |
| Steuer | 19 %/7 % als Kategorie S; Pauschalen, steuerfreie Leistungen und ausländische USt als Kategorie E (0 %) mit Begründung |
| Netto / USt / Brutto | Summen je Steuersatz, Gesamtbeträge |
| Nachlässe | Erstattungen Dritter und Kürzungen |
| Bereits bezahlt | vom Unternehmen direkt bezahlte Beträge und Vorschüsse; Zahlbetrag = Auszahlung an den Reisenden |

Geprüft wird das XML gegen das offizielle Factur-X-Schema (XSD, Profil EN 16931) und die Summenregeln der EN 16931 (u. a. BR-CO-10 bis BR-CO-17). Die PDF ist **keine zertifizierte PDF/A-3**: Standardschriften werden nicht eingebettet, und hochgeladene Belege können beliebige PDFs sein. Leser von ZUGFeRD-/Factur-X-Dateien finden das eingebettete XML dennoch.

## DATEV Upload-Mail einrichten

1. In **DATEV Unternehmen online** (Bereich Belege) die **Upload Mail** einrichten und die Adresse für den Belegtyp **Rechnungseingang** verwenden (endet auf `@uploadmail.datev.de`). Gegebenenfalls schaltet die Kanzlei die Funktion frei.
2. Die Adresse in der App unter *Einstellungen → DATEV Unternehmen online* eintragen.
3. Nach dem Abschluss einer Reise **„An DATEV senden“** wählen. Pro E-Mail sind höchstens 20 MB möglich.

Standardmäßig wird nur die PDF (mit eingebettetem XML) gesendet. „XML zusätzlich als eigene Datei“ ist abschaltbar, weil DATEV sonst zwei Belege anlegt.

## Installation und Betrieb

Voraussetzung: Node.js ≥ 20.

```bash
cd reisekosten
npm install
npm run build          # erzeugt dist/ (installierbare Web-App)
npm start              # Server auf http://localhost:8787
```

Für den E-Mail-Versand setzen Sie die SMTP-Zugangsdaten als Umgebungsvariablen. Ein Beispiel steht in `.env.example`. Zugangsdaten gehören nie in die App selbst.

| Variable | Bedeutung |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | SMTP-Server des Absenders |
| `MAIL_FROM` | Absender, z. B. `Reisekosten <reisekosten@firma.de>` |
| `APP_TOKEN` | optional: Zugangs-Token; in der App unter *Versand-Server* eintragen |
| `MAIL_ALLOWED_TO` | erlaubte Empfänger (Standard: `@uploadmail.datev.de`); verhindert Missbrauch als offenes Mail-Relay |
| `MAIL_ALLOWED_EXTRA` | weitere erlaubte Adressen, z. B. die Kanzlei für die Kopie |
| `MAIL_DRYRUN=1` | Testbetrieb: nichts wird versendet, nur protokolliert |
| `PORT`, `HOST` | Standard `8787`, `0.0.0.0` |

Den Server im Internet nur hinter **HTTPS** betreiben, z. B. über einen Reverse-Proxy. Kamera, Teilen und Offline-Betrieb funktionieren im Browser nur über HTTPS.

**Docker**

```bash
docker build -t reisekosten .
docker run -p 8787:8787 --env-file .env reisekosten
```

**Ohne Server**: Der Inhalt von `dist/` läuft auf jedem statischen Webspace. Der Versand erfolgt dann über „Teilen“ oder Download. `npm run build:single` erzeugt außerdem `dist-single/index.html` als einzelne Datei.

**Entwicklung**

```bash
npm run dev            # Vite-Entwicklungsserver (leitet /api an localhost:8787 weiter)
MAIL_DRYRUN=1 npm start
npm test               # Tests: Verpflegungspauschalen, Summen, USt, E-Rechnung, PDF
```

## Datenhaltung und Aufbewahrung

- Alle Reisen, Belege und Einstellungen liegen **nur auf dem jeweiligen Gerät** im Browser-Speicher. Regelmäßig unter *Einstellungen → Datensicherung* sichern. Die Sicherung dient auch zum Gerätewechsel.
- Abgeschlossene Abrechnungen sind unveränderbar (Status, Prüfsumme, eingefrorene Einstellungen). Stornos bleiben mit Grund und Zeitpunkt nachvollziehbar.
- Für die gesetzliche Aufbewahrung (GoBD) sind die an DATEV übermittelten PDF/XML-Dateien und Originalbelege maßgeblich.

## Projektstruktur

```
reisekosten/
  src/lib/perdiem.ts      Verpflegungsmehraufwand (Tagesberechnung, Länderwahl, Kürzungen)
  src/lib/rates.ts        Pauschalen-Tabellen, Städte, Luxemburg-/Mutterland-Regel, Import
  src/lib/totals.ts       Positionen, Summen, Umsatzsteuer, Auszahlung
  src/lib/xml.ts          E-Rechnung (CII/EN 16931)
  src/lib/pdf.ts          PDF-Auswertung mit Anlagen und eingebettetem XML
  src/lib/db.ts           IndexedDB, fortlaufende Nummer (atomar)
  src/views/              Übersicht, Reiseliste, Reise-Editor, Einstellungen
  server/server.mjs       Auslieferung und SMTP-Versand
  tests/                  Vitest
```

Die App ersetzt keine steuerliche Beratung. Kontenvorschläge (SKR 03/04) und Sonderfälle (Dreimonatsfrist, doppelte Haushaltsführung, Firmenwagen) bitte mit der Steuerberatung abstimmen.
