import Dexie, { type Table } from 'dexie';
import type {
  Item,
  Collection,
  Tag,
  Attachment,
  Annotation,
  CollectionItem,
  ItemTag,
} from '../types';

const DB_NAME = 'myzotero-db';

export interface AttachmentBlobRecord {
  attachmentId: string;
  blob: Blob;
}

export class MyZoteroDB extends Dexie {
  items!: Table<Item, string>;
  collections!: Table<Collection, string>;
  tags!: Table<Tag, string>;
  attachments!: Table<Attachment, string>;
  annotations!: Table<Annotation, string>;
  collectionItems!: Table<CollectionItem, string>;
  itemTags!: Table<ItemTag, string>;
  attachmentBlobs!: Table<AttachmentBlobRecord, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      items: 'id, dateAdded, dateModified, doi, *creators.name',
      collections: 'id, parentId, dateAdded',
      tags: 'id, name',
      attachments: 'id, itemId, dateAdded',
      annotations: 'id, attachmentId, page',
      collectionItems: 'id, collectionId, itemId, [collectionId+itemId]',
      itemTags: 'id, itemId, tagId, [itemId+tagId]',
    });
    this.version(2).stores({
      attachmentBlobs: 'attachmentId',
    });
  }
}

export const db = new MyZoteroDB();
