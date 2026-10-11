# Verification and device testing

## Local verification

Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:bundle`, `npm run preview:build`, and `npm run package` from the project directory. Backend tests construct synthetic local Steam trees; they never access a real Steam account. Model tests verify source overrides, favorites, duplicate names, and search behavior. The compiled-bundle test supplies mocked Decky globals to check plugin initialization, route registration/removal, RPC method names, and unsigned App ID navigation; it does not emulate Steam itself.

The automated suite covers:

- No Steam installation and empty catalogs.
- Installed vs partially downloaded manifests; Unicode names.
- Secondary library drives and duplicate App IDs.
- Multiple profiles, explicit profile selection, and invalid traversal-like profile values.
- Unsigned non-Steam App IDs and source suggestions based on launch data.
- Duplicate names with different identities and malformed/missing VDF data.
- Bounded file reads and preservation of reference library files.
- Preference validation, atomic round trips, corrupt preference warnings, and rejected writes preserving previous settings.
- Favorite-first sorting, category override filters, and case-insensitive search.

The desktop demo validates the shared interface with mouse/keyboard. It cannot establish controller focus behavior, Steam internal route compatibility, Decky RPC deployment, or actual game launching.

## Hardware acceptance checklist — pending

Record the Legion Go S's SteamOS, Steam client, and Decky versions before testing. Keep this checklist marked pending until actually tested on the device.

1. Install the ZIP and confirm Legion Library appears in Decky without an error. Open it, close it, and reopen it.
2. Inspect Setup & status. Confirm the Steam path and selected userdata profile match this device. With multiple accounts, verify only the selected profile's shortcuts appear.
3. Compare at least one installed Steam game, one Heroic/Epic game shortcut, one emulator game shortcut, and one offline PC game shortcut with Steam's normal library. Refresh after adding or removing entries. Include a game installed on the SD card if applicable.
4. Navigate every category and card with D-pad and joystick; check visible focus, row transitions, vertical scrolling, A activation, B return from details/setup, and B return from the library to Steam. Use touch as well. Check that Steam/Quick Access menus remain reachable.
5. Enter a search with the Steam keyboard, clear it, and test an empty category and a query with no results. Test Favorites with zero and several favorites.
6. Favorite a game, change its category, reset the suggestion, close/reopen the page, then reboot. Confirm saved preferences persist. Switch profile and confirm shortcuts are not merged.
7. Open each of the four source examples in Steam. Confirm the right game page and existing Play workflow. Start and exit each game through Steam. Verify Proton and controller settings are unchanged.
8. Test a missing/broken shortcut and a Heroic login/update requirement. Steam should report the launch issue; the plugin must not claim the game is ready offline. Try Offline Mode with a title already known to support it.
9. Test the device's native resolution and any preferred UI scaling. Confirm tabs, search, card titles, settings, and focused controls remain visible. Large-library scan/focus/scroll performance is not yet benchmarked.
10. Reload/uninstall the plugin. Confirm the route is removed, normal Steam Home works, and existing game library files are unchanged. Reinstall and check retained preferences if Decky preserves them.

## Troubleshooting

| Symptom | Check |
|---|---|
| Plugin missing or fails to load | Confirm the ZIP contains `legion-library/dist/index.js`, `main.py`, `py_modules/legion_catalog.py`, and manifests; restart Decky/device; inspect this plugin's Decky log |
| No Steam games | Check Setup & status's Steam root; ensure games are fully installed, including correct libraryfolders.vdf entries for SD libraries |
| No Heroic/emulator/PC entries | Add working Steam shortcuts first; select the correct userdata profile; restart Steam if shortcuts are not saved to disk yet |
| Wrong source label | Open the card and choose its category; source suggestions do not inspect launcher accounts |
| Wrong game's page | Verify the selected profile is the current Steam account and the shortcut still exists; record its App ID and client versions |
| Save fails | Check the plugin's Decky settings directory permissions and diagnostic message; do not edit Steam files to fix it |
| Cards lack real artwork | Expected in 0.1.0: local color covers and initials are used |
| Native Home does not change | Expected: this release is opened through Decky; native Home integration is deferred |
| Controller focus or navigation breaks after update | Record Steam/Decky versions and the failed checklist step; uninstall the plugin to restore the baseline UI |

Typical logs are under the actual Decky home directory's `logs/legion-library/`; settings are under `settings/legion-library/preferences.json`. The username/path can differ from Steam Deck examples. Do not send account credentials or launcher tokens with a bug report.
