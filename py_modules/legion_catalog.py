"""Read-only, local Steam discovery. Loaded through Decky's py_modules path."""
from __future__ import annotations

import re
import struct
from pathlib import Path

MAX_FILE = 16 * 1024 * 1024
MAX_GAMES = 4000
SOURCES = ("steam", "heroic", "emulator", "pc")


def read_small(path: Path) -> bytes:
    with path.open("rb") as handle:
        data = handle.read(MAX_FILE + 1)
    if len(data) > MAX_FILE:
        raise ValueError("File exceeds the 16 MiB discovery limit")
    return data


def text_vdf(data: bytes) -> dict:
    """Valve KeyValues subset used by manifests and libraryfolders.vdf."""
    text = data.decode("utf-8-sig", errors="replace")
    tokens = []
    i = 0
    while i < len(text):
        char = text[i]
        if char.isspace():
            i += 1
        elif text.startswith("//", i):
            end = text.find("\n", i)
            i = len(text) if end < 0 else end + 1
        elif char in "{}":
            tokens.append(char)
            i += 1
        elif char == '"':
            i += 1
            value = []
            while i < len(text) and text[i] != '"':
                if text[i] == "\\" and i + 1 < len(text) and text[i + 1] in ('"', "\\"):
                    i += 1
                value.append(text[i])
                i += 1
            if i == len(text):
                raise ValueError("Unterminated VDF string")
            tokens.append("".join(value))
            i += 1
        else:
            end = i
            while end < len(text) and not text[end].isspace() and text[end] not in "{}":
                end += 1
            tokens.append(text[i:end])
            i = end
    pos = 0

    def obj(depth=0, nested=False):
        nonlocal pos
        if depth > 32:
            raise ValueError("VDF nesting too deep")
        result = {}
        while pos < len(tokens):
            key = tokens[pos]
            pos += 1
            if key == "}":
                if not nested:
                    raise ValueError("Unexpected VDF closing brace")
                return result
            if key == "{" or pos >= len(tokens):
                raise ValueError("Invalid VDF key/value")
            value = tokens[pos]
            pos += 1
            if value == "}":
                raise ValueError("Missing VDF value")
            result[key] = obj(depth + 1, True) if value == "{" else value
        if nested:
            raise ValueError("Unclosed VDF object")
        return result

    return obj()


def binary_vdf(data: bytes) -> dict:
    """Binary KeyValues used by shortcuts.vdf, with bounded parsing."""
    pos = 0

    def take(count):
        nonlocal pos
        if pos + count > len(data):
            raise ValueError("Truncated binary VDF")
        value = data[pos:pos + count]
        pos += count
        return value

    def string():
        nonlocal pos
        end = data.find(b"\0", pos)
        if end < 0:
            raise ValueError("Unterminated binary VDF string")
        value = data[pos:end].decode("utf-8", errors="replace")
        pos = end + 1
        return value

    def obj(depth=0):
        if depth > 32:
            raise ValueError("Binary VDF nesting too deep")
        result = {}
        while True:
            kind = take(1)[0]
            if kind == 8:
                return result
            key = string()
            if kind == 0:
                value = obj(depth + 1)
            elif kind == 1:
                value = string()
            elif kind == 2:
                value = struct.unpack("<I", take(4))[0]
            elif kind == 3:
                value = struct.unpack("<f", take(4))[0]
            elif kind == 7:
                value = struct.unpack("<Q", take(8))[0]
            elif kind == 10:
                value = struct.unpack("<q", take(8))[0]
            else:
                raise ValueError(f"Unsupported binary VDF type {kind}")
            result[key] = value

    result = obj()
    if pos != len(data):
        raise ValueError("Unexpected trailing binary VDF data")
    return result


def infer_source(shortcut: dict) -> str:
    # These are suggestions, not claims about the installed launcher's identity.
    text = " ".join(str(shortcut.get(k, "")) for k in ("Exe", "exe", "LaunchOptions", "launchoptions"))
    tags = shortcut.get("tags", {})
    if isinstance(tags, dict):
        text += " " + " ".join(str(value) for value in tags.values())
    text = text.lower()
    if "heroic" in text or "legendary" in text:
        return "heroic"
    if re.search(r"retroarch|dolphin|pcsx2|ppsspp|duckstation|cemu|rpcs3|emulation|emudeck|ryujinx|yuzu|es-de", text):
        return "emulator"
    return "pc"


