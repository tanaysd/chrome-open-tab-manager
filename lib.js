export const EXPORT_SCHEMA_VERSION = 2;

export function normalizeTabsForExport(tabs) {
  return tabs
    .filter((tab) => tab?.url && /^https?:\/\//.test(tab.url))
    .map((tab) => ({ url: tab.url, title: tab.title ?? '', pinned: Boolean(tab.pinned) }));
}

export function buildExportPayload(tabs) {
  return {
    version: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tabs
  };
}

export function parseImportPayload(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || typeof data !== 'object') throw new Error('Invalid import format: expected JSON object.');
  if (!Array.isArray(data.tabs)) throw new Error('Invalid import format: expected a tabs array.');
  if (data.version !== undefined && typeof data.version !== 'number') throw new Error('Invalid import format: version must be a number.');
  return data;
}

export function dedupeTabs(tabs) {
  const seen = new Set();
  return tabs.filter((tab) => {
    if (!tab?.url || seen.has(tab.url)) return false;
    seen.add(tab.url);
    return true;
  });
}

export function chunkTabs(tabs, chunkSize = 100) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error('Chunk size must be a positive integer.');
  const out = [];
  for (let i = 0; i < tabs.length; i += chunkSize) out.push(tabs.slice(i, i + chunkSize));
  return out;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function encryptPayload(payload, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plaintext = encoder.encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(String(payload.version ?? '0')) }, key, plaintext);
  return { encrypted: true, v: 1, kdf: 'PBKDF2', iterations: 250000, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)) };
}

export async function decryptPayload(envelope, passphrase) {
  if (!envelope?.encrypted) throw new Error('File is not encrypted.');
  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  const data = fromBase64(envelope.data);
  const key = await deriveKey(passphrase, salt, envelope.iterations ?? 250000);
  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode('2') }, key, data);
  } catch {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  }
  return parseImportPayload(JSON.parse(decoder.decode(plaintext)));
}

async function deriveKey(passphrase, salt, iterations = 250000) {
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

function toBase64(bytes) { return btoa(String.fromCharCode(...bytes)); }
function fromBase64(base64) { return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)); }
