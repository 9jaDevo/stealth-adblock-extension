document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const darkToggle = $("darkModeToggle");
    const replaceToggle = $("replaceAds");
    const cookieToggle = $("blockCookieBanners");
    const socialToggle = $("blockSocialTrackers");
    const whitelistInput = $("whitelistInput");
    const whitelistList = $("whitelistList");
    const customInput = $("customSelectorInput");
    const customList = $("customSelectorList");
    const importFile = $("importFile");
    const messageEl = $("message");

    let messageTimer = null;
    function showMessage(text) {
        messageEl.textContent = text;
        if (messageTimer) clearTimeout(messageTimer);
        messageTimer = setTimeout(() => { messageEl.textContent = ""; }, 3000);
    }

    function todayKey() {
        const d = new Date();
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    function refreshStats() {
        chrome.storage.local.get("stats", ({ stats = { total: 0, days: {} } }) => {
            $("totalCount").textContent = stats.total || 0;
            $("todayCount").textContent = (stats.days && stats.days[todayKey()]) || 0;
        });
    }

    // -------- Load initial settings --------
    chrome.storage.sync.get(
        ["darkMode", "replaceAds", "blockCookieBanners", "blockSocialTrackers",
         "whitelist", "customSelectors"],
        (data) => {
            if (data.darkMode) document.body.classList.add("dark");
            darkToggle.checked = !!data.darkMode;
            replaceToggle.checked = !!data.replaceAds;
            cookieToggle.checked = data.blockCookieBanners !== false;
            socialToggle.checked = !!data.blockSocialTrackers;
            (data.whitelist || []).forEach(addWhitelistRow);
            (data.customSelectors || []).forEach(addCustomRow);
        }
    );
    refreshStats();

    // -------- Toggles --------
    darkToggle.addEventListener("change", () => {
        document.body.classList.toggle("dark", darkToggle.checked);
        chrome.storage.sync.set({ darkMode: darkToggle.checked });
    });
    replaceToggle.addEventListener("change", () =>
        chrome.storage.sync.set({ replaceAds: replaceToggle.checked }));
    cookieToggle.addEventListener("change", () =>
        chrome.storage.sync.set({ blockCookieBanners: cookieToggle.checked }));
    socialToggle.addEventListener("change", () =>
        chrome.storage.sync.set({ blockSocialTrackers: socialToggle.checked }));

    // -------- Whitelist --------
    function addWhitelistRow(site) {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = site;
        const btn = document.createElement("button");
        btn.textContent = "Remove";
        btn.addEventListener("click", () => {
            chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
                const newList = whitelist.filter((s) => s !== site);
                chrome.storage.sync.set({ whitelist: newList });
                li.remove();
            });
        });
        li.append(span, btn);
        whitelistList.appendChild(li);
    }

    function normalizeHost(input) {
        let v = String(input || "").trim().toLowerCase();
        if (!v) return "";
        if (v.includes("://")) {
            try { v = new URL(v).hostname; } catch { return ""; }
        }
        return v.replace(/^www\./, "").replace(/\/.*$/, "");
    }

    $("addWhitelist").addEventListener("click", () => {
        const site = normalizeHost(whitelistInput.value);
        if (!site) return showMessage("Enter a valid domain.");
        chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
            if (whitelist.includes(site)) {
                showMessage(`${site} already whitelisted.`);
            } else {
                whitelist.push(site);
                chrome.storage.sync.set({ whitelist });
                addWhitelistRow(site);
                showMessage(`Added ${site}.`);
            }
        });
        whitelistInput.value = "";
    });

    $("clearWhitelist").addEventListener("click", () => {
        chrome.storage.sync.set({ whitelist: [] });
        whitelistList.innerHTML = "";
        showMessage("Whitelist cleared.");
    });

    $("exportWhitelist").addEventListener("click", () => {
        chrome.storage.sync.get(["whitelist", "customSelectors"], (data) => {
            const blob = new Blob(
                [JSON.stringify({
                    whitelist: data.whitelist || [],
                    customSelectors: data.customSelectors || []
                }, null, 2)],
                { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "stealth-blocker-settings.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
    });

    $("importWhitelist").addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", () => {
        const file = importFile.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                const wl = Array.isArray(parsed.whitelist) ? parsed.whitelist : [];
                const cs = Array.isArray(parsed.customSelectors) ? parsed.customSelectors : [];
                chrome.storage.sync.set({ whitelist: wl, customSelectors: cs }, () => {
                    whitelistList.innerHTML = "";
                    customList.innerHTML = "";
                    wl.forEach(addWhitelistRow);
                    cs.forEach(addCustomRow);
                    showMessage("Settings imported.");
                });
            } catch {
                showMessage("Invalid file.");
            }
        };
        reader.readAsText(file);
        importFile.value = "";
    });

    // -------- Custom selectors --------
    function addCustomRow(sel) {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = sel;
        const btn = document.createElement("button");
        btn.textContent = "Remove";
        btn.addEventListener("click", () => {
            chrome.storage.sync.get("customSelectors", ({ customSelectors = [] }) => {
                const newList = customSelectors.filter((s) => s !== sel);
                chrome.storage.sync.set({ customSelectors: newList });
                li.remove();
            });
        });
        li.append(span, btn);
        customList.appendChild(li);
    }

    $("addCustomSelector").addEventListener("click", () => {
        const sel = customInput.value.trim();
        if (!sel) return;
        try { document.querySelector(sel); }
        catch { return showMessage("Invalid CSS selector."); }
        chrome.storage.sync.get("customSelectors", ({ customSelectors = [] }) => {
            if (customSelectors.includes(sel)) return;
            customSelectors.push(sel);
            chrome.storage.sync.set({ customSelectors });
            addCustomRow(sel);
        });
        customInput.value = "";
    });

    $("clearCustomSelectors").addEventListener("click", () => {
        chrome.storage.sync.set({ customSelectors: [] });
        customList.innerHTML = "";
    });

    // -------- Stats reset --------
    $("resetStats").addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "RESET_STATS" }, () => {
            refreshStats();
            showMessage("Statistics reset.");
        });
    });

    // Live updates from background/content
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.stats) refreshStats();
    });
});
