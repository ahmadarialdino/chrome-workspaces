# Workspaces for Chrome

A lightweight Chrome extension that brings a Safari-style workspace switcher to Google Chrome. Only the active workspace's normal tabs remain open; inactive workspaces are parked as saved URL lists.

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

## Install from a GitHub release

1. Download `workspaces-chrome.zip` from the latest GitHub release.
2. Unzip it.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the unzipped folder.
6. Pin **Workspaces** from Chrome's Extensions menu.

Chrome does not automatically update unpacked extensions. Download a newer release and replace the extension folder when an update is published, then click **Reload** on `chrome://extensions`.

## Use

- Enter a name and select **Add** to create a workspace.
- Select a workspace name to switch to it.
- Select **↗** beside a parked workspace to move the current tab there.
- Use the search box to find a workspace or saved tab.
- Select **⌄** to expand a workspace, then open, move, or remove individual tabs.
- Drag the coloured dot to reorder, or use **⋯ → Move up/down**.
- Use **⋯** to rename or delete a workspace.
- Select the clock-history button beside **Add** to recover closed tabs.
- Change the keyboard shortcut at `chrome://extensions/shortcuts`.

## Sync on another computer

Install the same release on each computer, sign into the same Google account in Chrome, and enable Chrome Sync. Workspace names, colours, order, and parked URLs synchronize. The active workspace and recovery archive remain device-specific.

## Important limitations

Chrome extensions cannot truly hide live tabs. Workspaces therefore records URLs and reloads pages when a parked workspace is restored. Unsaved forms, scroll position, media position, back/forward history, and other temporary page state can be lost.

The extension treats all normal unpinned tabs in the current window as part of the active workspace. Pinned tabs are shared. Chrome Sync storage is suitable for a moderate collection; extremely large tab sets or very long URLs can exceed its quota.

## Privacy

Workspaces has no analytics or external server. Workspace data uses Chrome's extension storage. Names and URLs are sent through Chrome Sync only when synchronization is enabled in Chrome.
