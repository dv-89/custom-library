import asyncio
import importlib.util
import json
import logging
import struct
import sys
import tempfile
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "py_modules"))
from legion_catalog import MAX_FILE, binary_vdf, discover, infer_source, read_small, text_vdf

# Exercise the same module import arrangement used by Decky's sandbox.
decky_stub = types.ModuleType("decky")
decky_stub.logger = logging.getLogger("test")
sys.modules["decky"] = decky_stub
spec = importlib.util.spec_from_file_location("plugin_test", ROOT / "main.py")
backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend)


def binary_object(value):
    result = b""
    for key, item in value.items():
        name = str(key).encode() + b"\0"
        if isinstance(item, dict):
            result += b"\0" + name + binary_object(item)
        elif isinstance(item, int):
            result += b"\x02" + name + struct.pack("<I", item & 0xffffffff)
        else:
            result += b"\x01" + name + str(item).encode() + b"\0"
    return result + b"\x08"


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.home = Path(self.temporary.name)
        self.root = self.home / ".local/share/Steam"
        (self.root / "steamapps").mkdir(parents=True)

    def tearDown(self):
        self.temporary.cleanup()

    def manifest(self, appid=42, name="Example Game", state=4, root=None):
        path = (root or self.root) / f"steamapps/appmanifest_{appid}.acf"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f'"AppState" {{ "appid" "{appid}" "name" "{name}" "StateFlags" "{state}" }}', encoding="utf-8")
        return path

    def shortcuts(self, profile, games):
        path = self.root / f"userdata/{profile}/config/shortcuts.vdf"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(binary_object({"shortcuts": {str(i): game for i, game in enumerate(games)}}))
        return path

    def test_no_steam_is_empty(self):
        missing = discover(self.home / "other")
        self.assertEqual(missing["games"], [])
        self.assertIn("No Steam installation", missing["diagnostics"][0])

    def test_installed_only_and_unicode(self):
        self.manifest(name="星のゲーム", state=6)
        self.manifest(43, state=2)
        self.assertEqual([game["name"] for game in discover(self.home)["games"]], ["星のゲーム"])

    def test_external_library_and_deduplication(self):
        self.manifest()
        extra = self.home / "sd card"
        self.manifest(root=extra)
        self.manifest(43, root=extra)
        escaped = str(extra).replace("\\", "\\\\")
        (self.root / "steamapps/libraryfolders.vdf").write_text(f'"libraryfolders" {{ "0" {{ "path" "{escaped}" }} }}')
        self.assertEqual(len(discover(self.home)["games"]), 2)

    def test_multiple_profiles_do_not_merge(self):
        self.shortcuts("12", [{"appid": 0x80000001, "AppName": "Epic", "Exe": "heroic"}])
        self.shortcuts("34", [{"appid": 0x80000002, "AppName": "PC", "Exe": "wine"}])
        result = discover(self.home)
        self.assertEqual(result["games"], [])
        self.assertEqual(result["profiles"], ["12", "34"])
        self.assertEqual(discover(self.home, "12")["games"][0]["name"], "Epic")
        self.assertEqual(discover(self.home, "../34")["games"], [])

    def test_unsigned_shortcut_ids_and_sources(self):
        self.shortcuts("12", [
            {"appid": 0x80000001, "AppName": "Epic", "Exe": "/usr/bin/flatpak", "LaunchOptions": "run com.heroicgameslauncher.hgl"},
            {"appid": 0x80000002, "AppName": "ROM", "Exe": "retroarch"},
            {"appid": 0x80000003, "AppName": "PC", "Exe": "wine"},
        ])
        games = discover(self.home)["games"]
        self.assertEqual({game["source"] for game in games}, {"heroic", "emulator", "pc"})
        self.assertTrue(all(game["appid"] > 2**31 for game in games))
        self.assertEqual(discover(self.home)["selected_profile"], "12")

    def test_invalid_shortcut_is_skipped(self):
        self.shortcuts("12", [{"appid": 0, "AppName": "Missing"}, {"appid": "bad", "AppName": "Wrong"}])
        self.assertEqual(discover(self.home)["games"], [])

    def test_duplicate_names_keep_distinct_identity(self):
        self.manifest(name="Same")
        self.shortcuts("12", [{"appid": 0x80000001, "AppName": "Same", "Exe": "wine"}])
        games = discover(self.home)["games"]
        self.assertEqual(len(games), 2)
        self.assertNotEqual(games[0]["id"], games[1]["id"])

    def test_malformed_files_leave_other_games_visible(self):
        self.manifest()
        (self.root / "steamapps/appmanifest_43.acf").write_text('"AppState" { "name"')
        shortcut_path = self.shortcuts("12", [])
        shortcut_path.write_bytes(b"\0bad")
        result = discover(self.home)
        self.assertEqual(len(result["games"]), 1)
        self.assertTrue(any("Skipped" in message for message in result["diagnostics"]))
        self.assertTrue(any("Could not read shortcuts" in message for message in result["diagnostics"]))

    def test_discovery_does_not_change_files(self):
        paths = [self.manifest(), self.shortcuts("12", [{"appid": 0x80000001, "AppName": "PC"}])]
        before = [(path.read_bytes(), path.stat().st_mtime_ns) for path in paths]
        discover(self.home)
        self.assertEqual(before, [(path.read_bytes(), path.stat().st_mtime_ns) for path in paths])

    def test_text_parser_escaped_paths_and_comments(self):
        parsed = text_vdf(b'// comment\n"root" { "path" "C:\\\\Games" "title" "A \\"B\\"" }')
        self.assertEqual(parsed["root"]["path"], "C:\\Games")
        self.assertEqual(parsed["root"]["title"], 'A "B"')

    def test_corrupt_parsers_raise(self):
        for data in [b'"a" {', b'"a"', b'}', b'"a" "unterminated']:
            with self.assertRaises(ValueError):
                text_vdf(data)
        for data in [b"", b"\x02a\0\1", b"\x06x\0", b"\x08trailing"]:
            with self.assertRaises(ValueError):
                binary_vdf(data)

    def test_file_limit(self):
        path = self.home / "large.vdf"
        with path.open("wb") as handle:
            handle.truncate(MAX_FILE + 1)
        with self.assertRaises(ValueError):
            read_small(path)

    def test_classification_is_based_on_launch_data(self):
        self.assertEqual(infer_source({"AppName": "Dolphin Tale", "Exe": "wine"}), "pc")
        self.assertEqual(infer_source({"tags": {"0": "Emulation"}}), "emulator")


class PreferenceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        decky_stub.DECKY_PLUGIN_SETTINGS_DIR = self.temporary.name
        decky_stub.DECKY_USER_HOME = str(Path(self.temporary.name) / "missing-home")
        self.plugin = backend.Plugin()

    def tearDown(self):
        self.temporary.cleanup()

    def test_preferences_round_trip(self):
        value = {"favorites": ["steam:42", "steam:42"], "overrides": {"steam:42": "pc"}, "profile": "12"}
        saved = asyncio.run(self.plugin.save_preferences(value))
        self.assertEqual(saved["favorites"], ["steam:42"])
        result = asyncio.run(self.plugin.get_catalog())
        self.assertEqual(result["preferences"], saved)
        self.assertEqual(list(Path(self.temporary.name).glob("*.tmp")), [])

    def test_invalid_preferences_rejected(self):
        for value in [{"profile": "../12"}, {"favorites": ["../../file"]}, {"overrides": {"steam:42": "invalid"}}, {"path": "/etc"}, [], {"profile": 12}]:
            with self.assertRaises(ValueError):
                backend.validate_preferences(value)

    def test_corrupt_preferences_produce_warning(self):
        self.plugin._settings_path().write_text("bad json")
        result = asyncio.run(self.plugin.get_catalog())
        self.assertEqual(result["preferences"]["favorites"], [])
        self.assertTrue(any("Preferences could not be read" in message for message in result["diagnostics"]))

    def test_invalid_save_preserves_previous(self):
        asyncio.run(self.plugin.save_preferences({"favorites": ["steam:42"]}))
        before = self.plugin._settings_path().read_bytes()
        with self.assertRaises(ValueError):
            asyncio.run(self.plugin.save_preferences({"favorites": ["bad"]}))
        self.assertEqual(before, self.plugin._settings_path().read_bytes())


if __name__ == "__main__":
    unittest.main()
