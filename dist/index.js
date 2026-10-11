const manifest = {"name":"Legion Library"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api$1;
try {
    api$1 = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api$1 = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api$1._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api$1._version}. Some features may not work.`);
}
const callable = api$1.callable;
const routerHook = api$1.routerHook;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

const sourceLabels = {
    steam: "Steam", heroic: "Heroic / Epic", emulator: "Emulators", pc: "Offline PC",
};
function gameSource(game, preferences) {
    return preferences.overrides[game.id] ?? game.source;
}
function visibleGames(games, preferences, filter, query) {
    const text = query.trim().toLocaleLowerCase();
    return games.filter(game => (!text || game.name.toLocaleLowerCase().includes(text)) &&
        (filter === "all" || (filter === "favorites" ? preferences.favorites.includes(game.id) : gameSource(game, preferences) === filter))).sort((a, b) => Number(preferences.favorites.includes(b.id)) - Number(preferences.favorites.includes(a.id)) || a.name.localeCompare(b.name));
}

const styles = `
.ll-root{box-sizing:border-box;min-height:100vh;height:100vh;overflow-y:auto;background:#0c121b;color:#edf2f7;padding:28px 36px 20px;font-family:Arial,sans-serif}
.ll-root *{box-sizing:border-box}.ll-root h1,.ll-root h2,.ll-root h3,.ll-root p{margin:0}.ll-root h1{font-size:27px;letter-spacing:-1px;margin-top:7px}.ll-root h2{font-size:30px;letter-spacing:-.8px}.ll-root p{color:#a5b2c4;line-height:1.6;margin-top:12px}.ll-root button{cursor:pointer;font:inherit}.ll-root button:disabled{opacity:.5;cursor:wait}
.ll-header{display:flex;justify-content:space-between;align-items:center;gap:20px}.ll-eyebrow{color:#91b7ac;letter-spacing:2px;font-size:10px;font-weight:700}.ll-version{color:#627185;font-size:10px;letter-spacing:1px;margin-left:12px}.ll-actions,.ll-tabs{display:flex;gap:8px}.ll-actions button,.ll-empty button,.ll-detail-actions button{border:1px solid #354354;background:#1a2534;color:#e2e9f3;border-radius:9px;padding:10px 16px;font-size:13px;min-height:40px}
.ll-intro{display:flex;align-items:center;justify-content:space-between;margin:35px 0 28px}.ll-intro p{font-size:14px;margin-top:8px}.ll-total{display:flex;flex-direction:column;text-align:right}.ll-total strong{font-size:34px;color:#a9e5ce}.ll-total span{font-size:11px;color:#8090a3}.ll-toolbar{display:flex;gap:18px;align-items:center;justify-content:space-between}.ll-tabs{flex-wrap:wrap}.ll-tabs .ll-tab{color:#9fadc0;background:transparent;border:1px solid #283443;border-radius:8px;padding:10px 12px;font-size:12px;min-height:40px}.ll-tabs .ll-active{background:#b5edda;color:#0d3028;border-color:#b5edda}.ll-count{opacity:.65;margin-left:8px;font-size:10px}.ll-search{width:210px;min-width:160px}.ll-search input{width:100%;border:1px solid #354354;border-radius:8px;padding:12px;background:#162131;color:#edf2f7;font:inherit;font-size:12px}.ll-section-title{display:flex;justify-content:space-between;margin:25px 0 14px;font-size:14px;font-weight:700}.ll-section-title span+span{font-size:11px;font-weight:400;color:#8998ab}
.ll-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:18px;padding-bottom:18px}.ll-grid .ll-card{padding:0;border:1px solid #283647;border-radius:12px;background:#162131;color:#f0f4fa;text-align:left;overflow:hidden;display:block;width:100%;min-width:0;box-shadow:none}.ll-cover{height:180px;position:relative;overflow:hidden;background:linear-gradient(140deg,var(--ll-color),#152131 85%);padding:15px}.ll-steam{--ll-color:#215775}.ll-heroic{--ll-color:#644774}.ll-emulator{--ll-color:#846137}.ll-pc{--ll-color:#2e6960}.ll-card-label{font-size:10px;letter-spacing:1px;text-transform:uppercase;position:relative;z-index:1;color:#ecf1f8}.ll-star{float:right;color:#ffe09b}.ll-letter{position:absolute;bottom:8px;left:10px;font-size:92px;letter-spacing:-8px;font-weight:800;opacity:.18;transform:rotate(-10deg)}.ll-cover-line{position:absolute;border:1px solid #ffffff20;width:140px;height:140px;border-radius:50%;right:-50px;top:40px}.ll-card-info{padding:14px}.ll-card-info strong{display:block;font-size:14px;white-space:normal;line-height:1.3;min-height:36px}.ll-card-info>span{display:block;font-size:10px;color:#9eafc3;margin-top:8px}.ll-arrow{float:right}.ll-root button:focus-visible,.ll-root .gpfocus,.ll-root .ll-focus{outline:3px solid #b5edda!important;outline-offset:3px}.ll-root .ll-card:hover{border-color:#82b5a5}.ll-footer{display:flex;justify-content:space-between;gap:20px;color:#667a91;font-size:10px;border-top:1px solid #223043;padding-top:16px;margin-top:22px}.ll-demo{background:#25394a;color:#c2ddeb;border:1px solid #38556a;padding:10px 14px;border-radius:7px;font-size:11px;letter-spacing:.5px;margin-top:20px}.ll-error{background:#532b32;color:#ffdade;padding:14px;border-radius:8px;margin-top:18px}.ll-empty{padding:60px 20px;text-align:center}.ll-empty button{margin-top:20px}.ll-setup{max-width:900px;padding:40px 0 15px}.ll-setup h3{margin-top:26px}.ll-profile{max-width:380px;margin:24px 0}.ll-diagnostic{padding:12px;border:1px solid #304152;border-radius:8px}.ll-detail{display:flex;gap:40px;padding:40px 0}.ll-poster{width:260px;min-height:330px;flex-shrink:0;background:linear-gradient(140deg,var(--ll-color),#162131);border:1px solid #3a4a5d;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;font-size:12px}.ll-monogram{font-size:110px;opacity:.45;font-weight:800}.ll-detail-info{max-width:550px}.ll-detail-info h2{margin-top:15px}.ll-detail-actions{display:flex;flex-direction:column;gap:14px;margin-top:25px;max-width:380px}.ll-detail-actions button:first-child{background:#b5edda;color:#103b2f}.ll-muted{font-size:11px}.ll-native-select{display:flex;flex-direction:column;gap:7px;font-size:12px;color:#a5b2c4}.ll-native-select select{padding:12px;background:#1a2534;color:#edf2f7;border:1px solid #354354;border-radius:8px;font:inherit}
@media(max-width:1000px){.ll-root{padding:22px}.ll-header{flex-wrap:wrap}.ll-toolbar{flex-wrap:wrap}.ll-grid{grid-template-columns:repeat(auto-fill,minmax(155px,1fr))}.ll-cover{height:155px}.ll-intro{margin:24px 0}.ll-detail{gap:25px}.ll-footer{flex-wrap:wrap}}@media(max-width:600px){.ll-root{padding:16px}.ll-detail{flex-direction:column}.ll-poster{width:100%;min-height:180px}.ll-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ll-version{display:none}}
`;

function Library({ api, controls: { Button, Group, Search, Select } }) {
    const [catalog, setCatalog] = SP_REACT.useState();
    const [filter, setFilter] = SP_REACT.useState("all");
    const [query, setQuery] = SP_REACT.useState("");
    const [selected, setSelected] = SP_REACT.useState();
    const [loading, setLoading] = SP_REACT.useState(false);
    const [saving, setSaving] = SP_REACT.useState(false);
    const [error, setError] = SP_REACT.useState("");
    const [diagnostics, setDiagnostics] = SP_REACT.useState(false);
    const alive = SP_REACT.useRef(true);
    async function refresh() {
        setLoading(true);
        setError("");
        try {
            const result = await api.load();
            if (alive.current) {
                setCatalog(result);
                setSelected(undefined);
            }
        }
        catch (err) {
            if (alive.current)
                setError(`Library could not be loaded: ${String(err)}`);
        }
        finally {
            if (alive.current)
                setLoading(false);
        }
    }
    SP_REACT.useEffect(() => {
        alive.current = true;
        void refresh();
        return () => { alive.current = false; };
    }, []);
    async function save(next, reload = false) {
        setSaving(true);
        setError("");
        try {
            const preferences = await api.save(next);
            if (alive.current)
                setCatalog(previous => previous ? { ...previous, preferences } : previous);
            if (reload && alive.current)
                await refresh();
        }
        catch (err) {
            if (alive.current)
                setError(`Changes could not be saved: ${String(err)}`);
        }
        finally {
            if (alive.current)
                setSaving(false);
        }
    }
    function back() {
        if (selected)
            setSelected(undefined);
        else if (diagnostics)
            setDiagnostics(false);
        else
            api.back();
    }
    const preferences = catalog?.preferences ?? { favorites: [], overrides: {}, profile: "" };
    const games = visibleGames(catalog?.games ?? [], preferences, filter, query);
    const busy = loading || saving;
    const categories = [{ value: "all", label: "All games" }, { value: "favorites", label: "Favorites" }, ...Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))];
    function toggleFavorite(game) {
        const favorites = preferences.favorites.includes(game.id) ? preferences.favorites.filter(id => id !== game.id) : [...preferences.favorites, game.id];
        void save({ ...preferences, favorites });
    }
    return SP_JSX.jsxs(Group, { className: "ll-root", flow: "column", onCancel: back, children: [SP_JSX.jsx("style", { children: styles }), SP_JSX.jsxs("header", { className: "ll-header", children: [SP_JSX.jsxs("div", { children: [SP_JSX.jsx("div", { className: "ll-eyebrow", children: "YOUR GAMES, TOGETHER" }), SP_JSX.jsxs("h1", { children: ["Legion Library", SP_JSX.jsx("span", { className: "ll-version", children: " PROTOTYPE" })] })] }), SP_JSX.jsxs(Group, { className: "ll-actions", flow: "row", children: [SP_JSX.jsx(Button, { onClick: back, children: selected || diagnostics ? "← Back" : "← Steam" }), SP_JSX.jsx(Button, { onClick: () => void refresh(), disabled: busy, children: loading ? "Scanning…" : "Refresh" }), SP_JSX.jsx(Button, { onClick: () => { setDiagnostics(!diagnostics); setSelected(undefined); }, children: "Setup & status" })] })] }), api.demo && SP_JSX.jsx("div", { className: "ll-demo", children: "DESKTOP DEMO \u00B7 Sample titles only \u00B7 No device or library connection" }), error && SP_JSX.jsx("div", { role: "alert", className: "ll-error", children: error }), diagnostics ? SP_JSX.jsxs("section", { className: "ll-setup", children: [SP_JSX.jsx("h2", { children: "Connect your collection" }), SP_JSX.jsx("p", { children: "Installed Steam apps appear after scanning. Add Heroic games, emulator games, and PC games as Steam shortcuts, then refresh here." }), SP_JSX.jsx("p", { children: "Category suggestions use shortcut launch information. Open a game to correct its category. \u201COffline PC\u201D is an organization label; it does not verify offline play." }), catalog && catalog.profiles.length > 0 && SP_JSX.jsx("div", { className: "ll-profile", children: SP_JSX.jsx(Select, { label: "Steam userdata profile", value: catalog.selected_profile, disabled: busy, options: [{ value: "", label: "Choose profile…" }, ...catalog.profiles.map(value => ({ value, label: value }))], onChange: profile => void save({ ...preferences, profile }, true) }) }), SP_JSX.jsx("p", { children: "Profile numbers are Steam userdata folder IDs. Choose the folder belonging to the account currently signed into Steam. Local installed apps can include tools and games from other accounts." }), SP_JSX.jsx("h3", { children: "Discovery status" }), SP_JSX.jsxs("p", { children: [catalog?.games.length ?? 0, " entries \u00B7 Steam folder: ", catalog?.steam_root ?? "not found / not yet inspected"] }), catalog?.diagnostics.map((message, index) => SP_JSX.jsx("p", { className: "ll-diagnostic", children: message }, index)), SP_JSX.jsx("p", { children: "Legion Library reads manifests and shortcuts. Favorites and categories are saved in its own Decky settings. Use Steam\u2019s game page to play, configure Proton, or manage a shortcut." })] }) : selected ? SP_JSX.jsxs("section", { className: "ll-detail", children: [SP_JSX.jsxs("div", { className: `ll-poster ll-${gameSource(selected, preferences)}`, children: [SP_JSX.jsx("span", { className: "ll-monogram", children: selected.name.slice(0, 2).toUpperCase() }), SP_JSX.jsx("span", { children: sourceLabels[gameSource(selected, preferences)] })] }), SP_JSX.jsxs("div", { className: "ll-detail-info", children: [SP_JSX.jsx("div", { className: "ll-eyebrow", children: selected.kind === "steam" ? "INSTALLED STEAM APP" : "STEAM SHORTCUT" }), SP_JSX.jsx("h2", { children: selected.name }), SP_JSX.jsx("p", { children: "Open this entry in Steam to play with your existing controller, launcher, and compatibility settings." }), SP_JSX.jsxs(Group, { className: "ll-detail-actions", flow: "column", children: [SP_JSX.jsx(Button, { onClick: () => { try {
                                            api.open(selected);
                                        }
                                        catch (err) {
                                            setError(`Steam could not open this entry: ${String(err)}`);
                                        } }, children: "Open Steam game page \u2197" }), SP_JSX.jsx(Button, { onClick: () => toggleFavorite(selected), disabled: busy, children: preferences.favorites.includes(selected.id) ? "★ Remove favorite" : "☆ Add to favorites" }), SP_JSX.jsx(Select, { label: "Category", disabled: busy, value: gameSource(selected, preferences), options: Object.entries(sourceLabels).map(([value, label]) => ({ value, label })), onChange: source => void save({ ...preferences, overrides: { ...preferences.overrides, [selected.id]: source } }) }), preferences.overrides[selected.id] && SP_JSX.jsx(Button, { disabled: busy, onClick: () => { const overrides = { ...preferences.overrides }; delete overrides[selected.id]; void save({ ...preferences, overrides }); }, children: "Reset category suggestion" })] }), SP_JSX.jsxs("p", { className: "ll-muted", children: [preferences.overrides[selected.id] ? "Your category" : selected.suggested ? "Suggested category · you can change it" : "Steam manifest", " \u00B7 App ID ", selected.appid] })] })] }) : SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs("div", { className: "ll-intro", children: [SP_JSX.jsxs("div", { children: [SP_JSX.jsx("h2", { children: "A home for every game." }), SP_JSX.jsx("p", { children: "Steam, Epic, emulators, and PC favorites in one place." })] }), SP_JSX.jsxs("div", { className: "ll-total", children: [SP_JSX.jsx("strong", { children: catalog?.games.length ?? "—" }), SP_JSX.jsx("span", { children: "library entries" })] })] }), SP_JSX.jsxs(Group, { className: "ll-toolbar", flow: "row", children: [SP_JSX.jsx(Group, { className: "ll-tabs", flow: "row", children: categories.map(category => {
                                    const count = visibleGames(catalog?.games ?? [], preferences, category.value, "").length;
                                    return SP_JSX.jsxs(Button, { className: `ll-tab ${filter === category.value ? "ll-active" : ""}`, onClick: () => setFilter(category.value), children: [category.label, SP_JSX.jsx("span", { className: "ll-count", children: count })] }, category.value);
                                }) }), SP_JSX.jsx("div", { className: "ll-search", children: SP_JSX.jsx(Search, { value: query, onChange: setQuery }) })] }), !catalog && loading ? SP_JSX.jsxs("div", { className: "ll-empty", children: [SP_JSX.jsx("h3", { children: "Inspecting local Steam files\u2026" }), SP_JSX.jsx("p", { children: "Your library stays on the device." })] }) : games.length === 0 ? SP_JSX.jsxs("div", { className: "ll-empty", children: [SP_JSX.jsx("h3", { children: catalog?.games.length ? "No matching games" : "Your collection starts here" }), SP_JSX.jsx("p", { children: catalog?.games.length ? "Try another category or search." : "Add games to Steam, then refresh. Setup & status shows what was found." }), SP_JSX.jsx(Button, { onClick: () => { setFilter("all"); setQuery(""); setDiagnostics(!catalog?.games.length); }, children: catalog?.games.length ? "Clear filters" : "Open setup & status" })] }) : SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs("div", { className: "ll-section-title", children: [SP_JSX.jsx("span", { children: filter === "all" ? "Your collection" : categories.find(category => category.value === filter)?.label }), SP_JSX.jsxs("span", { children: [games.length, " shown \u00B7 favorites first"] })] }), SP_JSX.jsx(Group, { className: "ll-grid", flow: "grid", children: games.map(game => {
                                    const source = gameSource(game, preferences);
                                    return SP_JSX.jsxs(Button, { className: `ll-card ll-${source}`, onClick: () => setSelected(game), children: [SP_JSX.jsxs("div", { className: "ll-cover", children: [SP_JSX.jsx("span", { className: "ll-card-label", children: sourceLabels[source] }), preferences.favorites.includes(game.id) && SP_JSX.jsx("span", { className: "ll-star", children: "\u2605" }), SP_JSX.jsx("span", { className: "ll-letter", children: game.name.slice(0, 2).toUpperCase() }), SP_JSX.jsx("span", { className: "ll-cover-line" })] }), SP_JSX.jsxs("div", { className: "ll-card-info", children: [SP_JSX.jsx("strong", { children: game.name }), SP_JSX.jsxs("span", { children: [game.kind === "steam" ? "Installed app" : "Steam shortcut", " ", SP_JSX.jsx("span", { className: "ll-arrow", children: "\u2197" })] })] })] }, game.id);
                                }) })] })] }), SP_JSX.jsxs("footer", { className: "ll-footer", children: [SP_JSX.jsx("span", { children: "Local library \u00B7 manual refresh" }), SP_JSX.jsx("span", { children: "Choose a game to open details \u00B7 Back returns to Steam" })] })] });
}

const ROUTE = "/legion-library";
const getCatalog = callable("get_catalog");
const savePreferences = callable("save_preferences");
const api = {
    load: getCatalog,
    save: savePreferences,
    open: game => { DFL.Navigation.Navigate(`/library/app/${game.appid}`); DFL.Navigation.CloseSideMenus(); },
    back: () => DFL.Navigation.NavigateBack(),
};
const controls = {
    Button: props => SP_JSX.jsx(DFL.DialogButton, { ...props }),
    Group: ({ flow, children, ...props }) => SP_JSX.jsx(DFL.Focusable, { ...props, "flow-children": flow, focusWithinClassName: "ll-focus-within", children: children }),
    Search: ({ value, onChange }) => SP_JSX.jsx(DFL.TextField, { label: "Search", value: value, onChange: event => onChange(event.target.value), bShowClearAction: true }),
    Select: ({ value, options, onChange, disabled, label }) => SP_JSX.jsxs("div", { className: "ll-native-select", children: [SP_JSX.jsx("span", { children: label }), SP_JSX.jsx(DFL.Dropdown, { menuLabel: label, selectedOption: value, disabled: disabled, rgOptions: options.map(option => ({ data: option.value, label: option.label })), onChange: option => onChange(String(option.data)) })] }),
};
function LibraryRoute() { return SP_JSX.jsx(Library, { api: api, controls: controls }); }
function openLibrary() { DFL.Navigation.Navigate(ROUTE); DFL.Navigation.CloseSideMenus(); }
var index = definePlugin(() => {
    routerHook.addRoute(ROUTE, LibraryRoute, { exact: true });
    return {
        name: "Legion Library",
        titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: "Legion Library" }),
        icon: SP_JSX.jsxs("svg", { viewBox: "0 0 24 24", width: "20", height: "20", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [SP_JSX.jsx("rect", { x: "3", y: "6", width: "18", height: "13", rx: "4" }), SP_JSX.jsx("path", { d: "M7 10v5m-2-2.5h4m7-1h.01m2 3h.01" })] }),
        content: SP_JSX.jsxs(DFL.PanelSection, { title: "Your unified home", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: openLibrary, children: "Open Legion Library" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { color: "#9faebf", fontSize: 12, lineHeight: 1.6 }, children: "Installed Steam apps and non-Steam shortcuts, organized your way. Open Setup & status to choose a profile or inspect discovery." }) })] }),
        onDismount() { routerHook.removeRoute(ROUTE); },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
