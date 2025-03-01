/******/ (() => { // webpackBootstrap
/*!********************************************!*\
  !*** ./src/contentScript/contentScript.ts ***!
  \********************************************/
chrome.runtime.sendMessage("From the Content Script", (response) => {
    console.log(response);
});

/******/ })()
;
//# sourceMappingURL=contentScript.js.map