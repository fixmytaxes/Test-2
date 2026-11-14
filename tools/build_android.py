#!/usr/bin/env python3
"""Baut die Android-App der Thekenkasse (APK) ohne Android Studio.

    python3 tools/build_android.py

Benötigt (Ubuntu/Debian): openjdk (javac, keytool), android-sdk-platform-23,
aapt, dalvik-exchange, zipalign, apksigner. Ergebnis: dist/Thekenkasse.apk

Die App wird mit dem Schlüssel android/keystore/thekenkasse.jks signiert. Er wird beim
ersten Bauen erzeugt und nicht ins Repository übernommen. Updates lassen sich nur mit
demselben Schlüssel über eine installierte App spielen – den Schlüssel also aufbewahren.
"""
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402  (eingebettete Oberfläche wie bei der Einzeldatei)

ROOT = Path(__file__).resolve().parent.parent
ANDROID = ROOT / "android"
OUT = ANDROID / "build"
KEYSTORE = ANDROID / "keystore" / "thekenkasse.jks"
KEY_PASS = "thekenkasse"
ANDROID_JAR = Path("/usr/lib/android-sdk/platforms/android-23/android.jar")


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

    # 1. Oberfläche als einzelne Datei in die App legen
    (OUT / "assets" / "index.html").write_text(build.inline_html(embed_fonts=True), encoding="utf-8")

    # 2. Java übersetzen (Java-8-Bytecode ohne Lambdas, damit dx ihn verarbeiten kann)
    sources = [str(p) for p in (ANDROID / "src").rglob("*.java")]
    run("javac", "-source", "8", "-target", "8", "-nowarn", "-Xlint:-options",
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
        run("keytool", "-genkeypair", "-keystore", str(KEYSTORE), "-alias", "thekenkasse",
            "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
            "-storepass", KEY_PASS, "-keypass", KEY_PASS, "-dname", "CN=Thekenkasse, O=Thekenkasse, C=DE")
    final = ROOT / "dist" / "Thekenkasse.apk"
    final.parent.mkdir(exist_ok=True)
    run("apksigner", "sign", "--ks", str(KEYSTORE), "--ks-pass", f"pass:{KEY_PASS}", "--key-pass", f"pass:{KEY_PASS}",
        "--out", str(final), str(aligned))
    run("apksigner", "verify", str(final))
    print(f"{final.relative_to(ROOT)}  ({final.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
