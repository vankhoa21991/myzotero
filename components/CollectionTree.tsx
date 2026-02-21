import React, { useEffect, useState } from 'react';
import type { Collection } from '../lib/types';
import {
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} from '../lib/db/repository';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ConfirmDialog } from './ui/dialog';
import { cn } from '../lib/utils';
import { Folder, FolderOpen, ChevronRight, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

function buildTree(collections: Collection[], parentId: string | null): Collection[] {
  return collections.filter((c) => (c.parentId ?? null) === parentId);
}

interface CollectionTreeProps {
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  refreshKey?: number;
}

export function CollectionTree({
  selectedCollectionId,
  onSelectCollection,
  refreshKey = 0,
}: CollectionTreeProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Collection | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const load = async () => {
    const all = await getAllCollections();
    setCollections(all);
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createCollection({ name: newName.trim(), parentId: newParentId });
    setNewName('');
    setNewParentId(null);
    if (newParentId) setExpanded((prev) => new Set(prev).add(newParentId));
    load();
  };

  const handleRename = async () => {
    if (!editingId || !editName.trim()) return;
    await updateCollection(editingId, { name: editName.trim() });
    setEditingId(null);
    setEditName('');
    load();
  };

  const handleDelete = async (col: Collection) => {
    await deleteCollection(col.id);
    setDeleteConfirm(null);
    if (selectedCollectionId === col.id) onSelectCollection(null);
    load();
  };

  const renderNode = (parentId: string | null, depth: number) => {
    const children = buildTree(collections, parentId);
    return children.map((col) => {
      const childList = buildTree(collections, col.id);
      const hasChildren = childList.length > 0;
      const isExpanded = expanded.has(col.id);
      const isSelected = selectedCollectionId === col.id;
      const isEditing = editingId === col.id;

      return (
        <div key={col.id} className="select-none">
          <div
            style={{ paddingLeft: depth * 12 }}
            className={cn(
              'group flex items-center gap-1 py-1 pr-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800',
              isSelected && 'bg-gray-200 dark:bg-gray-700',
            )}
          >
            <button
              type="button"
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => hasChildren && toggleExpand(col.id)}
            >
              {hasChildren ? (
                <ChevronRight
                  className={cn('w-4 h-4 text-gray-500', isExpanded && 'rotate-90')}
                />
              ) : (
                <span className="w-4 inline-block" />
              )}
            </button>
            {isEditing ? (
              <div className="flex-1 flex items-center gap-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="h-7 text-sm flex-1"
                />
                <Button size="sm" onClick={handleRename}>
                  Save
                </Button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="flex-1 flex items-center gap-1 min-w-0 text-left"
                  onClick={() => onSelectCollection(col.id)}
                >
                  {isExpanded ? (
                    <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span className="truncate text-sm">{col.name}</span>
                </button>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => {
                      setEditingId(col.id);
                      setEditName(col.name);
                    }}
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => setDeleteConfirm(col)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div>{renderNode(col.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          Collections
        </span>
        <div className="flex items-center gap-1">
          {newParentId === null && (
            <>
              <Input
                placeholder="New collection"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="h-7 text-xs w-28"
              />
              <Button size="sm" onClick={handleAdd} title="Add collection">
                <Plus className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <button
          type="button"
          className={cn(
            'w-full flex items-center gap-2 py-1.5 px-2 rounded text-sm text-left',
            selectedCollectionId === null && 'bg-gray-200 dark:bg-gray-700',
          )}
          onClick={() => onSelectCollection(null)}
        >
          <Folder className="w-4 h-4 text-gray-500" />
          All items
        </button>
        {renderNode(null, 0)}
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete collection?"
        description={
          deleteConfirm
            ? `"${deleteConfirm.name}" and all nested collections will be removed. Items are not deleted.`
            : undefined
        }
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
