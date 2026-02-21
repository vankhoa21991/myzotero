/**
 * Extract metadata from the current document (run in page context).
 * Used by content script when requested via messaging.
 */

export interface PageMetadata {
  title: string;
  url: string;
  doi: string | null;
  authors: string[];
  description?: string;
  isPdf: boolean;
}

const DOI_REGEX =
  /\b10\.\d{4,}\/[^\s]*/g;
const META_SELECTORS = [
  'meta[name="citation_title"]',
  'meta[name="dc.title"]',
  'meta[property="og:title"]',
  'meta[name="twitter:title"]',
];

function getMetaContent(selector: string): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  return el?.getAttribute('content')?.trim() || null;
}

function getMetaContents(selector: string): string[] {
  if (typeof document === 'undefined') return [];
  const nodes = document.querySelectorAll(selector);
  return Array.from(nodes)
    .map((el) => el.getAttribute('content')?.trim())
    .filter((s): s is string => !!s);
}

export function extractMetadataFromDocument(): PageMetadata {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const isPdf = url.toLowerCase().endsWith('.pdf') || getMetaContent('meta[name="citation_pdf_url"]') != null;

  let title =
    getMetaContent('meta[name="citation_title"]') ??
    getMetaContent('meta[name="dc.title"]') ??
    getMetaContent('meta[property="og:title"]') ??
    (typeof document !== 'undefined' ? document.title : '') ??
    '';

  const description =
    getMetaContent('meta[name="description"]') ??
    getMetaContent('meta[name="dc.description"]') ??
    getMetaContent('meta[property="og:description"]') ??
    undefined;

  const authors: string[] = [];
  const citationAuthor = getMetaContents('meta[name="citation_author"]');
  const dcCreator = getMetaContents('meta[name="dc.creator"]');
  if (citationAuthor.length) authors.push(...citationAuthor);
  else if (dcCreator.length) authors.push(...dcCreator);

  let doi: string | null = null;
  const citationDoi = getMetaContent('meta[name="citation_doi"]');
  const dcIdentifier = getMetaContent('meta[name="dc.identifier"]');
  if (citationDoi?.match(/10\.\d{4,}/)) doi = citationDoi;
  else if (dcIdentifier?.match(/10\.\d{4,}/)) doi = dcIdentifier;
  else if (typeof document !== 'undefined' && document.body?.innerText) {
    const match = document.body.innerText.match(DOI_REGEX);
    if (match) doi = match[0];
  }

  return {
    title: title.trim() || 'Untitled',
    url,
    doi,
    authors,
    description,
    isPdf,
  };
}
