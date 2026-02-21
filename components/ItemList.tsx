import React, { useEffect, useState } from 'react';
import type { Item, Tag } from '../lib/types';
import {
  getAllItems,
  getCollectionItemIds,
  getItemTagIds,
} from '../lib/db/repository';
import { db } from '../lib/db/schema';
import { cn } from '../lib/utils';
import { FileText, Tag as TagIcon } from 'lucide-react';

interface ItemListProps {
  collectionId: string | null;
  filterTagId: string | null;
  selectedItemId: string | null;
  onSelectItem: (item: Item | null) => void;
  tags: Tag[];
  refreshKey?: number;
}

export function ItemList({
  collectionId,
  filterTagId,
  selectedItemId,
  onSelectItem,
  tags,
  refreshKey = 0,
}: ItemListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [itemTagIds, setItemTagIds] = useState<Record<string, string[]>>({});
  const [sortBy, setSortBy] = useState<'dateAdded' | 'title'>('dateAdded');

  const load = async () => {
    let list: Item[];
    if (collectionId) {
      const ids = await getCollectionItemIds(collectionId);
      const all = await db.items.where('id').anyOf(ids).toArray();
      list = all.sort((a, b) => b.dateAdded - a.dateAdded);
    } else {
      list = await getAllItems();
    }
    if (sortBy === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    setItems(list);
    const tagMap: Record<string, string[]> = {};
    for (const item of list) {
      tagMap[item.id] = await getItemTagIds(item.id);
    }
    setItemTagIds(tagMap);
  };

  useEffect(() => {
    load();
  }, [collectionId, refreshKey, sortBy]);

  const filteredItems = filterTagId
    ? items.filter((item) => (itemTagIds[item.id] ?? []).includes(filterTagId))
    : items;

  const getTagName = (tagId: string) => tags.find((t) => t.id === tagId)?.name ?? tagId;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          Items
        </span>
        <select
          className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'dateAdded' | 'title')}
        >
          <option value="dateAdded">Date added</option>
          <option value="title">Title</option>
        </select>
      </div>
      <ul className="flex-1 overflow-auto min-h-0 space-y-0.5">
        {filteredItems.map((item) => {
          const tagIds = itemTagIds[item.id] ?? [];
          const isSelected = selectedItemId === item.id;
          const creator = item.creators?.[0]?.name ?? '';
          const date = new Date(item.dateAdded).toLocaleDateString();

          return (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  'w-full text-left px-2 py-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-700',
                  isSelected && 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                )}
                onClick={() => onSelectItem(item)}
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.title || 'Untitled'}</div>
                    {creator && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {creator}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tagIds.slice(0, 3).map((tid) => (
                        <span
                          key={tid}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700"
                        >
                          <TagIcon className="w-3 h-3" />
                          {getTagName(tid)}
                        </span>
                      ))}
                      {tagIds.length > 3 && (
                        <span className="text-xs text-gray-400">+{tagIds.length - 3}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{date}</div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {filteredItems.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          No items yet. Save a page from the popup or import from Zotero.
        </div>
      )}
    </div>
  );
}
