"""HTML-Bericht (eine Datei, ohne Internetverbindung lesbar, druckbar)."""

from __future__ import annotations

from datetime import datetime, timedelta
from html import escape

from . import __version__
from .db import ACTIVE, IDLE, LOCKED, PAUSED
from .report import (
    GAP,
    STATE_LABELS,
    STATE_SHORT,
    UNASSIGNED,
    Block,
    Report,
    fmt_day,
    fmt_dur,
    fmt_hours,
    fmt_num,
    round_hours,
)

# Feste Reihenfolge der Farben für Mandanten/Projekte (validierte Palette, siehe README)
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]
SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"]
MAX_SERIES = len(SERIES)

CSS = """
:root {
  color-scheme: light;
  --page: #f9f9f7; --surface: #fcfcfb; --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
  --grid: #e1e0d9; --axis: #c3c2b7; --ring: rgba(11,11,11,0.10); --accent: #2a78d6;
  --other: #8f9aa6; --unassigned: #b7bfc8; --idle: #e8d9b0;
  --locked: #9b9a94; --paused: #c9c0e8; --row-alt: #f3f2ee;
  --s1:#2a78d6; --s2:#eb6834; --s3:#1baf7a; --s4:#eda100; --s5:#e87ba4; --s6:#008300; --s7:#6250d6; --s8:#e34948;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --page: #0d0d0d; --surface: #1a1a19; --ink: #f0efec; --ink-2: #c3c2b7; --muted: #898781;
    --grid: #2c2c2a; --axis: #383835; --ring: rgba(255,255,255,0.10); --accent: #3987e5;
    --other: #6f7983; --unassigned: #4f565e; --idle: #5a4d2b; --locked: #55544f; --paused: #4a4370; --row-alt: #222220;
    --s1:#3987e5; --s2:#d95926; --s3:#199e70; --s4:#c98500; --s5:#d55181; --s6:#0ca30c; --s7:#9085e9; --s8:#e66767;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink);
  font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1180px; margin: 0 auto; padding: 24px 16px 48px; }
header h1 { font-size: 22px; margin: 0 0 4px; }
header p { margin: 0; color: var(--ink-2); }
section { background: var(--surface); border: 1px solid var(--ring); border-radius: 10px;
  padding: 16px 18px; margin-top: 16px; }
h2 { font-size: 16px; margin: 0 0 4px; }
h3 { font-size: 14px; margin: 16px 0 6px; }
.hint { color: var(--muted); font-size: 12.5px; margin: 0 0 10px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 16px; }
.tile { background: var(--surface); border: 1px solid var(--ring); border-radius: 10px; padding: 12px 14px; }
.tile .k { color: var(--ink-2); font-size: 12.5px; display: flex; align-items: center; gap: 6px; }
.tile .v { font-size: 26px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 2px; }
.tile .s { color: var(--muted); font-size: 12px; }
.sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; flex: none; }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--grid); vertical-align: top; }
th { font-size: 12px; font-weight: 600; color: var(--ink-2); white-space: nowrap; }
td.n, th.n { text-align: right; white-space: nowrap; }
td.t { white-space: nowrap; }
tr.sum td { font-weight: 600; border-top: 1px solid var(--axis); border-bottom: none; }
tr.off td { color: var(--ink-2); }
td.wrap { overflow-wrap: anywhere; }
.bar { position: relative; height: 8px; min-width: 80px; background: var(--row-alt); border-radius: 4px; }
.bar > span { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: var(--accent); }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 8px 0 4px; font-size: 12.5px; color: var(--ink-2); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.timeline { width: 100%; height: auto; display: block; }
.timeline text { fill: var(--muted); font-size: 11px; }
.timeline .day { fill: var(--ink-2); font-size: 12px; }
.timeline rect.mark { stroke: var(--surface); stroke-width: 1; }
.timeline rect.mark:hover { stroke: var(--ink); stroke-width: 1.5; }
details { margin-top: 10px; }
summary { cursor: pointer; font-weight: 600; }
.muted { color: var(--muted); }
footer { color: var(--muted); font-size: 12px; margin-top: 20px; }
#tip { position: fixed; pointer-events: none; z-index: 10; background: var(--surface); color: var(--ink);
  border: 1px solid var(--ring); border-radius: 8px; padding: 8px 10px; font-size: 12.5px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15); max-width: 360px; display: none; }
#tip b { display: block; margin-bottom: 2px; }
@media print {
  body { background: #fff; }
  section, .tile { break-inside: avoid; border-color: #ccc; }
  details { display: block; }
  details > summary { list-style: none; }
  #tip { display: none !important; }
}
"""

