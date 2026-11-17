"""Windows-Abfragen per ctypes (keine Zusatzpakete nötig).

- aktives Fenster, Fenstertitel, Prozess und Programmdatei
- Dateibeschreibung/Hersteller aus den Versionsinformationen der .exe
- Sekunden seit der letzten Maus-/Tastatureingabe
- PC gesperrt?
- Einzelinstanz (Mutex) und "Fenster anzeigen"-Signal (Event)
"""

from __future__ import annotations

import logging
import os
import sys
import time

from .recorder import Snapshot

log = logging.getLogger(__name__)

IS_WINDOWS = sys.platform == "win32"

if IS_WINDOWS:  # pragma: no cover - wird unter Windows im CI geprüft
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.WinDLL("user32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    version = ctypes.WinDLL("version", use_last_error=True)

    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    DESKTOP_READOBJECTS = 0x0001
    UOI_NAME = 2
    ERROR_ALREADY_EXISTS = 183
    WAIT_OBJECT_0 = 0
    EVENT_MODIFY_STATE = 0x0002

    class LASTINPUTINFO(ctypes.Structure):
        _fields_ = [("cbSize", wintypes.UINT), ("dwTime", wintypes.DWORD)]

    WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    user32.GetForegroundWindow.restype = wintypes.HWND
    user32.GetForegroundWindow.argtypes = []
    user32.GetWindowTextLengthW.restype = ctypes.c_int
    user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
    user32.GetWindowTextW.restype = ctypes.c_int
    user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    user32.GetWindowThreadProcessId.restype = wintypes.DWORD
    user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
    user32.GetLastInputInfo.restype = wintypes.BOOL
    user32.GetLastInputInfo.argtypes = [ctypes.POINTER(LASTINPUTINFO)]
    user32.EnumChildWindows.restype = wintypes.BOOL
    user32.EnumChildWindows.argtypes = [wintypes.HWND, WNDENUMPROC, wintypes.LPARAM]
    user32.OpenInputDesktop.restype = wintypes.HANDLE
    user32.OpenInputDesktop.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    user32.CloseDesktop.restype = wintypes.BOOL
    user32.CloseDesktop.argtypes = [wintypes.HANDLE]
    user32.GetUserObjectInformationW.restype = wintypes.BOOL
    user32.GetUserObjectInformationW.argtypes = [
        wintypes.HANDLE, ctypes.c_int, wintypes.LPVOID, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)
    ]
    kernel32.GetTickCount.restype = wintypes.DWORD
    kernel32.GetTickCount.argtypes = []
    kernel32.OpenProcess.restype = wintypes.HANDLE
    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL
    kernel32.QueryFullProcessImageNameW.argtypes = [
        wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)
    ]
    kernel32.CloseHandle.restype = wintypes.BOOL
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CreateMutexW.restype = wintypes.HANDLE
    kernel32.CreateMutexW.argtypes = [wintypes.LPVOID, wintypes.BOOL, wintypes.LPCWSTR]
    kernel32.CreateEventW.restype = wintypes.HANDLE
    kernel32.CreateEventW.argtypes = [wintypes.LPVOID, wintypes.BOOL, wintypes.BOOL, wintypes.LPCWSTR]
    kernel32.OpenEventW.restype = wintypes.HANDLE
    kernel32.OpenEventW.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.LPCWSTR]
    kernel32.SetEvent.restype = wintypes.BOOL
    kernel32.SetEvent.argtypes = [wintypes.HANDLE]
    kernel32.WaitForSingleObject.restype = wintypes.DWORD
    kernel32.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
    version.GetFileVersionInfoSizeW.restype = wintypes.DWORD
    version.GetFileVersionInfoSizeW.argtypes = [wintypes.LPCWSTR, ctypes.POINTER(wintypes.DWORD)]
    version.GetFileVersionInfoW.restype = wintypes.BOOL
    version.GetFileVersionInfoW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID]
    version.VerQueryValueW.restype = wintypes.BOOL
    version.VerQueryValueW.argtypes = [
        wintypes.LPCVOID, wintypes.LPCWSTR, ctypes.POINTER(wintypes.LPVOID), ctypes.POINTER(wintypes.UINT)
    ]


