import UnlockExtensionService from "~services/UnlockExtensionService";
import { ExtensionBadgeService } from "~services/ExtensionBadgeService";

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // on extension installation
        chrome.runtime.openOptionsPage();
    } else if (details.reason === 'update') {
        // on extension update
        ExtensionBadgeService.updateAllTabsIcon();
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    UnlockExtensionService.isUnlocked().then(async (isUnlocked) => {
        if (isUnlocked) {
            await ExtensionBadgeService.createIconForTab(tab);
        } else {
            ExtensionBadgeService.displayLockIcons();
        }
    });
});

chrome.tabs.onActivated.addListener((activeInfo: chrome.tabs.TabActiveInfo) => {
    chrome.tabs.get(activeInfo.tabId).then((tab) => {
        UnlockExtensionService.isUnlocked().then(async (isUnlocked) => {
            if (isUnlocked) {
                await ExtensionBadgeService.createIconForTab(tab);
            } else {
                ExtensionBadgeService.displayLockIcons();
            }
        });
    });
});

export {}
