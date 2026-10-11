# Legion Library 0.1.0

A custom Decky Loader library page for SteamOS Gaming Mode on the Lenovo Legion Go S. This initial prototype is opened through the Decky quick-access panel. It offers a unified game grid, source filters, search, favorites, category editing, profile selection, and discovery status.

**Status:** compiled and tested locally with synthetic Steam fixtures and a desktop demo. Not yet tested inside SteamOS or on a Legion Go S. The native Home screen and Home button still work normally. Opening Legion Library is manual.

## What appears

| Collection | Prototype discovery | How to prepare it |
|---|---|---|
| Steam | Locally installed app manifests, including apps on Steam library drives | Install games normally in Steam |
| Heroic / Epic | Existing non-Steam Steam shortcuts with a suggested Heroic category | Use Heroic's Add to Steam feature for each game |
| Emulators | Existing Steam shortcuts with emulator launch information or tags | Add individual games through your existing ROM manager, or add the emulator itself |
| Offline PC | Remaining Steam shortcuts, initially labeled Offline PC | Add the game to Steam and configure its launch/Proton settings there |

The plugin does not log into Epic, read Heroic account tokens, enumerate an Epic cloud library, search ROM or executable folders, create Steam shortcuts, install launchers, or select Proton versions. Emulator shortcuts may represent a launcher rather than an individual ROM. Heroic can serve stores besides Epic; the category does not prove the store. Offline PC is a category, not an offline-readiness test. Correct any suggestion in the game's detail screen.

Steam discovery includes installed apps across the device; manifests do not establish the current account's ownership or distinguish every game from a tool. Uninstalled Steam titles are omitted. Non-Steam shortcuts are displayed as registered, even if their target has since been removed.

## Install on the Legion Go S

1. Have a working Decky Loader installation on your SteamOS device. Use its [official installation instructions](https://github.com/SteamDeckHomebrew/decky-loader#installation). This project does not install or modify Decky itself.
2. Transfer `release/legion-library-0.1.0.zip` from this Windows project to the handheld, for example into Downloads with a USB drive or your normal file-transfer tool. This is the installable ZIP; a ZIP of the whole source folder is not the same thing.
3. In Gaming Mode, open the Quick Access menu and Decky's settings. Enable Decky's Developer mode, open its Developer section, and select **Install Plugin from ZIP File**. Choose the transferred ZIP. Menu wording can vary by Decky version.
4. Open **Decky → Legion Library → Open Legion Library**. The initial scan inspects the device's local Steam files. Open **Setup & status** if games are missing or multiple userdata profiles exist.
5. If several profiles are listed, choose the numeric Steam userdata folder corresponding to the account currently logged in. These are Steam account folder IDs, not Windows user IDs. On the device, look under the discovered Steam folder's `userdata/` directory. The plugin intentionally avoids merging profiles. Switch profiles when switching Steam accounts.
6. Refresh after adding games or shortcuts. If Steam has not flushed a newly added shortcut to disk, restart Steam/Gaming Mode, then refresh again.
7. Select a game card. Choose **Open Steam game page** and use Steam's **Play** button. This preserves Steam's controller configuration, launch choices, and compatibility workflow.

You do not need Node.js or a Python installation on the handheld to install the ZIP; Decky supplies the plugin backend runtime. The plugin requests no root/debug flags and uses Python's standard library only.

If your Decky version has no ZIP installer, extract the archive so its `legion-library/` folder is directly inside the actual Decky home directory's `plugins/` folder, then restart Decky or the device. Do not assume the SteamOS username is `deck`; use your device's actual Decky home path. Prefer Decky's installer to manual permission changes.

## Build and preview on Windows

Open a terminal in `C:\Users\dvard\Downloads\Development\Custom Decky Plugins`:

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run test:bundle
npm run package
npm run preview
```

Prerequisites: Node.js 22 LTS (or compatible newer Node), npm, and Python 3.11+ on PATH for tests/packaging. SteamOS/Decky supplies Python at runtime; no pip dependencies are required. The tested local environment used Node 24.18.0 and Python 3.12.14.

The preview opens at `http://127.0.0.1:5173/`. It uses fictional sample titles and browser-only demo preferences. It does not inspect your Windows Steam installation or connect to your handheld. Preview controls use normal browser controls; the actual plugin uses Decky's Steam controller-aware components. `npm run preview:build` produces a static preview in `preview-dist/`, which is not part of the installed plugin.

`npm run package` creates the installable ZIP and a SHA-256 file under `release/`. The ZIP contains a single `legion-library/` root folder, frontend bundle, Python backend, licenses, documentation, and rebuildable source. `node_modules`, preview data, and test fixtures are excluded.

## Data and behavior

Discovery starts when the library is opened or Refresh is pressed. It checks the Decky user's `.local/share/Steam`, `.steam/steam`, or `.steam/root`; reads `steamapps/libraryfolders.vdf` and installed `appmanifest_*.acf` files; then reads the selected `userdata/<profile>/config/shortcuts.vdf`. SD/external Steam libraries are followed only when listed by Steam. No recursive game-folder scan occurs. Individual files are limited to 16 MiB; up to 4,000 entries are displayed.

Steam and shortcut files are read-only. Only `preferences.json` inside `decky.DECKY_PLUGIN_SETTINGS_DIR` is written, atomically. Preferences store favorites, category overrides, and a selected profile. Shortcut preference IDs include the profile and App ID, so equal game names remain separate. Steam favorites are shared across profiles. Entries disappearing from the library do not erase their preferences; deleting/recreating a shortcut can change its App ID and require favoriting it again.

The interface uses local color covers and initials in this release. No artwork service or credentials are required. Account/profile auto-detection, real game artwork, custom collections, hide/reorder, direct Heroic/ROM adapters, and optional native-home integration are later improvements after device testing.

## Testing and removal

Follow [docs/TESTING.md](docs/TESTING.md) for the hardware checklist and known limitations. [docs/APPROACH.md](docs/APPROACH.md) records the architecture and Steam UI constraints.

To remove it, uninstall **Legion Library** through Decky's plugin settings. It has no native Home patch to undo. Decky may retain its settings folder; optionally remove only this plugin's settings folder after backing it up if you want a complete preference reset. Your Steam/Heroic/emulator files are not changed.

## References and licensing

Implementation follows the [official Decky plugin template](https://github.com/SteamDeckHomebrew/decky-plugin-template), [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader), [@decky/ui](https://github.com/SteamDeckHomebrew/decky-frontend-lib), and [@decky/api](https://github.com/SteamDeckHomebrew/loader-api). Decky and Steam's internal frontend interfaces can change with updates; reinstalling or rebuilding cannot guarantee compatibility with every client revision. No device connection or real game library was available during this prototype's implementation.

Own code: MIT. See LICENSE and THIRD_PARTY_NOTICES.md for the adapted build configuration and bundled @decky/api library.
