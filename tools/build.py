#!/usr/bin/env python3
"""Baut die Weitergabe-Dateien der Thekenkasse.

    python3 tools/build.py

Erzeugt:
  ios/Thekenkasse.swiftpm/WebApp.swift – Oberfläche für die iPad-App (Swift Playgrounds)
  dist/Thekenkasse-iPad.swiftpm.zip    – iPad-App zum Öffnen in Swift Playgrounds (offline)
  dist/Thekenkasse.html                – die komplette App in einer einzigen Datei (offline, ohne Server)
  dist/Thekenkasse-WebApp.zip          – die App als Ordner zum Hochladen auf einen Webspace
                                         (danach auf dem iPad „Zum Home-Bildschirm“, offline-fähig)
"""
import base64
import re
import zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SWIFTPM = ROOT / "ios" / "Thekenkasse.swiftpm"
SWIFTPM_FILES = ["Package.swift", "ThekenkasseApp.swift", "WebApp.swift"]

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


def inline_html(embed_fonts: bool = True) -> str:
    """index.html mit eingebettetem CSS, JavaScript und Icons (ohne externe Dateien)."""
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    if "</script" in js or "</style" in css:
        raise SystemExit("app.js oder styles.css enthält ein schließendes Tag und kann nicht eingebettet werden.")

    # Schriften als data-URI einbetten, damit die Datei ohne Internet gleich aussieht.
    def font(match: re.Match) -> str:
        return f'url("{data_uri(ROOT / match.group(1), "font/woff2")}")'
    if embed_fonts:
        css = re.sub(r'url\("(fonts/[^"]+\.woff2)"\)', font, css)
    else:
        # Ohne Webfont: auf dem iPad greift die Systemschrift „Avenir Next Condensed“.
        css = re.sub(r'@font-face \{[^}]*\}\n', "", css)

    html = replace_once(html, '<link rel="manifest" href="manifest.webmanifest">\n', "")
    html = replace_once(html, 'href="icons/icon.svg"', f'href="{data_uri(ROOT / "icons/icon.svg", "image/svg+xml")}"')
    html = replace_once(html, 'href="icons/apple-touch-icon.png"', f'href="{data_uri(ROOT / "icons/apple-touch-icon.png", "image/png")}"')
    html = replace_once(html, '<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
    html = replace_once(html, '<script src="app.js" defer></script>', f"<script>\n{js}\n</script>")
    html = replace_once(html, "<!doctype html>\n", f"<!doctype html>\n<!-- Thekenkasse · erstellt {date.today().isoformat()} -->\n")
    return html


def build_single_file() -> Path:
    out = DIST / "Thekenkasse.html"
    out.write_text(inline_html(embed_fonts=True), encoding="utf-8")
    return out


def build_ipad_app() -> Path:
    """Swift-Playgrounds-Projekt: die Oberfläche wird als Text in WebApp.swift eingebettet."""
    html = inline_html(embed_fonts=False)
    if '"""##' in html or "\\##" in html or "\r" in html:
        raise SystemExit("Die Oberfläche enthält Zeichenfolgen, die in Swift nicht eingebettet werden können.")
    swift = (
        "// Automatisch erzeugt von tools/build.py – bitte nicht von Hand bearbeiten.\n"
        "// Enthält die komplette Oberfläche der Thekenkasse (HTML, CSS und JavaScript).\n\n"
        "enum WebApp {\n"
        '    static let html = ##"""\n'
        f"{html.rstrip()}\n"
        '"""##\n'
        "}\n"
    )
    (SWIFTPM / "WebApp.swift").write_text(swift, encoding="utf-8")
    out = DIST / "Thekenkasse-iPad.swiftpm.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in SWIFTPM_FILES:
            z.write(SWIFTPM / rel, f"Thekenkasse.swiftpm/{rel}")
    return out


def build_zip() -> Path:
    out = DIST / "Thekenkasse-WebApp.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in WEBAPP_FILES:
            z.write(ROOT / rel, f"Thekenkasse/{rel}")
    return out


if __name__ == "__main__":
    DIST.mkdir(exist_ok=True)
    for path in (build_ipad_app(), build_single_file(), build_zip()):
        print(f"{path.relative_to(ROOT)}  ({path.stat().st_size / 1024:.0f} KB)")
