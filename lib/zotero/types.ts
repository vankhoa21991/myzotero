/** Zotero export JSON types (simplified) */

export interface ZoteroCreator {
  creatorType?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface ZoteroTag {
  tag: string;
  type?: number;
}

export interface ZoteroItem {
  key?: string;
  itemType: string;
  title?: string;
  url?: string;
  DOI?: string;
  abstractNote?: string;
  creators?: ZoteroCreator[];
  tags?: ZoteroTag[];
  collections?: string[];
  dateAdded?: string;
  dateModified?: string;
  [k: string]: unknown;
}

/** Export file can be array of items or object with items/key1/key2 */
export type ZoteroExport = ZoteroItem[] | { items?: ZoteroItem[]; [k: string]: unknown };
