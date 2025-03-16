import { LegacyFormManagerService } from "~services/frontend/LegacyFormManagerService";
import { sendToBackground } from "@plasmohq/messaging";
import {
    type DecryptedPartialCredentialData,
    type GetCredentialsListMessagingConfiguration,
    GetCredentialsListMessagingFilterType,
    type GetCredentialsListMessagingResponse
} from "~background/messages/getPartiallyDecryptedFilteredCredentialsList";
import passwordPickerIcon from "data-base64:~../assets/images/passwordPickerIcon.svg";

export class PasswordPickerService {
    private static showPickerCallback: (left: number, top: number, maxZ: any) => void;
    private static hidePickerCallback: () => void;
    public static decryptedPartialCredentialData: DecryptedPartialCredentialData[] = [];

    public static initPickerForPage = (
        showPickerCallback: (left: number, top: number, maxZ: any) => void,
        hidePickerCallback: () => void
    ) => {
        PasswordPickerService.showPickerCallback = showPickerCallback;
        PasswordPickerService.hidePickerCallback = hidePickerCallback;

        console.log("initPickerForPage");
        const pageUrl = window.location.href;
        const loginFields = LegacyFormManagerService.getLoginFields();
        console.log(pageUrl);
        console.log(loginFields);

        // todo: fetch enablePasswordPicker from settings
        const enablePasswordPicker = true;

        // todo: check ignored sites / urls here
        /*
        if (!settings.hasOwnProperty('ignored_sites') || settings.ignored_sites.findUrl(url).length !== 0) {
            return;
        }
        */

        if (loginFields.length > 0) {
            for (const loginField of loginFields) {
                if (loginField == null) {
                    continue;
                }
                const form = LegacyFormManagerService.getFormFromElement(loginField[0]);
                if (enablePasswordPicker && form) {
                    PasswordPickerService.createPasswordPicker(form);
                }

                //Password miner
                form.addEventListener("submit", () => {
                    PasswordPickerService.onFormSubmittedCallback(loginField)
                }, {
                    capture: true
                });
            }

            sendToBackground<GetCredentialsListMessagingConfiguration, GetCredentialsListMessagingResponse>({
                name: "getPartiallyDecryptedFilteredCredentialsList",
                body: {
                    filterText: pageUrl,
                    filterType: GetCredentialsListMessagingFilterType.SEARCH_BY_URL
                }
            }).then(async (value) => {
                console.log('Found ' + value.decryptedPartialCredentialData.length + ' logins for this site');
                PasswordPickerService.decryptedPartialCredentialData = value.decryptedPartialCredentialData;

                sendToBackground({
                    name: "getAutofillEnabledState"
                }).then(async (value) => {
                    if (value.autofillEnabled === true && PasswordPickerService.decryptedPartialCredentialData.length === 1) {
                        const credentialToAutofill = PasswordPickerService.decryptedPartialCredentialData[0];
                        LegacyFormManagerService.fillPassword(
                            credentialToAutofill.username ?? credentialToAutofill.email,
                            credentialToAutofill.password
                        );
                    }
                });
            });
        }
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
        event.preventDefault();
        event.stopPropagation();
        const offsetX = event.offsetX;
        const offsetRight = (data.width - offsetX);

        // only open iframe, if the mouse clicked at the passman icon in the input element
        // using data.height as replacement for the icon width, since it is automatically resized to fill the element height
        if (offsetRight < data.height) {
            // todo: implement
            PasswordPickerService.showPasswordPicker(data.el, data.form);

            //alert("the password picker should open up now - if it was implemented");
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

        let loginField = null;
        let loginFieldPos = null;
        let loginFieldVisible = null;

        let passwordField = null;
        let passwordFieldPos = null;
        let passwordFieldVisible = null;

        for (const element of form.getElementsByTagName('input')) {
            if (element == el) {
                // we found the element, the user has initially clicked on
                console.log("we found the element, the user has initially clicked on", element);
                loginField = element;
            }
            /*if (element.type == 'password') {
                passwordField = element;
            }*/
        }

        // var loginField = form[0] as HTMLElement;
        if (loginField != null) {
            loginFieldPos = loginField.getBoundingClientRect();
            loginFieldVisible = window.getComputedStyle(loginField).display !== 'none';
        }

        //var passwordField = form[1] as HTMLElement;
        if (passwordField != null) {
            passwordFieldPos = passwordField.getBoundingClientRect();
            passwordFieldVisible = window.getComputedStyle(passwordField).display !== 'none';
        }

        let left = loginFieldPos?.left || passwordFieldPos?.left;
        let top = loginFieldPos?.top || passwordFieldPos?.top;
        let maxZ = PasswordPickerService.getMaxZ();

        if (loginFieldPos && passwordFieldPos?.top > loginFieldPos?.top) {
            top = passwordFieldPos?.top + passwordField?.offsetHeight + 10;
        } else {
            if (loginFieldPos) {
                top = top + loginField?.offsetHeight + 10;
            } else {
                top = top + passwordField?.offsetHeight + 10;
            }
        }
        if (!loginFieldVisible) {
            left = passwordFieldPos?.left;
        }

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

            el.style.backgroundImage = 'url("' + passwordPickerIcon + '")';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.cssText = el.getAttribute('style') + ' background-position: right 3px center !important;';

            el.removeEventListener('click', PasswordPickerService.onFormIconClick);
            el.addEventListener('click', function (event) {
                PasswordPickerService.onFormIconClick(event, { width: width, height: height, el: el, form: form });
            });
        }
    }

    public static createPasswordPicker = (form: HTMLFormElement) => {
        for (let element of form.getElementsByTagName('input')) {
            PasswordPickerService.createFormIcon(element, form);
        }
    }

    public static onFormSubmittedCallback = (loginField) => {
        console.log("onFormSubmittedCallback");
        console.log(loginField);
    }
}
