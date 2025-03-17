import ExtensionUnlockService from "~services/ExtensionUnlockService";
import { CustomCredentialFilterService } from "~services/CustomCredentialFilterService";
import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
import ContextMenuService from "~services/backend/ContextMenuService";

export class ExtensionBadgeService {
    public static readonly DEFAULT_BADGE_BG_COLOR = '#0082c9';

    public static updateAllTabsIcon = (isFrontendCall = false) => {
        ExtensionUnlockService.isUnlocked().then((isUnlocked) => {
            if (isUnlocked) {
                ExtensionUnlockService.getUnlockedDefaultVault(isFrontendCall).then(async (vault) => {
                    if (vault) {
                        if (vault.credentials.length <= 1) {
                            await vault.refresh(true);
                        }

                        chrome.tabs.query({}).then(async (tabs) => {
                            for (const tab of tabs) {
                                await ExtensionBadgeService.createIconForTab(tab, true, vault, isFrontendCall);
                            }
                        });
                    }
                });
            } else {
                ExtensionBadgeService.displayLockIcons();
            }
        });
    }

    /**
     * Creates / updates the tab icon with the credential count. Updates the tab specific context menu as well (if it is active).
     * @param tab
     * @param ignoreUnlockedCheck could cause errors if this is true, but the extension is not unlocked! use carefully!
     * @param vault
     * @param isFrontendCall
     */
    public static createIconForTab = async (tab: chrome.tabs.Tab, ignoreUnlockedCheck = false, vault?: Vault, isFrontendCall = false) => {
        if (!vault) {
            vault = await ExtensionUnlockService.getUnlockedDefaultVault(isFrontendCall);
            if (vault) {
                if (vault.credentials.length <= 1) {
                    await vault.refresh(true);
                }
            }
        }
        const url = tab.url ?? tab.pendingUrl;

        if (!vault || !ignoreUnlockedCheck && !await ExtensionUnlockService.isUnlocked() || !url) {
            return;
        }

        const credentialsForTab = await CustomCredentialFilterService.getCredentialsByUrl(url, vault.credentials);
        const credentialAmount = credentialsForTab.length;

        if (tab.active) {
            ContextMenuService.updateActiveTabSpecificContextMenuItems(credentialsForTab);
        }

        await chrome.action.setBadgeText({
            text: credentialAmount.toString(),
            tabId: tab.id
        });
        await chrome.action.setBadgeBackgroundColor({
            color: ExtensionBadgeService.DEFAULT_BADGE_BG_COLOR,
            tabId: tab.id
        });

        const plural = (credentialAmount === 1) ? chrome.i18n.getMessage('credential') : chrome.i18n.getMessage('credentials');
        await chrome.action.setTitle({
            title: chrome.i18n.getMessage('browser_action_title_login', [credentialAmount.toString(), plural.toString().toLowerCase()]),
            tabId: tab.id
        });
    }

    public static displayLockIcons = () => {
        chrome.tabs.query({}).then(async (tabs) => {
            for (const tab of tabs) {
                await chrome.action.setBadgeText({
                    text: '🔑',
                    tabId: tab.id
                });
                await chrome.action.setBadgeBackgroundColor({
                    color: '#ff0000',
                    tabId: tab.id
                });
                await chrome.action.setTitle({
                    title: chrome.i18n.getMessage('browser_action_title_locked'),
                    tabId: tab.id
                });
            }
        });
    }
}
