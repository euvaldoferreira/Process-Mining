const DEFAULT_API_URL = '';
const DEFAULT_ENABLED_SITES = [];
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 3000;

let queue = [];
let apiUrl = DEFAULT_API_URL;
let enabledSites = DEFAULT_ENABLED_SITES;
let isEnabled = true;
let flushTimer = null;

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
  const result = await chrome.storage.local.get(['apiUrl', 'enabledSites', 'isEnabled']);
  apiUrl = result.apiUrl || DEFAULT_API_URL;
  enabledSites = result.enabledSites || DEFAULT_ENABLED_SITES;
  isEnabled = result.isEnabled !== false;
}

async function persistConfig() {
  await chrome.storage.local.set({ apiUrl, enabledSites, isEnabled });
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
      headers: { 'Content-Type': 'application/json' },
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
    enabledSites = message.enabledSites || DEFAULT_ENABLED_SITES;
    isEnabled = message.isEnabled !== false;
    void persistConfig();
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'config:get') {
    void loadConfig().then(() => sendResponse({ apiUrl, enabledSites, isEnabled }));
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
