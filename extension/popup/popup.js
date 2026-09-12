let allTabs = [];

document.addEventListener("DOMContentLoaded", () => {

  fetchAndRenderTabs();

  setupDropdowns();

  document
    .getElementById("search-input")
    ?.addEventListener("input", handleSearch);

  document
    .getElementById("clear-search-btn")
    ?.addEventListener("click", clearSearch);

  document
    .getElementById("popout-btn")
    ?.addEventListener("click", openPopout);


  // GROUP OPTIONS
  document
    .getElementById("group-domain")
    ?.addEventListener("click", () => {
      groupByDomain();
      closeDropdowns();
    });

  document
    .getElementById("group-window")
    ?.addEventListener("click", () => {
      groupByWindow();
      closeDropdowns();
    });

  document
    .getElementById("group-none")
    ?.addEventListener("click", () => {
      removeGroups();
      closeDropdowns();
    });


  // SORT OPTIONS
  document
    .getElementById("sort-domain")
    ?.addEventListener("click", () => {
      sortByDomain();
      closeDropdowns();
    });

  document
    .getElementById("sort-title")
    ?.addEventListener("click", () => {
      sortByTitle();
      closeDropdowns();
    });

  document
    .getElementById("sort-recent")
    ?.addEventListener("click", () => {
      sortByRecent();
      closeDropdowns();
    });


  // DEDUPE OPTIONS
  document
    .getElementById("dedup-url")
    ?.addEventListener("click", () => {
      deduplicateURLs();
      closeDropdowns();
    });

  document
    .getElementById("dedup-domain")
    ?.addEventListener("click", () => {
      deduplicateDomains();
      closeDropdowns();
    });

});


// =============================
// DROPDOWNS
// =============================

function setupDropdowns() {

  const dropdownButtons = document.querySelectorAll(".dropdown-btn");

  dropdownButtons.forEach(button => {

    button.addEventListener("click", (event) => {

      event.stopPropagation();

      const dropdown = button.closest(".dropdown");

      document.querySelectorAll(".dropdown").forEach(item => {

        if (item !== dropdown) {
          item.classList.remove("active");
        }

      });

      dropdown.classList.toggle("active");

    });

  });


  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    closeDropdowns();
  });

}


function closeDropdowns() {

  document.querySelectorAll(".dropdown").forEach(dropdown => {
    dropdown.classList.remove("active");
  });

}


// =============================
// GET TABS
// =============================

function fetchAndRenderTabs() {

  chrome.tabs.query({}, tabs => {

    allTabs = tabs;

    renderTabs(allTabs);

  });

}


// =============================
// DISPLAY TABS
// =============================

function renderTabs(tabs) {

  const list = document.getElementById("tab-list");
  const emptyState = document.getElementById("empty-state");
  const count = document.getElementById("tab-count");

  list.innerHTML = "";

  count.textContent =
    tabs.length + (tabs.length === 1 ? " tab" : " tabs");


  if (tabs.length === 0) {

    emptyState.classList.remove("hidden");

    return;

  }

  emptyState.classList.add("hidden");


  tabs.forEach(tab => {

    const li = document.createElement("li");

    li.className = "tab-item";

    li.innerHTML = `
      <div class="tab-info">

        <div class="tab-title">
          ${escapeHTML(tab.title || "Untitled")}
        </div>

        <div class="tab-url">
          ${escapeHTML(tab.url || "")}
        </div>

      </div>

      <button
        class="close-tab"
        data-id="${tab.id}"
        title="Close tab"
      >
        <span class="material-symbols-outlined">
          close
        </span>
      </button>
    `;


    li.addEventListener("click", event => {

      if (
        event.target.closest(".close-tab")
      ) {
        return;
      }

      chrome.tabs.update(tab.id, {
        active: true
      });

      chrome.windows.update(tab.windowId, {
        focused: true
      });

    });


    li.querySelector(".close-tab")
      .addEventListener("click", () => {

        chrome.tabs.remove(tab.id);

        allTabs = allTabs.filter(
          t => t.id !== tab.id
        );

        renderTabs(allTabs);

      });


    list.appendChild(li);

  });

}


