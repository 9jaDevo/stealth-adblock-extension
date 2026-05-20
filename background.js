// ---------------------------------------------------------------------------
// Stealth Ad & Tracker Blocker — background service worker
// ---------------------------------------------------------------------------

const AD_DOMAINS = [
    // Google ad stack
    "doubleclick.net", "googlesyndication.com", "googleadservices.com",
    "googletagservices.com", "google-analytics.com", "googletagmanager.com",
    "g.doubleclick.net", "pagead2.googlesyndication.com", "adservice.google.com",
    // Major ad exchanges & SSPs
    "adsafeprotected.com", "adnxs.com", "pubmatic.com", "moatads.com",
    "openx.net", "rubiconproject.com", "casalemedia.com", "smartadserver.com",
    "criteo.com", "criteo.net", "indexexchange.com", "appnexus.com",
    "media.net", "sovrn.com", "advertising.com", "amazon-adsystem.com",
    "adform.net", "yieldmo.com", "yieldlab.net", "districtm.io",
    "33across.com", "lijit.com", "spotxchange.com", "1rx.io",
    "stackadapt.com", "bidswitch.net", "smaato.net", "tribalfusion.com",
    "adtechus.com", "adtech.de", "adsymptotic.com", "demdex.net",
    // Content recommendation / native ads
    "taboola.com", "outbrain.com", "revcontent.com", "mgid.com",
    "zergnet.com", "content.ad", "engageya.com", "earnify.com",
    // Pop-under / aggressive networks
    "propellerads.com", "popads.net", "popcash.net", "adcash.com",
    "exoclick.com", "exosrv.com", "trafficjunky.net", "juicyads.com",
    "ero-advertising.com", "plugrush.com", "trafficstars.com",
    // Trackers & analytics
    "scorecardresearch.com", "quantserve.com", "chartbeat.com", "chartbeat.net",
    "hotjar.com", "mouseflow.com", "fullstory.com", "mixpanel.com",
    "segment.com", "segment.io", "amplitude.com", "kissmetrics.com",
    "newrelic.com", "nr-data.net", "optimizely.com", "crazyegg.com",
    "addthis.com", "sharethis.com", "disqusads.com", "summerhamster.com",
    // Facebook / Meta tracking pixels
    "connect.facebook.net", "facebook.com/tr", "fbcdn.net/ads",
    // Microsoft / Bing
    "bat.bing.com", "clarity.ms",
    // Twitter / X
    "ads-twitter.com", "static.ads-twitter.com",
    // LinkedIn
    "ads.linkedin.com", "analytics.pointdrive.linkedin.com",
    // TikTok
    "analytics.tiktok.com", "business-api.tiktok.com",
    // Yahoo / Verizon
    "ads.yahoo.com", "advertising.yahoo.com", "yimg.com/ss/rapid-",
    // Misc programmatic
    "tribalfusion.com", "contextweb.com", "gumgum.com", "teads.tv",
    "triplelift.com", "thetradedesk.com", "adsrvr.org", "rfihub.com",
    "rfihub.net", "turn.com", "mathtag.com", "bluekai.com",
    "krxd.net", "rlcdn.com", "agkn.com", "exelator.com",
    "everesttech.net", "eyeota.net", "tapad.com", "addthisedge.com",
    // Adult / malware-heavy networks
    "go.ad2up.com", "ads.exoclick.com", "syndication.exosrv.com"
];

// Build declarativeNetRequest rules from the domain list (1 rule per domain).
function buildRules() {
    return AD_DOMAINS.map((domain, idx) => ({
        id: idx + 1,
        priority: 1,
        action: { type: "block" },
        condition: {
            urlFilter: `||${domain}^`,
            resourceTypes: [
                "script", "image", "xmlhttprequest", "sub_frame",
                "media", "font", "object", "ping", "websocket"
            ]
        }
    }));
}

const RULES = buildRules();
const RULE_IDS = RULES.map(r => r.id);

// ---------------------------------------------------------------------------
// Whitelist helpers
// ---------------------------------------------------------------------------

function hostMatchesWhitelist(hostname, whitelist) {
    if (!hostname || !Array.isArray(whitelist)) return false;
    const host = hostname.toLowerCase().replace(/^www\./, "");
    return whitelist.some(raw => {
        if (!raw) return false;
        const entry = String(raw).toLowerCase().trim().replace(/^www\./, "");
        if (!entry) return false;
        return host === entry || host.endsWith("." + entry);
    });
}

// ---------------------------------------------------------------------------
// Apply / remove blocking rules globally
// ---------------------------------------------------------------------------

async function applyRules(enabled) {
    try {
        if (enabled) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: RULE_IDS,
                addRules: RULES
            });
        } else {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: RULE_IDS
            });
        }
    } catch (err) {
        console.error("[StealthBlocker] Failed to update rules:", err);
    }
}

async function refreshRulesForActiveTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) {
            await applyRules(true);
            return;
        }
        let hostname = "";
        try { hostname = new URL(tab.url).hostname; } catch { /* chrome:// etc. */ }
        const { isPaused = false, whitelist = [] } =
            await chrome.storage.sync.get(["isPaused", "whitelist"]);
        const whitelisted = hostMatchesWhitelist(hostname, whitelist);
        await applyRules(!(isPaused || whitelisted));
    } catch (err) {
        console.error("[StealthBlocker] refreshRulesForActiveTab:", err);
    }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
    applyRules(true);
    chrome.contextMenus.create({
        id: "stealth-block-element",
        title: "Stealth Blocker: block this element",
        contexts: ["all"]
    });
});

chrome.runtime.onStartup.addListener(() => {
    refreshRulesForActiveTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) refreshRulesForActiveTab();
});
chrome.tabs.onActivated.addListener(() => refreshRulesForActiveTab());

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.isPaused || changes.whitelist) refreshRulesForActiveTab();
});

// ---------------------------------------------------------------------------
// Stats + badge counter
// ---------------------------------------------------------------------------

const tabCounts = new Map(); // tabId -> count blocked on current page

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function bumpStats(n) {
    if (!n) return;
    const { stats = { total: 0, days: {} } } =
        await chrome.storage.local.get("stats");
    stats.total = (stats.total || 0) + n;
    const k = todayKey();
    stats.days = stats.days || {};
    stats.days[k] = (stats.days[k] || 0) + n;
    await chrome.storage.local.set({ stats });
}

function updateBadge(tabId) {
    const n = tabCounts.get(tabId) || 0;
    const text = n > 0 ? (n > 999 ? "999+" : String(n)) : "";
    chrome.action.setBadgeBackgroundColor({ color: "#d33" }).catch(() => {});
    chrome.action.setBadgeText({ tabId, text }).catch(() => {});
}

chrome.tabs.onRemoved.addListener(tabId => tabCounts.delete(tabId));

chrome.webNavigation?.onBeforeNavigate?.addListener?.(details => {
    if (details.frameId === 0) {
        tabCounts.set(details.tabId, 0);
        updateBadge(details.tabId);
    }
});

// ---------------------------------------------------------------------------
// Messaging with content scripts and UI
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return;

    switch (msg.type) {
        case "BLOCKED_COUNT": {
            const tabId = sender.tab?.id;
            if (tabId != null) {
                const prev = tabCounts.get(tabId) || 0;
                tabCounts.set(tabId, prev + (msg.count || 0));
                updateBadge(tabId);
            }
            bumpStats(msg.count || 0);
            break;
        }
        case "GET_TAB_COUNT": {
            const tabId = msg.tabId ?? sender.tab?.id;
            sendResponse({ count: tabCounts.get(tabId) || 0 });
            return true;
        }
        case "RESET_STATS": {
            chrome.storage.local.set({ stats: { total: 0, days: {} } })
                .then(() => sendResponse({ ok: true }));
            return true;
        }
        case "REFRESH_RULES": {
            refreshRulesForActiveTab().then(() => sendResponse({ ok: true }));
            return true;
        }
    }
});

// ---------------------------------------------------------------------------
// Context menu: tell active tab to block the clicked element
// ---------------------------------------------------------------------------

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== "stealth-block-element" || !tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "PICK_AND_BLOCK" }).catch(() => {});
});

