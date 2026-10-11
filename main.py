"""Decky RPC boundary. All writes are confined to this plugin's settings directory."""
import asyncio
import json
import os
import re
import tempfile
from pathlib import Path

import decky
from legion_catalog import SOURCES, discover


def validate_preferences(value):
    if not isinstance(value, dict) or set(value) - {"favorites", "overrides", "profile"}:
        raise ValueError("Invalid preference fields")
    favorites = value.get("favorites", [])
    overrides = value.get("overrides", {})
    profile = value.get("profile", "")
    key_pattern = r"(?:steam:[1-9]\d{0,9}|shortcut:\d{1,20}:[1-9]\d{0,9})"
    def valid_key(key):
        return isinstance(key, str) and re.fullmatch(key_pattern, key) is not None
    if not isinstance(favorites, list) or len(favorites) > 4000 or not all(valid_key(key) for key in favorites):
        raise ValueError("Invalid favorites")
    if not isinstance(overrides, dict) or len(overrides) > 4000 or not all(valid_key(key) and source in SOURCES for key, source in overrides.items()):
        raise ValueError("Invalid source overrides")
    if not isinstance(profile, str) or (profile and re.fullmatch(r"\d{1,20}", profile) is None):
        raise ValueError("Invalid Steam userdata profile")
    return {"favorites": sorted(set(favorites)), "overrides": dict(overrides), "profile": profile}


class Plugin:
    def __init__(self):
        self.lock = asyncio.Lock()

    async def _main(self):
        decky.logger.info("Legion Library loaded; discovery waits for the user to open the library")

    def _settings_path(self):
        return Path(decky.DECKY_PLUGIN_SETTINGS_DIR) / "preferences.json"

    def _read_preferences(self):
        path = self._settings_path()
        try:
            if path.stat().st_size > 1024 * 1024:
                raise ValueError("Preferences file is too large")
            return validate_preferences(json.loads(path.read_text(encoding="utf-8"))), None
        except FileNotFoundError:
            return validate_preferences({}), None
        except (OSError, ValueError, TypeError) as error:
            return validate_preferences({}), f"Preferences could not be read; defaults are in use: {error}"

    def _catalog(self):
        preferences, warning = self._read_preferences()
        try:
            result = discover(Path(decky.DECKY_USER_HOME), preferences["profile"])
        except OSError as error:
            result = {"games": [], "profiles": [], "selected_profile": "", "steam_root": None, "diagnostics": [f"Discovery failed: {error}"]}
        result["preferences"] = preferences
        if warning:
            result["diagnostics"].append(warning)
        return result

    async def get_catalog(self):
        async with self.lock:
            return await asyncio.to_thread(self._catalog)

    def _write_preferences(self, value):
        path = self._settings_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix="preferences-", suffix=".tmp", dir=path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(value, handle, ensure_ascii=False, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)

    async def save_preferences(self, preferences):
        value = validate_preferences(preferences)
        async with self.lock:
            await asyncio.to_thread(self._write_preferences, value)
        return value

    async def _unload(self):
        pass

    async def _uninstall(self):
        pass
