# Workspaces for Chrome

<p align="center"><img src="icons/workspaces.svg" width="88" alt="Workspaces logo"></p>

A lightweight Chrome extension that brings a Safari-style workspace switcher to Google Chrome. Only the active workspace's normal tabs remain open; inactive workspaces are parked as saved URL lists.

> **Current version:** 4.4.6 · **Status:** Active development · Manual installation required

## Features

- Switch between named workspaces from a compact toolbar popup.
- Park inactive workspaces so their tabs disappear from the tab bar.
- Move the current tab directly into another workspace.
- Search across workspace names and saved tab URLs.
- Expand any workspace to inspect, open, move, or remove individual tabs.
- Reorder workspaces by dragging or from the **⋯** menu.
- Rename and delete workspaces.
- Recover up to 30 genuinely closed tabs for 30 days.
- Synchronize workspace names, colours, order, and URLs through Chrome Sync.
- Open the menu with **Option + W** on macOS or **Alt + W** elsewhere.
- Share pinned tabs across every workspace.

## Install

1. Select **Code → Download ZIP** on this GitHub page.
2. Unzip the downloaded file.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the unzipped `chrome-workspaces-main` folder.
6. Pin **Workspaces** from Chrome's Extensions menu.

Chrome does not automatically update unpacked extensions. To update, download the repository again, replace the old folder, then select **Reload** on `chrome://extensions`.

## Use

- Enter a name and select **Add** to create a workspace.
- Select a workspace name to switch to it.
- Select <img src="icons/move-tab.svg" width="18" alt="Move tab"> beside a parked workspace to move the current tab there.
- Select the **search icon** to turn the workspace-name field into search mode, then type a workspace name or saved URL.
- Select <img src="icons/chevron-down.svg" width="18" alt="Expand"> to expand a workspace, then open, move, or remove individual tabs.
- Drag the coloured dot to reorder, or use <img src="icons/more.svg" width="18" alt="More menu"> **→ Move up/down**.
- Use <img src="icons/more.svg" width="18" alt="More menu"> to rename or delete a workspace.
- Select the clock-history button beside **Add** to recover closed tabs.
- Change the keyboard shortcut at `chrome://extensions/shortcuts`.

## Sync on another computer

Install the same release on each computer, sign into the same Google account in Chrome, and enable Chrome Sync. Workspace names, colours, order, and parked URLs synchronize. The active workspace and recovery archive remain device-specific.

## Important limitations

Chrome extensions cannot truly hide live tabs. Workspaces therefore records URLs and reloads pages when a parked workspace is restored. Unsaved forms, scroll position, media position, back/forward history, and other temporary page state can be lost.

The extension treats all normal unpinned tabs in the current window as part of the active workspace. Pinned tabs are shared. Chrome Sync storage is suitable for a moderate collection; extremely large tab sets or very long URLs can exceed its quota.

## Privacy

Workspaces has no analytics, advertising, or external server. Workspace data uses Chrome's extension storage. Names and URLs are sent through Chrome Sync only when synchronization is enabled in Chrome. See the [Privacy Policy](PRIVACY.md) for full details.

## Troubleshooting

- **Shortcut does not work:** Open `chrome://extensions/shortcuts` and assign a shortcut to **Open the Workspaces menu**.
- **Changes do not appear:** Open `chrome://extensions` and select **Reload** on Workspaces.
- **A Chrome page does not restore:** Chrome restricts extensions from reopening some internal `chrome://` pages. Workspaces replaces unsupported extension pages with a new tab.
- **Sync stops updating:** Chrome Sync has limited storage. Reduce very large workspace tab collections and try again.
- **Multiple Chrome windows:** The active workspace is device-wide. Workspaces currently manages the normal, unpinned tabs in the window where it is opened.

## Contributing

Bug reports, feature suggestions, and pull requests are welcome through [GitHub Issues](https://github.com/ahmadarialdino/chrome-workspaces/issues).

## Licence

Released under the [MIT Licence](LICENSE).
