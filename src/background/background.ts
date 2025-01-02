// const blockedSites = ["underdogfantasy.com", "prizepicks.com"];
// let timerActive = false;
// let timerId: NodeJS.Timeout | null = null;

// // Helper to update blocking rules
// const updateBlockingRules = (shouldBlock: boolean) => {
//   chrome.declarativeNetRequest.updateEnabledRulesets({
//     enableRulesetIds: shouldBlock ? ["block_betting_sites"] : [],
//     disableRulesetIds: shouldBlock ? [] : ["block_betting_sites"],
//   });
// };

// // Initialize on load
// chrome.runtime.onInstalled.addListener(() => {
//   updateBlockingRules(true); // Block sites by default
// });

// // Restore state on extension start
// chrome.runtime.onStartup.addListener(() => {
//   chrome.storage.local.get(["timerExpiration"], (result) => {
//     const currentTime = Date.now();
//     const timerExpiration = result.timerExpiration || 0;

//     if (currentTime >= timerExpiration) {
//       // Timer expired, block sites
//       updateBlockingRules(true);
//       chrome.storage.local.remove("timerExpiration");
//     } else {
//       // Timer still active, unblock sites and set remaining timer
//       const remainingTime = timerExpiration - currentTime;
//       updateBlockingRules(false);
//       startTimer(remainingTime / 1000); // Convert ms to seconds
//     }
//   });
// });

// // Start a timer and persist its state
// const startTimer = (durationSeconds: number) => {
//   const expirationTime = Date.now() + durationSeconds * 1000; // Calculate expiration time
//   chrome.storage.local.set({ timerExpiration: expirationTime });
//   updateBlockingRules(false); // Unblock sites
//   timerActive = true;

//   if (timerId) clearTimeout(timerId); // Clear any existing timer
//   timerId = setTimeout(() => {
//     updateBlockingRules(true); // Re-block sites after timer
//     timerActive = false;
//     chrome.storage.local.remove("timerExpiration");
//   }, durationSeconds * 1000);
// };

// // Listen for messages
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "startTimer" && !timerActive) {
//     startTimer(message.duration);
//   } else if (message.action === "timerExpired") {
//     if (timerId) {
//       clearTimeout(timerId);
//       timerId = null;
//     }
//     updateBlockingRules(true);
//     timerActive = false;
//     chrome.storage.local.remove("timerExpiration");
//   }
// });

const blockedSites = ["underdogfantasy.com", "prizepicks.com"];
let timerActive = false;
let timerId: NodeJS.Timeout | null = null;

// Helper to update blocking rules
const updateBlockingRules = (shouldBlock: boolean) => {
  chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: shouldBlock ? ["block_betting_sites"] : [],
    disableRulesetIds: shouldBlock ? [] : ["block_betting_sites"],
  });
};

// Initialize on load
chrome.runtime.onInstalled.addListener(() => {
  updateBlockingRules(true); // Block sites by default
});

// Restore state on extension start
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(["timerExpiration"], (result) => {
    const currentTime = Date.now();
    const timerExpiration = result.timerExpiration || 0;

    if (currentTime >= timerExpiration) {
      // Timer expired, block sites
      updateBlockingRules(true);
      chrome.storage.local.remove("timerExpiration");
    } else {
      // Timer still active, unblock sites and set remaining timer
      const remainingTime = timerExpiration - currentTime;
      updateBlockingRules(false);
      startTimer(remainingTime / 1000); // Convert ms to seconds
    }
  });
});

// Start a timer and persist its state
const startTimer = (durationSeconds: number) => {
  const expirationTime = Date.now() + durationSeconds * 1000; // Calculate expiration time
  chrome.storage.local.set({ timerExpiration: expirationTime });
  updateBlockingRules(false); // Unblock sites
  timerActive = true;

  if (timerId) clearTimeout(timerId); // Clear any existing timer
  timerId = setTimeout(() => {
    updateBlockingRules(true); // Re-block sites after timer
    timerActive = false;
    chrome.storage.local.remove("timerExpiration");
  }, durationSeconds * 1000);
};

// Listen for messages
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

  // Explicitly return true for asynchronous operations
  return true;
});
