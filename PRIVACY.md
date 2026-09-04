# Privacy Policy

**Last updated: 4 September 2026**

Workspaces is a Chrome extension for organising browser tabs into named workspaces.

## Data the extension handles

To provide its workspace features, Workspaces stores:

- Workspace names, colours, order, and saved tab URLs.
- The active workspace identifier on the current device.
- A device-local list of recently closed tabs, including their titles, URLs, workspace names, and closing times.
- Temporary tab information in Chrome's session storage while the browser is running.

## How data is used

This information is used only to save, switch, search, restore, and synchronise workspaces and tabs. Workspaces does not use the information for advertising, profiling, analytics, or any unrelated purpose.

## Storage and synchronisation

Workspace names, colours, order, and saved URLs are stored with `chrome.storage.sync`. When Chrome Sync is enabled, Google may synchronise that data between Chrome browsers signed into the same Google account.

The active workspace, recovery archive, and temporary tab cache use Chrome's local or session storage and are not intentionally synchronised by Workspaces.

## Data sharing

Workspaces has no developer-operated server and does not sell, transmit, or disclose browsing data to the developer or to third parties. Data handled by Chrome Sync is subject to Google's applicable privacy terms.

## Permissions

- **Tabs:** Reads tab titles and URLs and creates, updates, activates, or closes tabs to provide workspace management.
- **Tab groups:** Avoids interfering with tabs that belong to Chrome's native tab groups and migrates data from earlier versions.
- **Storage:** Saves workspace settings, URLs, device state, and the recently closed archive.

## Data retention and deletion

Recently closed entries are retained locally for up to 30 days, with a maximum of 30 entries. Workspace data remains until the user removes it, clears the extension's storage, or uninstalls the extension. Synced data can also be managed through the user's Chrome Sync settings.

## Contact

For privacy questions, open an issue at <https://github.com/ahmadarialdino/chrome-workspaces/issues>.
