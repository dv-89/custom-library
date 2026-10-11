import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import * as jsx from "react/jsx-runtime";

test("compiled plugin connects to Decky, opens its route, calls RPC, and unregisters", async () => {
  const routes = new Map();
  const navigations = [];
  const calls = [];
  const api = {
    _version: 2,
    callable: method => async (...args) => { calls.push([method, args]); return {}; },
    routerHook: { addRoute: (path, component) => routes.set(path, component), removeRoute: path => routes.delete(path) },
  };
  globalThis.window = { __DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit: { connect: (version, name) => { assert.equal(version, 2); assert.equal(name, "Legion Library"); return api; } } };
  globalThis.SP_REACT = React;
  globalThis.SP_JSX = jsx;
  globalThis.DFL = {
    ButtonItem: "button", DialogButton: "button", Dropdown: "select", Focusable: "div", PanelSection: "section", PanelSectionRow: "div", TextField: "input", staticClasses: { Title: "title" },
    Navigation: { Navigate: path => navigations.push(path), NavigateBack() {}, CloseSideMenus() {} },
  };
  const { default: define } = await import("../dist/index.js");
  const plugin = define();
  assert.equal(plugin.name, "Legion Library");
  assert.equal(routes.size, 1);
  const openButton = plugin.content.props.children[0].props.children;
  openButton.props.onClick();
  assert.deepEqual(navigations, ["/legion-library"]);
  const route = routes.get("/legion-library")();
  await route.props.api.load();
  await route.props.api.save({ favorites: [], overrides: {}, profile: "" });
  assert.deepEqual(calls.map(call => call[0]), ["get_catalog", "save_preferences"]);
  route.props.api.open({ appid: 2147483649 });
  assert.equal(navigations[1], "/library/app/2147483649");
  plugin.onDismount();
  assert.equal(routes.size, 0);
});
