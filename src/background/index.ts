chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // on extension installation
        chrome.runtime.openOptionsPage();
    } else if (details.reason === 'update') {
        // on extension update
    }
});

export {}
