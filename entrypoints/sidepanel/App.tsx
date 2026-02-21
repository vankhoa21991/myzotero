import React, { useState, useEffect, useCallback } from 'react';
import { CollectionTree } from '../../components/CollectionTree';
import { ItemList } from '../../components/ItemList';
import { ItemDetail } from '../../components/ItemDetail';
import { TagManager } from '../../components/TagManager';
import { ImportDialog } from '../../components/ImportDialog';
import type { Item, Collection, Tag } from '../../lib/types';
import { getAllCollections, getAllTags } from '../../lib/db/repository';
import { Button } from '../../components/ui/button';

function getViewerUrl(attachmentId: string): string {
  const base = typeof browser !== 'undefined' ? browser.runtime.getURL('/viewer.html') : '';
  return `${base}?attachmentId=${encodeURIComponent(attachmentId)}`;
}

export default function SidepanelApp() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);

  const loadMeta = useCallback(async () => {
    const [cols, t] = await Promise.all([getAllCollections(), getAllTags()]);
    setCollections(cols);
    setTags(t);
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta, refreshKey]);

  const handleOpenPdf = (attachmentId: string) => {
    const url = getViewerUrl(attachmentId);
    if (typeof browser !== 'undefined') {
      browser.tabs.create({ url });
    }
  };

  const handleTagsChange = () => setRefreshKey((k) => k + 1);

  const collectionList = collections.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <header className="p-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">MyZotero</h1>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            Import
          </Button>
        </div>
        <div className="mt-1">
          <TagManager
            itemId={null}
            filterTagId={filterTagId}
            onFilterTag={setFilterTagId}
            refreshKey={refreshKey}
          />
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-40 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 overflow-hidden">
          <CollectionTree
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={setSelectedCollectionId}
            refreshKey={refreshKey}
          />
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          {selectedItem ? (
            <ItemDetail
              itemId={selectedItem.id}
              collections={collectionList}
              onClose={() => setSelectedItem(null)}
              onDeleted={() => {
                setSelectedItem(null);
                setRefreshKey((k) => k + 1);
              }}
              onTagsChange={handleTagsChange}
              refreshKey={refreshKey}
              onOpenPdf={handleOpenPdf}
            />
          ) : (
            <ItemList
              collectionId={selectedCollectionId}
              filterTagId={filterTagId}
              selectedItemId={null}
              onSelectItem={setSelectedItem}
              tags={tags}
              refreshKey={refreshKey}
            />
          )}
        </main>
      </div>
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
