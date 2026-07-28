let currentOrigin = '';
let enabledSitesCache = [];

function normalizePattern(pattern) {
  if (!pattern) return '';
  const trimmed = pattern.trim();
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch (error) {
    return trimmed.replace(/\/+$/, '');
  }
}

function isOriginAllowed(origin, list) {
  return list.some((pattern) => {
    const normalized = normalizePattern(pattern);
    return !!normalized && (origin === normalized || origin.startsWith(normalized));
  });
}

function renderSiteStatus() {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const button = document.getElementById('toggleSite');

  if (!currentOrigin) {
    dot.className = 'dot';
    text.textContent = 'Não disponível nesta página';
    button.style.display = 'none';
    return;
  }

  const allowed = isOriginAllowed(currentOrigin, enabledSitesCache);
  dot.className = 'dot ' + (allowed ? 'on' : 'off');
  text.textContent = allowed ? 'Observação ativa neste site' : 'Este site não está sendo observado';
  button.style.display = 'block';
  button.textContent = allowed ? 'Remover este site' : 'Permitir observar este site';
  button.className = allowed ? 'remove' : 'allow';
}

async function saveConfig() {
  return chrome.runtime.sendMessage({
    type: 'config:save',
    apiUrl: document.getElementById('apiUrl').value.trim(),
    apiKey: document.getElementById('apiKey').value.trim(),
    enabledSites: enabledSitesCache,
    isEnabled: document.getElementById('isEnabled').checked
  });
}

async function toggleCurrentSite() {
  if (!currentOrigin) return;
  const allowed = isOriginAllowed(currentOrigin, enabledSitesCache);
  enabledSitesCache = allowed
    ? enabledSitesCache.filter((pattern) => normalizePattern(pattern) !== currentOrigin)
    : [...enabledSitesCache, currentOrigin];
  document.getElementById('enabledSites').value = enabledSitesCache.join('\n');
  await saveConfig();
  renderSiteStatus();
}

document.getElementById('toggleSite').addEventListener('click', toggleCurrentSite);

document.getElementById('save').addEventListener('click', async function () {
  enabledSitesCache = document.getElementById('enabledSites').value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  const response = await saveConfig();
  if (response?.ok) {
    window.close();
  }
});

(async function init() {
  document.getElementById('version').textContent = 'v' + chrome.runtime.getManifest().version;

  const response = await chrome.runtime.sendMessage({ type: 'config:get' });
  document.getElementById('apiUrl').value = response?.apiUrl || '';
  document.getElementById('apiKey').value = response?.apiKey || '';
  enabledSitesCache = response?.enabledSites || [];
  document.getElementById('enabledSites').value = enabledSitesCache.join('\n');
  document.getElementById('isEnabled').checked = response?.isEnabled !== false;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && /^https?:\/\//i.test(tab.url)) {
      currentOrigin = new URL(tab.url).origin;
      document.getElementById('currentSiteUrl').textContent = currentOrigin;
    } else {
      document.getElementById('currentSiteUrl').textContent = 'Esta página não pode ser observada (não é http/https)';
    }
  } catch (error) {
    document.getElementById('currentSiteUrl').textContent = 'Não foi possível detectar o site atual';
  }

  renderSiteStatus();
})();
