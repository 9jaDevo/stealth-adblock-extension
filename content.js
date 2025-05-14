chrome.storage.sync.get(["replaceAds", "isPaused"], ({ replaceAds, isPaused }) => {
    if (isPaused) return;

    const elementsToRemove = [
        '[id^="ad"]', '[class*="ads"]', '[class*="sponsored"]', 'iframe[src*="ad"]',
        'div[class*="banner"]', 'div[class*="sponsor"]',
        'ytd-promoted-video-renderer', 'div[id*="player-ads"]', 'div[class*="video-ads"]',
        'div[class*="googleads"]', 'div[id*="ad_container"]', 'section[data-ad-feedback]'
    ];

    elementsToRemove.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (replaceAds) {
                const img = document.createElement("img");
                const replacements = [
                    chrome.runtime.getURL("replacement/cat.jpg"),
                    chrome.runtime.getURL("replacement/dog.jpg"),
                    chrome.runtime.getURL("replacement/nature.jpg")
                ];
                img.src = replacements[Math.floor(Math.random() * replacements.length)];
                img.style.maxWidth = "100%";
                el.replaceWith(img);
            } else {
                el.remove();
            }
        });
    });
});