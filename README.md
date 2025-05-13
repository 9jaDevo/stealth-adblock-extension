# Stealth Ad & Tracker Blocker (Chrome Extension)

🚫 A powerful, stealthy, privacy-first Chrome extension that blocks ads, trackers, and malvertising—just like ExpressVPN’s ad blocker. Customize your browsing experience with features like ad replacement, dark mode, sync settings, and more.

## 🚀 Features

- ✅ Block all ads: Video ads, popups, banners, and more—even on YouTube, Facebook, and Twitch.
- 🛡️ Block trackers: Prevent third-party scripts from collecting your data.
- ⚡ Faster browsing: Stops unwanted requests and improves page load time.
- 🧠 Malware protection: Blocks known domains that host malware, scams, or crypto miners.
- 🌙 Dark mode: Toggle between light and dark interface themes.
- 🐱 Ad replacement: Replace blocked ads with cat, dog, or landscape images.
- 🔄 Sync settings: Whitelists and preferences are synced across Chrome profiles.
- 📋 Custom whitelists: Choose which websites are allowed to show ads.
- 🛠️ User-friendly options: Configure everything from a clean options page.

## 🧩 How to Install Locally

1. Clone or Download this Repository
2. Navigate to `chrome://extensions/` in your browser
3. Enable Developer Mode
4. Click “Load unpacked” and select the folder you cloned
5. Browse with peace 😌

## 📁 Project Structure

/replacement/         → Ad replacement images (cat.jpg, dog.jpg, nature.jpg)
background.js         → Handles network-level ad blocking
content.js            → Removes or replaces ad elements in the DOM
manifest.json         → Chrome extension config
options.html/.js      → User settings interface
popup.html            → Popup UI for quick access

## 📦 Coming Soon

- 📑 EasyList filter import support
- 🧩 Auto-update block rules via remote list
- 🌍 Firefox & Edge versions
- 🧩 Filter list toggles in UI

## 🤝 License

[MIT License](LICENSE)

## 💬 Feedback & Support

Issues, improvements, and feature requests are welcome! Open an issue or start a discussion on the GitHub repo.
