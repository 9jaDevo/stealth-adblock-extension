document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.sync.get(['darkMode', 'isPaused'], ({ darkMode, isPaused }) => {
        if (darkMode) document.getElementById("popupBody").classList.add("dark");
        document.getElementById("pauseToggle").checked = isPaused || false;
    });

    document.getElementById("pauseToggle").addEventListener("change", (e) => {
        chrome.storage.sync.set({ isPaused: e.target.checked });
    });

    document.getElementById("openOptions").onclick = () => chrome.runtime.openOptionsPage();
});