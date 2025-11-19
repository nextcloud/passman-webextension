export interface FillableLoginFormFields {
    usernameField?: HTMLInputElement;
    emailField?: HTMLInputElement;
    passwordFields?: HTMLInputElement[];
    otpField?: HTMLInputElement;
    // this is used to store the form element that the fields belong to
    _form: HTMLFormElement;
}

/**
 Code based on:
 @url https://web.archive.org/web/20201112012320/https://dxr.mozilla.org/firefox/source/toolkit/components/passwordmgr/src/nsLoginManager.js#645

 todo: needs complete refactoring, just copied from the old extension (findForm.js) and fixed/improved some logic
 */
export class LegacyFormManagerService {
    public static skippedInvisibleFieldsDetected: boolean = false;

    /**
     *
     * _isAutoCompleteDisabled
     *
     * Returns true if the page requests autocomplete be disabled for the
     * specified form input.
     */
    public static isAutocompleteDisabled = (element: HTMLElement): boolean => {
        return !!(
            element &&
            element.hasAttribute("autocomplete") &&
            element.getAttribute("autocomplete")?.toLowerCase() === "off"
        );
    }

    /**
     * Check if an element is visible
     * @param element
     * @returns {boolean}
     */
    public static isElementVisible = (element: HTMLElement): boolean => {
        return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
    }

    /**
     * _getPasswordFields
     *
     * Returns an array of password field elements for the specified form.
     * If no pw fields are found, or if more than 3 are found, then null
     * is returned.
     *
     * skipEmptyFields can be set to ignore password fields with no value.
     */
    private static _getTypedFields = (
        formInputElements: NodeListOf<HTMLInputElement>, 
        skipEmptyFields: boolean,
        skipNonVisibleFields: boolean = true,
        type: string = 'password',
        andHasNameOf: string[] = []
    ) => {
        // Locate the password fields in the form.
        const pwFields = [];

        for (let i = 0; i < formInputElements.length; i++) {
            const elem = formInputElements[i];
            if (elem.type !== type) {
                continue;
            }

            if (skipNonVisibleFields && !this.isElementVisible(elem)) {
                console.debug(`ingore non visible ${type} field`, elem);
                this.skippedInvisibleFieldsDetected = true;
                continue;
            }

            if (skipEmptyFields && !elem.value) {
                continue;
            }

            if (andHasNameOf.length > 0) {
                const hasNameOf = andHasNameOf.some(name => elem.name.toLowerCase().includes(name.toLowerCase()));
                if (!hasNameOf) {
                    continue;
                }
            }

            pwFields.push({
                indexOfAllFormInputElements: i,
                element: elem
            });
        }

        // If too many fields, bail out.
        if (pwFields.length > 3) {
            console.debug('(form ignored -- too many password fields. [got ' + pwFields.length + "])");
            return null;
        }

        return pwFields;
    }

    public static couldBeUsernameField = (field: HTMLInputElement) => {
        const usernameFieldNames = ["username", "user", "login", "nickname", "nick"];
        return field.type.toLowerCase() === "text" && usernameFieldNames.some(name => field.name.toLowerCase().includes(name));
    }

    public static couldBeOtpField = (field: HTMLInputElement) => {
        const otpFieldNames = ["otp", "one-time-password", "one-time-passcode", "one-time-pass", "totp", "authenticator", "token"];
        return (field.type.toLowerCase() === "text" || field.type.toLowerCase() === "number") && (
            (field.hasAttribute("autocomplete") && field.getAttribute("autocomplete")?.toLowerCase() === "one-time-code") ||
            otpFieldNames.some(name => field.name.toLowerCase().includes(name))
        );
    }

    /**
     * Don't do any magic here, just get the fields from the form and return them in a structured way.
     * @param form - The form to get the fields for.
     * @param isSubmission - Whether the form is being submitted (to skip empty fields).
     * @param skipNonVisibleFields - Whether to skip non-visible fields (default: true).
     * @returns The needed / supported fields for the given form.
     */
    private static getTypedFormFields = (form: HTMLFormElement, isSubmission: boolean, skipNonVisibleFields: boolean = true): FillableLoginFormFields => {
        const formInputElements = form.querySelectorAll('input');
        const fields: FillableLoginFormFields = {
            _form: form
        };

        const pwFields = this._getTypedFields(formInputElements, isSubmission, skipNonVisibleFields, 'password');
        if (pwFields && pwFields.length > 0) {
            fields.passwordFields = pwFields.map(field => field.element);

            // Locate the first possible username, email and otp field in the form by searching backwards
            // from the first password field. Assume the first text field is the username.
            // We might not find a username field if the user is already logged in to the site.
            for (let i = pwFields[0].indexOfAllFormInputElements - 1; i >= 0; i--) {
                if (!this.isElementVisible(formInputElements[i])) {
                    continue;
                }
                if (this.couldBeUsernameField(formInputElements[i])) {
                    fields.usernameField = formInputElements[i];
                    break;
                }
            }
            for (let i = pwFields[0].indexOfAllFormInputElements - 1; i >= 0; i--) {
                if (!this.isElementVisible(formInputElements[i])) {
                    continue;
                }
                if (formInputElements[i].type.toLowerCase() === "email") {
                    fields.emailField = formInputElements[i];
                    break;
                }
            }
            for (let i = pwFields[0].indexOfAllFormInputElements - 1; i >= 0; i--) {
                if (!this.isElementVisible(formInputElements[i])) {
                    continue;
                }
                if (this.couldBeOtpField(formInputElements[i])) {
                    fields.otpField = formInputElements[i];
                    break;
                }
            }
        } else {
            // use first matching fields for the other field types if no password field is found
            const emailFields = this._getTypedFields(formInputElements, isSubmission, skipNonVisibleFields, 'email');
            if (emailFields && emailFields.length > 0 && !fields.emailField) {
                fields.emailField = emailFields[0].element;
            }
            const textFields = this._getTypedFields(formInputElements, isSubmission, skipNonVisibleFields, 'text');
            if (textFields && textFields.length > 0) {
                for (const textField of textFields) {
                    if (!fields.usernameField && this.couldBeUsernameField(textField.element)) {
                        fields.usernameField = textField.element;
                    } else if (!fields.otpField && this.couldBeOtpField(textField.element)) {
                        fields.otpField = textField.element;
                    } else if (fields.passwordFields && fields.otpField) {
                        // we found a username and otp field, so we can stop searching
                        break;
                    }
                }
            }
        }

        // if backward search 

        return fields;
    }

