import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const code = ts.transpileModule(readFileSync(new URL("../src/artwork.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { steamPosterSources } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const game = { appid: 2147483649, kind: "shortcut" };
test("custom SteamGridDB poster precedes cached and default Steam art", () => {
  const overview = {};
  const store = {
    GetAppOverviewByAppID: id => { assert.equal(id, game.appid); return overview; },
    GetCustomVerticalCapsuleURLs(app) { assert.equal(this, store); assert.equal(app, overview); return ["http://steamloopback.host/custom-poster.png"]; },
    GetCustomLandcapeImageURLs: () => ["http://steamloopback.host/custom-wide.png"],
    GetCachedVerticalImageURLForApp: () => "http://steamloopback.host/cached-poster.jpg",
    GetVerticalCapsuleURLForApp: () => "https://cdn.steamstatic.com/poster.jpg",
  };
  assert.deepEqual(steamPosterSources(game, store), ["http://steamloopback.host/custom-poster.png", "http://steamloopback.host/custom-wide.png", "http://steamloopback.host/cached-poster.jpg", "https://cdn.steamstatic.com/poster.jpg"]);
});
test("missing client methods and a failed getter still allow fallback", () => {
  assert.deepEqual(steamPosterSources(game), []);
  assert.deepEqual(steamPosterSources(game, { GetAppOverviewByAppID: () => null }), []);
  assert.deepEqual(steamPosterSources(game, { GetAppOverviewByAppID: () => ({}), GetCustomVerticalCapsuleURLs() { throw Error("changed client"); }, GetVerticalCapsuleURLForApp: () => "https://cdn.steamstatic.com/poster.jpg" }), ["https://cdn.steamstatic.com/poster.jpg"]);
});
test("duplicates and invalid sources are omitted", () => {
  assert.deepEqual(steamPosterSources(game, { GetAppOverviewByAppID: () => ({}), GetCustomVerticalCapsuleURLs: () => [null, "", "javascript:alert(1)", "http://steamloopback.host/poster.png", "http://steamloopback.host/poster.png"], GetVerticalCapsuleURLForApp: () => "http://steamloopback.host/poster.png" }), ["http://steamloopback.host/poster.png"]);
});
