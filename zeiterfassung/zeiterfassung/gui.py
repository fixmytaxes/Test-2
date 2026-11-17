"""Bedienoberfläche (tkinter) mit Symbol im Infobereich (pystray, falls installiert)."""

from __future__ import annotations

import logging
import queue
import threading
import time
from datetime import date, datetime, time as dtime, timedelta
from pathlib import Path

import tkinter as tk
from tkinter import messagebox, ttk

from . import APP_NAME, __version__, autostart, paths, winapi
from .classify import Classifier, WindowInfo
from .config import ConfigStore
from .db import ACTIVE, IDLE, LOCKED, PAUSED, Database
from .export import create_report, edit_text_file, open_path, report_folder
from .report import fmt_dur, parse_date, period
from .tracker import Tracker

log = logging.getLogger(__name__)

STATE_TEXT = {
    ACTIVE: ("Aufzeichnung läuft", "#1baf7a"),
    IDLE: ("Inaktiv – keine Eingabe", "#eda100"),
    LOCKED: ("PC gesperrt", "#9b9a94"),
    PAUSED: ("Pausiert (privat) – es wird nichts aufgezeichnet", "#6250d6"),
}


def _make_tray_image():
    from PIL import Image, ImageDraw

    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((4, 4, 60, 60), fill=(42, 120, 214, 255))
    d.ellipse((10, 10, 54, 54), fill=(255, 255, 255, 255))
    d.line((32, 32, 32, 16), fill=(42, 120, 214, 255), width=5)
    d.line((32, 32, 44, 38), fill=(42, 120, 214, 255), width=5)
    return img


