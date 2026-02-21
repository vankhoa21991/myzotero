import { db } from './schema';
import { getSupabaseClient } from '../supabase/client';
import {
  fetchRemoteItems,
  fetchRemoteCollections,
  fetchRemoteTags,
  fetchRemoteAttachments,
  fetchRemoteAnnotations,
  fetchRemoteCollectionItems,
  fetchRemoteItemTags,
  upsertRemoteItems,
  upsertRemoteCollections,
  upsertRemoteTags,
  upsertRemoteAttachments,
  upsertRemoteAnnotations,
  upsertRemoteCollectionItems,
  upsertRemoteItemTags,
} from '../supabase/remote';

const SYNC_MODE_KEY = 'myzotero_sync_mode';

export async function getSyncMode(): Promise<'local' | 'supabase'> {
  const o = await browser.storage.local.get(SYNC_MODE_KEY);
  return (o[SYNC_MODE_KEY] as 'local' | 'supabase') ?? 'local';
}

export async function setSyncMode(mode: 'local' | 'supabase'): Promise<void> {
  await browser.storage.local.set({ [SYNC_MODE_KEY]: mode });
}

export async function pullFromRemote(): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const [
    remoteItems,
    remoteCollections,
    remoteTags,
    remoteAttachments,
    remoteAnnotations,
    remoteCollectionItems,
    remoteItemTags,
  ] = await Promise.all([
    fetchRemoteItems(supabase),
    fetchRemoteCollections(supabase),
    fetchRemoteTags(supabase),
    fetchRemoteAttachments(supabase),
    fetchRemoteAnnotations(supabase),
    fetchRemoteCollectionItems(supabase),
    fetchRemoteItemTags(supabase),
  ]);

  await db.transaction('rw', [db.items, db.collections, db.tags, db.attachments, db.annotations, db.collectionItems, db.itemTags], async () => {
    for (const item of remoteItems) await db.items.put(item);
    for (const col of remoteCollections) await db.collections.put(col);
    for (const tag of remoteTags) await db.tags.put(tag);
    for (const att of remoteAttachments) await db.attachments.put(att);
    for (const ann of remoteAnnotations) await db.annotations.put(ann);
    for (const row of remoteCollectionItems) await db.collectionItems.put(row);
    for (const row of remoteItemTags) await db.itemTags.put(row);
  });
}

export async function pushPendingToRemote(): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const [items, collections, tags] = await Promise.all([
    db.items.where('syncStatus').equals('pending').toArray(),
    db.collections.where('syncStatus').equals('pending').toArray(),
    db.tags.where('syncStatus').equals('pending').toArray(),
  ]);

  const pendingAttachments = await db.attachments.where('syncStatus').equals('pending').toArray();
  const pendingAnnotations = await db.annotations.where('syncStatus').equals('pending').toArray();
  const pendingCollectionItems = await db.collectionItems.where('syncStatus').equals('pending').toArray();
  const pendingItemTags = await db.itemTags.where('syncStatus').equals('pending').toArray();

  await upsertRemoteItems(supabase, user.id, items);
  await upsertRemoteCollections(supabase, user.id, collections);
  await upsertRemoteTags(supabase, user.id, tags);
  await upsertRemoteAttachments(supabase, user.id, pendingAttachments);
  await upsertRemoteAnnotations(supabase, user.id, pendingAnnotations);
  await upsertRemoteCollectionItems(supabase, user.id, pendingCollectionItems);
  await upsertRemoteItemTags(supabase, user.id, pendingItemTags);

  await db.transaction('rw', [db.items, db.collections, db.tags, db.attachments, db.annotations, db.collectionItems, db.itemTags], async () => {
    for (const item of items) await db.items.update(item.id, { syncStatus: 'synced' });
    for (const col of collections) await db.collections.update(col.id, { syncStatus: 'synced' });
    for (const tag of tags) await db.tags.update(tag.id, { syncStatus: 'synced' });
    for (const a of pendingAttachments) await db.attachments.update(a.id, { syncStatus: 'synced' });
    for (const a of pendingAnnotations) await db.annotations.update(a.id, { syncStatus: 'synced' });
    for (const r of pendingCollectionItems) await db.collectionItems.update(r.id, { syncStatus: 'synced' });
    for (const r of pendingItemTags) await db.itemTags.update(r.id, { syncStatus: 'synced' });
  });
}

export async function runSync(): Promise<{ error?: string }> {
  if ((await getSyncMode()) !== 'supabase') return {};
  try {
    await pullFromRemote();
    await pushPendingToRemote();
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}
