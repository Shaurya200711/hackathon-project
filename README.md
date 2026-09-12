# TabFlow 🌊
> **Your Browser, Organized Instantly.**

TabFlow is a lightweight, client-side Chrome Extension built to eliminate tab overload. It acts as a command center for your browser, utilizing Chrome's native DOM APIs to instantly categorize your workspace, execute real-time fuzzy searches, and automatically group related tabs with a single click.

## ✨ Features

* **One-Click Auto-Grouping:** Instantly clusters related tabs by domain into color-coded Chrome Tab Groups. No manual drag-and-drop required.
* **Fuzzy Tab Search:** Real-time search engine that filters open tabs by title or URL, allowing you to instantly jump to specific documentation or repositories.
* **Intelligent Categorization:** An offline algorithm that scans active URLs to detect and label your current workflow (e.g., "Coding & Development", "Work & Documents").
* **100% Privacy & Zero Latency:** Executes entirely offline on the client side. No external server requests, no paid APIs, and no data tracking.

## 🛠️ Technical Stack

* **Frontend:** Vanilla JavaScript, HTML5, CSS3
* **Architecture:** Chrome Extension API (Manifest V3)
* **Core APIs:** `chrome.tabs`, `chrome.tabGroups`, `chrome.windows`
* **Search Engine:** Custom offline token-based filtering

## 🚀 Installation & Setup (Local Development)

To run this extension locally on your machine, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/smart-tab-manager.git](https://github.com/your-username/smart-tab-manager.git)
   cd smart-tab-manager
