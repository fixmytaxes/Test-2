#!/usr/bin/env bash
# Alle Tests von Bonarchiv: Belegerkennung (Node), Java-Teile (JVM), Oberfläche (Playwright)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Belegerkennung"
TZ=Europe/Berlin node --test tests/parser.test.js

echo "== Java (QR-Erkennung, Dateitypen)"
ANDROID_JAR=/usr/lib/android-sdk/platforms/android-23/android.jar
CP="android/libs/zxing-core-3.5.3.jar:$ANDROID_JAR"
OUT=$(mktemp -d)
javac -nowarn -encoding UTF-8 -cp "$CP" -d "$OUT" \
  android/src/de/bonarchiv/app/QrDecoder.java android/src/de/bonarchiv/app/FileStore.java tests/java/JvmTest.java
java -Dfile.encoding=UTF-8 -cp "$OUT:$CP" de.bonarchiv.app.JvmTest
rm -rf "$OUT"

echo "== Oberfläche (Ende-zu-Ende)"
TZ=Europe/Berlin node tests/e2e.js
