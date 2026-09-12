
let allTabs = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderTabs();

  document.getElementById('search-input')?.addEventListener('input', handleSearch);
  document.getElementById('auto-group-btn')?.addEventListener('click', handleAutoGroup);
  document.getElementById('sort-domain-btn')?.addEventListener('click', handleSortTabs);
  document.getElementById('dedup-btn')?.addEventListener('click', handleDeduplicate);
  document.getElementById('popout-btn')?.addEventListener('click', handlePopout);
});

// 1. Fetch Open Tabs
async function fetchAndRenderTabs() {
  allTabs = await chrome.tabs.query({ currentWindow: true });
  renderTabList(allTabs);
}

// 2. Render List View
function renderTabList(tabsToRender) {
  const tabListContainer = document.getElementById('tab-list');
  const emptyState = document.getElementById('empty-state');
  const tabCountBadge = document.getElementById('tab-count');

  tabListContainer.innerHTML = '';
  tabCountBadge.textContent = `${tabsToRender.length} tabs`;

  if (tabsToRender.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  tabsToRender.forEach(tab => {
    const li = document.createElement('li');
    li.className = 'tab-item';

    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    favicon.src = tab.favIconUrl || 'https://www.google.com/s2/favicons?domain=chrome';
    favicon.onerror = () => { favicon.src = 'https://www.google.com/s2/favicons?domain=chrome'; };

    const infoDiv = document.createElement('div');
    infoDiv.className = 'tab-info';

    const titleSpan = document.createElement('div');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = tab.title;

    const urlSpan = document.createElement('div');
    urlSpan.className = 'tab-url';
    urlSpan.textContent = tab.url;

    infoDiv.append(titleSpan, urlSpan);

    // Switch focus to tab on click
    li.addEventListener('click', () => {
      chrome.tabs.update(tab.id, { active: true });
    });

    // Delete single tab button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'icon-btn close-btn';
    closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.remove(tab.id);
      li.remove();
      allTabs = allTabs.filter(t => t.id !== tab.id);
      tabCountBadge.textContent = `${allTabs.length} tabs`;
    });

    li.append(favicon, infoDiv, closeBtn);
    tabListContainer.appendChild(li);
  });
}

// 3. Search Filter
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const filtered = allTabs.filter(tab => 
    tab.title.toLowerCase().includes(query) || 
    tab.url.toLowerCase().includes(query)
  );
  renderTabList(filtered);
}

// 4. Auto-Group Tabs by Website Domain
async function handleAutoGroup() {
  const domainMap = {};

  allTabs.forEach(tab => {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      if (!domainMap[domain]) domainMap[domain] = [];
      domainMap[domain].push(tab.id);
    } catch (e) {
      // Ignore non-standard Chrome URLs
    }
  });

  for (const [domain, tabIds] of Object.entries(domainMap)) {
    if (tabIds.length > 1) {
      const group = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(group, { title: domain.toUpperCase() });
    }
  }
}

// 5. Sort Tabs Alphabetically by Domain
async function handleSortTabs() {
  const sortedTabs = [...allTabs].sort((a, b) => {
    const domainA = new URL(a.url).hostname;
    const domainB = new URL(b.url).hostname;
    return domainA.localeCompare(domainB);
  });

  for (let i = 0; i < sortedTabs.length; i++) {
    await chrome.tabs.move(sortedTabs[i].id, { index: i });
  }
  fetchAndRenderTabs();
}

// 6. Deduplicate Duplicate URLs
async function handleDeduplicate() {
  const seenUrls = new Set();
  const duplicateIds = [];

  allTabs.forEach(tab => {
    if (seenUrls.has(tab.url)) {
      duplicateIds.push(tab.id);
    } else {
      seenUrls.add(tab.url);
    }
  });

  if (duplicateIds.length > 0) {
    await chrome.tabs.remove(duplicateIds);
    fetchAndRenderTabs();
  }
}

// 7. Pop-out Window Option
function handlePopout() {
  chrome.windows.create({
    url: chrome.runtime.getURL('src/popup/popup.html?isPopout=true'),
    type: 'popup',
    width: 380,
    height: 560
  });
  window.close();
}