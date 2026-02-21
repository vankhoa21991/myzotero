import React, { useEffect, useState } from 'react';
import type { Tag } from '../lib/types';
import {
  getAllTags,
  getItemTagIds,
  addTagToItem,
  removeTagFromItem,
  getOrCreateTag,
} from '../lib/db/repository';
import { cn } from '../lib/utils';
import { Tag as TagIcon, Plus, X } from 'lucide-react';

interface TagManagerProps {
  itemId: string | null;
  onTagsChange?: () => void;
  /** When set, show only tags that match this filter (for filtering list) */
  filterTagId?: string | null;
  onFilterTag?: (tagId: string | null) => void;
  refreshKey?: number;
}

export function TagManager({
  itemId,
  onTagsChange,
  filterTagId,
  onFilterTag,
  refreshKey = 0,
}: TagManagerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [itemTagIds, setItemTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    const tags = await getAllTags();
    setAllTags(tags);
    if (itemId) {
      const ids = await getItemTagIds(itemId);
      setItemTagIds(ids);
    }
  };

  useEffect(() => {
    load();
  }, [itemId, refreshKey]);

  const handleAddTag = async () => {
    const name = newTagName.trim();
    if (!name || !itemId) return;
    const tag = await getOrCreateTag(name);
    await addTagToItem(itemId, tag.id);
    setNewTagName('');
    setShowAdd(false);
    load();
    onTagsChange?.();
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!itemId) return;
    await removeTagFromItem(itemId, tagId);
    load();
    onTagsChange?.();
  };

  const tagById = (id: string) => allTags.find((t) => t.id === id);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tags</span>
        {onFilterTag && (
          <button
            type="button"
            className={cn(
              'text-xs px-2 py-0.5 rounded border',
              filterTagId === null
                ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
            onClick={() => onFilterTag(null)}
          >
            All
          </button>
        )}
        {allTags.map((tag) => {
          const isOnItem = itemId && itemTagIds.includes(tag.id);
          const isFilter = filterTagId === tag.id;
          return (
            <span
              key={tag.id}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border',
                isOnItem && 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700',
                isFilter && onFilterTag && 'ring-2 ring-offset-1 ring-blue-500',
              )}
            >
              {onFilterTag && (
                <button
                  type="button"
                  onClick={() => onFilterTag(isFilter ? null : tag.id)}
                  title={isFilter ? 'Clear filter' : 'Filter by tag'}
                >
                  <TagIcon className="w-3 h-3" />
                </button>
              )}
              <span>{tag.name}</span>
              {itemId && isOnItem && (
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  onClick={() => handleRemoveTag(tag.id)}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          );
        })}
        {itemId && (
          <>
            {showAdd ? (
              <span className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="New tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                    if (e.key === 'Escape') setShowAdd(false);
                  }}
                  className="w-24 h-6 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2"
                />
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  onClick={handleAddTag}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="w-3 h-3" />
                Add tag
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
