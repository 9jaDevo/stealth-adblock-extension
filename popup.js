document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.sync.get('darkMode', ({ darkMode }) => {
        if (darkMode) document.getElementById('popupBody').classList.add('dark');
    });

    document.getElementById('openOptions').onclick = () =>
        chrome.runtime.openOptionsPage();
});