# --- einzelne Abfragen -------------------------------------------------------

def foreground_window() -> int:
    return int(user32.GetForegroundWindow() or 0)


def window_title(hwnd: int) -> str:
    if not hwnd:
        return ""
    length = user32.GetWindowTextLengthW(hwnd)
    if length <= 0:
        return ""
    buf = ctypes.create_unicode_buffer(length + 2)
    user32.GetWindowTextW(hwnd, buf, length + 2)
    return buf.value


def window_pid(hwnd: int) -> int:
    if not hwnd:
        return 0
    pid = wintypes.DWORD(0)
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    return int(pid.value)


def process_path(pid: int) -> str:
    if not pid:
        return ""
    handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not handle:
        return ""
    try:
        size = wintypes.DWORD(32768)
        buf = ctypes.create_unicode_buffer(size.value)
        if kernel32.QueryFullProcessImageNameW(handle, 0, buf, ctypes.byref(size)):
            return buf.value
        return ""
    finally:
        kernel32.CloseHandle(handle)


def idle_seconds() -> float:
    info = LASTINPUTINFO()
    info.cbSize = ctypes.sizeof(LASTINPUTINFO)
    if not user32.GetLastInputInfo(ctypes.byref(info)):
        return 0.0
    # GetTickCount läuft nach 49,7 Tagen über – Differenz modulo 2^32 rechnen
    millis = (kernel32.GetTickCount() - info.dwTime) & 0xFFFFFFFF
    return millis / 1000.0


def input_desktop_name() -> str | None:
    """Name des Eingabe-Desktops ("Default" normal, "Winlogon" bei Sperre/Anmeldung)."""
    handle = user32.OpenInputDesktop(0, False, DESKTOP_READOBJECTS)
    if not handle:
        return None  # kein Zugriff -> Sperrbildschirm
    try:
        buf = ctypes.create_unicode_buffer(256)
        needed = wintypes.DWORD(0)
        if user32.GetUserObjectInformationW(handle, UOI_NAME, buf, ctypes.sizeof(buf), ctypes.byref(needed)):
            return buf.value
        return ""
    finally:
        user32.CloseDesktop(handle)


def is_locked(foreground_process: str = "") -> bool:
    if foreground_process.lower() in ("lockapp.exe", "logonui.exe"):
        return True
    name = input_desktop_name()
    if name is None:
        return True
    return bool(name) and name.lower() != "default"


def _version_strings(path: str) -> dict[str, str]:
    result: dict[str, str] = {}
    size = version.GetFileVersionInfoSizeW(path, None)
    if not size:
        return result
    data = ctypes.create_string_buffer(size)
    if not version.GetFileVersionInfoW(path, 0, size, data):
        return result
    ptr = wintypes.LPVOID()
    length = wintypes.UINT()
    codepages = []
    if version.VerQueryValueW(data, "\\VarFileInfo\\Translation", ctypes.byref(ptr), ctypes.byref(length)) and ptr.value:
        count = length.value // 4
        words = ctypes.cast(ptr, ctypes.POINTER(wintypes.WORD * (count * 2))).contents
        codepages = [f"{words[i * 2]:04x}{words[i * 2 + 1]:04x}" for i in range(count)]
    codepages += ["040704b0", "040904b0", "040904e4", "000004b0"]
    for key in ("FileDescription", "ProductName", "CompanyName"):
        for cp in codepages:
            ptr = wintypes.LPVOID()
            length = wintypes.UINT()
            sub = f"\\StringFileInfo\\{cp}\\{key}"
            if version.VerQueryValueW(data, sub, ctypes.byref(ptr), ctypes.byref(length)) and ptr.value and length.value:
                value = ctypes.wstring_at(ptr.value).strip()
                if value:
                    result[key] = value
                    break
    return result


def _real_uwp_window(hwnd: int, host_pid: int) -> tuple[int, int]:
    """Bei Store-Apps gehört das Fenster zu ApplicationFrameHost – echtes Kindfenster suchen."""
    found: list[tuple[int, int]] = []

    @WNDENUMPROC
    def callback(child, _lparam):
        pid = window_pid(child)
        if pid and pid != host_pid:
            found.append((int(child), pid))
            return False
        return True

    user32.EnumChildWindows(hwnd, callback, 0)
    return found[0] if found else (hwnd, host_pid)


