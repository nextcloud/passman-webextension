import UnlockExtensionService from "~services/UnlockExtensionService";
import { CustomCredentialFilterService } from "~services/CustomCredentialFilterService";
import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";

export class ExtensionBadgeService {
    public static readonly DEFAULT_BADGE_BG_COLOR = '#0082c9';

    public static updateAllTabsIcon = () => {
        UnlockExtensionService.isUnlocked().then((isUnlocked) => {
            if (isUnlocked) {
                UnlockExtensionService.getUnlockedDefaultVault().then(async (vault) => {
                    if (vault) {
                        if (vault.credentials.length <= 1) {
                            await vault.refresh(true);
                        }

                        chrome.tabs.query({}).then(async (tabs) => {
                            for (const tab of tabs) {
                                await ExtensionBadgeService.createIconForTab(tab, true, vault);
                            }
                        });
                    }
                });
            } else {
                ExtensionBadgeService.displayLogoutIcons();
            }
        });
    }

    /**
     * @param tab
     * @param ignoreUnlockedCheck could cause errors if this is true, but the extension is not unlocked! use carefully!
     * @param vault
     */
    public static createIconForTab = async (tab: chrome.tabs.Tab, ignoreUnlockedCheck = false, vault?: Vault) => {
        if (!vault) {
            vault = await UnlockExtensionService.getUnlockedDefaultVault();
            if (vault) {
                if (vault.credentials.length <= 1) {
                    await vault.refresh(true);
                }
            }
        }

        if (!vault || !ignoreUnlockedCheck && !await UnlockExtensionService.isUnlocked()) {
            return;
        }

        const credentialsForTab = await CustomCredentialFilterService.getCredentialsByUrl(tab.url, vault.credentials);
        const credentialAmount = credentialsForTab.length;

        if (tab.active) {
            // todo: update contextMenu
            // window.contextMenu.setContextItems(credentialsForTab);
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
            title: chrome.i18n.getMessage('browser_action_title_login', [credentialAmount.toString(), plural.toString()]),
            tabId: tab.id
        });
    }

    public static displayLogoutIcons = () => {
        // todo: implement
    }
}
