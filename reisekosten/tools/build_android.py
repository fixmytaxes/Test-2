#!/usr/bin/env python3
"""Baut die Android-App „Reisekosten“ (APK) ohne Android Studio.

    cd reisekosten && python3 tools/build_android.py

Benötigt: Node.js (npm), openjdk (javac, keytool) sowie unter Ubuntu/Debian die Pakete
android-sdk-platform-23, aapt, dalvik-exchange, zipalign und apksigner.
Ergebnis: ../dist/Reisekosten.apk (Android 7.0 und neuer)

Ablauf: Die Web-App wird als einzelne HTML-Datei gebaut (npm run build:single) und als Asset in eine
schlanke WebView-App gelegt (android/src). Signiert wird mit android/keystore/reisekosten.jks; der
Schlüssel wird beim ersten Bauen erzeugt und nicht ins Repository übernommen. Updates lassen sich nur
mit demselben Schlüssel über eine installierte App spielen – den Schlüssel also aufbewahren.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
ANDROID = APP / "android"
OUT = ANDROID / "build"
KEYSTORE = Path(os.environ.get("REISEKOSTEN_KEYSTORE", ANDROID / "keystore" / "reisekosten.jks"))
KEY_PASS = os.environ.get("REISEKOSTEN_KEY_PASS", "reisekosten")
ANDROID_JAR = Path("/usr/lib/android-sdk/platforms/android-23/android.jar")
ZIEL = APP.parent / "dist" / "Reisekosten.apk"


def run(*cmd: str, cwd: Path | None = None) -> None:
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stdout + result.stderr)
        raise SystemExit(f"Fehlgeschlagen: {' '.join(cmd)}")


def main() -> None:
    if not ANDROID_JAR.exists():
        raise SystemExit(f"{ANDROID_JAR} fehlt (Paket android-sdk-platform-23 installieren).")
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)
    (OUT / "classes").mkdir()

    # 1. Oberfläche als einzelne Datei bauen und in die App legen
    run("npm", "run", "build:single", cwd=APP)
    shutil.copy(APP / "dist-single" / "index.html", OUT / "assets" / "index.html")

    # 2. Java übersetzen (Java-8-Bytecode ohne Lambdas, damit dx ihn verarbeiten kann)
    sources = [str(p) for p in (ANDROID / "src").rglob("*.java")]
    run("javac", "-source", "8", "-target", "8", "-nowarn", "-Xlint:-options", "-encoding", "UTF-8",
        "-bootclasspath", str(ANDROID_JAR), "-d", str(OUT / "classes"), *sources)
    run("dalvik-exchange", "--dex", "--min-sdk-version=24", f"--output={OUT / 'classes.dex'}", str(OUT / "classes"))

    # 3. Manifest, Ressourcen und Oberfläche packen, Programmcode hinzufügen
    unsigned = OUT / "unsigned.apk"
    run("aapt", "package", "-f", "-M", str(ANDROID / "AndroidManifest.xml"), "-S", str(ANDROID / "res"),
        "-A", str(OUT / "assets"), "-I", str(ANDROID_JAR), "-F", str(unsigned))
    run("aapt", "add", str(unsigned), "classes.dex", cwd=OUT)

    # 4. Ausrichten und signieren
    aligned = OUT / "aligned.apk"
    run("zipalign", "-f", "-p", "4", str(unsigned), str(aligned))
    if not KEYSTORE.exists():
        KEYSTORE.parent.mkdir(parents=True, exist_ok=True)
        run("keytool", "-genkeypair", "-keystore", str(KEYSTORE), "-alias", "reisekosten",
            "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
            "-storepass", KEY_PASS, "-keypass", KEY_PASS, "-dname", "CN=Reisekosten, O=Reisekosten, C=DE")
    ZIEL.parent.mkdir(exist_ok=True)
    run("apksigner", "sign", "--ks", str(KEYSTORE), "--ks-pass", f"pass:{KEY_PASS}", "--key-pass", f"pass:{KEY_PASS}",
        "--v4-signing-enabled", "false", "--out", str(ZIEL), str(aligned))
    run("apksigner", "verify", str(ZIEL))
    print(f"{ZIEL.relative_to(APP.parent)}  ({ZIEL.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
