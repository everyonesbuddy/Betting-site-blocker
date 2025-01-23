const blockedSites = ["underdogfantasy.com", "prizepicks.com"];
let timerActive = false;
let timerId: NodeJS.Timeout | null = null;

const updateBlockingRules = (shouldBlock: boolean) => {
  chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: shouldBlock ? ["block_betting_sites"] : [],
    disableRulesetIds: shouldBlock ? [] : ["block_betting_sites"],
  });
  console.log("Blocking rules updated:", shouldBlock ? "Block" : "Unblock");
};

chrome.runtime.onInstalled.addListener(() => {
  updateBlockingRules(true);
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(["timerExpiration"], (result) => {
    const currentTime = Date.now();
    const timerExpiration = result.timerExpiration || 0;

    if (currentTime >= timerExpiration) {
      updateBlockingRules(true);
      chrome.storage.local.remove("timerExpiration");
    } else {
      const remainingTime = timerExpiration - currentTime;
      updateBlockingRules(false);
      startTimer(remainingTime / 1000);
    }
  });
});

const startTimer = (durationSeconds: number) => {
  if (timerActive) return; // Prevent multiple active timers

  if (timerId) clearTimeout(timerId); // Clear any existing timer

  const expirationTime = Date.now() + durationSeconds * 1000;
  chrome.storage.local.set({ timerExpiration: expirationTime });
  updateBlockingRules(false);

  timerActive = true;
  timerId = setTimeout(() => {
    timerId = null;
    timerActive = false;
    updateBlockingRules(true);
    chrome.storage.local.remove("timerExpiration", () => {
      console.log("Timer expired, sites re-blocked");
      chrome.runtime.reload(); // Reload the extension when the timer ends
    });
  }, durationSeconds * 1000);

  console.log("Timer started for:", durationSeconds, "seconds");
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startTimer" && !timerActive) {
    startTimer(message.duration);
    sendResponse({ success: true });
  } else if (message.action === "timerExpired") {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    updateBlockingRules(true);
    timerActive = false;
    chrome.storage.local.remove("timerExpiration");
    sendResponse({ success: true });
  } else if (message.action === "getBlockedSites") {
    sendResponse({ blockedSites });
  } else {
    sendResponse({ error: "Unknown action" });
  }

  return true;
});

// Function to reload the extension
function reloadExtension() {
  chrome.runtime.reload();
}

// Set an interval to reload the extension every 5 minutes (300,000 milliseconds)
setInterval(reloadExtension, 300000);