TOOLTIP_JS = """
(function () {
  var tip = document.getElementById('tip');
  document.querySelectorAll('[data-tip]').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      tip.innerHTML = el.getAttribute('data-tip');
      tip.style.display = 'block';
      var x = e.clientX + 14, y = e.clientY + 14;
      var r = tip.getBoundingClientRect();
      if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 14;
      if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - 14;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
    el.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
  });
  if (window.matchMedia) {
    window.addEventListener('beforeprint', function () {
      document.querySelectorAll('details').forEach(function (d) { d.open = true; });
    });
  }
})();
"""

STATE_FILL = {IDLE: "url(#hatch-idle)", LOCKED: "var(--locked)", PAUSED: "var(--paused)"}
STATE_SWATCH = {IDLE: "var(--idle)", LOCKED: "var(--locked)", PAUSED: "var(--paused)"}


def _e(text) -> str:
    return escape(str(text), quote=True)


class _Colors:
    """Farbe je Mandant/Projekt: die größten acht in fester Reihenfolge, Rest "Sonstige"."""

    def __init__(self, report: Report):
        assigned = [z for z, _s in report.by_zuordnung if z != UNASSIGNED]
        self.top = assigned[:MAX_SERIES]
        self.has_other = len(assigned) > MAX_SERIES
        self._map = {z: f"var(--s{i + 1})" for i, z in enumerate(self.top)}

    def fill(self, block: Block) -> str:
        if block.state != ACTIVE:
            return STATE_FILL.get(block.state, "none")
        if not block.zuordnung:
            return "var(--unassigned)"
        return self._map.get(block.zuordnung, "var(--other)")

    def legend(self) -> str:
        parts = [f'<span><i class="sw" style="background:{self._map[z]}"></i>{_e(z)}</span>' for z in self.top]
        if self.has_other:
            parts.append('<span><i class="sw" style="background:var(--other)"></i>Sonstige Mandanten/Projekte</span>')
        parts.append('<span><i class="sw" style="background:var(--unassigned)"></i>Aktiv, nicht zugeordnet</span>')
        for state in (IDLE, LOCKED, PAUSED):
            parts.append(
                f'<span><i class="sw" style="background:{STATE_SWATCH[state]}"></i>{_e(STATE_SHORT[state])}</span>'
            )
        parts.append('<span><i class="sw" style="border:1px dashed var(--axis)"></i>Keine Aufzeichnung</span>')
        return '<div class="legend">' + "".join(parts) + "</div>"


def _block_tip(b: Block) -> str:
    head = f"{b.start:%H:%M}–{b.end:%H:%M} · {fmt_dur(b.secs)} h"
    lines = [f"<b>{_e(b.label)}</b>{_e(head)}"]
    if b.state == ACTIVE:
        for app, secs in b.apps.most_common(4):
            if secs < 30:
                continue
            lines.append(f"{_e(app)}: {fmt_dur(secs)} h")
        if b.main_title:
            lines.append(f"<span class='muted'>{_e(b.main_title[:120])}</span>")
    return _e("<br>".join(lines))


