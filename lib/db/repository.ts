import { db } from './schema';
import type {
  Item,
  Collection,
  Tag,
  Attachment,
  Annotation,
  CollectionItem,
  ItemTag,
} from '../types';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

// --- Items
export async function createItem(partial: Omit<Item, 'id' | 'dateAdded' | 'dateModified' | 'syncStatus'>): Promise<Item> {
  const now = Date.now();
  const item: Item = {
    ...partial,
    id: generateId(),
    dateAdded: now,
    dateModified: now,
    creators: partial.creators ?? [],
    syncStatus: 'pending',
  };
  await db.items.add(item);
  return item;
}

export async function getItem(id: string): Promise<Item | undefined> {
  return db.items.get(id);
}

export async function getAllItems(): Promise<Item[]> {
  return db.items.orderBy('dateAdded').reverse().toArray();
}

export async function updateItem(id: string, updates: Partial<Item>): Promise<void> {
  await db.items.update(id, { ...updates, dateModified: Date.now(), syncStatus: 'pending' });
}

export async function deleteItem(id: string): Promise<void> {
  await db.items.delete(id);
  await db.collectionItems.where('itemId').equals(id).delete();
  await db.itemTags.where('itemId').equals(id).delete();
  const attachments = await db.attachments.where('itemId').equals(id).toArray();
  for (const a of attachments) {
    await db.annotations.where('attachmentId').equals(a.id).delete();
    await db.attachments.delete(a.id);
  }
}

// --- Collections
export async function createCollection(partial: {
  name: string;
  parentId?: string | null;
}): Promise<Collection> {
  const now = Date.now();
  const col: Collection = {
    id: generateId(),
    name: partial.name,
    parentId: partial.parentId ?? null,
    dateAdded: now,
    dateModified: now,
    syncStatus: 'pending',
  };
  await db.collections.add(col);
  return col;
}

export async function getCollection(id: string): Promise<Collection | undefined> {
  return db.collections.get(id);
}

export async function getAllCollections(): Promise<Collection[]> {
  return db.collections.orderBy('dateAdded').toArray();
}

export async function getChildCollections(parentId: string | null): Promise<Collection[]> {
  return db.collections.where('parentId').equals(parentId ?? '').toArray();
}

export async function updateCollection(id: string, updates: Partial<Collection>): Promise<void> {
  await db.collections.update(id, { ...updates, dateModified: Date.now(), syncStatus: 'pending' });
}

export async function deleteCollection(id: string): Promise<void> {
  const children = await db.collections.where('parentId').equals(id).toArray();
  for (const c of children) await deleteCollection(c.id);
  await db.collectionItems.where('collectionId').equals(id).delete();
  await db.collections.delete(id);
}

// --- CollectionItem (assign item to collection)
export async function addItemToCollection(collectionId: string, itemId: string): Promise<CollectionItem> {
  const existing = await db.collectionItems
    .where('[collectionId+itemId]')
    .equals([collectionId, itemId])
    .first();
  if (existing) return existing;
  const now = Date.now();
  const row: CollectionItem = {
    id: generateId(),
    collectionId,
    itemId,
    dateAdded: now,
    syncStatus: 'pending',
  };
  await db.collectionItems.add(row);
  return row;
}

export async function removeItemFromCollection(collectionId: string, itemId: string): Promise<void> {
  await db.collectionItems.where('[collectionId+itemId]').equals([collectionId, itemId]).delete();
}

export async function getCollectionItemIds(collectionId: string): Promise<string[]> {
  const rows = await db.collectionItems.where('collectionId').equals(collectionId).toArray();
  return rows.map((r) => r.itemId);
}

export async function getItemCollectionIds(itemId: string): Promise<string[]> {
  const rows = await db.collectionItems.where('itemId').equals(itemId).toArray();
  return rows.map((r) => r.collectionId);
}

// --- Tags
export async function createTag(partial: { name: string; color?: string }): Promise<Tag> {
  let tag = await db.tags.where('name').equals(partial.name).first();
  if (tag) return tag;
  const now = Date.now();
  tag = {
    id: generateId(),
    name: partial.name,
    color: partial.color,
    syncStatus: 'pending',
  };
  await db.tags.add(tag);
  return tag;
}

export async function getOrCreateTag(name: string, color?: string): Promise<Tag> {
  let tag = await db.tags.where('name').equals(name).first();
  if (tag) return tag;
  return createTag({ name, color });
}

export async function getAllTags(): Promise<Tag[]> {
  return db.tags.orderBy('name').toArray();
}

export async function updateTag(id: string, updates: Partial<Tag>): Promise<void> {
  await db.tags.update(id, { ...updates, syncStatus: 'pending' });
}

// --- ItemTag
export async function addTagToItem(itemId: string, tagId: string): Promise<ItemTag> {
  const existing = await db.itemTags.where('[itemId+tagId]').equals([itemId, tagId]).first();
  if (existing) return existing;
  const row: ItemTag = {
    id: generateId(),
    itemId,
    tagId,
    syncStatus: 'pending',
  };
  await db.itemTags.add(row);
  return row;
}

export async function removeTagFromItem(itemId: string, tagId: string): Promise<void> {
  await db.itemTags.where('[itemId+tagId]').equals([itemId, tagId]).delete();
}

export async function getItemTagIds(itemId: string): Promise<string[]> {
  const rows = await db.itemTags.where('itemId').equals(itemId).toArray();
  return rows.map((r) => r.tagId);
}

// --- Attachments
export async function createAttachment(partial: {
  itemId: string;
  filename: string;
  contentType: string;
  size: number;
  storagePath?: string;
}): Promise<Attachment> {
  const now = Date.now();
  const att: Attachment = {
    id: generateId(),
    ...partial,
    dateAdded: now,
    dateModified: now,
    syncStatus: 'pending',
  };
  await db.attachments.add(att);
  return att;
}

export async function getAttachmentsByItemId(itemId: string): Promise<Attachment[]> {
  return db.attachments.where('itemId').equals(itemId).toArray();
}

export async function getAttachment(id: string): Promise<Attachment | undefined> {
  return db.attachments.get(id);
}

export async function saveAttachmentBlob(attachmentId: string, blob: Blob): Promise<void> {
  await db.attachmentBlobs.put({ attachmentId, blob });
}

export async function getAttachmentBlob(attachmentId: string): Promise<Blob | undefined> {
  const rec = await db.attachmentBlobs.get(attachmentId);
  return rec?.blob;
}

// --- Annotations
export async function createAnnotation(partial: Omit<Annotation, 'id' | 'dateAdded' | 'dateModified' | 'syncStatus'>): Promise<Annotation> {
  const now = Date.now();
  const ann: Annotation = {
    ...partial,
    id: generateId(),
    dateAdded: now,
    dateModified: now,
    syncStatus: 'pending',
  };
  await db.annotations.add(ann);
  return ann;
}

export async function getAnnotationsByAttachmentId(attachmentId: string): Promise<Annotation[]> {
  return db.annotations.where('attachmentId').equals(attachmentId).toArray();
}

export async function updateAnnotation(id: string, updates: Partial<Annotation>): Promise<void> {
  await db.annotations.update(id, { ...updates, dateModified: Date.now(), syncStatus: 'pending' });
}

export async function deleteAnnotation(id: string): Promise<void> {
  await db.annotations.delete(id);
}
