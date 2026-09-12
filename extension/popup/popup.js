let allTabs = [];
let selectedTabIds = new Set();
let activeFilter = "all"; // 'all', 'audio', 'pinned'

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  fetchAndRenderTabs();
  setupDropdowns();
  setupNavigation();
  setupGlobalActions();
});

// =============================
// THEME MANAGEMENT
// =============================

function initTheme() {
  const savedTheme = localStorage.getItem("tabflow_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("tabflow_theme", nextTheme);
  });
}

// =============================
// NAVIGATION & FILTERS
// =============================

function setupNavigation() {
  const navItems = {
    "nav-all": "all",
    "nav-audio": "audio",
    "nav-pinned": "pinned"
  };

  Object.keys(navItems).forEach(id => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
      e.currentTarget.classList.add("active");
      
      activeFilter = navItems[id];
      updateSectionTitle();
      applyFiltersAndRender();
    });
  });
}

function updateSectionTitle() {
  const titleMap = {
    all: "All Open Tabs",
    audio: "Tabs Playing Audio",
    pinned: "Pinned Tabs"
  };
  const titleEl = document.getElementById("section-title");
  if (titleEl) titleEl.textContent = titleMap[activeFilter] || "Tabs";
}

// =============================
// GLOBAL EVENT HANDLERS
// =============================

function setupGlobalActions() {
  document.getElementById("search-input")?.addEventListener("input", handleSearch);
  document.getElementById("clear-search-btn")?.addEventListener("click", clearSearch);
  
  document.getElementById("new-tab-btn")?.addEventListener("click", () => {
    chrome.tabs.create({});
  });

  document.getElementById("select-all-btn")?.addEventListener("click", () => {
    const filtered = getFilteredTabs();
    if (selectedTabIds.size === filtered.length) {
      selectedTabIds.clear();
    } else {
      filtered.forEach(tab => selectedTabIds.add(tab.id));
    }
    applyFiltersAndRender();
  });

  document.getElementById("close-selected-btn")?.addEventListener("click", closeSelectedTabs);

  // Group Handlers
  document.getElementById("group-domain")?.addEventListener("click", () => { groupByDomain(); closeDropdowns(); });
  document.getElementById("group-window")?.addEventListener("click", () => { groupByWindow(); closeDropdowns(); });
  document.getElementById("group-none")?.addEventListener("click", () => { removeGroups(); closeDropdowns(); });

  // Sort Handlers
  document.getElementById("sort-domain")?.addEventListener("click", () => { sortByDomain(); closeDropdowns(); });
  document.getElementById("sort-title")?.addEventListener("click", () => { sortByTitle(); closeDropdowns(); });
  document.getElementById("sort-recent")?.addEventListener("click", () => { sortByRecent(); closeDropdowns(); });

  // Dedupe Handlers
  document.getElementById("dedup-url")?.addEventListener("click", () => { deduplicateURLs(); closeDropdowns(); });
  document.getElementById("dedup-domain")?.addEventListener("click", () => { deduplicateDomains(); closeDropdowns(); });
}

// =============================
// DROPDOWNS MANAGEMENT
// =============================

function setupDropdowns() {
  const dropdownButtons = document.querySelectorAll(".dropdown-btn");

  dropdownButtons.forEach(button => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const dropdown = button.closest(".dropdown");

      document.querySelectorAll(".dropdown").forEach(item => {
        if (item !== dropdown) item.classList.remove("active");
      });

      dropdown.classList.toggle("active");
    });
  });

  document.addEventListener("click", () => closeDropdowns());
}

function closeDropdowns() {
  document.querySelectorAll(".dropdown").forEach(dropdown => {
    dropdown.classList.remove("active");
  });
}

// =============================
// FETCH & RENDER
// =============================

function fetchAndRenderTabs() {
  chrome.tabs.query({}, tabs => {
    allTabs = tabs;
    updateNavigationBadges();
    applyFiltersAndRender();
  });
}

