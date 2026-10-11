import { useState } from "react";
import type { Game, LibraryAPI } from "./model";

export function Poster({ game, api }: { game: Game; api: LibraryAPI }) {
  const [sources] = useState(() => {
    try { return api.posterSources?.(game) ?? []; } catch { return []; }
  });
  const [index, setIndex] = useState(0);
  const source = sources[index];
  return <>
    <span className="ll-letter" aria-hidden="true">{game.name.slice(0, 2).toUpperCase()}</span>
    <span className="ll-cover-line" aria-hidden="true" />
    {source && <img className="ll-artwork" src={source} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setIndex(previous => previous + 1)} />}
  </>;
}
