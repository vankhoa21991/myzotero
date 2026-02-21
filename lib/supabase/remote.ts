import type { SupabaseClient } from '@supabase/supabase-js';
import type { Item, Collection, Tag, Attachment, Annotation, CollectionItem, ItemTag } from '../types';

const BUCKET = 'pdfs';

function toRemoteItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    title: row.title as string,
    url: row.url as string | undefined,
    doi: row.doi as string | undefined,
    type: row.type as string,
    abstract: row.abstract as string | undefined,
    dateAdded: row.date_added as number,
    dateModified: row.date_modified as number,
    creators: (row.creators as Item['creators']) ?? [],
    syncStatus: (row.sync_status as Item['syncStatus']) ?? 'synced',
  };
}

function toRemoteCollection(row: Record<string, unknown>): Collection {
  return {
    id: row.id as string,
    name: row.name as string,
    parentId: (row.parent_id as string) ?? null,
    dateAdded: row.date_added as number,
    dateModified: row.date_modified as number | undefined,
    syncStatus: (row.sync_status as Collection['syncStatus']) ?? 'synced',
  };
}

function toRemoteTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string | undefined,
    syncStatus: (row.sync_status as Tag['syncStatus']) ?? 'synced',
  };
}

function toRemoteAttachment(row: Record<string, unknown>): Attachment {
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    filename: row.filename as string,
    contentType: row.content_type as string,
    storagePath: row.storage_path as string | undefined,
    size: row.size as number,
    dateAdded: row.date_added as number,
    dateModified: row.date_modified as number | undefined,
    syncStatus: (row.sync_status as Attachment['syncStatus']) ?? 'synced',
  };
}

function toRemoteAnnotation(row: Record<string, unknown>): Annotation {
  return {
    id: row.id as string,
    attachmentId: row.attachment_id as string,
    type: row.type as Annotation['type'],
    page: row.page as number,
    position: (row.position as Record<string, unknown>) ?? {},
    content: row.content as string | undefined,
    color: row.color as string | undefined,
    dateAdded: row.date_added as number,
    dateModified: row.date_modified as number | undefined,
    syncStatus: (row.sync_status as Annotation['syncStatus']) ?? 'synced',
  };
}

export async function fetchRemoteItems(supabase: SupabaseClient): Promise<Item[]> {
  const { data, error } = await supabase.from('items').select('*').order('date_added', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toRemoteItem);
}

export async function fetchRemoteCollections(supabase: SupabaseClient): Promise<Collection[]> {
  const { data, error } = await supabase.from('collections').select('*').order('date_added');
  if (error) throw error;
  return (data ?? []).map(toRemoteCollection);
}

export async function fetchRemoteTags(supabase: SupabaseClient): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(toRemoteTag);
}

export async function fetchRemoteAttachments(supabase: SupabaseClient): Promise<Attachment[]> {
  const { data, error } = await supabase.from('attachments').select('*').order('date_added');
  if (error) throw error;
  return (data ?? []).map(toRemoteAttachment);
}

export async function fetchRemoteAnnotations(supabase: SupabaseClient): Promise<Annotation[]> {
  const { data, error } = await supabase.from('annotations').select('*').order('date_added');
  if (error) throw error;
  return (data ?? []).map(toRemoteAnnotation);
}

export async function fetchRemoteCollectionItems(supabase: SupabaseClient): Promise<CollectionItem[]> {
  const { data, error } = await supabase.from('collection_items').select('*');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    collectionId: row.collection_id,
    itemId: row.item_id,
    dateAdded: row.date_added,
    syncStatus: row.sync_status ?? 'synced',
  }));
}

export async function fetchRemoteItemTags(supabase: SupabaseClient): Promise<ItemTag[]> {
  const { data, error } = await supabase.from('item_tags').select('*');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    itemId: row.item_id,
    tagId: row.tag_id,
    syncStatus: row.sync_status ?? 'synced',
  }));
}

function itemToRow(item: Item, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    title: item.title,
    url: item.url ?? null,
    doi: item.doi ?? null,
    type: item.type,
    abstract: item.abstract ?? null,
    date_added: item.dateAdded,
    date_modified: item.dateModified,
    creators: item.creators,
    sync_status: item.syncStatus ?? 'synced',
  };
}

export async function upsertRemoteItems(supabase: SupabaseClient, userId: string, items: Item[]): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map((i) => itemToRow(i, userId));
  const { error } = await supabase.from('items').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertRemoteCollections(supabase: SupabaseClient, userId: string, collections: Collection[]): Promise<void> {
  if (collections.length === 0) return;
  const rows = collections.map((c) => ({
    id: c.id,
    user_id: userId,
    name: c.name,
    parent_id: c.parentId ?? null,
    date_added: c.dateAdded,
    date_modified: c.dateModified ?? c.dateAdded,
    sync_status: c.syncStatus ?? 'synced',
  }));
  const { error } = await supabase.from('collections').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertRemoteTags(supabase: SupabaseClient, userId: string, tags: Tag[]): Promise<void> {
  if (tags.length === 0) return;
  const rows = tags.map((t) => ({
    id: t.id,
    user_id: userId,
    name: t.name,
    color: t.color ?? null,
    sync_status: t.syncStatus ?? 'synced',
  }));
  const { error } = await supabase.from('tags').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertRemoteAttachments(supabase: SupabaseClient, userId: string, attachments: Attachment[]): Promise<void> {
  if (attachments.length === 0) return;
  const rows = attachments.map((a) => ({
    id: a.id,
    user_id: userId,
    item_id: a.itemId,
    filename: a.filename,
    content_type: a.contentType,
    storage_path: a.storagePath ?? null,
    size: a.size,
    date_added: a.dateAdded,
    date_modified: a.dateModified ?? a.dateAdded,
    sync_status: a.syncStatus ?? 'synced',
  }));
  const { error } = await supabase.from('attachments').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertRemoteAnnotations(supabase: SupabaseClient, userId: string, annotations: Annotation[]): Promise<void> {
  if (annotations.length === 0) return;
  const rows = annotations.map((a) => ({
    id: a.id,
    user_id: userId,
    attachment_id: a.attachmentId,
    type: a.type,
    page: a.page,
    position: a.position,
    content: a.content ?? null,
    color: a.color ?? null,
    date_added: a.dateAdded,
    date_modified: a.dateModified ?? a.dateAdded,
    sync_status: a.syncStatus ?? 'synced',
  }));
  const { error } = await supabase.from('annotations').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertRemoteCollectionItems(supabase: SupabaseClient, userId: string, rows: CollectionItem[]): Promise<void> {
  if (rows.length === 0) return;
  const data = rows.map((r) => ({
    id: r.id,
    user_id: userId,
    collection_id: r.collectionId,
    item_id: r.itemId,
    date_added: r.dateAdded,
    sync_status: r.syncStatus ?? 'synced',
  }));
  const { error } = await supabase.from('collection_items').upsert(data, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertRemoteItemTags(supabase: SupabaseClient, userId: string, rows: ItemTag[]): Promise<void> {
  if (rows.length === 0) return;
  const data = rows.map((r) => ({
    id: r.id,
    user_id: userId,
    item_id: r.itemId,
    tag_id: r.tagId,
    sync_status: r.syncStatus ?? 'synced',
  }));
  const { error } = await supabase.from('item_tags').upsert(data, { onConflict: 'id' });
  if (error) throw error;
}

export async function uploadPdfToStorage(supabase: SupabaseClient, path: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true });
  if (error) throw error;
}

export async function downloadPdfFromStorage(supabase: SupabaseClient, path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  if (!data) throw new Error('No data');
  return data;
}
