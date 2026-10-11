import { ComponentType, CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { Catalog, DEFAULT_HEADER_OFFSET, Game, LibraryAPI, Preferences, Source, gameSource, sourceLabels, visibleGames } from "./model";
import { styles } from "./styles";
import { Poster } from "./Poster";

export interface Controls {
  Button: ComponentType<{ children?: ReactNode; onClick: () => void; disabled?: boolean; className?: string; style?: CSSProperties }>;
  Group: ComponentType<{ children?: ReactNode; className?: string; flow?: string; onCancel?: () => void; style?: CSSProperties }>;
  Search: ComponentType<{ value: string; onChange: (value: string) => void }>;
  Select: ComponentType<{ value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean; label: string }>;
}

export function Library({ api, controls: { Button, Group, Search, Select } }: { api: LibraryAPI; controls: Controls }) {
  const [catalog, setCatalog] = useState<Catalog>();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Game>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [diagnostics, setDiagnostics] = useState(false);
  const [artworkRevision, setArtworkRevision] = useState(0);
  const alive = useRef(true);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const result = await api.load();
      if (alive.current) { setCatalog(result); setSelected(undefined); setArtworkRevision(previous => previous + 1); }
    } catch (err) {
      if (alive.current) setError(`Library could not be loaded: ${String(err)}`);
    } finally { if (alive.current) setLoading(false); }
  }
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => { alive.current = false; };
  }, []);

  async function save(next: Preferences, reload = false) {
    setSaving(true);
    setError("");
    try {
      const preferences = await api.save(next);
      if (alive.current) setCatalog(previous => previous ? { ...previous, preferences } : previous);
      if (reload && alive.current) await refresh();
    } catch (err) {
      if (alive.current) setError(`Changes could not be saved: ${String(err)}`);
    } finally { if (alive.current) setSaving(false); }
  }
  function back() {
    if (selected) setSelected(undefined);
    else if (diagnostics) setDiagnostics(false);
    else api.back();
  }
  const preferences = catalog?.preferences ?? { favorites: [], overrides: {}, profile: "" };
  const games = visibleGames(catalog?.games ?? [], preferences, filter, query);
  const busy = loading || saving;
  const categories = [{ value: "all", label: "All games" }, { value: "favorites", label: "Favorites" }, ...Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))];
  function toggleFavorite(game: Game) {
    const favorites = preferences.favorites.includes(game.id) ? preferences.favorites.filter(id => id !== game.id) : [...preferences.favorites, game.id];
    void save({ ...preferences, favorites });
  }

  const headerOffset = preferences.header_offset ?? DEFAULT_HEADER_OFFSET;
  return <Group className="ll-root" flow="column" onCancel={back} style={{ "--ll-header-clearance": `${headerOffset}px` } as CSSProperties}>
    <style>{styles}</style>
    <Group className="ll-scroll" flow="column">
    <header className="ll-header">
      <div><div className="ll-eyebrow">YOUR GAMES, TOGETHER</div><h1>Legion Library<span className="ll-version"> PROTOTYPE</span></h1></div>
      <Group className="ll-actions" flow="row">
        <Button onClick={back}>{selected || diagnostics ? "← Back" : "← Steam"}</Button>
        <Button onClick={() => void refresh()} disabled={busy}>{loading ? "Scanning…" : "Refresh"}</Button>
        <Button onClick={() => { setDiagnostics(!diagnostics); setSelected(undefined); }}>Setup & status</Button>
      </Group>
    </header>
    {api.demo && <div className="ll-demo">DESKTOP DEMO · Sample titles only · No device or library connection</div>}
    {error && <div role="alert" className="ll-error">{error}</div>}
    {diagnostics ? <section className="ll-setup">
      <h2>Connect your collection</h2>
      <p>Installed Steam apps appear after scanning. Add Heroic games, emulator games, and PC games as Steam shortcuts, then refresh here.</p>
      <p>Category suggestions use shortcut launch information. Open a game to correct its category. “Offline PC” is an organization label; it does not verify offline play.</p>
      <h3>Display & artwork</h3>
      <div className="ll-profile"><Select label="Space for Steam / performance header" disabled={busy} value={String(headerOffset)} options={[0, 48, 96, 144, 192, 240].map(value => ({ value: String(value), label: value === 0 ? "None" : `${value} px${value === 96 ? " (default)" : ""}` }))} onChange={value => void save({ ...preferences, header_offset: Number(value) })} /></div>
      <p>The space above this page stays clear while you scroll. Increase it if the performance overlay covers the controls. Taller overlays may also cover part of the collection.</p>
      <p>Posters use custom Steam artwork first, including images applied through SteamGridDB, then Steam's cached and standard covers. After changing artwork, press Refresh. Missing or unavailable images fall back to the color cover.</p>
      {catalog && catalog.profiles.length > 0 && <div className="ll-profile"><Select label="Steam userdata profile" value={catalog.selected_profile} disabled={busy} options={[{ value: "", label: "Choose profile…" }, ...catalog.profiles.map(value => ({ value, label: value }))]} onChange={profile => void save({ ...preferences, profile }, true)} /></div>}
      <p>Profile numbers are Steam userdata folder IDs. Choose the folder belonging to the account currently signed into Steam. Local installed apps can include tools and games from other accounts.</p>
      <h3>Discovery status</h3>
      <p>{catalog?.games.length ?? 0} entries · Steam folder: {catalog?.steam_root ?? "not found / not yet inspected"}</p>
      {catalog?.diagnostics.map((message, index) => <p key={index} className="ll-diagnostic">{message}</p>)}
      <p>Legion Library reads manifests and shortcuts. Favorites and categories are saved in its own Decky settings. Use Steam’s game page to play, configure Proton, or manage a shortcut.</p>
    </section> : selected ? <section className="ll-detail">
      <div className={`ll-poster ll-${gameSource(selected, preferences)}`}><Poster key={`${selected.id}:${artworkRevision}`} game={selected} api={api} /><span className="ll-poster-label">{sourceLabels[gameSource(selected, preferences)]}</span></div>
      <div className="ll-detail-info"><div className="ll-eyebrow">{selected.kind === "steam" ? "INSTALLED STEAM APP" : "STEAM SHORTCUT"}</div><h2>{selected.name}</h2>
        <p>Open this entry in Steam to play with your existing controller, launcher, and compatibility settings.</p>
        <Group className="ll-detail-actions" flow="column">
          <Button onClick={() => { try { api.open(selected); } catch (err) { setError(`Steam could not open this entry: ${String(err)}`); } }}>Open Steam game page ↗</Button>
          <Button onClick={() => toggleFavorite(selected)} disabled={busy}>{preferences.favorites.includes(selected.id) ? "★ Remove favorite" : "☆ Add to favorites"}</Button>
          <Select label="Category" disabled={busy} value={gameSource(selected, preferences)} options={Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))} onChange={source => void save({ ...preferences, overrides: { ...preferences.overrides, [selected.id]: source as Source } })} />
          {preferences.overrides[selected.id] && <Button disabled={busy} onClick={() => { const overrides = { ...preferences.overrides }; delete overrides[selected.id]; void save({ ...preferences, overrides }); }}>Reset category suggestion</Button>}
        </Group>
        <p className="ll-muted">{preferences.overrides[selected.id] ? "Your category" : selected.suggested ? "Suggested category · you can change it" : "Steam manifest"} · App ID {selected.appid}</p>
      </div>
    </section> : <>
      <div className="ll-intro"><div><h2>A home for every game.</h2><p>Steam, Epic, emulators, and PC favorites in one place.</p></div><div className="ll-total"><strong>{catalog?.games.length ?? "—"}</strong><span>library entries</span></div></div>
      <Group className="ll-toolbar" flow="row">
        <Group className="ll-tabs" flow="row">{categories.map(category => {
          const count = visibleGames(catalog?.games ?? [], preferences, category.value, "").length;
          return <Button key={category.value} className={`ll-tab ${filter === category.value ? "ll-active" : ""}`} onClick={() => setFilter(category.value)}>{category.label}<span className="ll-count">{count}</span></Button>;
        })}</Group>
        <div className="ll-search"><Search value={query} onChange={setQuery} /></div>
      </Group>
      {!catalog && loading ? <div className="ll-empty"><h3>Inspecting local Steam files…</h3><p>Your library stays on the device.</p></div> : games.length === 0 ? <div className="ll-empty"><h3>{catalog?.games.length ? "No matching games" : "Your collection starts here"}</h3><p>{catalog?.games.length ? "Try another category or search." : "Add games to Steam, then refresh. Setup & status shows what was found."}</p><Button onClick={() => { setFilter("all"); setQuery(""); setDiagnostics(!catalog?.games.length); }}>{catalog?.games.length ? "Clear filters" : "Open setup & status"}</Button></div> : <>
        <div className="ll-section-title"><span>{filter === "all" ? "Your collection" : categories.find(category => category.value === filter)?.label}</span><span>{games.length} shown · favorites first</span></div>
        <Group className="ll-grid" flow="grid">{games.map(game => {
          const source = gameSource(game, preferences);
          return <Button key={game.id} className={`ll-card ll-${source}`} onClick={() => setSelected(game)}>
            <div className="ll-cover"><Poster key={`${game.id}:${artworkRevision}`} game={game} api={api} /><div className="ll-cover-badges"><span className="ll-card-label">{sourceLabels[source]}</span>{preferences.favorites.includes(game.id) && <span className="ll-star">★</span>}</div></div>
            <div className="ll-card-info"><strong>{game.name}</strong><span>{game.kind === "steam" ? "Installed app" : "Steam shortcut"} <span className="ll-arrow">↗</span></span></div>
          </Button>;
        })}</Group>
      </>}
    </>}
    <footer className="ll-footer"><span>Local library · manual refresh</span><span>Choose a game to open details · Back returns to Steam</span></footer>
    </Group>
  </Group>;
}
