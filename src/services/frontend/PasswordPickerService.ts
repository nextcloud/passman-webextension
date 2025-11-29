import { LegacyFormManagerService, type FillableLoginFormFields } from "~/services/frontend/LegacyFormManagerService";
import {
    type DecryptedPartialCredentialData,
    GetCredentialsListMessagingFilterType,
    type GetCredentialsListMessagingResponse
} from "~/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
import type {
    CreateCredentialForPickerMessagingResponse
} from "~/entrypoints/background/messages/createCredentialForPicker";
import type { DecryptedCredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
import type { PasswordGeneratorConfigurationInterface } from "@binsky/passman-client-ts/lib/Interfaces/PasswordGeneratorService/PasswordGeneratorConfigurationInterface";
import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
import passwordPickerIcon from "~/assets/images/passwordPickerIcon.svg";
import { sendMessage } from "@/entrypoints/background/messaging";
import { DynamicFormDetectionService } from "~/services/frontend/DynamicFormDetectionService";
import { GetPickerPageSettingsResponse } from "@/entrypoints/background/messages/getPickerPageSettings";

export enum PASSWORD_PICKER_SECTIONS {
    ADD,
    LIST,
    SEARCH,
    GENERATE,
    PAGE_RULES
}

export class PasswordPickerService {
    private static showPickerCallback: (left: number, top: number, maxZ: any) => void;
    private static hidePickerCallback: () => void;
    public static decryptedPartialCredentialData: DecryptedPartialCredentialData[] = [];
    protected static modifiedInputElementsIconRemovalCallbacks: (() => void)[] = [];

    /**
     * Initializes the password picker for the current page
     */
    public static initPickerForPage = (
        showPickerCallback: (left: number, top: number, maxZ: any) => void,
        hidePickerCallback: () => void,
        pickerPageSettings: GetPickerPageSettingsResponse
    ) => {
        PasswordPickerService.showPickerCallback = showPickerCallback;
        PasswordPickerService.hidePickerCallback = hidePickerCallback;

        console.debug("initPickerForPage");

        // Initialize current URL in detection service
        DynamicFormDetectionService.setCurrentUrl(window.location.href);

        // Process existing forms immediately
        PasswordPickerService.processLoginForms(pickerPageSettings);

        // Set up observer for dynamically added forms (SPA support)
        PasswordPickerService.setupFormObserver(pickerPageSettings);
    }

    /**
     * Processes login forms and sets up password pickers for them
     */
    private static processLoginForms = (pickerPageSettings: GetPickerPageSettingsResponse) => {
        const pageUrl = window.location.href;
        const loginFieldsPerForm = LegacyFormManagerService.getLoginFieldsPerForm();
        console.debug("Processing login forms", pageUrl, loginFieldsPerForm);

        // todo: fetch enablePasswordPicker from settings
        const enablePasswordPicker = true;

        // If the page is ignored, we don't need to process any forms
        if (pickerPageSettings.mergedPageRules.ignorePage) {
            return;
        }

        LegacyFormManagerService.enableAutosubmitAfterFilling = pickerPageSettings.mergedPageRules.enableAutosubmit ?? false;

        if (loginFieldsPerForm.length > 0) {
            for (const loginFields of loginFieldsPerForm) {
                const form = loginFields._form;
                
                // Skip if we've already processed this form
                if (DynamicFormDetectionService.isFormProcessed(form)) {
                    console.debug("skipping form", form, "because it has already been processed");
                    continue;
                }
                console.debug("processing form", form);

                // Mark form as processed
                DynamicFormDetectionService.markFormAsProcessed(form);

                if (enablePasswordPicker && form) {
                    PasswordPickerService.createPasswordPicker(form, loginFields);
                }

                //Password miner
                loginFields._form.addEventListener("submit", () => {
                    PasswordPickerService.onFormSubmittedCallback(loginFields)
                }, {
                    capture: true
                });
            }

            // Only fetch credentials if we haven't already (to avoid duplicate requests)
            if (PasswordPickerService.decryptedPartialCredentialData.length === 0) {
                sendMessage('getPartiallyDecryptedFilteredCredentialsList', {
                    filterText: pageUrl,
                    filterType: GetCredentialsListMessagingFilterType.SEARCH_BY_URL,
                    getCachedIfPossible: true
                }).then(async (value) => {
                    console.debug('Found ' + value.decryptedPartialCredentialData.length + ' logins for this site');
                    PasswordPickerService.decryptedPartialCredentialData = value.decryptedPartialCredentialData;
                    PasswordPickerService.performAutofillIfEnabled(pickerPageSettings.mergedPageRules.enableEmailAsUsernameFallbackFilling ?? true);
                });
            } else {
                // no need to refetch decrypted credential data, if we already have it
                PasswordPickerService.performAutofillIfEnabled(pickerPageSettings.mergedPageRules.enableEmailAsUsernameFallbackFilling ?? true);
            }
        }
    }

    private static performAutofillIfEnabled = (enableEmailAsUsernameFallbackFilling: boolean) => {
        sendMessage('getAutofillEnabledState').then(async (value) => {
            if (value.autofillEnabled === true && PasswordPickerService.decryptedPartialCredentialData.length === 1) {
                const credentialToAutofill = PasswordPickerService.decryptedPartialCredentialData[0];
                LegacyFormManagerService.fillFields(
                    credentialToAutofill.username ?? undefined,
                    credentialToAutofill.email ?? undefined,
                    credentialToAutofill.password ?? undefined,
                    credentialToAutofill.otp ?? undefined,
                    enableEmailAsUsernameFallbackFilling
                );
            }
        });
    }

    /**
     * Sets up dynamic form detection using DynamicFormDetectionService
     */
    private static setupFormObserver = (pickerPageSettings: GetPickerPageSettingsResponse) => {
        // Set up callback for when new forms are detected
        DynamicFormDetectionService.setFormDetectedCallback(() => {
            PasswordPickerService.processLoginForms(pickerPageSettings);
        });

        // Set up callback for when URL changes (SPA navigation)
        DynamicFormDetectionService.setUrlChangedCallback((newUrl, oldUrl) => {
            console.debug("URL changed from", oldUrl, "to", newUrl);
            DynamicFormDetectionService.resetProcessedForms();

            // Resetting decryptedPartialCredentialData is usually only needed if ignorePath is false, because we then need to refetch the credentials
            if (!pickerPageSettings.mergedPageRules.ignorePath) {
                PasswordPickerService.decryptedPartialCredentialData = [];
            }
            PasswordPickerService.processLoginForms(pickerPageSettings);
        });

        // Enable all detection features individually, based on the extension settings, merged with the page rules
        // todo: can we somehow measure the performance impact of the mutation observer?

        if (pickerPageSettings.mergedPageRules.enableUserEventBasedFormDetection) {
            // Only trigger manual detection when the mutation observer is currently disabled
            // todo: check if this "nor state check" is actually still needed (because we now have the page rules feature)
            DynamicFormDetectionService.enableUserEventDetection();
        }

        if (pickerPageSettings.mergedPageRules.enableFormDetectionOnUrlPopstateEvents) {
            DynamicFormDetectionService.enableUrlPopstateCheck();
        }

        if (pickerPageSettings.mergedPageRules.enableFormDetectionOnUrlChangesByInterval) {
            DynamicFormDetectionService.enableUrlIntervalCheck(1000);
        }

        if (pickerPageSettings.mergedPageRules.enableFormDetectionByMutationObserver) {
            DynamicFormDetectionService.enableMutationObserver();
        }
    }

    public static readonly unloadPicker = () => {
        PasswordPickerService.modifiedInputElementsIconRemovalCallbacks.forEach(cb => cb());
        PasswordPickerService.modifiedInputElementsIconRemovalCallbacks = [];
        
        // Clean up dynamic form detection service
        DynamicFormDetectionService.cleanup();
        
        // Clear credentials data
        PasswordPickerService.decryptedPartialCredentialData = [];
    }

    public static readonly hidePicker = () => {
        if (PasswordPickerService.hidePickerCallback) {
            PasswordPickerService.hidePickerCallback();
        }
    }

    private static onFormIconClick = (event?: MouseEvent, data?: {
        width: number,
        height: number,
        el: HTMLInputElement,
        form: HTMLFormElement
    }) => {
        if (!event || !data) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const offsetX = event.offsetX;
        const offsetRight = (data.width - offsetX);

        // only open iframe, if the mouse clicked at the passman icon in the input element
        // using data.height as replacement for the icon width, since it is automatically resized to fill the element height
        if (offsetRight < data.height) {
            PasswordPickerService.showPasswordPicker(data.el, data.form);
        }
    }

    private static getMaxZ = () => {
        return Math.max.apply(null,
            Array.from(document.querySelectorAll('body *')).map(function (e) {
                if (window.getComputedStyle(e).position !== 'static') {
                    return parseInt(window.getComputedStyle(e).zIndex) || 1;
                }
            }).filter(function (value) {
                return typeof value === 'number';
            })
        );
    }

    private static showPasswordPicker = (el: HTMLInputElement, form: HTMLFormElement) => {
        var passwordPickerFrames = document.querySelectorAll('#password_picker');
        if (passwordPickerFrames.length > 1) {
            return;
        }

        let clickField = null;
        let clickFieldPos = null;
        let clickFieldVisible = null;

        for (const element of form.getElementsByTagName('input')) {
            if (element == el) {
                // we found the element, the user has initially clicked on
                console.debug("we found the element, the user has initially clicked on", element);
                clickField = element;
            }
            /*if (element.type == 'password') {
                passwordField = element;
            }*/
        }

        // var loginField = form[0] as HTMLElement;
        if (clickField != null) {
            clickFieldPos = clickField.getBoundingClientRect();
            clickFieldVisible = window.getComputedStyle(clickField).display !== 'none';
        }

        let left = clickFieldPos?.left ?? 0;    // todo: is 0 a good fallback? how could we guess the position?
        let top = clickFieldPos?.bottom ?? 0;   // attach picker to the bottom of the clicked element; todo: ^
        let maxZ = PasswordPickerService.getMaxZ();

        PasswordPickerService.showPickerCallback(left, top, maxZ);

        //var pickerUrl = chrome.extension.getURL('/html/inject/password_picker.html');
        //var picker = document.getElementById('password_picker');
        //console.log(picker);
        //picker.classList.add('passwordPickerIframe');
        //picker.setAttribute('scrolling', 'no');
        //picker.setAttribute('height', '385');
        //picker.setAttribute('width', '350');
        //picker.setAttribute('frameborder', '0');
        //picker.setAttribute('src', pickerUrl);
        /*picker.style.position = 'absolute';
        picker.style.left = left + 'px';
        picker.style.zIndex = maxZ + 10;
        picker.style.top = top + 'px';*/
        //document.body.insertBefore(picker, document.body.firstChild);

        // todo: what is this line? :
        //activeForm = form;

        /*var existingPickers = document.querySelectorAll('.passwordPickerIframe:not(:last-child)');
        existingPickers.forEach(function(picker) {
            picker.remove();
        });*/
    }


    private static createFormIcon = (el: HTMLInputElement, form: HTMLFormElement) => {
        if (el.type == 'email' || el.type == 'password' || el.type == 'text') {
            const width = el.offsetWidth;
            const height = el.offsetHeight;

            // Store original styles to restore later
            const originalBackgroundImage = el.style.backgroundImage;
            const originalBackgroundRepeat = el.style.backgroundRepeat;
            const originalStyle = el.getAttribute('style') || '';

            el.style.backgroundImage = 'url("' + passwordPickerIcon + '")';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.cssText = el.getAttribute('style') + ' background-position: right 3px center !important;';

            const clickHandler = function (event: MouseEvent) {
                PasswordPickerService.onFormIconClick(event, { width: width, height: height, el: el, form: form });
            };

            el.removeEventListener('click', PasswordPickerService.onFormIconClick);
            el.addEventListener('click', clickHandler);

            PasswordPickerService.modifiedInputElementsIconRemovalCallbacks.push(() => {
                // Remove the click event listener
                el.removeEventListener('click', clickHandler);

                // Restore original styles
                el.style.backgroundImage = originalBackgroundImage;
                el.style.backgroundRepeat = originalBackgroundRepeat;
                el.setAttribute('style', originalStyle);
            });
        }
    }

    public static createPasswordPicker = (form: HTMLFormElement, loginFields: FillableLoginFormFields) => {
        for (const input of [...(loginFields.passwordFields ?? []), loginFields.emailField, loginFields.usernameField, loginFields.otpField]) {
            if (input) {
                PasswordPickerService.createFormIcon(input, form);
            }
        }
        // not sure what the initial idea was, but creating a picker icon for each input element is not a good idea
        /*for (let element of form.getElementsByTagName('input')) {
            PasswordPickerService.createFormIcon(element, form);
        }*/
    }

    public static onFormSubmittedCallback = (loginFields: FillableLoginFormFields) => {
        console.debug("onFormSubmittedCallback");
        console.debug(loginFields);
    }

    public static searchCredentialsForPicker = (searchInput: string): Promise<GetCredentialsListMessagingResponse> => {
        return sendMessage('getPartiallyDecryptedFilteredCredentialsList', {
            filterText: searchInput,
            filterType: GetCredentialsListMessagingFilterType.DEFAULT_SEARCH_FULL_TEXT_LABEL,
            getCachedIfPossible: true
        }).then(async (value) => {
            console.debug('Found ' + value.decryptedPartialCredentialData.length + ' picker search results');
            return value;
        });
    }

    public static createCredentialFromPicker = (credentialData: Partial<DecryptedCredentialInterface>): Promise<CreateCredentialForPickerMessagingResponse> => {
        return sendMessage('createCredentialForPicker', {
            credentialData: credentialData
        }).then(async (value: CreateCredentialForPickerMessagingResponse) => {
            console.debug('Credential creation result:', value);
            if (value.status && value.decryptedPartialCredentialData) {
                // this way we don't need to reload the full picker data, but just add the new credential to the list
                PasswordPickerService.decryptedPartialCredentialData.push(value.decryptedPartialCredentialData);
            }
            return value;
        });
    }

    public static getFormDataFromCurrentPage = (): { label?: string, username?: string, email?: string, password?: string, url?: string } => {
        const pageUrl = window.location.href;
        const loginFieldsPerForm = LegacyFormManagerService.getLoginFieldsPerForm();

        let formData: { label?: string, username?: string, email?: string, password?: string, url?: string } = {
            url: pageUrl
        };

        if (loginFieldsPerForm.length > 0) {
            const loginFields = loginFieldsPerForm[0]; // Use first form found

            // Extract username
            if (loginFields.usernameField?.value) {
                formData.username = loginFields.usernameField.value;
            }

            // Extract email
            if (loginFields.emailField?.value) {
                formData.email = loginFields.emailField.value;
            }

            // Extract password
            if (loginFields.passwordFields && loginFields.passwordFields.length > 0) {
                formData.password = loginFields.passwordFields[0].value;
            }

            // Generate label from domain
            try {
                const urlObj = new URL(pageUrl);
                formData.label = urlObj.hostname;
            } catch {
                formData.label = pageUrl;
            }
        }

        return formData;
    }

    public static getPasswordGeneratorConfiguration = async (): Promise<PasswordGeneratorConfigurationInterface> => {
        try {
            const configResponse = await sendMessage('getPasswordGeneratorConfiguration');

            if (configResponse.status && configResponse.passwordGeneratorConfiguration) {
                return configResponse.passwordGeneratorConfiguration;
            }
        } catch (error) {
            console.error('Error getting password generator configuration:', error);
        }

        // Return default configuration as fallback
        return PasswordGeneratorService.getDefaultConfig();
    }
}
