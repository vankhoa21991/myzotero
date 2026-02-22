import { runSync, getSyncMode } from '../lib/db/sync';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    // Optional: open side panel on install
  });

  browser.alarms.create('myzotero-sync', { periodInMinutes: 15 });
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'myzotero-sync' && (await getSyncMode()) === 'supabase') {
      await runSync();
    }
  });

  browser.runtime.onMessage.addListener(
    (
      message: { type: string },
      _sender: unknown,
      sendResponse: (r: unknown) => void,
    ) => {
      if (message.type === 'getPageMetadata') {
        (async () => {
          try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
              sendResponse({ error: 'No active tab' });
              return;
            }
            let result: unknown;
            try {
              const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  function getMeta(selector: string): string | null {
                    return document.querySelector(selector)?.getAttribute('content')?.trim() || null;
                  }
                  function getMetas(selector: string): string[] {
                    return Array.from(document.querySelectorAll(selector))
                      .map((el) => el.getAttribute('content')?.trim())
                      .filter((s): s is string => !!s);
                  }
                  const url = window.location.href;
                  const isPdf =
                    url.toLowerCase().endsWith('.pdf') ||
                    getMeta('meta[name="citation_pdf_url"]') != null;
                  const title =
                    getMeta('meta[name="citation_title"]') ||
                    getMeta('meta[name="dc.title"]') ||
                    getMeta('meta[property="og:title"]') ||
                    document.title ||
                    'Untitled';
                  const description =
                    getMeta('meta[name="description"]') ||
                    getMeta('meta[name="dc.description"]') ||
                    getMeta('meta[property="og:description"]') ||
                    undefined;
                  const citationAuthors = getMetas('meta[name="citation_author"]');
                  const dcCreators = getMetas('meta[name="dc.creator"]');
                  const authors = citationAuthors.length ? citationAuthors : dcCreators;
                  let doi: string | null =
                    getMeta('meta[name="citation_doi"]') ||
                    getMeta('meta[name="dc.identifier"]') ||
                    null;
                  if (doi && !doi.match(/10\.\d{4,}/)) doi = null;
                  if (!doi && document.body?.innerText) {
                    const match = document.body.innerText.match(/\b10\.\d{4,}\/[^\s]*/);
                    doi = match ? match[0] : null;
                  }
                  return { title: title.trim() || 'Untitled', url, doi, authors, description, isPdf };
                },
              });
              result = results?.[0]?.result ?? { error: 'Extraction returned no result' };
            } catch {
              // Fallback for chrome:// URLs and other restricted pages:
              // use basic tab metadata directly from the tabs API
              result = {
                title: tab.title?.trim() || 'Untitled',
                url: tab.url ?? '',
                doi: null,
                authors: [],
                description: undefined,
                isPdf: (tab.url ?? '').toLowerCase().endsWith('.pdf'),
              };
            }
            sendResponse(result);
          } catch (e) {
            sendResponse({ error: String(e) });
          }
        })();
        return true;
      }
    },
  );
});
