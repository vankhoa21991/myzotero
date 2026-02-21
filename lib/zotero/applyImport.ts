import { db } from '../db/schema';
import { getOrCreateTag } from '../db/repository';
import type { ImportResult } from './importer';

export async function applyImport(result: ImportResult): Promise<void> {
  const { items, collections, collectionItemIds, itemTagNames } = result;

  await db.transaction(
    'rw',
    [db.items, db.collections, db.tags, db.collectionItems, db.itemTags],
    async () => {
      for (const item of items) await db.items.put(item);
      for (const col of collections) await db.collections.put(col);

      for (const [itemId, names] of itemTagNames) {
        for (const name of names) {
          const tag = await getOrCreateTag(name);
          const existing = await db.itemTags.where('[itemId+tagId]').equals([itemId, tag.id]).first();
          if (!existing) {
            await db.itemTags.add({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
              itemId,
              tagId: tag.id,
              syncStatus: 'pending',
            });
          }
        }
      }

      for (const [collectionId, itemIds] of collectionItemIds) {
        for (const itemId of itemIds) {
          const existing = await db.collectionItems
            .where('[collectionId+itemId]')
            .equals([collectionId, itemId])
            .first();
          if (!existing) {
            await db.collectionItems.add({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
              collectionId,
              itemId,
              dateAdded: Date.now(),
              syncStatus: 'pending',
            });
          }
        }
      }
    },
  );
}