def discover(home: Path, profile: str = "") -> dict:
    result = {"games": [], "profiles": [], "selected_profile": "", "diagnostics": [], "steam_root": None}
    roots = [home / ".local/share/Steam", home / ".steam/steam", home / ".steam/root"]
    root = next((path.resolve() for path in roots if path.is_dir()), None)
    if root is None:
        result["diagnostics"].append("No Steam installation found under the Decky user's home. No library was imported.")
        return result
    result["steam_root"] = str(root)
    libraries = {root}
    folders = root / "steamapps/libraryfolders.vdf"
    if folders.is_file():
        try:
            values = text_vdf(read_small(folders)).get("libraryfolders", {})
            for key, value in values.items():
                if str(key).isdigit():
                    path = value.get("path") if isinstance(value, dict) else value
                    if isinstance(path, str) and Path(path).is_absolute() and Path(path).is_dir():
                        libraries.add(Path(path).resolve())
        except (OSError, ValueError, AttributeError) as error:
            result["diagnostics"].append(f"Could not read Steam library locations: {error}")
    games = {}
    for library in sorted(libraries):
        for manifest in sorted((library / "steamapps").glob("appmanifest_*.acf")):
            if len(games) >= MAX_GAMES:
                result["diagnostics"].append("Discovery stopped at 4,000 games.")
                break
            try:
                app = text_vdf(read_small(manifest)).get("AppState", {})
                appid = int(app.get("appid", 0))
                flags = int(app.get("StateFlags", 0))
                name = app.get("name", "")
                if not 0 < appid < 2**32 or not isinstance(name, str) or not name.strip():
                    continue
                # Steam StateFlags bit 4 is FullyInstalled. Partial downloads aren't launchable entries.
                if not flags & 4:
                    continue
                key = f"steam:{appid}"
                games[key] = {"id": key, "appid": appid, "name": name, "source": "steam", "kind": "steam", "suggested": False}
            except (OSError, ValueError, TypeError, AttributeError) as error:
                result["diagnostics"].append(f"Skipped {manifest.name}: {error}")
    userdata = root / "userdata"
    profiles = sorted(path.name for path in userdata.iterdir() if path.is_dir() and path.name.isdigit()) if userdata.is_dir() else []
    result["profiles"] = profiles
    selected = profile if profile in profiles else (profiles[0] if len(profiles) == 1 else "")
    result["selected_profile"] = selected
    if len(profiles) > 1 and not selected:
        result["diagnostics"].append("Choose a Steam userdata profile to import its non-Steam shortcuts; profiles are not merged.")
    if selected:
        path = userdata / selected / "config/shortcuts.vdf"
        if path.is_file():
            try:
                shortcuts = binary_vdf(read_small(path)).get("shortcuts", {})
                if not isinstance(shortcuts, dict):
                    raise ValueError("Invalid shortcuts root")
                for shortcut in shortcuts.values():
                    if len(games) >= MAX_GAMES:
                        result["diagnostics"].append("Discovery stopped at 4,000 games.")
                        break
                    if not isinstance(shortcut, dict):
                        continue
                    appid = shortcut.get("appid")
                    name = shortcut.get("AppName", shortcut.get("appname", ""))
                    if type(appid) is not int or not 0 < appid < 2**32 or not isinstance(name, str) or not name.strip():
                        continue
                    key = f"shortcut:{selected}:{appid}"
                    games[key] = {"id": key, "appid": appid, "name": name, "source": infer_source(shortcut), "kind": "shortcut", "suggested": True}
            except (OSError, ValueError, AttributeError) as error:
                result["diagnostics"].append(f"Could not read shortcuts for profile {selected}: {error}")
        else:
            result["diagnostics"].append(f"No shortcuts.vdf for profile {selected}. Add non-Steam games to Steam first.")
    result["games"] = sorted(games.values(), key=lambda game: game["name"].casefold())
    result["diagnostics"].append("Steam entries are locally installed apps across this device, including possible tools; account ownership and offline readiness are not verified.")
    return result
