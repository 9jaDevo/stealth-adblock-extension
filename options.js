document.addEventListener('DOMContentLoaded', () => {
  const darkToggle = document.getElementById('darkModeToggle');
  const replaceToggle = document.getElementById('replaceAds');
  const syncToggle = document.getElementById('syncRules');
  const whitelistInput = document.getElementById('whitelistInput');
  const whitelistList = document.getElementById('whitelistList');
  const clearButton = document.getElementById('clearWhitelist');

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

  clearButton.addEventListener('click', () => {
    chrome.storage.sync.set({ whitelist: [] });
    whitelistList.innerHTML = '';
  });

  function addToUI(site) {
    const li = document.createElement('li');
    li.textContent = site + ' ';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => {
      chrome.storage.sync.get('whitelist', ({ whitelist = [] }) => {
        const newList = whitelist.filter(item => item !== site);
        chrome.storage.sync.set({ whitelist: newList });
        li.remove();
      });
    };
    li.appendChild(removeBtn);
    whitelistList.appendChild(li);
  }
});