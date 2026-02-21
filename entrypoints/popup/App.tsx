import React, { useEffect, useState } from 'react';
import type { Creator } from '../../lib/types';
import { createItem } from '../../lib/db/repository';
import { fetchMetadataByDoi } from '../../lib/metadata/crossref';
import type { PageMetadata } from '../../lib/metadata/extractors';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function PopupApp() {
  const [meta, setMeta] = useState<PageMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [doi, setDoi] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await browser.runtime.sendMessage({ type: 'getPageMetadata' });
        if (response?.error) {
          setError(response.error);
          setMeta(null);
          return;
        }
        const pageMeta = response as PageMetadata;
        setMeta(pageMeta);
        setTitle(pageMeta.title);
        setDoi(pageMeta.doi ?? '');

        if (pageMeta.doi) {
          const crossref = await fetchMetadataByDoi(pageMeta.doi);
          if (crossref) {
            if (crossref.title) setTitle(crossref.title);
          }
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const authors: Creator[] =
    meta?.authors?.map((name) => ({ name, role: 'author' })) ?? [];
  const displayUrl = meta?.url ?? '';

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createItem({
        title: title.trim(),
        url: displayUrl || undefined,
        doi: doi.trim() || undefined,
        type: meta?.isPdf ? 'document' : 'webpage',
        abstract: meta?.description,
        creators: authors,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-[320px] min-h-[200px] p-4 bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">Reading page...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-[320px] min-h-[200px] p-4 bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <p className="text-xs text-gray-500 mt-2">You can still add manually from the side panel.</p>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="w-[320px] min-h-[200px] p-4 bg-gray-50 dark:bg-gray-900">
        <p className="text-sm font-medium text-green-600 dark:text-green-400">Saved to library</p>
        <Button
          className="mt-2"
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              const w = await browser.windows.getCurrent();
              if (w?.id != null && (browser as { sidePanel?: { open: (o: { windowId: number }) => Promise<void> } }).sidePanel?.open)
                await (browser as { sidePanel: { open: (o: { windowId: number }) => Promise<void> } }).sidePanel.open({ windowId: w.id });
            } catch {
              // ignore
            }
          }}
        >
          Open library
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[320px] min-h-[200px] p-4 bg-gray-50 dark:bg-gray-900 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Save to MyZotero</h2>
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-0.5 w-full"
          placeholder="Title"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">DOI</label>
        <Input
          value={doi}
          onChange={(e) => setDoi(e.target.value)}
          className="mt-0.5 w-full"
          placeholder="Optional DOI"
        />
      </div>
      {displayUrl && (
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={displayUrl}>
          {displayUrl}
        </p>
      )}
      {meta?.isPdf && (
        <p className="text-xs text-amber-600 dark:text-amber-400">PDF page — saved as reference; open library to attach file.</p>
      )}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
