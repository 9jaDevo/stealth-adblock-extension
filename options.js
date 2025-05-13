document.addEventListener('DOMContentLoaded', () => {
  const darkToggle = document.getElementById('darkModeToggle');
  const replaceToggle = document.getElementById('replaceAds');
  const syncToggle = document.getElementById('syncRules');
  const whitelistInput = document.getElementById('whitelistInput');
  const whitelistList = document.getElementById('whitelistList');

  chrome.storage.sync.get(['darkMode', 'replaceAds', 'syncRules', 'whitelist'], ({ darkMode, replaceAds, syncRules, whitelist }) => {
    darkToggle.checked = darkMode || false;
    replaceToggle.checked = replaceAds || false;
    syncToggle.checked = syncRules || false;
    (whitelist || []).forEach(site => addToUI(site));
  });

  darkToggle.addEventListener('change', () => chrome.storage.sync.set({ darkMode: darkToggle.checked }));
  replaceToggle.addEventListener('change', () => chrome.storage.sync.set({ replaceAds: replaceToggle.checked }));
  syncToggle.addEventListener('change', () => chrome.storage.sync.set({ syncRules: syncToggle.checked }));

  document.getElementById('addWhitelist').addEventListener('click', () => {
    const site = whitelistInput.value.trim();
    if (!site) return;
    chrome.storage.sync.get('whitelist', ({ whitelist = [] }) => {
      if (!whitelist.includes(site)) {
        whitelist.push(site);
        chrome.storage.sync.set({ whitelist });
        addToUI(site);
      }
    });
    whitelistInput.value = '';
  });

  function addToUI(site) {
    const li = document.createElement('li');
    li.textContent = site;
    whitelistList.appendChild(li);
  }
});