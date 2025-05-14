const ruleIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // match your rule count
const adBlockRules = [
  "*://*.doubleclick.net/*",
  "*://*.googlesyndication.com/*",
  "*://*.googleadservices.com/*",
  "*://*.adsafeprotected.com/*",
  "*://*.adnxs.com/*",
  "*://*.pubmatic.com/*",
  "*://*.moatads.com/*",
  "*://*.taboola.com/*",
  "*://*.outbrain.com/*",
  "*://*.criteo.com/*"
];

const rules = adBlockRules.map((url, index) => ({
  id: index + 1,
  priority: 1,
  action: { type: "block" },
  condition: {
    urlFilter: url,
    resourceTypes: ["script", "image", "xmlhttprequest", "sub_frame"]
  }
}));

function updateBlockingRules(tabUrl) {
  const hostname = new URL(tabUrl).hostname;
  chrome.storage.sync.get(['isPaused', 'whitelist'], ({ isPaused, whitelist = [] }) => {
    const isWhitelisted = whitelist.some(domain => hostname.endsWith(domain));

    if (isPaused || isWhitelisted) {
      chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ruleIds });
    } else {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds,
        addRules: rules
      });
    }
  });
}

// On tab update or activation, re-check rules
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) updateBlockingRules(tab.url);
});
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (tab.url) updateBlockingRules(tab.url);
  });
});
