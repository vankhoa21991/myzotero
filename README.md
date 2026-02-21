# myzotero

Personal reference manager Chrome extension: save PDFs and URLs from the browser, organize with collections and tags, view and annotate PDFs, import from Zotero, and sync via Supabase.

## Development

```bash
pnpm install
pnpm run dev
```

Load the extension: open `chrome://extensions`, enable Developer mode, **Load unpacked**, select the `.output/chrome-mv3` folder.

## Build & package

```bash
pnpm run build    # output in .output/chrome-mv3
pnpm run zip      # produces .output/myzotero-<version>-chrome.zip for Chrome Web Store
```

## Install on other machines

- **Load unpacked**: Copy the repo, run `pnpm install && pnpm run build`, then load `.output/chrome-mv3` in Chrome.
- **Chrome Web Store (unlisted)**: Upload the zip from `pnpm run zip` to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole). Publish as **Unlisted** so only you can install via the direct link. Enable Supabase in Settings to sync across machines.