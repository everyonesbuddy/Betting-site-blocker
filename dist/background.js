(()=>{const e=["underdogfantasy.com","prizepicks.com"];let t=!1,o=null;const r=e=>{chrome.declarativeNetRequest.updateEnabledRulesets({enableRulesetIds:e?["block_betting_sites"]:[],disableRulesetIds:e?[]:["block_betting_sites"]})};chrome.runtime.onInstalled.addListener((()=>{r(!0)})),chrome.runtime.onStartup.addListener((()=>{chrome.storage.local.get(["timerExpiration"],(e=>{const t=Date.now(),o=e.timerExpiration||0;if(t>=o)r(!0),chrome.storage.local.remove("timerExpiration");else{const e=o-t;r(!1),i(e/1e3)}}))}));const i=e=>{const i=Date.now()+1e3*e;chrome.storage.local.set({timerExpiration:i}),r(!1),t=!0,o&&clearTimeout(o),o=setTimeout((()=>{r(!0),t=!1,chrome.storage.local.remove("timerExpiration")}),1e3*e)};chrome.runtime.onMessage.addListener(((s,a,n)=>("startTimer"!==s.action||t?"timerExpired"===s.action?(o&&(clearTimeout(o),o=null),r(!0),t=!1,chrome.storage.local.remove("timerExpiration"),n({success:!0})):"getBlockedSites"===s.action?n({blockedSites:e}):n({error:"Unknown action"}):(i(s.duration),n({success:!0})),!0)))})();