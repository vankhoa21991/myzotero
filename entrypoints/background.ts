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
      sender: { tab?: { id?: number }; url?: string },
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
            const response = await browser.tabs.sendMessage(tab.id, { type: 'EXTRACT_METADATA' });
            sendResponse(response);
          } catch (e) {
            sendResponse({ error: String(e) });
          }
        })();
        return true;
      }
    },
  );
});
