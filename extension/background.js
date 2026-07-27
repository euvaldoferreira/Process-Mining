const DEFAULT_API_URL = '';
const DEFAULT_API_KEY = '';
const DEFAULT_ENABLED_SITES = [];
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 3000;

let queue = [];
let apiUrl = DEFAULT_API_URL;
let apiKey = DEFAULT_API_KEY;
let enabledSites = DEFAULT_ENABLED_SITES;
let isEnabled = true;
let flushTimer = null;
let clientId = '';

async function ensureClientId() {
  if (clientId) return clientId;
  const stored = await chrome.storage.local.get(['clientId']);
  if (stored.clientId) {
    clientId = stored.clientId;
  } else {
    clientId = crypto.randomUUID();
    await chrome.storage.local.set({ clientId });
  }
  return clientId;
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch (error) {
    return '';
  }
}

function isSiteAllowed(url) {
  const origin = normalizeUrl(url);
  if (!origin) return false;
  return enabledSites.some((pattern) => origin === pattern || origin.startsWith(pattern));
}

async function loadConfig() {
  const result = await chrome.storage.local.get(['apiUrl', 'apiKey', 'enabledSites', 'isEnabled']);
  apiUrl = result.apiUrl || DEFAULT_API_URL;
  apiKey = result.apiKey || DEFAULT_API_KEY;
  enabledSites = result.enabledSites || DEFAULT_ENABLED_SITES;
  isEnabled = result.isEnabled !== false;
  await ensureClientId();
}

async function persistConfig() {
  await chrome.storage.local.set({ apiUrl, apiKey, enabledSites, isEnabled });
}

function enqueue(event) {
  queue.push(event);
  if (queue.length >= BATCH_SIZE) {
    void flushQueue();
  }
}

async function flushQueue() {
  if (!queue.length || !apiUrl || !isEnabled) return;
  const batch = queue.splice(0, queue.length);
  try {
    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': clientId,
        ...(apiKey ? { 'X-API-Key': apiKey } : {})
      },
      body: JSON.stringify(batch)
    });
  } catch (error) {
    queue.unshift(...batch);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, FLUSH_INTERVAL_MS);
}

chrome.runtime.onInstalled.addListener(() => {
  void loadConfig();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'config:save') {
    apiUrl = message.apiUrl || DEFAULT_API_URL;
    apiKey = message.apiKey || DEFAULT_API_KEY;
    enabledSites = message.enabledSites || DEFAULT_ENABLED_SITES;
    isEnabled = message.isEnabled !== false;
    void persistConfig();
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'config:get') {
    void loadConfig().then(() => sendResponse({ apiUrl, apiKey, enabledSites, isEnabled }));
    return true;
  }

  if (message?.type === 'event') {
    const event = message.payload;
    if (event?.url && isSiteAllowed(event.url) && isEnabled) {
      enqueue(event);
      scheduleFlush();
    }
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

void loadConfig();