# --- Momentaufnahme ------------------------------------------------------------

class WindowsProvider:
    """Liefert Momentaufnahmen des aktiven Fensters unter Windows."""

    def __init__(self) -> None:
        self._path_cache: dict[int, tuple[float, str]] = {}
        self._version_cache: dict[str, dict[str, str]] = {}
        self.own_pid = os.getpid()

    def _path(self, pid: int) -> str:
        now = time.monotonic()
        cached = self._path_cache.get(pid)
        if cached and now - cached[0] < 300:
            return cached[1]
        path = process_path(pid)
        if len(self._path_cache) > 500:
            self._path_cache.clear()
        self._path_cache[pid] = (now, path)
        return path

    def _version(self, path: str) -> dict[str, str]:
        if not path:
            return {}
        if path not in self._version_cache:
            try:
                self._version_cache[path] = _version_strings(path)
            except Exception:
                log.exception("Versionsinformationen nicht lesbar: %s", path)
                self._version_cache[path] = {}
        return self._version_cache[path]

    def snapshot(self) -> Snapshot:
        hwnd = foreground_window()
        title = window_title(hwnd)
        pid = window_pid(hwnd)
        path = self._path(pid)
        process = os.path.basename(path) if path else ""
        if process.lower() == "applicationframehost.exe":
            _child, child_pid = _real_uwp_window(hwnd, pid)
            if child_pid != pid:
                pid = child_pid
                path = self._path(pid)
                process = os.path.basename(path) if path else process
        ver = self._version(path)
        return Snapshot(
            hwnd=hwnd,
            pid=pid,
            process=process,
            exe_path=path,
            product=ver.get("FileDescription") or ver.get("ProductName", ""),
            company=ver.get("CompanyName", ""),
            title=title,
            idle_seconds=idle_seconds(),
            locked=is_locked(process),
        )


class DummyProvider:
    """Ersatz auf Nicht-Windows-Systemen (Entwicklung/Tests)."""

    own_pid = os.getpid()

    def snapshot(self) -> Snapshot:
        return Snapshot(process="(nur unter Windows verfügbar)", title="", idle_seconds=0.0)


def make_provider():
    return WindowsProvider() if IS_WINDOWS else DummyProvider()


# --- Einzelinstanz & Signal zum Anzeigen des Fensters --------------------------

MUTEX_NAME = "Local\\Zeiterfassung-Einzelinstanz"
SHOW_EVENT_NAME = "Local\\Zeiterfassung-Anzeigen"

_mutex_handle = None


def acquire_single_instance() -> bool:
    """True, wenn keine andere Instanz läuft (Mutex bleibt bis Programmende bestehen)."""
    global _mutex_handle
    if not IS_WINDOWS:
        return True
    handle = kernel32.CreateMutexW(None, False, MUTEX_NAME)
    already = ctypes.get_last_error() == ERROR_ALREADY_EXISTS
    if already:
        if handle:
            kernel32.CloseHandle(handle)
        return False
    _mutex_handle = handle
    return True


def create_show_event():
    if not IS_WINDOWS:
        return None
    return kernel32.CreateEventW(None, False, False, SHOW_EVENT_NAME) or None


def signal_show_event() -> bool:
    if not IS_WINDOWS:
        return False
    handle = kernel32.OpenEventW(EVENT_MODIFY_STATE, False, SHOW_EVENT_NAME)
    if not handle:
        return False
    try:
        return bool(kernel32.SetEvent(handle))
    finally:
        kernel32.CloseHandle(handle)


def event_signaled(handle) -> bool:
    if not IS_WINDOWS or not handle:
        return False
    return kernel32.WaitForSingleObject(handle, 0) == WAIT_OBJECT_0


def message_box(text: str, title: str = "Zeiterfassung", icon: int = 0x40) -> None:
    """Einfaches Hinweisfenster ohne tkinter (0x40 = Info, 0x10 = Fehler)."""
    if IS_WINDOWS:
        ctypes.windll.user32.MessageBoxW(None, text, title, icon)
    else:
        print(f"{title}: {text}")


def set_dpi_awareness() -> None:
    if not IS_WINDOWS:
        return
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass
