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

    /*
     * _getFormFields
     *
     * Returns the username and password fields found in the form.
     * Can handle complex forms by trying to figure out what the
     * relevant fields are.
     *
     * Returns: [usernameField, newPasswordField, oldPasswordField]
     *
     * usernameField may be null.
     * newPasswordField will always be non-null.
     * oldPasswordField may be null. If null, newPasswordField is just
     * "theLoginField". If not null, the form is apparently a
     * change-password field, with oldPasswordField containing the password
     * that is being changed.
     */
    private static getFormFields = (form: HTMLFormElement, isSubmission: boolean, skipNonVisibleFields: boolean = true) => {
        const formInputElements = form.querySelectorAll('input');

        // Locate the password field(s) in the form. Up to 3 supported.
        // If there's no password field, there's nothing for us to do.
        let pwFields = this._getTypedFields(formInputElements, isSubmission, skipNonVisibleFields, 'password');

        // try not to give up; may it's only a username field; let's use pwFields for other possible fields of type text
        // TODO: this is a hack; we should find a better way to do this; unused code since it's not working for the later method code
        /*if (!pwFields || pwFields.length === 0) {
            //return [null, null, null];
            pwFields = this._getTypedFields(
                formInputElements, 
                isSubmission, 
                'text',
                ['username', 'user', 'login', 'nickname', 'nick', 'email', 'emailaddress', 'mail']
            );
        }*/

        if (!pwFields || pwFields.length === 0) {
            return [null, null, null];
        }


        // Locate the username field in the form by searching backwards
        // from the first passwordfield, assume the first text field is the
        // username. We might not find a username field if the user is
        // already logged in to the site.
        let usernameField = null;
        for (let i = pwFields[0].indexOfAllFormInputElements - 1; i >= 0; i--) {
            if (!this.isElementVisible(formInputElements[i])) {
                continue;
            }
            if (formInputElements[i].type.toLowerCase() === "text" || formInputElements[i].type.toLowerCase() === "email") {
                usernameField = formInputElements[i];
                break;
            }
        }

        if (!usernameField) {
            console.debug('(form (' + form.action + ') ignored -- no username field found)');
        }


        // If we're not submitting a form (it's a page load), there are no
        // password field values for us to use for identifying fields. So,
        // just assume the first password field is the one to be filled in.
        if (!isSubmission || pwFields.length === 1) {
            const res = [usernameField, pwFields[0].element];
            // todo: is this stupid? refactor!
            if (pwFields[1]) {
                res.push(pwFields[1].element);
            } else {
                res.push(null);
            }
            return res;
        }


        // Try to figure out WTF is in the form based on the password values.
        let oldPasswordField, newPasswordField;
        const pw1 = pwFields[0].element.value;
        const pw2 = pwFields[1].element.value;
        const pw3 = (pwFields[2] ? pwFields[2].element.value : null);

        if (pwFields.length === 3) {
            // Look for two identical passwords, that's the new password

            if (pw1 === pw2 && pw2 === pw3) {
                // All 3 passwords the same? Weird! Treat as if 1 pw field.
                newPasswordField = pwFields[0].element;
                oldPasswordField = null;
            } else if (pw1 === pw2) {
                newPasswordField = pwFields[0].element;
                oldPasswordField = pwFields[2].element;
            } else if (pw2 === pw3) {
                oldPasswordField = pwFields[0].element;
                newPasswordField = pwFields[2].element;
            } else if (pw1 === pw3) {
                // A bit odd, but could make sense with the right page layout.
                newPasswordField = pwFields[0].element;
                oldPasswordField = pwFields[1].element;
            } else {
                // We can't tell which of the 3 passwords should be saved.
                console.debug("(form ignored -- all 3 pw fields differ)");
                return [null, null, null];
            }
        } else { // pwFields.length == 2
            if (pw1 === pw2) {
                // Treat as if 1 pw field
                newPasswordField = pwFields[0].element;
                oldPasswordField = null;
            } else {
                // Just assume that the 2nd password is the new password
                oldPasswordField = pwFields[0].element;
                newPasswordField = pwFields[1].element;
            }
        }

        return [usernameField, newPasswordField, oldPasswordField];
    }

    /**
     * todo: needs refactoring; we should use a more type safe approach, since username (or email - who knows?) and password fields are not determined by the type of the field
     * @param isSubmission
     */
    public static getLoginFields = (isSubmission: boolean = false, skipNonVisibleFields: boolean = true) => {
        const loginForms = [];

        for (const form of document.forms) {
            const result = LegacyFormManagerService.getFormFields(form, isSubmission, skipNonVisibleFields);
            const usernameField = result[0];
            const passwordField = result[1];

            // Need a valid password field to do anything.
            if (passwordField === null) {
                continue;
            }

            const res = [usernameField, passwordField];
            if (result[2]) {
                res.push(result[2]);
            } else {
                res.push(null);
            }
            loginForms.push(res);
        }

        return loginForms;
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

    public static fillPassword = (user?: string, password?: string) => {
        const loginFields = LegacyFormManagerService.getLoginFields();
        if (loginFields) {
            for (let i = 0; i < loginFields.length; i++) {
                const fields = loginFields[i];
                if (!fields || (!fields[0] && !fields[1] && !fields[2])) {
                    continue;
                }
                if (user && fields[0]) {
                    fields[0].value = user;
                    if (fields[0].offsetParent) {
                        LegacyFormManagerService.dispatchEvents(fields[0]);
                    }
                }
                if (password && fields[1]) {
                    fields[1].value = password;
                    if (fields[1].offsetParent) {
                        LegacyFormManagerService.dispatchEvents(fields[1]);
                    }
                }
                if (password && fields[2]) {
                    fields[2].value = password;
                    if (fields[2].offsetParent) {
                        LegacyFormManagerService.dispatchEvents(fields[2]);
                    }
                }
            }
        } else {
            console.error('The fillPassword was called, but no login fields could be found');
        }
    }
}
