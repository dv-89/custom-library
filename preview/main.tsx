import { createRoot } from "react-dom/client";
import { Library, Controls } from "../src/Library";
import { Catalog, LibraryAPI, Preferences, Source } from "../src/model";
import { demoPoster } from "./posters";

const fixtures: [string, Source][] = [["Neon Drift", "steam"], ["Paper Kingdom", "heroic"], ["Pocket Rally", "emulator"], ["Moonbase Alpha", "pc"], ["Orbit Runner", "steam"], ["The Last Orchard", "heroic"], ["Star Circuit", "emulator"], ["Lost Signal", "pc"], ["After the Rain", "steam"], ["Crystal Coast", "heroic"]];
let preferences: Preferences = { favorites: ["steam:1000", "shortcut:12345:2147483649"], overrides: {}, profile: "12345" };
try { const saved = localStorage.getItem("legion-demo-preferences"); if (saved) preferences = JSON.parse(saved); } catch { /* Demo persistence is optional. */ }
const catalog: Catalog = {
  games: fixtures.map(([name, source], index) => ({ id: source === "steam" ? `steam:${1000 + index}` : `shortcut:12345:${2147483648 + index}`, appid: source === "steam" ? 1000 + index : 2147483648 + index, name, source, kind: source === "steam" ? "steam" : "shortcut", suggested: source !== "steam" })),
  profiles: ["12345", "67890"], selected_profile: "12345", steam_root: "Demo only — no Steam folder inspected",
  diagnostics: ["This desktop preview uses fictional sample entries. It cannot discover or launch your games."], preferences,
};
const api: LibraryAPI = {
  demo: true,
  async load() { return { ...catalog, selected_profile: preferences.profile, preferences }; },
  async save(next) { localStorage.setItem("legion-demo-preferences", JSON.stringify(next)); preferences = next; return next; },
  open: game => alert(`Demo only: on SteamOS this opens Steam's game page for ${game.name} (App ID ${game.appid}).`),
  back: () => alert("Demo only: on SteamOS this returns to the previous Steam screen."),
  posterSources: game => { const index = fixtures.findIndex(([name]) => name === game.name); return index === 0 ? ["/missing-demo-poster.png", demoPoster(game.name, index)] : index < 8 ? [demoPoster(game.name, index)] : index === 8 ? ["/missing-demo-poster.png"] : []; },
};
const controls: Controls = {
  Button: props => <button {...props} />,
  Group: ({ children, className, style }) => <div className={className} style={style}>{children}</div>,
  Search: ({ value, onChange }) => <input aria-label="Search your collection" placeholder="Search your collection" value={value} onChange={event => onChange(event.target.value)} />,
  Select: ({ value, options, onChange, disabled, label }) => <label className="ll-native-select">{label}<select value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>,
};
const simulateOverlay = new URLSearchParams(location.search).has("overlay");
createRoot(document.getElementById("root")!).render(<>{simulateOverlay && <aside data-testid="performance-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 64, zIndex: 20, display: "flex", alignItems: "center", background: "#172222", color: "#a8e6ca", padding: "0 24px", font: "14px monospace", boxSizing: "border-box" }}>SIMULATED PERFORMANCE HEADER · Desktop layout test</aside>}<Library api={api} controls={controls} /></>);
