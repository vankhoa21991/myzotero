export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface Creator {
  name: string;
  role?: string; // author, editor, etc.
}

export interface Item {
  id: string;
  title: string;
  url?: string;
  doi?: string;
  type: string; // journalArticle, book, etc.
  abstract?: string;
  dateAdded: number;
  dateModified: number;
  creators: Creator[];
  syncStatus: SyncStatus;
}

export interface Collection {
  id: string;
  name: string;
  parentId: string | null;
  dateAdded: number;
  dateModified?: number;
  syncStatus?: SyncStatus;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  syncStatus?: SyncStatus;
}

export interface Attachment {
  id: string;
  itemId: string;
  filename: string;
  contentType: string;
  /** Local: not set when synced; Supabase: storage path */
  storagePath?: string;
  size: number;
  dateAdded: number;
  dateModified?: number;
  syncStatus?: SyncStatus;
}

export type AnnotationType = 'highlight' | 'note' | 'rect';

export interface Annotation {
  id: string;
  attachmentId: string;
  type: AnnotationType;
  page: number;
  /** Normalized coordinates or text range for highlight */
  position: Record<string, unknown>;
  content?: string;
  color?: string;
  dateAdded: number;
  dateModified?: number;
  syncStatus?: SyncStatus;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  itemId: string;
  dateAdded: number;
  syncStatus?: SyncStatus;
}

export interface ItemTag {
  id: string;
  itemId: string;
  tagId: string;
  syncStatus?: SyncStatus;
}
