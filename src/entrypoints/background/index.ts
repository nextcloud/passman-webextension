import ExtensionUnlockService from "@/services/ExtensionUnlockService";
import { ExtensionBadgeService } from "@/services/backend/ExtensionBadgeService";
import ContextMenuService from "@/services/backend/ContextMenuService";
import ExtensionMigrationService from "@/services/ExtensionMigrationService";
import ConsoleLoggingService, { logger } from "@/services/ConsoleLoggingService";
import browser from "webextension-polyfill";

// Import all message handlers to register them
import './messages/ping';
import './messages/nextcloudServerMessagingConnectorApi';
import './messages/unlockExtension';
import './messages/lockExtension';
import './messages/setDefaultVault';
import './messages/getPossibleVaultsInfo';
import './messages/getPasswordGeneratorConfiguration';
import './messages/getPartiallyDecryptedFilteredCredentialsList';
import './messages/getExtensionUnlockState';
import './messages/getAutofillEnabledState';
import './messages/getEnableEmailAsUsernameFallbackFillingState';
import './messages/createCredentialForPicker';
import './messages/addNewServerConnection';
import './messages/setActiveServerConnection';
import './messages/removeServerConnection';
import './messages/listServerConnections';
import './messages/getCredentialsForVault';
import './messages/getPickerPageSettings';
import './messages/updatePickerPageSettings';
import './messages/cachePendingDoorhangerCredential';
import './messages/getPendingDoorhangerCredential';
import './messages/clearPendingDoorhangerCredential';
import './messages/updateCredentialForDoorhanger';
import './messages/getDoorhangerSettings';
import { executeOnMessageListenerRegistration } from "@/entrypoints/background/messaging";
import { DoorhangerPendingCredentialService } from "@/services/backend/DoorhangerPendingCredentialService";

export default defineBackground(() => {
    // Executed when background is loaded
    void ConsoleLoggingService.refreshLogLevel();

    browser.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') {
            // on extension installation
            browser.runtime.openOptionsPage();
        } else if (details.reason === 'update') {
            // on extension update
            ExtensionBadgeService.updateAllTabsIcon();
        }

        ExtensionMigrationService.runOnInstalled(details).catch((e) => {
            logger.warn('[migration] runOnInstalled failed', e);
        });
    });

    // Catch upgrades that missed onInstalled
    ExtensionMigrationService.runOnStartup().catch((e) => {
        logger.warn('[migration] runOnStartup failed', e);
    });

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        ExtensionUnlockService.isUnlocked().then(async (isUnlocked) => {
            if (isUnlocked) {
                await ExtensionBadgeService.createIconForTab(tab);
            } else {
                ExtensionBadgeService.displayLockIcons();
            }
        });
    });

    browser.tabs.onActivated.addListener((activeInfo: browser.Tabs.OnActivatedActiveInfoType) => {
        browser.tabs.get(activeInfo.tabId).then((tab) => {
            ExtensionUnlockService.isUnlocked().then(async (isUnlocked) => {
                if (isUnlocked) {
                    // creates / updates tab icon with credential count and updates the tab specific context menu as well
                    await ExtensionBadgeService.createIconForTab(tab);
                } else {
                    ExtensionBadgeService.displayLockIcons();
                }
            });
        });
    });

    browser.tabs.onRemoved.addListener((tabId) => {
        DoorhangerPendingCredentialService.clear(tabId);
    });

    executeOnMessageListenerRegistration();

    ContextMenuService.reInit();
});
