# MyZotero

A personal reference manager built as a Chrome extension. Save papers, PDFs, and web pages from the browser; organize with collections and tags; view and annotate PDFs; import from Zotero; sync across machines via Supabase.

---

## Quick start

```bash
pnpm install
pnpm run build        # build to .output/chrome-mv3
pnpm run dev          # build + watch mode
pnpm run zip          # package for Chrome Web Store
```

Load the extension: `chrome://extensions` → Developer mode → **Load unpacked** → select `.output/chrome-mv3`.

### Install on other machines

- **Load unpacked**: pull the repo, run `pnpm install && pnpm run build`, load the output folder.
- **Chrome Web Store (unlisted)**: run `pnpm run zip`, upload the zip to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole), publish as **Unlisted**. Install on any machine from the private link. No build needed on other machines.

---

## Architecture

The extension is a **Manifest V3** Chrome extension built with [WXT](https://wxt.dev/) (Vite-based), React, TypeScript, and Tailwind CSS. It is **local-first**: all data is written to IndexedDB immediately, then synced to Supabase in the background when configured.

```
Chrome Extension
├── Popup              Quick-save current tab
├── Side Panel         Full library UI (collections, items, tags)
├── Viewer             Full-page PDF viewer with annotations
├── Content Script     Metadata extraction from pages
├── Background SW      Message broker, periodic sync alarm
└── Options Page       Supabase configuration and sign-in

Storage Layer
├── IndexedDB (Dexie)  Local-first, always available offline
├── Supabase Postgres  Remote metadata (items, collections, tags…)
└── Supabase Storage   Remote PDF file storage
```

### Data flow

```
User action → write to IndexedDB (immediate)
           → mark record syncStatus = 'pending'

Background alarm (every 15 min, when Supabase mode enabled)
  → pull all remote records → put into IndexedDB (merge)
  → push all local 'pending' records to Supabase
  → mark records syncStatus = 'synced'
```

### Conflict resolution

Last-write-wins using `dateModified` timestamp. No conflict UI yet.

---

## Project structure

```
myzotero/
├── entrypoints/
│   ├── background.ts          Service worker: messaging, sync alarm
│   ├── content.ts             Content script: metadata extraction
│   ├── popup/                 Quick-save popup (React)
│   ├── sidepanel/             Library browser (React)
│   ├── viewer/                Full-page PDF viewer (React)
│   └── options/               Settings page (React)
├── components/
│   ├── ui/                    Base UI: Button, Input, Dialog
│   ├── CollectionTree.tsx     Nested folder tree
│   ├── ItemList.tsx           Sortable item list with tag filter
│   ├── ItemDetail.tsx         Metadata editor, collections, tags
│   ├── PdfViewer.tsx          PDF.js viewer with annotation overlay
│   ├── TagManager.tsx         Tag creation, assignment, filter
│   └── ImportDialog.tsx       Zotero JSON import dialog
├── lib/
│   ├── db/
│   │   ├── schema.ts          Dexie v1-v3 schema definitions
│   │   ├── repository.ts      CRUD operations for all entities
│   │   └── sync.ts            Bidirectional sync engine
│   ├── supabase/
│   │   ├── client.ts          Supabase client with sync storage adapter
│   │   ├── remote.ts          Remote fetch / upsert operations
│   │   └── migrations/
│   │       └── 001_initial.sql  Full Postgres schema with RLS
│   ├── metadata/
│   │   ├── extractors.ts      Page metadata extraction (DOI, OG, citation)
│   │   └── crossref.ts        CrossRef API client (DOI → full metadata)
│   ├── zotero/
│   │   ├── types.ts           Zotero export type definitions
│   │   ├── importer.ts        Parse Zotero JSON export
│   │   └── applyImport.ts     Write parsed import into IndexedDB
│   ├── pdf/
│   │   └── annotations.ts     Annotation position types
│   ├── types.ts               Shared TypeScript types
│   └── utils.ts               cn() utility (clsx + tailwind-merge)
├── assets/
│   └── globals.css            Tailwind directives
├── public/
│   ├── pdf.worker.min.mjs     PDF.js worker (copied at prebuild)
│   └── icon-{16,32,48,128}.png
├── wxt.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Data model

All entities are stored in both **IndexedDB** (local) and **Supabase** (remote, when enabled). Every record carries a `syncStatus: 'synced' | 'pending' | 'conflict'` field.

| Entity | Key fields |
|---|---|
| Item | id, title, url, doi?, type, abstract?, creators[], dateAdded, dateModified, syncStatus |
| Collection | id, name, parentId, dateAdded |
| Tag | id, name, color? |
| Attachment | id, itemId, filename, contentType, storagePath?, size |
| Annotation | id, attachmentId, type (highlight/note/rect), page, position, content?, color? |
| CollectionItem | collectionId + itemId (junction) |
| ItemTag | itemId + tagId (junction) |

IndexedDB schema version history:
- **v1**: base tables
- **v2**: `attachmentBlobs` table (local PDF blob storage)
- **v3**: `syncStatus` index added to all tables

---

## Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run `lib/supabase/migrations/001_initial.sql` in the SQL editor.
3. Create storage bucket `pdfs` (private) via Storage → New bucket.
4. Create a user in Authentication → Users → Add user.
5. In the extension Options page: paste Project URL + Anon key → Save → Sign in → set mode to **Supabase sync**.

---

## Known issues

| Issue | Notes |
|---|---|
| DOI field shown by default in popup | Should be collapsed / optional |
| UI uses minimal unstyled components | Needs a proper design pass |
| Sync conflict resolution | Last-write-wins only, no conflict UI |
| PDF blob saving | Viewer works from URL; local blob attach not yet in UI |
| PDF text highlight | Add note / rect tools exist; real mouse-selection highlight not wired |
| Web page annotation | No highlight or comment on live web pages yet |
| Session expiry | User must re-sign-in manually in Options when session expires |
| `chrome://` URL saving | Saves tab title/URL only, no metadata extraction possible |

---

## Planned improvements

### UI / UX
- [ ] Full design pass: proper spacing, typography, color system (consider shadcn/ui components fully)
- [ ] Dark/light mode toggle
- [ ] Side panel: split-pane layout (collection tree + item list always visible)
- [ ] Item list: compact vs expanded row view
- [ ] Search bar with full-text search across titles, authors, abstracts
- [ ] Keyboard shortcuts (save page, open side panel, next/prev item)
- [ ] Drag-and-drop items into collections
- [ ] Onboarding flow for first-time setup (Supabase config wizard)

### Popup
- [ ] Hide DOI field by default; show only when detected automatically
- [ ] Show detected authors inline
- [ ] One-click save with no form (auto-fill from page metadata)
- [ ] "Save and attach PDF" when on a PDF URL

### PDF annotations
- [ ] "Download & attach PDF" button in ItemDetail (fetch from item URL, store blob locally)
- [ ] Real text highlight in PDF: mouse selection → create highlight annotation with color picker
- [ ] Inline comment / note anchored to highlighted text in PDF
- [ ] Annotation sidebar: list all highlights and notes for a document, click to jump to page
- [ ] Annotation editing: edit note text inline in the sidebar
- [ ] Annotation export: copy all highlights + notes as Markdown or plain text
- [ ] PDF upload via drag-and-drop or file picker in ItemDetail

### Web page (URL) annotations
- [ ] Content script overlay: highlight any text on a saved web page directly in the browser
- [ ] Right-click context menu → "Highlight" or "Add comment" on selected text
- [ ] Highlight persistence: re-inject highlights when the user revisits the page
- [ ] Side panel shows all highlights and comments for the current page
- [ ] Comment threads: reply to an existing annotation
- [ ] Export web highlights as Markdown (like Readwise / Hypothesis)

### Sync & storage
- [ ] Conflict resolution UI (show conflict, pick winner)
- [ ] Auto-refresh session token (avoid manual re-sign-in)
- [ ] Selective sync (choose which collections to sync)
- [ ] PDF sync to Supabase Storage (upload blob, download on other machines)
- [ ] Export library to Zotero JSON / BibTeX

### Metadata
- [ ] Auto-fetch metadata for any saved URL via OpenGraph + CrossRef
- [ ] Semantic Scholar / OpenAlex API as fallback when CrossRef has no result
- [ ] Detect and suggest duplicate items when saving

### Distribution
- [ ] GitHub Actions CI: auto-build and upload to Chrome Web Store on git tag
- [ ] Firefox support (WXT already supports it; minor manifest changes needed)