import React, { useEffect, useState } from 'react';
import type { Item, Attachment } from '../lib/types';
import {
  getItem,
  updateItem,
  deleteItem,
  getAttachmentsByItemId,
  getItemCollectionIds,
  addItemToCollection,
  removeItemFromCollection,
} from '../lib/db/repository';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ConfirmDialog } from './ui/dialog';
import { TagManager } from './TagManager';
import { cn } from '../lib/utils';
import { ExternalLink, Trash2, FileText } from 'lucide-react';

interface ItemDetailProps {
  itemId: string | null;
  collections: { id: string; name: string }[];
  onClose: () => void;
  onDeleted: () => void;
  onTagsChange?: () => void;
  refreshKey?: number;
  onOpenPdf?: (attachmentId: string) => void;
}

export function ItemDetail({
  itemId,
  collections,
  onClose,
  onDeleted,
  onTagsChange,
  refreshKey = 0,
  onOpenPdf,
}: ItemDetailProps) {
  const [item, setItem] = useState<Item | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [itemCollectionIds, setItemCollectionIds] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const load = async () => {
    if (!itemId) {
      setItem(null);
      setAttachments([]);
      setItemCollectionIds([]);
      return;
    }
    const i = await getItem(itemId);
    setItem(i ?? null);
    if (i) {
      const atts = await getAttachmentsByItemId(itemId);
      setAttachments(atts);
      const cids = await getItemCollectionIds(itemId);
      setItemCollectionIds(cids);
    }
  };

  useEffect(() => {
    load();
  }, [itemId, refreshKey]);

  const handleUpdate = async (updates: Partial<Item>) => {
    if (!itemId) return;
    await updateItem(itemId, updates);
    setItem((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleDelete = async () => {
    if (!itemId) return;
    await deleteItem(itemId);
    setDeleteConfirm(false);
    onDeleted();
    onClose();
  };

  const toggleCollection = async (collectionId: string) => {
    if (!itemId) return;
    if (itemCollectionIds.includes(collectionId)) {
      await removeItemFromCollection(collectionId, itemId);
    } else {
      await addItemToCollection(collectionId, itemId);
    }
    const cids = await getItemCollectionIds(itemId);
    setItemCollectionIds(cids);
  };

  if (!item) {
    return (
      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
        Select an item or add one from the popup.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold truncate flex-1">{item.title || 'Untitled'}</h2>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteConfirm(true)}
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-4 flex-1 min-h-0">
        {editing ? (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">Title</label>
            <Input
              value={item.title}
              onChange={(e) => setItem((p) => (p ? { ...p, title: e.target.value } : null))}
              onBlur={() => handleUpdate({ title: item.title })}
            />
            <label className="text-xs font-medium text-gray-500">URL</label>
            <Input
              value={item.url ?? ''}
              onChange={(e) => setItem((p) => (p ? { ...p, url: e.target.value || undefined } : null))}
              onBlur={() => handleUpdate({ url: item.url })}
            />
            <label className="text-xs font-medium text-gray-500">DOI</label>
            <Input
              value={item.doi ?? ''}
              onChange={(e) => setItem((p) => (p ? { ...p, doi: e.target.value || undefined } : null))}
              onBlur={() => handleUpdate({ doi: item.doi })}
            />
            <Button size="sm" onClick={() => setEditing(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Title</span>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
            <p className="text-sm">{item.title || '—'}</p>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open URL
              </a>
            )}
            {item.doi && (
              <p className="text-xs text-gray-500">
                DOI: <span className="font-mono">{item.doi}</span>
              </p>
            )}
            {item.creators?.length > 0 && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {item.creators.map((c) => c.name).join(', ')}
              </p>
            )}
          </div>
        )}

        <div>
          <span className="text-xs font-medium text-gray-500">Collections</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {collections.map((col) => {
              const isIn = itemCollectionIds.includes(col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  className={cn(
                    'text-xs px-2 py-0.5 rounded border',
                    isIn
                      ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}
                  onClick={() => toggleCollection(col.id)}
                >
                  {col.name} {isIn ? '✓' : '+'}
                </button>
              );
            })}
          </div>
        </div>

        <TagManager itemId={item.id} onTagsChange={onTagsChange} refreshKey={refreshKey} />

        {attachments.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-500">Attachments</span>
            <ul className="mt-1 space-y-1">
              {attachments.map((att) => (
                <li key={att.id}>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => onOpenPdf?.(att.id)}
                  >
                    <FileText className="w-4 h-4" />
                    {att.filename}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Delete item?"
        description="This will remove the item and its attachments and annotations. This cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
