document.addEventListener("DOMContentLoaded", () => {
    const pauseToggle = document.getElementById("pauseToggle");
    const whitelistBtn = document.getElementById("whitelistCurrent");
    const statusEl = document.getElementById("status");
    const messageEl = document.getElementById("message");
    const tabCountEl = document.getElementById("tabCount");
    const todayCountEl = document.getElementById("todayCount");
    const totalCountEl = document.getElementById("totalCount");

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

    function reloadActiveTab() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id != null) chrome.tabs.reload(tabs[0].id);
        });
    }

    // Initial UI state
    chrome.storage.sync.get(["darkMode", "isPaused"], ({ darkMode, isPaused }) => {
        if (darkMode) document.body.classList.add("dark");
        pauseToggle.checked = !!isPaused;
        statusEl.textContent = isPaused ? "Paused" : "Enabled";
    });

    chrome.storage.local.get("stats", ({ stats = { total: 0, days: {} } }) => {
        totalCountEl.textContent = stats.total || 0;
        todayCountEl.textContent = (stats.days && stats.days[todayKey()]) || 0;
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId == null) return;
        chrome.runtime.sendMessage({ type: "GET_TAB_COUNT", tabId }, (resp) => {
            if (resp && typeof resp.count === "number") {
                tabCountEl.textContent = resp.count;
            }
        });
    });

    // Pause toggle
    pauseToggle.addEventListener("change", (e) => {
        chrome.storage.sync.set({ isPaused: e.target.checked }, () => {
            statusEl.textContent = e.target.checked ? "Paused" : "Enabled";
            showMessage("Reloading page...");
            setTimeout(reloadActiveTab, 250);
        });
    });

    // Whitelist current site
    whitelistBtn.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = tabs[0]?.url;
            if (!url) return showMessage("No active tab.");
            let hostname;
            try { hostname = new URL(url).hostname; }
            catch { return showMessage("Unsupported page."); }
            if (!hostname) return showMessage("Unsupported page.");

            chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
                if (whitelist.includes(hostname)) {
                    showMessage(`${hostname} already whitelisted.`);
                    return;
                }
                whitelist.push(hostname);
                chrome.storage.sync.set({ whitelist }, () => {
                    showMessage(`${hostname} whitelisted. Reloading...`);
                    setTimeout(reloadActiveTab, 250);
                });
            });
        });
    });

    document.getElementById("openOptions").addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });
});

