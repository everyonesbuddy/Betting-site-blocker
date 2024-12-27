chrome.runtime.sendMessage("From the Content Script", (response) => {
  console.log(response);
});
