import {
  buildExportPayload,
  chunkTabs,
  decryptPayload,
  dedupeTabs,
  encryptPayload,
  normalizeTabsForExport,
  parseImportPayload
} from './lib.js';

const DEFAULT_IMPORT_BATCH_SIZE = 25;
const MAX_TABS_WARNING_THRESHOLD = 100;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === 'EXPORT_TABS') {
      const tabs = normalizeTabsForExport(await chrome.tabs.query(message.allWindows ? {} : { currentWindow: true }));
      const chunkSize = Number(message.chunkSize) > 0 ? Number(message.chunkSize) : tabs.length;
      const chunks = chunkTabs(tabs, chunkSize);

      for (let i = 0; i < chunks.length; i += 1) {
        const payload = buildExportPayload(chunks[i]);
        const content = message.encrypt
          ? JSON.stringify(await encryptPayload(payload, message.passphrase), null, 2)
          : JSON.stringify(payload, null, 2);
        const suffix = chunks.length > 1 ? `-part-${i + 1}-of-${chunks.length}` : '';
        const filename = `open-tabs-${Date.now()}${suffix}${message.encrypt ? '.enc' : ''}.json`;
        await downloadTextFile(content, filename);
      }

      sendResponse({ ok: true, tabCount: tabs.length, files: chunks.length });
      return;
    }

    if (message.type === 'IMPORT_TABS') {
      const parsed = JSON.parse(message.payload);
      const payload = message.encrypted ? await decryptPayload(parsed, message.passphrase) : parseImportPayload(parsed);
      const sourceTabs = message.dedupe ? dedupeTabs(payload.tabs) : payload.tabs;

      if (sourceTabs.length > MAX_TABS_WARNING_THRESHOLD && !message.userConfirmedLargeImport) {
        sendResponse({ ok: false, errorCode: 'LARGE_IMPORT_CONFIRMATION_REQUIRED', error: `Large import (${sourceTabs.length} tabs) requires confirmation.` });
        return;
      }

      const batchSize = Number(message.batchSize) > 0 ? Number(message.batchSize) : DEFAULT_IMPORT_BATCH_SIZE;
      const batches = chunkTabs(sourceTabs, batchSize);
      let opened = 0;
      for (const batch of batches) {
        for (const tab of batch) {
          if (!tab.url || !/^https?:\/\//.test(tab.url)) continue;
          await chrome.tabs.create({ url: tab.url, pinned: Boolean(tab.pinned), active: false });
          opened += 1;
        }
      }
      sendResponse({ ok: true, tabCount: opened, batches: batches.length });
    }
  })().catch((error) => sendResponse({ ok: false, errorCode: 'GENERIC_ERROR', error: error.message }));

  return true;
});

async function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    await chrome.downloads.download({ url, filename, saveAs: true });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
