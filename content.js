// ---------------------------------------------------------------------------
// Stealth Ad & Tracker Blocker — content script
// Runs at document_start in all frames. Removes ad elements + cookie banners,
// optionally replaces them with images, observes DOM mutations, and supports
// a right-click "block this element" picker.
// ---------------------------------------------------------------------------

(() => {
    const AD_SELECTORS = [
        // Generic
        '[id^="ad-"]', '[id^="ad_"]', '[id*="-ad-"]', '[id$="-ad"]',
        '[class*="adsbygoogle"]', 'ins.adsbygoogle',
        '[class*="advert"]', '[class*="-ads-"]', '[class*="-ad-"]',
        '[class*="sponsored"]', '[class*="sponsor"]',
        '[class*="banner-ad"]', '[class*="ad-banner"]',
        '[data-ad-slot]', '[data-ad-client]', '[data-ad]', '[data-ad-id]',
        '[aria-label="Advertisement"]', '[aria-label*="Sponsored"]',
        'iframe[src*="ads."]', 'iframe[src*="/ads/"]', 'iframe[src*="ad."]',
        'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
        'iframe[src*="amazon-adsystem"]', 'iframe[src*="adnxs"]',
        'iframe[id^="google_ads_"]', 'iframe[id*="ad_iframe"]',

        // YouTube
        'ytd-promoted-video-renderer', 'ytd-promoted-sparkles-web-renderer',
        'ytd-display-ad-renderer', 'ytd-action-companion-ad-renderer',
        'ytd-banner-promo-renderer', 'ytd-in-feed-ad-layout-renderer',
        'ytd-statement-banner-renderer', 'ytd-merch-shelf-renderer',
        '#masthead-ad', '#player-ads', '.ytp-ad-module',
        '.ytp-ad-overlay-slot', '.video-ads',

        // Facebook
        '[data-pagelet*="FeedUnit"] [data-ad-rendering-role]',
        '[data-ad-comet-pending]', '[role="article"][data-pagelet="FeedUnit_R"]',

        // Twitter / X
        '[data-testid="placementTracking"]',
        'div[aria-label="Promoted"]',

        // Reddit
        'shreddit-ad-post', '[data-promoted="true"]',

        // News / generic publisher boxes
        'div[id*="googleads"]', 'div[id*="google_ads"]',
        'div[id^="div-gpt-ad"]', 'div[id*="ad_container"]',
        'section[data-ad-feedback]', 'aside[class*="ad"]',

        // Live streaming (Twitch and similar)
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
        '.stream-display-ad__wrapper',
        '.stream-display-ad__frame_squeezeback',
        '.tw-overlay-ad', '.avap-ads-container',
        '.ad-showing', '.player-ad-overlay'
    ];

    const COOKIE_BANNER_SELECTORS = [
        '#onetrust-consent-sdk', '#onetrust-banner-sdk',
        '#CybotCookiebotDialog', '#cookieConsent', '#cookie-consent',
        '#cookie-banner', '.cookie-banner', '.cookie-notice',
        '[class*="cookie-notice"]', '[class*="cookie-banner"]',
        '[id*="gdpr"]', '[class*="gdpr"]',
        '#truste-consent-track', '.truste_box_overlay',
        '.qc-cmp2-container', '#qc-cmp2-ui',
        '.fc-consent-root', '.didomi-popup-container'
    ];

    const SOCIAL_TRACKER_SELECTORS = [
        '.fb-like', '.fb-share-button', '.fb_iframe_widget',
        'iframe[src*="facebook.com/plugins"]',
        '.twitter-follow-button', '.twitter-share-button',
        'iframe[src*="platform.twitter.com"]',
        'iframe[src*="platform.linkedin.com"]',
        '.linkedin-share-button',
        'iframe[src*="instagram.com/embed"]',
        '.addthis_toolbox', '.at-share-tbx-element',
        '.sharethis-inline-share-buttons'
    ];

    const REPLACEMENTS = [
        chrome.runtime.getURL("replacement/cat.jpg"),
        chrome.runtime.getURL("replacement/dog.jpg"),
        chrome.runtime.getURL("replacement/nature.jpg")
    ];

    let settings = {
        isPaused: false,
        whitelist: [],
        replaceAds: false,
        blockCookieBanners: true,
        blockSocialTrackers: false,
        customSelectors: []
    };

    let active = true;          // becomes false if paused or whitelisted
    let blockedCount = 0;
    let flushTimer = null;

    // -----------------------------------------------------------------------
    // Whitelist matching (same rules as background.js)
    // -----------------------------------------------------------------------
    function hostMatchesWhitelist(hostname, whitelist) {
        const host = (hostname || "").toLowerCase().replace(/^www\./, "");
        return (whitelist || []).some(raw => {
            if (!raw) return false;
            const entry = String(raw).toLowerCase().trim().replace(/^www\./, "");
            if (!entry) return false;
            return host === entry || host.endsWith("." + entry);
        });
    }

    function computeActive() {
        if (settings.isPaused) return false;
        if (hostMatchesWhitelist(location.hostname, settings.whitelist)) return false;
        return true;
    }

    // -----------------------------------------------------------------------
    // Element removal
    // -----------------------------------------------------------------------
    function buildSelectorList() {
        const list = [...AD_SELECTORS];
        if (settings.blockCookieBanners) list.push(...COOKIE_BANNER_SELECTORS);
        if (settings.blockSocialTrackers) list.push(...SOCIAL_TRACKER_SELECTORS);
        if (Array.isArray(settings.customSelectors)) {
            for (const s of settings.customSelectors) {
                if (typeof s === "string" && s.trim()) list.push(s.trim());
            }
        }
        return list;
    }

    function removeMatches(root = document) {
        if (!active || !root || !root.querySelectorAll) return;
        const selectors = buildSelectorList();
        let removed = 0;
        for (const selector of selectors) {
            let nodes;
            try { nodes = root.querySelectorAll(selector); }
            catch { continue; } // bad selector — skip
            for (const el of nodes) {
                if (!el.isConnected) continue;
                if (settings.replaceAds) {
                    const img = document.createElement("img");
                    img.src = REPLACEMENTS[Math.floor(Math.random() * REPLACEMENTS.length)];
                    img.alt = "";
                    img.style.maxWidth = "100%";
                    img.style.height = "auto";
                    try { el.replaceWith(img); } catch { try { el.remove(); } catch {} }
                } else {
                    try { el.remove(); } catch {}
                }
                removed++;
            }
        }

        // Live-streaming: auto-mute video when ad is playing
        try {
            const video = document.querySelector("video");
            const adIndicator = document.querySelector(
                '.ad-showing, [data-a-target="video-ad-label"], .ytp-ad-player-overlay'
            );
            if (video && adIndicator && !video.muted) video.muted = true;
        } catch {}

        if (removed > 0) {
            blockedCount += removed;
            scheduleFlush();
        }
    }

    function scheduleFlush() {
        if (flushTimer) return;
        flushTimer = setTimeout(() => {
            flushTimer = null;
            if (blockedCount > 0) {
                const count = blockedCount;
                blockedCount = 0;
                try {
                    chrome.runtime.sendMessage({ type: "BLOCKED_COUNT", count });
                } catch {}
            }
        }, 500);
    }

    // -----------------------------------------------------------------------
    // MutationObserver — handles dynamically inserted ads
    // -----------------------------------------------------------------------
    let observer = null;
    let scanTimer = null;
    function scheduleScan() {
        if (scanTimer) return;
        scanTimer = setTimeout(() => {
            scanTimer = null;
            removeMatches(document);
        }, 200);
    }

    function startObserver() {
        if (observer || !document.documentElement) return;
        observer = new MutationObserver(scheduleScan);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    function stopObserver() {
        if (observer) { observer.disconnect(); observer = null; }
        if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
    }

    // -----------------------------------------------------------------------
    // Element picker (right-click "block this element")
    // -----------------------------------------------------------------------
    let pickerArmed = false;
    let pickerTarget = null;

    document.addEventListener("contextmenu", (e) => {
        pickerTarget = e.target;
    }, true);

    function cssPathFor(el) {
        if (!(el instanceof Element)) return "";
        if (el.id) return `#${CSS.escape(el.id)}`;
        const parts = [];
        let node = el;
        while (node && node.nodeType === 1 && parts.length < 5) {
            let part = node.tagName.toLowerCase();
            if (node.classList && node.classList.length) {
                part += "." + [...node.classList].map(c => CSS.escape(c)).join(".");
            }
            parts.unshift(part);
            if (node.id) { parts[0] = `#${CSS.escape(node.id)}`; break; }
            node = node.parentElement;
        }
        return parts.join(" > ");
    }

    function handlePickAndBlock() {
        const el = pickerTarget;
        if (!el) return;
        const selector = cssPathFor(el);
        if (!selector) return;
        chrome.storage.sync.get("customSelectors", ({ customSelectors = [] }) => {
            if (!customSelectors.includes(selector)) {
                customSelectors.push(selector);
                chrome.storage.sync.set({ customSelectors });
            }
            settings.customSelectors = customSelectors;
            try { el.remove(); } catch {}
            blockedCount++;
            scheduleFlush();
        });
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type === "PICK_AND_BLOCK") handlePickAndBlock();
    });

    // -----------------------------------------------------------------------
    // Settings load + live updates
    // -----------------------------------------------------------------------
    function applyActiveState() {
        const wasActive = active;
        active = computeActive();
        if (active && !wasActive) {
            removeMatches(document);
            startObserver();
        } else if (!active && wasActive) {
            stopObserver();
        } else if (active) {
            removeMatches(document);
        }
    }

    chrome.storage.sync.get(
        ["isPaused", "whitelist", "replaceAds", "blockCookieBanners",
         "blockSocialTrackers", "customSelectors"],
        (data) => {
            settings = {
                isPaused: !!data.isPaused,
                whitelist: data.whitelist || [],
                replaceAds: !!data.replaceAds,
                blockCookieBanners: data.blockCookieBanners !== false, // default on
                blockSocialTrackers: !!data.blockSocialTrackers,
                customSelectors: data.customSelectors || []
            };
            active = computeActive();
            if (active) {
                removeMatches(document);
                startObserver();
            }
        }
    );

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;
        let touched = false;
        for (const k of Object.keys(changes)) {
            if (k in settings) {
                settings[k] = changes[k].newValue;
                touched = true;
            }
        }
        if (touched) applyActiveState();
    });
})();