def _timeline(report: Report, colors: _Colors) -> str:
    days = [d for d in report.days if report.blocks.get(d.day)]
    if not days:
        return ""
    lo = min(d.first.hour for d in days)
    hi = max((d.last + timedelta(minutes=59)).hour if d.last.date() == d.day else 24 for d in days)
    hi = max(hi, lo + 1)
    label_w, width, row_h, gap, top = 108, 1000, 22, 8, 18
    plot_w = width - label_w - 22
    height = top + len(days) * (row_h + gap) + 4

    def x(dt: datetime, day) -> float:
        hours = (dt - datetime.combine(day, datetime.min.time())).total_seconds() / 3600.0
        return label_w + (hours - lo) / (hi - lo) * plot_w

    out = [
        f'<svg class="timeline" viewBox="0 0 {width} {height}" role="img" aria-label="Tagesverlauf">',
        '<defs><pattern id="hatch-idle" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
        '<rect width="6" height="6" fill="var(--idle)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--locked)" '
        'stroke-width="1.5" opacity="0.55"/></pattern></defs>',
    ]
    step = 1 if hi - lo <= 14 else 2
    for h in range(lo, hi + 1, step):
        xx = label_w + (h - lo) / (hi - lo) * plot_w
        out.append(f'<line x1="{xx:.1f}" y1="{top - 4}" x2="{xx:.1f}" y2="{height - 4}" stroke="var(--grid)"/>')
        out.append(f'<text x="{xx:.1f}" y="{top - 7}" text-anchor="middle">{h:02d}:00</text>')
    for i, d in enumerate(days):
        y = top + i * (row_h + gap)
        out.append(f'<text class="day" x="0" y="{y + row_h / 2 + 4:.1f}">{_e(fmt_day(d.day))}</text>')
        out.append(
            f'<rect x="{x(d.first, d.day):.1f}" y="{y}" width="{max(0.5, x(d.last, d.day) - x(d.first, d.day)):.1f}" '
            f'height="{row_h}" rx="3" fill="none" stroke="var(--axis)" stroke-dasharray="3 3"/>'
        )
        for b in report.blocks[d.day]:
            if b.state == GAP:
                continue
            x0, x1 = x(b.start, d.day), x(b.end, d.day)
            out.append(
                f'<rect class="mark" x="{x0:.2f}" y="{y}" width="{max(1.0, x1 - x0):.2f}" height="{row_h}" '
                f'rx="2" fill="{colors.fill(b)}" data-tip="{_block_tip(b)}"/>'
            )
    out.append("</svg>")
    return "".join(out)


def _bar(secs: float, total: float, color: str = "var(--accent)") -> str:
    pct = 0 if total <= 0 else min(100.0, secs / total * 100)
    return f'<div class="bar"><span style="width:{pct:.1f}%;background:{color}"></span></div>'


def _tiles(report: Report) -> str:
    t = report.totals
    active, idle, locked, paused = (t.get(s, 0.0) for s in (ACTIVE, IDLE, LOCKED, PAUSED))
    gap = t.get(GAP, 0.0)
    span = sum(d.span for d in report.days)
    days_note = "" if report.single_day else f" an {len(report.days)} Tag(en)"
    tiles = [
        ("var(--accent)", "Aktiv gearbeitet", fmt_dur(active) + " h", f"{fmt_hours(active)} Stunden{days_note}"),
        ("var(--idle)", "Inaktiv – PC an, keine Eingabe", fmt_dur(idle) + " h", "keine Maus-/Tastatureingabe"),
        ("var(--locked)", "PC gesperrt", fmt_dur(locked) + " h", "Sperrbildschirm"),
    ]
    if paused:
        tiles.append(("var(--paused)", "Pausiert (privat)", fmt_dur(paused) + " h", "manuell pausiert"))
    if report.single_day and report.days:
        d = report.days[0]
        tiles.append(("var(--axis)", "Erste / letzte Aktivität", f"{d.first:%H:%M}–{d.last:%H:%M}",
                      f"Zeitspanne {fmt_dur(span)} h, davon {fmt_dur(gap)} h ohne Aufzeichnung"))
    else:
        tiles.append(("var(--axis)", "Ohne Aufzeichnung", fmt_dur(gap) + " h", "PC aus / Standby zwischen Beginn und Ende"))
    html = ['<div class="tiles">']
    for color, k, v, s in tiles:
        html.append(
            f'<div class="tile"><div class="k"><i class="sw" style="background:{color}"></i>{_e(k)}</div>'
            f'<div class="v">{_e(v)}</div><div class="s">{_e(s)}</div></div>'
        )
    html.append("</div>")
    return "".join(html)