    /**
     * Forms without any compatible fields are ignored / filtered out.
     * @param isSubmission - Whether the form is being submitted (to skip empty fields).
     * @param skipNonVisibleFields - Whether to skip non-visible fields (default: true).
     * @returns Array of identified login fields grouped by form.
     */
    public static getLoginFieldsPerForm = (isSubmission: boolean = false, skipNonVisibleFields: boolean = true): FillableLoginFormFields[] => {
        return Array.from(document.forms).map((form: HTMLFormElement) => 
            this.getTypedFormFields(form, isSubmission, skipNonVisibleFields)
        ).filter(fields => fields.usernameField || fields.emailField || fields.passwordFields || fields.otpField);
    }

    /**
     * A slight (enforced) typescript optimized method to get the next possible parent form of the given element.
     * @param elem
     */
    public static getFormFromElement = (elem: HTMLElement) => {
        if (elem) {
            while (elem.parentNode) {
                if (elem.parentNode.nodeName.toLowerCase() === "form") {
                    return elem.parentNode as HTMLFormElement;
                }
                elem = elem.parentNode as HTMLElement;
            }
        }
    }

    public static dispatchEvents = (element: EventTarget) => {
        const eventNames = ['click', 'focus', 'keypress', 'keydown', 'keyup', 'input', 'blur', 'change'];
        eventNames.forEach(function (eventName) {
            element.dispatchEvent(new Event(eventName, { "bubbles": true }));
        });
    }

    /**
     * Fills the fields with the given values if they are found.
     * @param username - The username to fill.
     * @param email - The email to fill.
     * @param password - The password to fill.
     * @param otp - The otp to fill.
     */
    public static fillFields = (username?: string, email?: string, password?: string, otp?: string, enableEmailAsUsernameFallbackFilling: boolean = true) => {
        const loginFieldsByForm = LegacyFormManagerService.getLoginFieldsPerForm();
        if (loginFieldsByForm && loginFieldsByForm.length > 0) {
            for (let i = 0; i < loginFieldsByForm.length; i++) {
                const fields = loginFieldsByForm[i];
                // we should not abort if one of the fields is not found, we should just skip it
                /*if (!fields || (!fields[0] && !fields[1] && !fields[2])) {
                    continue;
                }*/
                if (username && fields.usernameField && !fields.usernameField.value) {
                    fields.usernameField.value = username;
                    if (fields.usernameField.offsetParent) {
                        LegacyFormManagerService.dispatchEvents(fields.usernameField);
                    }
                }
                if (email && fields.emailField && !fields.emailField.value) {
                    fields.emailField.value = email;
                    if (fields.emailField.offsetParent) {
                        LegacyFormManagerService.dispatchEvents(fields.emailField);
                    }
                }
                if (password && fields.passwordFields) {
                    fields.passwordFields.forEach(field => {
                        if (field.value) {
                            return;
                        }
                        field.value = password;
                        if (field.offsetParent) {
                            LegacyFormManagerService.dispatchEvents(field);
                        }
                    });
                }
                if (otp && fields.otpField && !fields.otpField.value) {
                    fields.otpField.value = otp;
                    if (fields.otpField.offsetParent) {
                        LegacyFormManagerService.dispatchEvents(fields.otpField);
                    }
                }

                // fallback username and email filling logic to fill email as username if no username field is found (and the other way around)
                // only when we don't have both field types available, we should check if we can fill the other field type, if still empty
                if (enableEmailAsUsernameFallbackFilling) {
                    if (!fields.emailField && fields.usernameField && !fields.usernameField.value && !username && email) {
                        // initial username field was not filled and email value wasn't used yet, so we can try to fill it as username
                        fields.usernameField.value = email;
                        if (fields.usernameField.offsetParent) {
                            LegacyFormManagerService.dispatchEvents(fields.usernameField);
                        }
                    }
                    if (!fields.usernameField && fields.emailField && !fields.emailField.value && !email && username) {
                        // initial email field was not filled and username value wasn't used yet, so we can try to fill it as email
                        fields.emailField.value = username;
                        if (fields.emailField.offsetParent) {
                            LegacyFormManagerService.dispatchEvents(fields.emailField);
                        }
                    }
                }
            }
        } else {
            console.error('No fields found to fill');
        }
    }
}
