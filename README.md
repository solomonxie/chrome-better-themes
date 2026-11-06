# Better Themes (Chrome extension)

Calm, focused tweaks for the work sites you open every day. One click in the toolbar
dropdown switches between themes, or back to the site as it ships.

## Sites
- **Jira** (`*.atlassian.net`), issue pages (`/browse/KEY-123` or `?selectedIssue=KEY-123`).
  The page stays as Jira draws it, with a few tweaks:
  - the left sidebar starts collapsed; Jira's own sidebar button (top left) still opens it
  - the right details pane is hidden; the small tab on the right edge brings it back
  - clicking the title or the description no longer opens the editor (links still work); an **Edit** button by the Description heading opens Jira's editor
  - the title and the description have no hover highlight
  - subtask and linked item tables are read-only: no hover, inline edit, status change or drag to reorder; issue links still open
  - the empty "Linked work items" prompt and the "Agents" (Start work) block are removed
  - a plain click on a link to another issue opens it in the same tab (Cmd/Ctrl/middle click still open a new one)
  - Rovo is removed: the "Ask Rovo" popup on text selection, the top-bar button and the chat button

## Themes
Each site lists its own themes in the dropdown, plus **Original** (the site unchanged).
Jira has one, **Focus**. The choice is saved per site and synced with your Chrome profile.

## Install
1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** → choose the `extension/` folder.

## Use
- Click the toolbar icon to pick a theme or switch it off.
- `Alt+Shift+T` cycles themes (including Original), `Alt+Shift+O` toggles the original page
  (change them in `chrome://extensions/shortcuts`).

## Adding a site
Add `extension/sites/<site>/<site>.js` and `.css`, register the module with
`BT.register({ site, label, themes, isActive, mount, unmount })` (see `extension/core/themes.js`),
and add a `content_scripts` entry plus host permission in `manifest.json`.
