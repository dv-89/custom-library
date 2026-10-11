import type { Game } from "./model";

// Optional Steam internals: a missing method or stale overview must not break the library.
// Method names and signatures follow @decky/ui's globals/stores types.
type ArtworkMethod = (overview: unknown) => unknown;
export interface ArtworkStore {
  GetAppOverviewByAppID?: (appid: number) => unknown;
  GetCustomVerticalCapsuleURLs?: ArtworkMethod;
  GetCustomLandcapeImageURLs?: ArtworkMethod; // Steam's API uses this spelling.
  GetCachedVerticalImageURLForApp?: ArtworkMethod;
  GetVerticalCapsuleURLForApp?: ArtworkMethod;
  GetCachedLandscapeImageURLForApp?: ArtworkMethod;
  GetLandscapeImageURLForApp?: ArtworkMethod;
}

export function steamPosterSources(game: Game, store?: ArtworkStore): string[] {
  if (!store || typeof store.GetAppOverviewByAppID !== "function") return [];
  let overview: unknown;
  try { overview = store.GetAppOverviewByAppID(game.appid); } catch { return []; }
  if (!overview) return [];
  const sources: string[] = [];
  const methods: (keyof Omit<ArtworkStore, "GetAppOverviewByAppID">)[] = [
    "GetCustomVerticalCapsuleURLs", "GetCustomLandcapeImageURLs",
    "GetCachedVerticalImageURLForApp", "GetVerticalCapsuleURLForApp",
    "GetCachedLandscapeImageURLForApp", "GetLandscapeImageURLForApp",
  ];
  for (const name of methods) {
    try {
      const method = store[name];
      if (typeof method !== "function") continue;
      const result = method.call(store, overview);
      for (const source of Array.isArray(result) ? result : [result]) {
        if (typeof source === "string" && /^(?:https?:\/\/|file:\/\/|data:image\/)/i.test(source) && !sources.includes(source)) sources.push(source);
      }
    } catch { /* Continue to cached/default artwork if a client method fails. */ }
  }
  return sources;
}
