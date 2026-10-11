import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../src/model.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { visibleGames, gameSource } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const games = [
  { id: "steam:42", name: "Same Title", source: "steam" },
  { id: "shortcut:12:2147483649", name: "Same Title", source: "pc" },
  { id: "steam:43", name: "Alpha", source: "steam" },
];
const prefs = { favorites: [games[1].id], overrides: { [games[1].id]: "heroic" }, profile: "12" };
test("favorites sort first without collapsing duplicate titles", () => {
  const result = visibleGames(games, prefs, "all", "");
  assert.equal(result.length, 3);
  assert.equal(result[0].id, games[1].id);
});
test("category override controls filtering", () => {
  assert.equal(gameSource(games[1], prefs), "heroic");
  assert.equal(visibleGames(games, prefs, "heroic", "").length, 1);
  assert.equal(visibleGames(games, prefs, "pc", "").length, 0);
});
test("search trims whitespace and ignores case", () => {
  assert.equal(visibleGames(games, prefs, "all", " SAME ").length, 2);
  assert.equal(visibleGames(games, prefs, "favorites", "alpha").length, 0);
});
