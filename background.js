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

chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(r => r.id),
        addRules: rules
    });
});