function updateNavigationBadges() {
  document.getElementById("nav-count-all").textContent = allTabs.length;
  document.getElementById("nav-count-audio").textContent = allTabs.filter(t => t.audible).length;
  document.getElementById("nav-count-pinned").textContent = allTabs.filter(t => t.pinned).length;
}

function getFilteredTabs() {
  const query = (document.getElementById("search-input")?.value || "").toLowerCase().trim();

  return allTabs.filter(tab => {
    // Navigation Category Filter
    if (activeFilter === "audio" && !tab.audible) return false;
    if (activeFilter === "pinned" && !tab.pinned) return false;

    // Search Query Filter
    if (query) {
      const title = (tab.title || "").toLowerCase();
      const url = (tab.url || "").toLowerCase();
      return title.includes(query) || url.includes(query);
    }

    return true;
  });
}

function applyFiltersAndRender() {
  const tabsToDisplay = getFilteredTabs();
  renderTabs(tabsToDisplay);
}

function renderTabs(tabs) {
  const list = document.getElementById("tab-list");
  const emptyState = document.getElementById("empty-state");
  const count = document.getElementById("tab-count");
  const windowCount = document.getElementById("window-count");
  const selectedBtn = document.getElementById("close-selected-btn");
  const selectedCountEl = document.getElementById("selected-count");

  list.innerHTML = "";

  // Stats updates
  const uniqueWindows = new Set(allTabs.map(t => t.windowId)).size;
  count.textContent = `${allTabs.length} ${allTabs.length === 1 ? 'tab' : 'tabs'} total`;
  windowCount.textContent = `${uniqueWindows} active ${uniqueWindows === 1 ? 'window' : 'windows'}`;

  // Selection state button updates
  if (selectedTabIds.size > 0) {
    selectedBtn.classList.remove("hidden");
    selectedCountEl.textContent = selectedTabIds.size;
  } else {
    selectedBtn.classList.add("hidden");
  }

  if (tabs.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  tabs.forEach(tab => {
    const card = document.createElement("div");
    const isSelected = selectedTabIds.has(tab.id);
    card.className = `tab-card ${tab.active ? 'active-tab' : ''} ${isSelected ? 'selected' : ''}`;

    const faviconUrl = tab.favIconUrl && !tab.favIconUrl.startsWith("chrome://") 
      ? tab.favIconUrl 
      : "https://www.google.com/s2/favicons?sz=64&domain=chrome";

    card.innerHTML = `
      <div class="tab-card-header">
        <input type="checkbox" class="tab-checkbox" data-id="${tab.id}" ${isSelected ? 'checked' : ''} />
        <img class="tab-favicon" src="${escapeHTML(faviconUrl)}" alt="" onerror="this.src='https://www.google.com/s2/favicons?sz=64&domain=chrome'" />
        <div class="tab-title" title="${escapeHTML(tab.title || "Untitled")}">${escapeHTML(tab.title || "Untitled")}</div>
      </div>

      <div class="tab-card-body">
        <div class="tab-url" title="${escapeHTML(tab.url || "")}">${escapeHTML(getDomain(tab.url) || tab.url || "")}</div>
      </div>

      <div class="tab-card-footer">
        <div class="tab-badges">
          ${tab.audible ? '<span class="material-symbols-outlined tab-status-icon audible" title="Playing Audio">volume_up</span>' : ''}
          ${tab.pinned ? '<span class="material-symbols-outlined tab-status-icon" title="Pinned Tab">push_pin</span>' : ''}
        </div>
        <button class="icon-btn close-btn" data-id="${tab.id}" title="Close Tab">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    `;

    // Tab Activation Click
    card.addEventListener("click", (e) => {
      if (e.target.closest(".close-btn") || e.target.closest(".tab-checkbox")) return;
      
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
    });

    // Individual Selection Checkbox
    card.querySelector(".tab-checkbox").addEventListener("change", (e) => {
      e.stopPropagation();
      if (e.target.checked) {
        selectedTabIds.add(tab.id);
      } else {
        selectedTabIds.delete(tab.id);
      }
      applyFiltersAndRender();
    });

    // Close Tab Handler
    card.querySelector(".close-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.tabs.remove(tab.id, () => {
        allTabs = allTabs.filter(t => t.id !== tab.id);
        selectedTabIds.delete(tab.id);
        updateNavigationBadges();
        applyFiltersAndRender();
      });
    });

    list.appendChild(card);
  });
}

