const BACKEND_URL = "http://localhost:3000";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "groupTabs") {
    groupTabsWithAI(request.tabs).then(sendResponse).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  }

  if (request.action === "applyGroups") {
    applyTabGroups(request.groups).then(sendResponse).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  }
});

async function groupTabsWithAI(tabs) {
  if (!tabs || tabs.length === 0) {
    throw new Error("No tabs provided");
  }

  const tabsForAI = tabs.map(tab => ({
    id: tab.id,
    title: tab.title || "Untitled",
    url: tab.url || "",
    domain: getDomain(tab.url)
  }));

  const response = await fetch(`${BACKEND_URL}/api/group`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ tabs: tabsForAI })
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data.groups;
}

async function applyTabGroups(groups) {
  if (!chrome.tabs.group) {
    throw new Error("Tab groups API not available");
  }

  for (const group of groups) {
    if (group.tabIds && group.tabIds.length > 0) {
      try {
        const groupId = await chrome.tabs.group({ tabIds: group.tabIds });
        await chrome.tabGroups.update(groupId, { title: group.name });
      } catch (error) {
        console.error(`Failed to group tabs: ${error.message}`);
      }
    }
  }

  return { success: true };
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}
