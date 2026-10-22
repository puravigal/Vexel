chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    console.error("Vexel: unable to set side panel behavior", error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "VEXEL_GET_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      sendResponse({ tabId: tabs[0]?.id ?? null, url: tabs[0]?.url ?? null });
    }).catch((error: unknown) => {
      sendResponse({ error: error instanceof Error ? error.message : "Unable to read active tab" });
    });
    return true;
  }

  if (message?.type === "VEXEL_OPEN_PICKER" && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, { type: "VEXEL_START_PICKER" })
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "This page does not allow extension scripts."
      }));
    return true;
  }
});