class App:
    def __init__(self, root: tk.Tk, store: ConfigStore, tracker: Tracker, db_path: Path,
                 start_hidden: bool = False, show_event=None):
        self.root = root
        self.store = store
        self.tracker = tracker
        self.db_path = db_path
        self.show_event = show_event
        self.commands: "queue.Queue[tuple]" = queue.Queue()
        self.tray = None
        self._tray_hint_shown = False
        self._classifier = None
        self._classifier_cfg = None
        self._last_totals = 0.0
        self.db = Database(db_path)

        root.title(APP_NAME)
        root.minsize(560, 0)
        root.protocol("WM_DELETE_WINDOW", self.on_close)
        self._build()
        self._start_tray()
        self._refresh_autostart_path()

        if start_hidden:
            if self.tray:
                root.withdraw()
            else:
                root.iconify()
        self.root.after(200, self._poll_commands)
        self.root.after(500, self._update_status)

    # --- Aufbau ----------------------------------------------------------------------
    def _build(self) -> None:
        pad = dict(padx=10, pady=(8, 0))
        style = ttk.Style(self.root)
        try:
            style.configure("Value.TLabel", font=("Segoe UI", 10, "bold"))
            style.configure("Big.TLabel", font=("Segoe UI", 12, "bold"))
            style.configure("Error.TLabel", foreground="#c62828")
            style.configure("Muted.TLabel", foreground="#6b6a65")
        except tk.TclError:
            pass

        top = ttk.Frame(self.root)
        top.pack(fill="x", **pad)
        self.dot = tk.Canvas(top, width=16, height=16, highlightthickness=0)
        self.dot.pack(side="left")
        self.dot_item = self.dot.create_oval(2, 2, 14, 14, fill="#9b9a94", outline="")
        self.state_label = ttk.Label(top, text="Starte …", style="Big.TLabel")
        self.state_label.pack(side="left", padx=(6, 0))
        self.pause_btn = ttk.Button(top, text="Pause (privat)", command=self.toggle_pause)
        self.pause_btn.pack(side="right")

        today = ttk.LabelFrame(self.root, text="Heute")
        today.pack(fill="x", **pad)
        self.today_vars = {}
        for col, (key, label) in enumerate([(ACTIVE, "Aktiv"), (IDLE, "Inaktiv"), (LOCKED, "Gesperrt"),
                                            (PAUSED, "Pausiert"), ("first", "Beginn")]):
            ttk.Label(today, text=label, style="Muted.TLabel").grid(row=0, column=col, padx=10, pady=(4, 0), sticky="w")
            var = tk.StringVar(value="–")
            ttk.Label(today, textvariable=var, style="Value.TLabel").grid(row=1, column=col, padx=10, pady=(0, 6), sticky="w")
            self.today_vars[key] = var

        cur = ttk.LabelFrame(self.root, text="Aktuelles Fenster (zum Prüfen der Zuordnung)")
        cur.pack(fill="x", **pad)
        cur.columnconfigure(1, weight=1)
        self.cur_vars = {}
        for row, (key, label) in enumerate([
            ("anwendung", "Anwendung"), ("zuordnung", "Mandant / Projekt"), ("titel", "Fenstertitel"),
            ("adresse", "Website"), ("prozess", "Programmdatei"), ("quelle", "Erkannt durch"),
        ]):
            ttk.Label(cur, text=label + ":", style="Muted.TLabel").grid(row=row, column=0, sticky="nw", padx=(8, 6), pady=1)
            var = tk.StringVar(value="")
            lbl = ttk.Label(cur, textvariable=var, wraplength=430, justify="left")
            lbl.grid(row=row, column=1, sticky="w", pady=1)
            self.cur_vars[key] = var
        ttk.Button(cur, text="Fenstertitel kopieren", command=self.copy_title).grid(
            row=6, column=1, sticky="e", padx=8, pady=(2, 6))

        rep = ttk.LabelFrame(self.root, text="Bericht erstellen (HTML + Excel)")
        rep.pack(fill="x", **pad)
        quick = ttk.Frame(rep)
        quick.pack(fill="x", padx=6, pady=(6, 2))
        for i, (name, label) in enumerate([("heute", "Heute"), ("gestern", "Gestern"), ("woche", "Diese Woche"),
                                           ("letzte-woche", "Letzte Woche"), ("monat", "Dieser Monat"),
                                           ("letzter-monat", "Letzter Monat")]):
            ttk.Button(quick, text=label, command=lambda n=name: self.report_period(n)).grid(
                row=i // 3, column=i % 3, sticky="ew", padx=2, pady=2)
            quick.columnconfigure(i % 3, weight=1)
        custom = ttk.Frame(rep)
        custom.pack(fill="x", padx=6, pady=(2, 8))
        ttk.Label(custom, text="Von").pack(side="left", padx=(2, 4))
        self.von_var = tk.StringVar(value=f"{date.today():%d.%m.%Y}")
        ttk.Entry(custom, textvariable=self.von_var, width=11).pack(side="left")
        ttk.Label(custom, text="bis").pack(side="left", padx=4)
        self.bis_var = tk.StringVar(value=f"{date.today():%d.%m.%Y}")
        ttk.Entry(custom, textvariable=self.bis_var, width=11).pack(side="left")
        ttk.Button(custom, text="Erstellen", command=self.report_custom).pack(side="left", padx=6)
        ttk.Button(custom, text="Berichtsordner", command=self.open_reports).pack(side="right", padx=2)

        conf = ttk.LabelFrame(self.root, text="Einstellungen")
        conf.pack(fill="x", **pad)
        row = ttk.Frame(conf)
        row.pack(fill="x", padx=6, pady=(6, 2))
        ttk.Button(row, text="Einstellungen bearbeiten (Mandanten, Regeln)", command=self.edit_config).pack(side="left", padx=2)
        ttk.Button(row, text="Neu laden", command=self.reload_config).pack(side="left", padx=2)
        ttk.Button(row, text="Datenordner", command=lambda: open_path(paths.data_dir())).pack(side="left", padx=2)
        self.autostart_var = tk.BooleanVar(value=autostart.is_enabled())
        cb = ttk.Checkbutton(conf, text="Beim Anmelden an Windows automatisch starten (im Hintergrund)",
                             variable=self.autostart_var, command=self.toggle_autostart)
        cb.pack(anchor="w", padx=8, pady=(2, 6))
        if not autostart.supported():
            cb.state(["disabled"])

        bottom = ttk.Frame(self.root)
        bottom.pack(fill="x", padx=10, pady=8)
        self.msg_var = tk.StringVar(value="")
        self.msg_label = ttk.Label(bottom, textvariable=self.msg_var, wraplength=400, justify="left")
        self.msg_label.pack(side="left", fill="x", expand=True)
        ttk.Button(bottom, text="Beenden", command=self.quit).pack(side="right")
        ttk.Label(bottom, text=f"v{__version__}", style="Muted.TLabel").pack(side="right", padx=8)

    # --- Infobereich (Tray) ----------------------------------------------------------
    def _start_tray(self) -> None:
        try:
            import pystray
        except Exception as exc:
            log.info("Kein Symbol im Infobereich (pystray fehlt): %s", exc)
            return
        try:
            menu = pystray.Menu(
                pystray.MenuItem("Öffnen", lambda: self.commands.put(("show",)), default=True),
                pystray.MenuItem("Bericht heute", lambda: self.commands.put(("report", "heute"))),
                pystray.MenuItem("Pause (privat)", lambda: self.commands.put(("pause",)),
                                 checked=lambda _item: self.tracker.status().paused),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Beenden", lambda: self.commands.put(("quit",))),
            )
            self.tray = pystray.Icon("zeiterfassung", _make_tray_image(), APP_NAME, menu)
            threading.Thread(target=self.tray.run, name="Infobereich", daemon=True).start()
        except Exception:
            log.exception("Symbol im Infobereich konnte nicht erstellt werden")
            self.tray = None

    def _poll_commands(self) -> None:
        try:
            while True:
                cmd = self.commands.get_nowait()
                name = cmd[0]
                if name == "show":
                    self.show()
                elif name == "report":
                    self.report_period(cmd[1])
                elif name == "pause":
                    self.toggle_pause()
                elif name == "quit":
                    self.quit(confirm=False)
                    return
                elif name == "report_done":
                    self._report_done(*cmd[1:])
        except queue.Empty:
            pass
        if winapi.event_signaled(self.show_event):
            self.show()
        self.root.after(250, self._poll_commands)

    # --- Anzeige aktualisieren -----------------------------------------------------
    def _classifier_for_config(self) -> Classifier:
        cfg = self.store.config
        if cfg is not self._classifier_cfg:
            self._classifier = Classifier(cfg)
            self._classifier_cfg = cfg
        return self._classifier

    def _update_status(self) -> None:
        try:
            st = self.tracker.status()
            text, color = STATE_TEXT.get(st.state, ("Starte …", "#9b9a94"))
            if not st.running and st.since:
                text, color = "Aufzeichnung gestoppt", "#c62828"
            self.state_label.configure(text=text)
            self.dot.itemconfigure(self.dot_item, fill=color)
            self.pause_btn.configure(text="Fortsetzen" if st.paused else "Pause (privat)")
            if self.tray and getattr(self, "_tray_text", None) != text:
                self._tray_text = text
                self.tray.title = f"{APP_NAME} – {text}"

            snap = st.snapshot
            if snap is not None:
                w = WindowInfo(snap.process, snap.exe_path, snap.product, snap.company, snap.title, st.url)
                c = self._classifier_for_config().classify(w)
                self.cur_vars["anwendung"].set(c.anwendung)
                self.cur_vars["zuordnung"].set(c.zuordnung or "– nicht zugeordnet –")
                self.cur_vars["titel"].set(snap.title)
                self.cur_vars["adresse"].set(st.url or "–")
                self.cur_vars["prozess"].set(f"{snap.process}   {snap.company}".strip())
                self.cur_vars["quelle"].set(c.quelle or "–")

            if time.monotonic() - self._last_totals > 10:
                self._last_totals = time.monotonic()
                self._update_today()

            problems = []
            if self.store.error:
                problems.append("Einstellungen fehlerhaft (bisherige bleiben aktiv): " + self.store.error)
            if st.error:
                problems.append("Fehler bei der Aufzeichnung: " + st.error)
            if self.tracker.resolver.available is False:
                problems.append("Hinweis: Browser-Adressen werden nicht erfasst (Paket 'uiautomation' fehlt).")
            if problems:
                self.msg_var.set("\n".join(problems))
                self.msg_label.configure(style="Error.TLabel")
            elif self.msg_label.cget("style") == "Error.TLabel":
                self.msg_var.set("")
                self.msg_label.configure(style="TLabel")
        except Exception:
            log.exception("Fehler beim Aktualisieren der Anzeige")
        self.root.after(1000, self._update_status)

    def _update_today(self) -> None:
        start = datetime.combine(date.today(), dtime.min)
        end = start + timedelta(days=1)
        totals = self.db.state_totals(start.timestamp(), min(end.timestamp(), time.time() + 1))
        for key in (ACTIVE, IDLE, LOCKED, PAUSED):
            self.today_vars[key].set(fmt_dur(totals.get(key, 0.0)) + " h")
        row = self.db.conn.execute(
            "SELECT MIN(start_ts) FROM segments WHERE end_ts > ? AND start_ts < ?",
            (start.timestamp(), end.timestamp()),
        ).fetchone()
        first = row[0] if row and row[0] else None
        self.today_vars["first"].set(
            f"{datetime.fromtimestamp(max(first, start.timestamp())):%H:%M} Uhr" if first else "–")

    # --- Aktionen ----------------------------------------------------------------------
    def show(self) -> None:
        self.root.deiconify()
        self.root.lift()
        try:
            self.root.attributes("-topmost", True)
            self.root.after(300, lambda: self.root.attributes("-topmost", False))
            self.root.focus_force()
        except tk.TclError:
            pass

    def on_close(self) -> None:
        if self.tray:
            self.root.withdraw()
            if not self._tray_hint_shown:
                self._tray_hint_shown = True
                try:
                    self.tray.notify("Die Aufzeichnung läuft im Hintergrund weiter. "
                                     "Zum Öffnen auf das Uhr-Symbol im Infobereich klicken.", APP_NAME)
                except Exception:
                    pass
        else:
            self.root.iconify()

    def quit(self, confirm: bool = True) -> None:
        if confirm and not messagebox.askyesno(
            APP_NAME, "Zeiterfassung beenden?\n\nDanach wird nichts mehr aufgezeichnet, bis das Programm "
                      "wieder gestartet wird.", parent=self.root):
            return
        self.tracker.stop()
        if self.tray:
            try:
                self.tray.stop()
            except Exception:
                pass
        self.db.close()
        self.root.destroy()

    def toggle_pause(self) -> None:
        paused = not self.tracker.status().paused
        self.tracker.set_paused(paused)
        self.pause_btn.configure(text="Fortsetzen" if paused else "Pause (privat)")
        if self.tray:
            try:
                self.tray.update_menu()
            except Exception:
                pass

    def copy_title(self) -> None:
        title = self.cur_vars["titel"].get()
        self.root.clipboard_clear()
        self.root.clipboard_append(title)
        self.msg_var.set("Fenstertitel in die Zwischenablage kopiert.")

    def report_period(self, name: str) -> None:
        von, bis = period(name)
        self.von_var.set(f"{von:%d.%m.%Y}")
        self.bis_var.set(f"{bis:%d.%m.%Y}")
        self._start_report(von, bis)

    def report_custom(self) -> None:
        try:
            von = parse_date(self.von_var.get())
            bis = parse_date(self.bis_var.get())
        except ValueError as exc:
            messagebox.showerror(APP_NAME, str(exc), parent=self.root)
            return
        if bis < von:
            von, bis = bis, von
        self._start_report(von, bis)

    def _start_report(self, von: date, bis: date) -> None:
        if self.store.error:
            messagebox.showwarning(
                APP_NAME, "Die Einstellungsdatei enthält einen Fehler, der Bericht verwendet die zuletzt "
                          f"gültigen Einstellungen:\n\n{self.store.error}", parent=self.root)
        self.msg_var.set("Bericht wird erstellt …")
        self.msg_label.configure(style="TLabel")
        cfg = self.store.config

        def work():
            try:
                html, xlsx = create_report(self.db_path, cfg, von, bis)
                self.commands.put(("report_done", html, xlsx, None))
            except Exception as exc:
                log.exception("Bericht fehlgeschlagen")
                self.commands.put(("report_done", None, None, str(exc)))

        threading.Thread(target=work, name="Bericht", daemon=True).start()

    def _report_done(self, html, xlsx, error) -> None:
        if error:
            self.msg_var.set("")
            messagebox.showerror(APP_NAME, f"Der Bericht konnte nicht erstellt werden:\n{error}", parent=self.root)
            return
        self.msg_var.set(f"Bericht gespeichert: {html.name}" + (f" und {xlsx.name}" if xlsx else ""))
        open_path(html)

    def open_reports(self) -> None:
        open_path(report_folder(self.store.config))

    def edit_config(self) -> None:
        if not self.store.path.exists():
            self.store.reload()  # legt die Datei mit Standardwerten an
        edit_text_file(self.store.path)
        self.msg_var.set("Nach dem Speichern im Editor werden die Einstellungen automatisch übernommen.")

    def reload_config(self) -> None:
        error = self.store.reload()
        if error:
            messagebox.showerror(APP_NAME, f"Fehler in den Einstellungen:\n\n{error}", parent=self.root)
        else:
            self.msg_var.set("Einstellungen neu geladen.")
            self.msg_label.configure(style="TLabel")

    def toggle_autostart(self) -> None:
        try:
            autostart.set_enabled(self.autostart_var.get())
        except OSError as exc:
            messagebox.showerror(APP_NAME, f"Autostart konnte nicht geändert werden:\n{exc}", parent=self.root)
            self.autostart_var.set(autostart.is_enabled())

    def _refresh_autostart_path(self) -> None:
        """Wurde das Programm verschoben, den Autostart-Eintrag auf den neuen Pfad setzen."""
        try:
            if autostart.is_enabled():
                autostart.set_enabled(True)
        except OSError:
            pass


def _icon_path() -> Path:
    import sys

    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    return base / "zeiterfassung.ico"


def run_gui(store: ConfigStore, tracker: Tracker, db_path: Path, start_hidden: bool, show_event=None) -> None:
    winapi.set_dpi_awareness()
    root = tk.Tk()
    if winapi.IS_WINDOWS and _icon_path().exists():
        try:
            root.iconbitmap(default=str(_icon_path()))
        except tk.TclError:
            pass
    App(root, store, tracker, db_path, start_hidden=start_hidden, show_event=show_event)
    root.mainloop()
