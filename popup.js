document.addEventListener("DOMContentLoaded", () => {
    const pauseToggle = document.getElementById("pauseToggle");
    const whitelistBtn = document.getElementById("whitelistCurrent");

    // Dark mode
    chrome.storage.sync.get(['darkMode', 'isPaused'], ({ darkMode, isPaused }) => {
        if (darkMode) document.body.classList.add("dark");
        pauseToggle.checked = isPaused || false;
    });

    // Toggle pause
    pauseToggle.addEventListener("change", (e) => {
        chrome.storage.sync.set({ isPaused: e.target.checked }, () => {
            setTimeout(() => chrome.tabs.reload(), 200);
        });
    });

    // Whitelist current domain
    whitelistBtn.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            try {
                const hostname = new URL(tabs[0].url).hostname;
                chrome.storage.sync.get('whitelist', ({ whitelist = [] }) => {
                    if (!whitelist.includes(hostname)) {
                        whitelist.push(hostname);
                        chrome.storage.sync.set({ whitelist }, () => {
                            alert(`${hostname} has been whitelisted.`);
                            setTimeout(() => chrome.tabs.reload(), 200);
                        });
                    } else {
                        alert(`${hostname} is already whitelisted.`);
                    }
                });
            } catch (err) {
                console.error("Could not extract hostname:", err);
                alert("Invalid URL or unsupported tab.");
            }
        });
    });

    // Link to options
    document.getElementById("openOptions").onclick = () => chrome.runtime.openOptionsPage();
});
