import ExtensionUnlockService from "@/services/ExtensionUnlockService";
import { CustomCredentialFilterService } from "@/services/CustomCredentialFilterService";
import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
import ContextMenuService from "@/services/backend/ContextMenuService";
import { i18n } from "@/lib/i18n";
import browser from "webextension-polyfill";
import { CredentialFilterService, FILTERS } from "@binsky/passman-client-ts/lib/Service/CredentialFilterService";

/**
 * Required manifest-specific browser action assignment, since webextension-polyfill does not yet have a solution for it.
 * https://github.com/mozilla/webextension-polyfill/issues/329
 */
const browserAction = import.meta.env.MANIFEST_VERSION === 2 ? browser.browserAction : browser.action;

export class ExtensionBadgeService {
    public static readonly DEFAULT_BADGE_BG_COLOR = '#0082c9';

    public static readonly updateAllTabsIcon = (isFrontendCall = false) => {
        ExtensionUnlockService.isUnlocked().then((isUnlocked) => {
            if (isUnlocked) {
                ExtensionUnlockService.getUnlockedDefaultVault(isFrontendCall).then(async (vault) => {
                    if (vault) {
                        if (vault.credentials.length <= 1) {
                            await vault.refresh(true);
                        }

                        browser.tabs.query({}).then(async (tabs) => {
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
    public static readonly createIconForTab = async (tab: browser.Tabs.Tab, ignoreUnlockedCheck = false, vault?: Vault, isFrontendCall = false) => {
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

        const credentialsForUrl = await CustomCredentialFilterService.getCredentialsByUrl(url, vault.credentials);
        const credentialsForTab = CredentialFilterService.getFilteredCredentials(credentialsForUrl ?? [], FILTERS.SHOW_ALL);
        const credentialAmount = credentialsForTab?.length ?? 0;

        if (tab.active) {
            ContextMenuService.updateActiveTabSpecificContextMenuItems(credentialsForTab ?? []);
        }

        await browserAction.setBadgeText({
            text: credentialAmount.toString(),
            tabId: tab.id
        });
        await browserAction.setBadgeBackgroundColor({
            color: ExtensionBadgeService.DEFAULT_BADGE_BG_COLOR,
            tabId: tab.id
        });

        const plural = (credentialAmount === 1) ? i18n.getMessage('credential') : i18n.getMessage('credentials');
        await browserAction.setTitle({
            title: i18n.getMessage('browser_action_title_login', [credentialAmount.toString(), plural.toString().toLowerCase()]),
            tabId: tab.id
        });
    }

    public static readonly displayLockIcons = () => {
        browser.tabs.query({}).then(async (tabs) => {
            for (const tab of tabs) {
                await browserAction.setBadgeText({
                    text: '🔑',
                    tabId: tab.id
                });
                await browserAction.setBadgeBackgroundColor({
                    color: '#ff0000',
                    tabId: tab.id
                });
                await browserAction.setTitle({
                    title: i18n.getMessage('browser_action_title_locked'),
                    tabId: tab.id
                });
            }
        });
    }
}
