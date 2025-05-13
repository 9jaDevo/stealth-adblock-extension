chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
            {
                id: 1,
                priority: 1,
                action: { type: "block" },
                condition: {
                    urlFilter: "*://*adservice*",
                    resourceTypes: ["script", "image", "xmlhttprequest"]
                }
            }
        ],
        removeRuleIds: [1]
    });
});