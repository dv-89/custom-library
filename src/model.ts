export type Source = "steam" | "heroic" | "emulator" | "pc";
export const sourceLabels: Record<Source, string> = {
  steam: "Steam", heroic: "Heroic / Epic", emulator: "Emulators", pc: "Offline PC",
};
export interface Game {
  id: string;
  appid: number;
  name: string;
  source: Source;
  kind: "steam" | "shortcut";
  suggested: boolean;
}
export interface Preferences {
  favorites: string[];
  overrides: Record<string, Source>;
  profile: string;
  header_offset?: number;
}
export interface Catalog {
  games: Game[];
  profiles: string[];
  selected_profile: string;
  diagnostics: string[];
  steam_root: string | null;
  preferences: Preferences;
}
export interface LibraryAPI {
  load(): Promise<Catalog>;
  save(preferences: Preferences): Promise<Preferences>;
  open(game: Game): void;
  back(): void;
  demo?: boolean;
  posterSources?(game: Game): string[];
}
export const DEFAULT_HEADER_OFFSET = 96;
export function gameSource(game: Game, preferences: Preferences): Source {
  return preferences.overrides[game.id] ?? game.source;
}
export function visibleGames(games: Game[], preferences: Preferences, filter: string, query: string): Game[] {
  const text = query.trim().toLocaleLowerCase();
  return games.filter(game =>
    (!text || game.name.toLocaleLowerCase().includes(text)) &&
    (filter === "all" || (filter === "favorites" ? preferences.favorites.includes(game.id) : gameSource(game, preferences) === filter)),
  ).sort((a, b) => Number(preferences.favorites.includes(b.id)) - Number(preferences.favorites.includes(a.id)) || a.name.localeCompare(b.name));
}
