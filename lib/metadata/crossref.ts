/**
 * Fetch full metadata from CrossRef API by DOI.
 */

export interface CrossRefAuthor {
  given?: string;
  family?: string;
  name?: string;
}

export interface CrossRefMessage {
  title?: string[];
  author?: CrossRefAuthor[];
  published?: { 'date-parts'?: number[][] };
  'container-title'?: string[];
  DOI?: string;
  abstract?: string;
  type?: string;
}

export interface CrossRefResponse {
  message?: CrossRefMessage;
}

export async function fetchMetadataByDoi(doi: string): Promise<{
  title: string;
  authors: { name: string }[];
  year?: number;
  containerTitle?: string;
  abstract?: string;
  type?: string;
} | null> {
  const cleanDoi = doi.trim().replace(/^https?:\/\/doi\.org\//i, '');
  const url = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data: CrossRefResponse = await res.json();
    const msg = data.message;
    if (!msg) return null;
    const title = msg.title?.[0] ?? '';
    const authors = (msg.author ?? []).map((a) => ({
      name: [a.given, a.family].filter(Boolean).join(' ') || a.name || 'Unknown',
    }));
    const year = msg.published?.['date-parts']?.[0]?.[0];
    const containerTitle = msg['container-title']?.[0];
    return {
      title,
      authors,
      year,
      containerTitle,
      abstract: msg.abstract,
      type: msg.type,
    };
  } catch {
    return null;
  }
}
