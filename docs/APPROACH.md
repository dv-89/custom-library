# Approach and limits

## Initial inspection

The requested Windows folder existed and was empty on October 10, 2026. No repository, plugin, game manifests, Heroic installation, emulator configuration, device credentials, or direct library connection was supplied. The ChatGPT project's synced `sources/` references were left untouched. The prior conversation established the four desired game groups and the Legion Go S target, without a specific visual design.

## Feasible first version

Use a Decky registered route, `/legion-library`, rather than patching native Home components. A Decky panel button opens this page. The full-screen design provides a large collection grid, categories, favorites, search, and game details. Decky's `DialogButton`, `Focusable`, `TextField`, and `Dropdown` provide Steam UI/controller integration. All injected CSS is scoped to `.ll-root` and removed with the route component. Plugin unload unregisters the route.

Steam has no public, stable interface for replacing all of Gaming Mode Home or remapping its Home behavior to a plugin page. Replacing internal React elements or intercepting navigation is possible in principle, but depends on Steam's private implementation and can break after updates or conflict with other UI plugins. This prototype makes no such patch. Its interaction with internal navigation is confined to Decky's Navigation wrapper and the standard game-detail path `/library/app/<unsigned-appid>`, which still requires on-device verification.

The plugin opens Steam's game page instead of invoking a raw executable. Steam then owns the launch workflow, controller mapping, Proton, updates, running-game state, and errors. An installed app manifest does not mean a launch is ready or licensed for the selected account. A shortcut does not guarantee its target exists.

## Components

| Component | Responsibility |
|---|---|
| `src/index.tsx` | Decky lifecycle, RPC calls, route registration, native UI controls and game-page navigation |
| `src/Library.tsx` | Shared library/detail/setup interface, loading/error states and preference edits |
| `src/model.ts` | Types, source resolution, filtering and favorite-first sorting |
| `main.py` | Decky RPC boundary, settings validation, atomic persistence, asynchronous worker handoff |
| `py_modules/legion_catalog.py` | Bounded text/binary VDF parsing and local read-only discovery |
| `preview/` | Explicit fictional demo using the same library UI with browser controls |

Decky's sandbox adds the plugin's `py_modules/` directory to Python's import path. The backend therefore ships its discovery module there rather than depending on the working directory. No subprocesses, shell commands, third-party launcher APIs, network requests, or root privileges are used by the plugin runtime.

## Integration choices

Steam manifests provide a conservative installed-only starting point. Libraryfolders.vdf allows discovery on SD cards without guessing mount names. Binary shortcuts.vdf provides names and unsigned 32-bit App IDs for existing non-Steam launch entries. Per-profile selection prevents silently combining unrelated account shortcuts.

Heroic/emulator categories are suggestions from shortcut executable, launch options, and tags. Generic or renamed launcher commands may not be recognized; users can change the category. Remaining shortcuts default to Offline PC, and that label is explicitly not an offline guarantee. This covers the four requested groups through their existing Steam launch entries without assuming direct access to third-party libraries.

This does not automatically populate every game in Epic, every ROM on disk, or every Windows executable. Later adapters should begin by inspecting the actual handheld's launcher/configuration layouts and confirming installed/title/launch mappings; filenames and configuration schemas should not be guessed here.

## Next iteration after hardware validation

1. Confirm route loading, D-pad/joystick focus, scrolling, text entry, B behavior, and game-page handoff with the device's installed Steam and Decky versions.
2. Inspect real shortcut samples and improve category suggestions; add explicit hide/custom collection controls for tools and launcher-only entries.
3. Resolve local Steam artwork safely, retaining the current color-cover fallback.
4. Consider optional Home integration only with a supported Steam/Decky version range, conflict handling, and an explicit reversible toggle.