def _zuordnung_table(report: Report, colors: _Colors) -> str:
    total = report.active_total
    minutes = report.config.rundung_minuten
    round_head = f"Stunden gerundet ({minutes} Min.)" if minutes else "Stunden"
    rows = []
    sum_rounded = 0.0
    for z, secs in report.by_zuordnung:
        rounded = round_hours(secs, minutes)
        sum_rounded += rounded
        color = "var(--unassigned)" if z == UNASSIGNED else colors._map.get(z, "var(--other)")
        apps = [(a, s) for zz, a, s in report.by_zuordnung_app if zz == z][:4]
        apps_txt = ", ".join(f"{a} {fmt_dur(s)}" for a, s in apps)
        rows.append(
            f'<tr{" class=off" if z == UNASSIGNED else ""}><td class="wrap"><i class="sw" style="background:{color}"></i> {_e(z)}'
            f'<div class="muted" style="font-size:12px">{_e(apps_txt)}</div></td>'
            f'<td class="n">{fmt_dur(secs)}</td><td class="n">{fmt_hours(secs)}</td>'
            f'<td class="n">{fmt_num(rounded)}</td>'
            f'<td class="n">{fmt_num(secs / total * 100 if total else 0, 1)} %</td><td>{_bar(secs, total, color)}</td></tr>'
        )
    rows.append(
        f'<tr class="sum"><td>Summe aktiv</td><td class="n">{fmt_dur(total)}</td><td class="n">{fmt_hours(total)}</td>'
        f'<td class="n">{fmt_num(sum_rounded)}</td><td class="n">100 %</td><td></td></tr>'
    )
    return (
        '<div class="table-wrap"><table><thead><tr><th>Mandant / Projekt</th><th class="n">Dauer (h:mm)</th>'
        f'<th class="n">Stunden</th><th class="n">{_e(round_head)}</th><th class="n">Anteil</th><th></th></tr></thead>'
        "<tbody>" + "".join(rows) + "</tbody></table></div>"
    )


def _simple_table(headers: list, rows: list, numeric: set, nowrap: frozenset = frozenset({0})) -> str:
    head = "".join(f'<th class="n">{_e(h)}</th>' if i in numeric else f"<th>{_e(h)}</th>" for i, h in enumerate(headers))
    body = []
    for row in rows:
        cls = row[0] if isinstance(row, tuple) and len(row) and row[0] in ("sum", "off") else None
        cells = row[1:] if cls else row
        tds = "".join(
            f'<td class="n">{c}</td>' if i in numeric else f'<td class="t">{c}</td>' if i in nowrap
            else f'<td class="wrap">{c}</td>'
            for i, c in enumerate(cells)
        )
        body.append(f'<tr class="{cls}">{tds}</tr>' if cls else f"<tr>{tds}</tr>")
    return f'<div class="table-wrap"><table><thead><tr>{head}</tr></thead><tbody>{"".join(body)}</tbody></table></div>'


def _blocks_table(blocks: list) -> str:
    rows = []
    for b in blocks:
        if b.state == ACTIVE:
            what = ", ".join(f"{a} ({fmt_dur(s)})" for a, s in b.apps.most_common(3) if s >= 30)
            rows.append([
                f"{b.start:%H:%M}", f"{b.end:%H:%M}", fmt_dur(b.secs),
                _e(b.zuordnung or "–"), _e(what), _e(b.main_title[:140]),
            ])
        else:
            rows.append(("off", f"{b.start:%H:%M}", f"{b.end:%H:%M}", fmt_dur(b.secs),
                         "", f"<i>{_e(STATE_LABELS[b.state])}</i>", ""))
    return _simple_table(["Beginn", "Ende", "Dauer", "Mandant / Projekt", "Anwendungen", "Hauptfenster"], rows, {2},
                         frozenset({0, 1}))


