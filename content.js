chrome.storage.sync.get(["replaceAds", "isPaused", "whitelist"], ({ replaceAds, isPaused, whitelist }) => {
    if (isPaused) return;

    const currentHost = window.location.hostname;
    if ((whitelist || []).includes(currentHost)) return;

    const elementsToRemove = [
        '[id^="ad"]', '[class*="ads"]', '[class*="sponsored"]', 'iframe[src*="ad"]',
        'div[class*="banner"]', 'div[class*="sponsor"]',
        'ytd-promoted-video-renderer', 'div[id*="player-ads"]', 'div[class*="video-ads"]',
        'div[class*="googleads"]', 'div[id*="ad_container"]', 'section[data-ad-feedback]'
    ];

    if (currentHost.includes("live") || currentHost.includes("stream")) {
        const liveAdSelectors = [
            '[data-test-selector="sda-wrapper"]',
            '[data-test-selector="sda-container"]',
            '[data-test-selector="sda-transform"]',
            '[data-test-selector="sda-frame"]',
            '[data-test-selector="ad-banner-default-text"]',
            '[data-test-selector="video-ad-label"]',
            '[data-test-selector="video-ad-countdown"]',
            '[data-a-target="ax-overlay"]',
            '[data-a-target="outstream-ax-overlay"]',
            '#amazon-video-ads-out-stream-iframe',
            '#amazon-video-ads-in-stream-iframe',
            '#amazon-companion-ad-div',
            '#stream-lowerthird',
            '.stream-display-ad__wrapper',
            '.stream-display-ad__frame_squeezeback',
            '.persistent-player',
            '.tw-overlay-ad',
            '.avap-ads-container',
            '.ad-showing',
            '.player-ad-overlay',
            '.CoreText-sc-1txzju1-0.cVgnVN',
            'button[aria-label="Leave feedback for this Ad"]'
        ];
        elementsToRemove.push(...liveAdSelectors);

        const video = document.querySelector('video');
        const adIndicator = document.querySelector('.ad-showing, [data-a-target="video-ad-label"]');
        if (video && adIndicator) video.muted = true;
    }

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
