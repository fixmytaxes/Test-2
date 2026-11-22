#!/usr/bin/env python3
"""Baut die Android-App „Bonarchiv“ (APK) ohne Android Studio.

    python3 bonarchiv/tools/build_android.py

Benötigt (Ubuntu/Debian):
    sudo apt-get install openjdk-17-jdk-headless aapt dalvik-exchange zipalign apksigner android-sdk-platform-23

Ergebnis: bonarchiv/dist/Bonarchiv.apk  (Android 7.0 und neuer)

Signiert wird mit bonarchiv/android/keystore/bonarchiv.jks. Der Schlüssel wird beim ersten
Bauen erzeugt und nicht ins Repository übernommen. Updates lassen sich nur mit demselben
Schlüssel über eine installierte App spielen – den Schlüssel also aufbewahren.
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
ANDROID = ROOT / "android"
OUT = ANDROID / "build"
ZXING = ANDROID / "libs" / "zxing-core-3.5.3.jar"
KEYSTORE = ANDROID / "keystore" / "bonarchiv.jks"
KEY_ALIAS = "bonarchiv"
KEY_PASS = "bonarchiv"
ANDROID_JAR = Path("/usr/lib/android-sdk/platforms/android-23/android.jar")
DIST = ROOT / "dist" / "Bonarchiv.apk"

# Dateien der Oberfläche, die in die App gehören (dev-bridge.js nur für den Browser)
WEB_FILES = ["index.html", "styles.css", "app.js", "parser.js",
             "vendor/pdfjs/pdf.min.mjs", "vendor/pdfjs/pdf.worker.min.mjs", "vendor/pdfjs/LICENSE"]


def run(*cmd, cwd=None):
    result = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stdout + result.stderr)
        raise SystemExit("Fehlgeschlagen: " + " ".join(str(c) for c in cmd))
    return result.stdout


def main():
    for tool in ["javac", "keytool", "aapt", "dalvik-exchange", "zipalign", "apksigner"]:
        if not shutil.which(tool):
            raise SystemExit(f"Werkzeug fehlt: {tool} (siehe Kopf dieses Skripts)")
    if not ANDROID_JAR.exists():
        raise SystemExit(f"{ANDROID_JAR} fehlt (Paket android-sdk-platform-23 installieren).")
    if not ZXING.exists():
        raise SystemExit(f"{ZXING} fehlt.")

    if OUT.exists():
        shutil.rmtree(OUT)
    www = OUT / "assets" / "www"
    www.mkdir(parents=True)
    (OUT / "classes").mkdir()

    # 1. Oberfläche in die App legen
    for rel in WEB_FILES:
        target = www / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(WEB / rel, target)

    # 2. Java übersetzen (Java-8-Bytecode ohne Lambdas, damit dx ihn verarbeiten kann)
    sources = sorted(str(p) for p in (ANDROID / "src").rglob("*.java"))
    run("javac", "-source", "8", "-target", "8", "-encoding", "UTF-8", "-nowarn", "-Xlint:-options",
        "-bootclasspath", ANDROID_JAR, "-classpath", ZXING, "-d", OUT / "classes", *sources)
    run("dalvik-exchange", "--dex", "--min-sdk-version=24", f"--output={OUT / 'classes.dex'}", OUT / "classes", ZXING)

    # 3. Manifest, Ressourcen und Oberfläche packen, Programmcode hinzufügen
    unsigned = OUT / "unsigned.apk"
    run("aapt", "package", "-f", "-M", ANDROID / "AndroidManifest.xml", "-S", ANDROID / "res",
        "-A", OUT / "assets", "-I", ANDROID_JAR, "-F", unsigned)
    run("aapt", "add", unsigned, "classes.dex", cwd=OUT)

    # 4. Ausrichten und signieren
    aligned = OUT / "aligned.apk"
    run("zipalign", "-f", "-p", "4", unsigned, aligned)
    if not KEYSTORE.exists():
        KEYSTORE.parent.mkdir(parents=True, exist_ok=True)
        run("keytool", "-genkeypair", "-keystore", KEYSTORE, "-alias", KEY_ALIAS,
            "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
            "-storepass", KEY_PASS, "-keypass", KEY_PASS, "-dname", "CN=Bonarchiv, O=Bonarchiv, C=DE")
    DIST.parent.mkdir(parents=True, exist_ok=True)
    run("apksigner", "sign", "--ks", KEYSTORE, "--ks-key-alias", KEY_ALIAS, "--ks-pass", f"pass:{KEY_PASS}",
        "--key-pass", f"pass:{KEY_PASS}", "--v4-signing-enabled", "false", "--out", DIST, aligned)
    run("apksigner", "verify", DIST)
    print(f"{DIST.relative_to(ROOT.parent)}  ({DIST.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
