#!/usr/bin/env python3
"""Baut die Weitergabe-Dateien der Thekenkasse.

    python3 tools/build.py

Erzeugt im Ordner dist/:
  Thekenkasse.html         – die komplette App in einer einzigen Datei (offline, ohne Server)
  Thekenkasse-WebApp.zip   – die App als Ordner zum Hochladen auf einen Webspace
                             (danach auf dem iPad „Zum Home-Bildschirm“, offline-fähig)
"""
import base64
import re
import zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

WEBAPP_FILES = [
    "index.html", "styles.css", "app.js", "sw.js", "manifest.webmanifest",
    "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
    "icons/icon-maskable-512.png", "icons/apple-touch-icon.png",
    "fonts/barlow-semi-condensed-500.woff2", "fonts/barlow-semi-condensed-600.woff2",
    "fonts/barlow-semi-condensed-700.woff2", "fonts/OFL.txt",
]


def data_uri(path: Path, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def replace_once(text: str, old: str, new: str) -> str:
    if text.count(old) != 1:
        raise SystemExit(f"Erwartete Stelle nicht eindeutig gefunden: {old!r}")
    return text.replace(old, new)


def build_single_file() -> Path:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    if "</script" in js or "</style" in css:
        raise SystemExit("app.js oder styles.css enthält ein schließendes Tag und kann nicht eingebettet werden.")

    # Schriften als data-URI einbetten, damit die Datei ohne Internet gleich aussieht.
    def font(match: re.Match) -> str:
        return f'url("{data_uri(ROOT / match.group(1), "font/woff2")}")'
    css = re.sub(r'url\("(fonts/[^"]+\.woff2)"\)', font, css)

    html = replace_once(html, '<link rel="manifest" href="manifest.webmanifest">\n', "")
    html = replace_once(html, 'href="icons/icon.svg"', f'href="{data_uri(ROOT / "icons/icon.svg", "image/svg+xml")}"')
    html = replace_once(html, 'href="icons/apple-touch-icon.png"', f'href="{data_uri(ROOT / "icons/apple-touch-icon.png", "image/png")}"')
    html = replace_once(html, '<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
    html = replace_once(html, '<script src="app.js" defer></script>', f"<script>\n{js}\n</script>")
    html = replace_once(html, "<!doctype html>\n", f"<!doctype html>\n<!-- Thekenkasse · Einzeldatei-Version · erstellt {date.today().isoformat()} -->\n")

    out = DIST / "Thekenkasse.html"
    out.write_text(html, encoding="utf-8")
    return out


def build_zip() -> Path:
    out = DIST / "Thekenkasse-WebApp.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in WEBAPP_FILES:
            z.write(ROOT / rel, f"Thekenkasse/{rel}")
    return out


if __name__ == "__main__":
    DIST.mkdir(exist_ok=True)
    for path in (build_single_file(), build_zip()):
        print(f"{path.relative_to(ROOT)}  ({path.stat().st_size / 1024:.0f} KB)")