// =============================
// SEARCH & BULK ACTIONS
// =============================

function handleSearch(event) {
  const query = event.target.value.trim();
  const clearButton = document.getElementById("clear-search-btn");

  if (query) {
    clearButton.classList.remove("hidden");
  } else {
    clearButton.classList.add("hidden");
  }

  applyFiltersAndRender();
}

function clearSearch() {
  const input = document.getElementById("search-input");
  input.value = "";
  document.getElementById("clear-search-btn").classList.add("hidden");
  applyFiltersAndRender();
}

function closeSelectedTabs() {
  const idsToRemove = Array.from(selectedTabIds);
  if (idsToRemove.length === 0) return;

  chrome.tabs.remove(idsToRemove, () => {
    allTabs = allTabs.filter(tab => !selectedTabIds.has(tab.id));
    selectedTabIds.clear();
    updateNavigationBadges();
    applyFiltersAndRender();
  });
}

// =============================
// GROUPING FUNCTIONS
// =============================

async function groupByDomain() {
  const groups = {};

  allTabs.forEach(tab => {
    const domain = getDomain(tab.url) || "other";
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(tab.id);
  });

  for (const [domain, tabIds] of Object.entries(groups)) {
    if (tabIds.length > 1 && chrome.tabs.group) {
      const groupId = await chrome.tabs.group({ tabIds });
      chrome.tabGroups.update(groupId, { title: domain.toUpperCase() });
    }
  }
}

async function groupByWindow() {
  const groups = {};

  allTabs.forEach(tab => {
    if (!groups[tab.windowId]) groups[tab.windowId] = [];
    groups[tab.windowId].push(tab.id);
  });

  for (const [windowId, tabIds] of Object.entries(groups)) {
    if (chrome.tabs.group) {
      const groupId = await chrome.tabs.group({ tabIds });
      chrome.tabGroups.update(groupId, { title: `Window ${windowId}` });
    }
  }
}

function removeGroups() {
  const tabIds = allTabs.map(t => t.id);
  if (chrome.tabs.ungroup) {
    chrome.tabs.ungroup(tabIds);
  }
}

// =============================
// SORTING FUNCTIONS
// =============================

function sortByDomain() {
  allTabs.sort((a, b) => getDomain(a.url).localeCompare(getDomain(b.url)));
  applyFiltersAndRender();
}

function sortByTitle() {
  allTabs.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  applyFiltersAndRender();
}

function sortByRecent() {
  allTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  applyFiltersAndRender();
}

// =============================
// DEDUPLICATION FUNCTIONS
// =============================

function deduplicateURLs() {
  const seen = new Set();
  const duplicateIds = [];

  allTabs.forEach(tab => {
    if (seen.has(tab.url)) {
      duplicateIds.push(tab.id);
    } else {
      seen.add(tab.url);
    }
  });

  if (duplicateIds.length > 0) {
    chrome.tabs.remove(duplicateIds, () => {
      allTabs = allTabs.filter(t => !duplicateIds.includes(t.id));
      updateNavigationBadges();
      applyFiltersAndRender();
    });
  }
}

function deduplicateDomains() {
  const seen = new Set();
  const duplicateIds = [];

  allTabs.forEach(tab => {
    const domain = getDomain(tab.url);
    if (!domain) return;

    if (seen.has(domain)) {
      duplicateIds.push(tab.id);
    } else {
      seen.add(domain);
    }
  });

  if (duplicateIds.length > 0) {
    chrome.tabs.remove(duplicateIds, () => {
      allTabs = allTabs.filter(t => !duplicateIds.includes(t.id));
      updateNavigationBadges();
      applyFiltersAndRender();
    });
  }
}

// =============================
// HELPER UTILITIES
// =============================

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}