def render_html(report: Report, xlsx_name: str = "") -> str:
    colors = _Colors(report)
    if report.single_day:
        period_txt = fmt_day(report.von, long=True)
    else:
        period_txt = f"{report.von:%d.%m.%Y} – {report.bis:%d.%m.%Y}"
    out = [
        "<!doctype html><html lang='de'><head><meta charset='utf-8'>",
        "<meta name='viewport' content='width=device-width, initial-scale=1'>",
        f"<title>Zeiterfassung {_e(period_txt)}</title><style>{CSS}</style></head><body><main>",
        f"<header><h1>Zeiterfassung – {_e(period_txt)}</h1>",
        f"<p>Erstellt am {report.created:%d.%m.%Y um %H:%M} Uhr",
    ]
    if xlsx_name:
        out.append(f" · <a href='{_e(xlsx_name)}'>Excel-Datei öffnen</a>")
    out.append("</p></header>")

    if not report.items:
        out.append("<section><h2>Keine Daten</h2><p>Für diesen Zeitraum wurde nichts aufgezeichnet.</p></section>")
        out.append("</main></body></html>")
        return "".join(out)

    out.append(_tiles(report))

    out.append("<section><h2>Tagesverlauf</h2>")
    out.append("<p class='hint'>Farbige Blöcke = aktive Arbeit je Mandant/Projekt. Mauszeiger auf einen Block zeigt Details.</p>")
    out.append(colors.legend())
    out.append(_timeline(report, colors))
    out.append("</section>")

    out.append("<section><h2>Zeit je Mandant / Projekt</h2>")
    out.append("<p class='hint'>Nur aktive Zeit (ohne Inaktivität, Sperre und Pausen). "
               "Zuordnung über DATEV-Mandantennummer, Mandantenliste und eigene Regeln (siehe Einstellungen).</p>")
    out.append(_zuordnung_table(report, colors))
    out.append("</section>")

    if not report.single_day:
        minutes = report.config.rundung_minuten
        rows = [[_e(fmt_day(d)), _e(z), fmt_dur(s), fmt_hours(s), fmt_num(round_hours(s, minutes))]
                for d, z, s in report.by_day_zuordnung]
        out.append("<section><h2>Mandanten / Projekte je Tag</h2>")
        out.append("<p class='hint'>Vorlage für die Übernahme in die Leistungserfassung.</p>")
        out.append(_simple_table(["Tag", "Mandant / Projekt", "Dauer", "Stunden", "gerundet"], rows, {2, 3, 4}))
        out.append("</section>")

    total = report.active_total
    rows = [[_e(a), fmt_dur(s), fmt_hours(s), f"{fmt_num(s / total * 100 if total else 0, 1)} %", _bar(s, total)]
            for a, s in report.by_app]
    rows.append(("sum", "Summe aktiv", fmt_dur(total), fmt_hours(total), "100 %", ""))
    out.append("<section><h2>Zeit je Anwendung</h2>")
    out.append(_simple_table(["Anwendung", "Dauer", "Stunden", "Anteil", ""], rows, {1, 2, 3}))
    out.append("</section>")

    if report.websites:
        rows = [[_e(dom), fmt_dur(s), fmt_hours(s)] for dom, s in report.websites[:60]]
        out.append("<section><h2>Websites im Browser</h2>")
        out.append(_simple_table(["Website", "Dauer", "Stunden"], rows, {1, 2}))
        out.append("</section>")

    day_rows = []
    for d in report.days:
        t = d.totals
        day_rows.append([
            _e(fmt_day(d.day)), f"{d.first:%H:%M}", f"{d.last:%H:%M}", fmt_dur(d.span),
            fmt_dur(t.get(ACTIVE, 0)), fmt_dur(t.get(IDLE, 0)), fmt_dur(t.get(LOCKED, 0)),
            fmt_dur(t.get(PAUSED, 0)), fmt_dur(t.get(GAP, 0)),
        ])
    if len(report.days) > 1:
        tt = report.totals
        day_rows.append(("sum", "Summe", "", "", fmt_dur(sum(d.span for d in report.days)),
                         fmt_dur(tt.get(ACTIVE, 0)), fmt_dur(tt.get(IDLE, 0)), fmt_dur(tt.get(LOCKED, 0)),
                         fmt_dur(tt.get(PAUSED, 0)), fmt_dur(tt.get(GAP, 0))))
    out.append("<section><h2>Anwesenheit am PC</h2>")
    out.append("<p class='hint'>Zeitspanne = erste bis letzte Aufzeichnung des Tages. Inaktiv = PC eingeschaltet, "
               f"aber mindestens {fmt_num(report.config.inaktiv_nach_sekunden / 60, 0)} Minuten keine Eingabe.</p>")
    out.append(_simple_table(
        ["Tag", "Beginn", "Ende", "Zeitspanne", "Aktiv", "Inaktiv", "Gesperrt", "Pausiert", "Ohne Aufzeichnung"],
        day_rows, {3, 4, 5, 6, 7, 8}, frozenset({0, 1, 2}),
    ))
    out.append("</section>")

    pause_rows = []
    for b in report.pauses:
        pause_rows.append([_e(fmt_day(b.start.date())), f"{b.start:%H:%M}", f"{b.end:%H:%M}", fmt_dur(b.secs),
                           _e(STATE_LABELS[b.state])])
    out.append("<section><h2>Pausen und Zeiten ohne Nutzung</h2>")
    out.append("<p class='hint'>Zeiten, in denen der PC eingeschaltet war, aber nicht benutzt wurde "
               "(inaktiv / gesperrt), sowie Lücken ohne Aufzeichnung.</p>")
    if pause_rows:
        out.append(_simple_table(["Tag", "Von", "Bis", "Dauer", "Art"], pause_rows, {3}, frozenset({0, 1, 2})))
    else:
        out.append("<p class='muted'>Keine Pausen erkannt.</p>")
    out.append("</section>")

    out.append("<section><h2>Zeitblöcke</h2>")
    out.append(f"<p class='hint'>Chronologisch. Wechsel unter {fmt_num(report.config.zeitblock_mindestdauer, 0)} Sekunden "
               "sind dem umgebenden Block zugeschlagen; die Summen oben sind sekundengenau.</p>")
    for i, d in enumerate(report.days):
        blocks = report.blocks.get(d.day, [])
        if report.single_day:
            out.append(_blocks_table(blocks))
        else:
            out.append(f"<details{' open' if i == len(report.days) - 1 else ''}><summary>{_e(fmt_day(d.day, long=True))} "
                       f"<span class='muted'>({fmt_dur(d.totals.get(ACTIVE, 0))} h aktiv)</span></summary>")
            out.append(_blocks_table(blocks))
            out.append("</details>")
    out.append("</section>")

    limit = 400
    rows = [[_e(a), _e(z), _e(dom), _e(ti), fmt_dur(s, seconds=True)] for a, z, dom, ti, s in report.details[:limit]]
    out.append("<section><h2>Details: Fenster und Seiten</h2>")
    more = f" Angezeigt: die {limit} längsten von {len(report.details)}; alle stehen in der Excel-Datei." if len(report.details) > limit else ""
    out.append(f"<p class='hint'>Aktive Zeit je Fenstertitel.{more}</p>")
    out.append(_simple_table(["Anwendung", "Mandant / Projekt", "Website", "Fenstertitel", "Dauer"], rows, {4}))
    out.append("</section>")

    out.append(f"<footer>Zeiterfassung {__version__} · Alle Daten wurden ausschließlich lokal auf diesem PC "
               "aufgezeichnet und ausgewertet.</footer>")
    out.append(f"</main><div id='tip' role='tooltip'></div><script>{TOOLTIP_JS}</script></body></html>")
    return "".join(out)
