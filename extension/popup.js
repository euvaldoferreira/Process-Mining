document.getElementById('save').addEventListener('click', async function () {
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const enabledSites = document.getElementById('enabledSites').value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  const isEnabled = document.getElementById('isEnabled').checked;

  const response = await chrome.runtime.sendMessage({
    type: 'config:save',
    apiUrl,
    apiKey,
    enabledSites,
    isEnabled
  });

  if (response?.ok) {
    window.close();
  }
});

(async function init() {
  const response = await chrome.runtime.sendMessage({ type: 'config:get' });
  document.getElementById('apiUrl').value = response?.apiUrl || '';
  document.getElementById('apiKey').value = response?.apiKey || '';
  document.getElementById('enabledSites').value = (response?.enabledSites || []).join('\n');
  document.getElementById('isEnabled').checked = response?.isEnabled !== false;
})();
