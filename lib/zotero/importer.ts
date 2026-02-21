import type { ZoteroExport, ZoteroItem, ZoteroCreator } from './types';
import type { Item, Creator, Tag, Collection } from '../types';

function zoteroCreatorToCreator(c: ZoteroCreator): Creator {
  const name =
    [c.firstName, c.lastName].filter(Boolean).join(' ').trim() ||
    (c.name ?? '');
  return { name: name || 'Unknown', role: c.creatorType };
}

function zoteroItemToItem(z: ZoteroItem, id: string): Item {
  const now = Date.now();
  const creators: Creator[] = (z.creators ?? []).map(zoteroCreatorToCreator);
  return {
    id,
    title: z.title?.trim() ?? 'Untitled',
    url: z.url ?? undefined,
    doi: z.DOI ?? undefined,
    type: z.itemType ?? 'journalArticle',
    abstract: z.abstractNote ?? undefined,
    dateAdded: z.dateAdded ? new Date(z.dateAdded).getTime() : now,
    dateModified: z.dateModified ? new Date(z.dateModified).getTime() : now,
    creators,
    syncStatus: 'pending',
  };
}

export interface ImportResult {
  items: Item[];
  collections: Collection[];
  tags: Tag[];
  collectionItemIds: Map<string, string[]>; // collectionId -> itemIds
  itemTagNames: Map<string, string[]>; // itemId -> tag names
}

export function parseZoteroExport(data: ZoteroExport): ImportResult {
  let rawItems: ZoteroItem[] = [];
  const collections: Collection[] = [];
  const collectionKeys = new Map<string, string>(); // zotero key -> our id
  const now = Date.now();
  let idCounter = 0;
  const genId = () => `import-${now}-${++idCounter}`;

  if (Array.isArray(data)) {
    rawItems = data;
  } else if (data && typeof data === 'object' && Array.isArray((data as { items?: ZoteroItem[] }).items)) {
    rawItems = (data as { items: ZoteroItem[] }).items;
    const colls = (data as { collections?: Array<{ key: string; name: string }> }).collections;
    if (Array.isArray(colls)) {
      for (const c of colls) {
        const id = genId();
        collectionKeys.set(c.key, id);
        collections.push({
          id,
          name: c.name ?? 'Collection',
          parentId: null,
          dateAdded: now,
          dateModified: now,
          syncStatus: 'pending',
        });
      }
    }
  }

  const items: Item[] = [];
  const collectionItemIds = new Map<string, string[]>();
  const itemTagNames = new Map<string, string[]>();
  const tagSet = new Set<string>();
  const keyToOurId = new Map<string, string>();

  for (const z of rawItems) {
    const id = genId();
    keyToOurId.set(z.key ?? id, id);
    items.push(zoteroItemToItem(z, id));
    if (z.tags?.length) {
      const names = z.tags.map((t) => t.tag).filter(Boolean);
      itemTagNames.set(id, names);
      names.forEach((n) => tagSet.add(n));
    }
    if (z.collections?.length && z.key) {
      const ourId = keyToOurId.get(z.key) ?? id;
      for (const collKey of z.collections) {
        const collId = collectionKeys.get(collKey);
        if (collId) {
          const list = collectionItemIds.get(collId) ?? [];
          list.push(ourId);
          collectionItemIds.set(collId, list);
        }
      }
    }
  }

  const tags: Tag[] = Array.from(tagSet).map((name) => ({
    id: genId(),
    name,
    syncStatus: 'pending' as const,
  }));

  return {
    items,
    collections,
    tags,
    collectionItemIds,
    itemTagNames,
  };
}