// =============================
// SEARCH
// =============================

function handleSearch(event) {

  const query =
    event.target.value.toLowerCase().trim();

  const clearButton =
    document.getElementById("clear-search-btn");


  if (query) {
    clearButton.classList.remove("hidden");
  } else {
    clearButton.classList.add("hidden");
  }


  const filteredTabs = allTabs.filter(tab => {

    const title =
      (tab.title || "").toLowerCase();

    const url =
      (tab.url || "").toLowerCase();

    return (
      title.includes(query) ||
      url.includes(query)
    );

  });


  renderTabs(filteredTabs);

}


function clearSearch() {

  const input =
    document.getElementById("search-input");

  input.value = "";

  document
    .getElementById("clear-search-btn")
    .classList.add("hidden");

  renderTabs(allTabs);

}


// =============================
// GROUP BY DOMAIN
// =============================

function groupByDomain() {

  const groups = {};

  allTabs.forEach(tab => {

    try {

      const domain =
        new URL(tab.url).hostname;

      if (!groups[domain]) {
        groups[domain] = [];
      }

      groups[domain].push(tab);

    } catch {
      console.log("Invalid URL:", tab.url);
    }

  });


  console.log("Grouped tabs:", groups);

}


// =============================
// GROUP BY WINDOW
// =============================

function groupByWindow() {

  const groups = {};

  allTabs.forEach(tab => {

    if (!groups[tab.windowId]) {
      groups[tab.windowId] = [];
    }

    groups[tab.windowId].push(tab);

  });


  console.log("Tabs grouped by window:", groups);

}


// =============================
// REMOVE GROUPS
// =============================

function removeGroups() {

  console.log("Remove groups selected");

}


// =============================
// SORT BY DOMAIN
// =============================

function sortByDomain() {

  const sortedTabs = [...allTabs].sort((a, b) => {

    const domainA =
      getDomain(a.url);

    const domainB =
      getDomain(b.url);

    return domainA.localeCompare(domainB);

  });

  renderTabs(sortedTabs);

}


// =============================
// SORT BY TITLE
// =============================

function sortByTitle() {

  const sortedTabs = [...allTabs].sort((a, b) => {

    return (a.title || "").localeCompare(
      b.title || ""
    );

  });

  renderTabs(sortedTabs);

}


// =============================
// SORT BY RECENT
// =============================

function sortByRecent() {

  const sortedTabs = [...allTabs].sort((a, b) => {

    return b.lastAccessed - a.lastAccessed;

  });

  renderTabs(sortedTabs);

}


// =============================
// DEDUPLICATE URLS
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

    chrome.tabs.remove(duplicateIds);

    allTabs = allTabs.filter(
      tab => !duplicateIds.includes(tab.id)
    );

    renderTabs(allTabs);

  }

}


// =============================
// DEDUPLICATE DOMAINS
// =============================

function deduplicateDomains() {

  const seen = new Set();

  const duplicateIds = [];


  allTabs.forEach(tab => {

    const domain =
      getDomain(tab.url);

    if (!domain) return;


    if (seen.has(domain)) {

      duplicateIds.push(tab.id);

    } else {

      seen.add(domain);

    }

  });


  if (duplicateIds.length > 0) {

    chrome.tabs.remove(duplicateIds);

    allTabs = allTabs.filter(
      tab => !duplicateIds.includes(tab.id)
    );

    renderTabs(allTabs);

  }

}


// =============================
// POP OUT
// =============================

function openPopout() {

  chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 600,
    height: 700
  });

}


// =============================
// HELPERS
// =============================

function getDomain(url) {

  try {

    return new URL(url).hostname;

  } catch {

    return "";

  }

}


function escapeHTML(text) {

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;

}