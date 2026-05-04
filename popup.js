const statusEl = document.getElementById('status');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');

const setStatus = (message, isError = false) => {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b00' : '#0a5';
};

const askPassphrase = (label) => {
  const passphrase = window.prompt(label);
  if (!passphrase) throw new Error('Passphrase is required.');
  return passphrase;
};

exportBtn.addEventListener('click', async () => {
  try {
    const encrypt = document.getElementById('encrypt').checked;
    const allWindows = document.getElementById('allWindows').checked;
    const chunkSize = Number(document.getElementById('exportChunkSize').value) || 100;
    const passphrase = encrypt ? askPassphrase('Set export passphrase') : null;
    const response = await chrome.runtime.sendMessage({ type: 'EXPORT_TABS', encrypt, allWindows, chunkSize, passphrase });
    if (!response?.ok) throw new Error(response?.error ?? 'Export failed');
    setStatus(`Exported ${response.tabCount} tabs to ${response.files} file(s).`);
  } catch (error) {
    setStatus(error.message, true);
  }
});

importBtn.addEventListener('click', async () => {
  try {
    const file = document.getElementById('importFile').files?.[0];
    if (!file) throw new Error('Choose a JSON file first.');

    const encrypted = document.getElementById('importEncrypted').checked;
    const dedupe = document.getElementById('dedupe').checked;
    const batchSize = Number(document.getElementById('importBatchSize').value) || 25;
    const passphrase = encrypted ? askPassphrase('Enter import passphrase') : null;
    const payload = await file.text();

    let response = await chrome.runtime.sendMessage({ type: 'IMPORT_TABS', payload, encrypted, dedupe, batchSize, passphrase });
    if (!response?.ok && response.errorCode === 'LARGE_IMPORT_CONFIRMATION_REQUIRED') {
      const confirmed = window.confirm(`${response.error} Continue?`);
      if (!confirmed) throw new Error('Import cancelled by user.');
      response = await chrome.runtime.sendMessage({ type: 'IMPORT_TABS', payload, encrypted, dedupe, batchSize, passphrase, userConfirmedLargeImport: true });
    }

    if (!response?.ok) throw new Error(response?.error ?? 'Import failed');
    setStatus(`Imported ${response.tabCount} tabs in ${response.batches} batch(es).`);
  } catch (error) {
    setStatus(error.message, true);
  }
});
