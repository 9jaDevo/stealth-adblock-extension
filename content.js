chrome.storage.sync.get("replaceAds", ({ replaceAds }) => {
    const elementsToRemove = [
        '[id^="ad"], [class*="ads"], iframe[src*="ad"], div[class*="banner"], div[class*="sponsor"]'
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