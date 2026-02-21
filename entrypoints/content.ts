import { extractMetadataFromDocument } from '../lib/metadata/extractors';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    browser.runtime.onMessage.addListener(
      (message: { type: string }, _sender: unknown, sendResponse: (r: unknown) => void) => {
        if (message.type === 'EXTRACT_METADATA') {
          try {
            const meta = extractMetadataFromDocument();
            sendResponse(meta);
          } catch (e) {
            sendResponse({ error: String(e) });
          }
        }
        return true;
      },
    );
  },
});
