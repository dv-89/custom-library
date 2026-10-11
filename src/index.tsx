import { ButtonItem, DialogButton, Dropdown, Focusable, Navigation, PanelSection, PanelSectionRow, TextField, staticClasses } from "@decky/ui";
import { callable, definePlugin, routerHook } from "@decky/api";
import { Library, Controls } from "./Library";
import { Catalog, LibraryAPI, Preferences } from "./model";
import { steamPosterSources, ArtworkStore } from "./artwork";

const ROUTE = "/legion-library";
const getCatalog = callable<[], Catalog>("get_catalog");
const savePreferences = callable<[preferences: Preferences], Preferences>("save_preferences");
const api: LibraryAPI = {
  load: getCatalog,
  save: savePreferences,
  open: game => { Navigation.Navigate(`/library/app/${game.appid}`); Navigation.CloseSideMenus(); },
  back: () => Navigation.NavigateBack(),
  posterSources: game => steamPosterSources(game, window.appStore as unknown as ArtworkStore | undefined),
};
const controls: Controls = {
  Button: props => <DialogButton {...props} />,
  Group: ({ flow, children, ...props }) => <Focusable {...props} flow-children={flow} focusWithinClassName="ll-focus-within">{children}</Focusable>,
  Search: ({ value, onChange }) => <TextField label="Search" value={value} onChange={event => onChange(event.target.value)} bShowClearAction />,
  Select: ({ value, options, onChange, disabled, label }) => <div className="ll-native-select"><span>{label}</span><Dropdown menuLabel={label} selectedOption={value} disabled={disabled} rgOptions={options.map(option => ({ data: option.value, label: option.label }))} onChange={option => onChange(String(option.data))} /></div>,
};
function LibraryRoute() { return <Library api={api} controls={controls} />; }
function openLibrary() { Navigation.Navigate(ROUTE); Navigation.CloseSideMenus(); }

export default definePlugin(() => {
  routerHook.addRoute(ROUTE, LibraryRoute, { exact: true });
  return {
    name: "Legion Library",
    titleView: <div className={staticClasses.Title}>Legion Library</div>,
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="13" rx="4"/><path d="M7 10v5m-2-2.5h4m7-1h.01m2 3h.01"/></svg>,
    content: <PanelSection title="Your unified home">
      <PanelSectionRow><ButtonItem layout="below" onClick={openLibrary}>Open Legion Library</ButtonItem></PanelSectionRow>
      <PanelSectionRow><div style={{ color: "#9faebf", fontSize: 12, lineHeight: 1.6 }}>Installed Steam apps and non-Steam shortcuts, organized your way. Open Setup & status to choose a profile or inspect discovery.</div></PanelSectionRow>
    </PanelSection>,
    onDismount() { routerHook.removeRoute(ROUTE); },
  };
});
