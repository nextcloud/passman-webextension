import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import { sendToContentScript } from "@plasmohq/messaging";
import { RemoteCallableFunctionNames, RemoteCallableFunctions } from "@/entrypoints/content/remoteCallableFunctions";
import ExtensionUnlockService from "../ExtensionUnlockService";
import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "../ExtensionSettingsService";
import browser from "webextension-polyfill";

enum ContextMenuItemId {
    GENERATE_PASSWORD = 'GENERATE_PASSWORD',
    COPY_GENERATED_PASSWORD = 'COPY_GENERATED_PASSWORD',
    FILL_GENERATED_PASSWORD = 'FILL_GENERATED_PASSWORD',
    AUTO_FILL = 'AUTO_FILL',
    COPY_USERNAME = 'COPY_USERNAME',
    COPY_EMAIL = 'COPY_EMAIL',
    COPY_PASSWORD = 'COPY_PASSWORD',
    COPY_URL = 'COPY_URL',
    COPY_OTP = 'COPY_OTP',
    RELOAD_PICKER = 'RELOAD_PICKER',
}
 // there are more fields, but we only need these for now (and we know there are getters for them in the Credential model)
type CredentialField = 'username' | 'email' | 'password' | 'url' | 'otp';

export default class ContextMenuService {
    public static reInit = () => {
        ExtensionUnlockService.isUnlocked().then((isUnlocked) => {
            ContextMenuService.reCreateContextMenuParentItems(isUnlocked);
        });
        browser.contextMenus.onClicked.addListener(async (info: browser.Menus.OnClickData, tab?: browser.Tabs.Tab) => {
            switch (info.menuItemId) {
                case ContextMenuItemId.COPY_GENERATED_PASSWORD:
                    // Send a message to the content script of the specified or currently active tab
                    await ContextMenuService.sendToContentScriptCopyToClipboard(PasswordGeneratorService.generate(
                        await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.passwordGeneratorConfiguration, true) ?? PasswordGeneratorService.getDefaultConfig()
                    ), tab);
                    break;
                case ContextMenuItemId.FILL_GENERATED_PASSWORD:
                    await sendToContentScript({
                        tabId: tab?.id,
                        body: {
                            method: RemoteCallableFunctionNames.enterLoginDetails,
                            args: {
                                password: PasswordGeneratorService.generate(
                                    await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.passwordGeneratorConfiguration, true) ?? PasswordGeneratorService.getDefaultConfig()
                                )
                            }
                        },
                        name: RemoteCallableFunctions.remoteFunctionCallMessageName
                    });
                    break;
                case ContextMenuItemId.RELOAD_PICKER:
                    await sendToContentScript({
                        tabId: tab?.id,
                        body: { method: RemoteCallableFunctionNames.reloadPicker },
                        name: RemoteCallableFunctions.remoteFunctionCallMessageName
                    });
                    break;
                default:
                    // a credential specific context menu item has been clicked
                    const [action, credentialGuid] = info.menuItemId.toString().split(':', 2);

                    const vault = await ExtensionUnlockService.getUnlockedDefaultVault();
                    if (vault && vault.credentials.length <= 1) {
                        await vault.refresh(true);
                    }
                    if (!vault) {
                        console.error("No vault found");
                        break;
                    }

                    const credential = vault.getCredentialByGuid(credentialGuid);
                    if (credential) {
                        switch (action) {
                            case ContextMenuItemId.COPY_USERNAME:
                                await ContextMenuService.sendToContentScriptCopyToClipboard(credential.username, tab);
                                break;
                            case ContextMenuItemId.COPY_EMAIL:
                                await ContextMenuService.sendToContentScriptCopyToClipboard(credential.email, tab);
                                break;
                            case ContextMenuItemId.COPY_PASSWORD:
                                await ContextMenuService.sendToContentScriptCopyToClipboard(credential.password, tab);
                                break;
                            case ContextMenuItemId.COPY_URL:
                                await ContextMenuService.sendToContentScriptCopyToClipboard(credential.url, tab);
                                break;
                            case ContextMenuItemId.COPY_OTP:
                                console.log(credential.otp);
                                const otp = OTPService.updateOTP(credential.otp);
                                console.log(otp);
                                await ContextMenuService.sendToContentScriptCopyToClipboard(otp, tab);
                                break;
                            case ContextMenuItemId.AUTO_FILL:
                                await sendToContentScript({
                                    tabId: tab?.id,
                                    body: {
                                        method: RemoteCallableFunctionNames.enterLoginDetails,
                                        args: {
                                            username: credential.username,
                                            email: credential.email,
                                            password: credential.password,
                                            otp: OTPService.updateOTP(credential.otp),
                                        }
                                    },
                                    name: RemoteCallableFunctions.remoteFunctionCallMessageName
                                });
                                break;
                        }
                    }
            }
        });
    }

    private static readonly sendToContentScriptCopyToClipboard = (copyText: string, tab?: browser.Tabs.Tab) => {
        // Send a message to the content script of the specified or currently active tab
        return sendToContentScript({
            tabId: tab?.id,
            body: {
                method: RemoteCallableFunctionNames.copyText,
                args: copyText
            },
            name: RemoteCallableFunctions.remoteFunctionCallMessageName
        });
    }

    public static readonly removeAllContextMenuItems = () => {
        browser.contextMenus.removeAll();
    }

    /**
     * Removes all context menu items and creates new parent items.
     * If isUnlocked is set to false, only the (vault independent) password generator items will be created.
     * @param isUnlocked
     */
    public static readonly reCreateContextMenuParentItems = (isUnlocked = true) => {
        ContextMenuService.removeAllContextMenuItems();
        ContextMenuService.initPasswordGeneratorMenu();

        if (isUnlocked) {
            ContextMenuService.createContextMenuItem(ContextMenuItemId.AUTO_FILL, 'Auto fill');
            ContextMenuService.createContextMenuItem(ContextMenuItemId.COPY_USERNAME, 'Copy username');
            ContextMenuService.createContextMenuItem(ContextMenuItemId.COPY_EMAIL, 'Copy email');
            ContextMenuService.createContextMenuItem(ContextMenuItemId.COPY_PASSWORD, 'Copy password');
            ContextMenuService.createContextMenuItem(ContextMenuItemId.COPY_URL, 'Copy URL');
            ContextMenuService.createContextMenuItem(ContextMenuItemId.COPY_OTP, 'Copy OTP');
            ContextMenuService.createContextMenuItem(ContextMenuItemId.RELOAD_PICKER, 'Reload password picker');
        }
    }

    private static readonly initPasswordGeneratorMenu = () => {
        ContextMenuService.createContextMenuItem(ContextMenuItemId.GENERATE_PASSWORD, 'Generate password');
        ContextMenuService.createContextMenuItem(ContextMenuItemId.COPY_GENERATED_PASSWORD, 'And copy to clipboard', ContextMenuItemId.GENERATE_PASSWORD);
        ContextMenuService.createContextMenuItem(ContextMenuItemId.FILL_GENERATED_PASSWORD, 'And fill fields', ContextMenuItemId.GENERATE_PASSWORD);
    }

    private static readonly createContextMenuItem = (
        id: ContextMenuItemId | string,
        title: string,
        parentId?: string | number,
    ) => {
        browser.contextMenus.create({
            id,
            title,
            contexts: ['page'],
            parentId,
            // cannot use onclick here since event pages cannot use the onclick property and must use menus.onClicked instead (in Firefox)
        });
    }

    /**
     * Does not include any vault or extension unlock check. That has to be done before by the caller!
     * @param credentials
     */
    public static readonly updateActiveTabSpecificContextMenuItems = (credentials: Credential[]) => {
        const fields = [
            { credentialFieldName: 'username' as CredentialField, parentMenuItemId: ContextMenuItemId.COPY_USERNAME, atLeastOneCredentialFieldFound: false },
            { credentialFieldName: 'email' as CredentialField, parentMenuItemId: ContextMenuItemId.COPY_EMAIL, atLeastOneCredentialFieldFound: false },
            { credentialFieldName: 'password' as CredentialField, parentMenuItemId: ContextMenuItemId.COPY_PASSWORD, atLeastOneCredentialFieldFound: false },
            { credentialFieldName: 'url' as CredentialField, parentMenuItemId: ContextMenuItemId.COPY_URL, atLeastOneCredentialFieldFound: false },
            { credentialFieldName: 'otp' as CredentialField, parentMenuItemId: ContextMenuItemId.COPY_OTP, atLeastOneCredentialFieldFound: false }
        ];
        ContextMenuService.reCreateContextMenuParentItems();

        // offer autofill parent context menu entry, if at least one "autofill able" credential has been found
        let foundAtLeastOneAutofillableCredential = false;

        for (const credential of credentials) {
            // offer autofill field for this credential, if at least one "autofill able" field has been found
            let foundAtLeastOneAutofillableFieldForCredential = false;

            for (let f = 0; f < fields.length; f++) {
                const field = fields[f];
                if (credential[field.credentialFieldName]) {
                    fields[f].atLeastOneCredentialFieldFound = true;
                    ContextMenuService.createContextMenuItem(
                        field.parentMenuItemId + ':' + credential.guid,
                        credential.label,
                        field.parentMenuItemId
                    );

                    // sufficient condition, as all fields except "url" can be used for the autofill function
                    if (field.credentialFieldName !== 'url') {
                        foundAtLeastOneAutofillableFieldForCredential = true;
                    }
                }
            }

            if (foundAtLeastOneAutofillableFieldForCredential) {
                foundAtLeastOneAutofillableCredential = true;
                ContextMenuService.createContextMenuItem(
                    ContextMenuItemId.AUTO_FILL + ':' + credential.guid,
                    credential.label,
                    ContextMenuItemId.AUTO_FILL
                );
            }
        }

        for (let f = 0; f < fields.length; f++) {
            const field = fields[f];
            if (field.atLeastOneCredentialFieldFound === false) {
                browser.contextMenus.remove(field.parentMenuItemId);
            }
        }
        if (!foundAtLeastOneAutofillableCredential) {
            browser.contextMenus.remove(ContextMenuItemId.AUTO_FILL);
        }
    }
}
