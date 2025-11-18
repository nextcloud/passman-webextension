/**
 * Service for detecting dynamically added forms and input fields in SPAs
 * Provides configurable detection mechanisms that can be enabled/disabled individually
 *
 * todo: try to implement a successful login logic to disable the detection service afterwards (to avoid unnecessary performance overhead)
 *   - e.g. by checking if the form has been submitted successfully or a login form button still exists
 *   - check the old doorhanger logic and/or reimplementation in the future
 */
export class DynamicFormDetectionService {
    private static mutationObserver: MutationObserver | null = null;
    private static urlCheckInterval: number | null = null;
    private static popstateHandler: ((event: PopStateEvent) => void) | null = null;
    private static currentUrl: string = '';
    private static processedForms: WeakSet<HTMLFormElement> = new WeakSet();
    
    // Feature flags
    private static mutationObserverEnabled: boolean = false;
    private static urlIntervalCheckEnabled: boolean = false;
    private static urlPopstateCheckEnabled: boolean = false;
    
    // Callbacks
    private static onFormDetectedCallback: (() => void) | null = null;
    private static onUrlChangedCallback: ((newUrl: string, oldUrl: string) => void) | null = null;

    /**
     * Sets the callback to be invoked when new forms are detected
     */
    public static setFormDetectedCallback = (callback: (() => void) | null) => {
        DynamicFormDetectionService.onFormDetectedCallback = callback;
    }

    /**
     * Sets the callback to be invoked when URL changes are detected
     */
    public static setUrlChangedCallback = (callback: ((newUrl: string, oldUrl: string) => void) | null) => {
        DynamicFormDetectionService.onUrlChangedCallback = callback;
    }

    /**
     * Enables MutationObserver to detect dynamically added forms and input fields.
     * Needed for pages like airbnb.com, where the login form is dynamically and partially added to the page, step by step.
     */
    public static enableMutationObserver = () => {
        if (DynamicFormDetectionService.mutationObserverEnabled) {
            return; // Already enabled
        }

        DynamicFormDetectionService.mutationObserverEnabled = true;

        // Stop existing observer if any
        if (DynamicFormDetectionService.mutationObserver) {
            DynamicFormDetectionService.mutationObserver.disconnect();
        }

        // Create new observer
        DynamicFormDetectionService.mutationObserver = new MutationObserver((mutations) => {
            let shouldCheckForms = false;

            for (const mutation of mutations) {
                // Check if new forms were added
                if (mutation.addedNodes.length > 0) {
                    for (const node of Array.from(mutation.addedNodes)) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            
                            // Check if a form was added
                            if (element.tagName === 'FORM') {
                                shouldCheckForms = true;
                                break;
                            }
                            
                            // Check if a form or input field was added within this element
                            if (element.querySelector && (
                                element.querySelector('form') ||
                                element.querySelector('input[type="password"]') ||
                                element.querySelector('input[type="email"]') ||
                                element.querySelector('input[type="text"]')
                            )) {
                                shouldCheckForms = true;
                                break;
                            }
                        }
                    }
                }

                // Also check if input fields were added to existing forms
                if (mutation.target && mutation.target instanceof HTMLFormElement) {
                    shouldCheckForms = true;
                }
            }

            if (shouldCheckForms && DynamicFormDetectionService.onFormDetectedCallback) {
                // Debounce: wait a bit for the DOM to settle (SPAs might add multiple elements)
                setTimeout(() => {
                    if (DynamicFormDetectionService.onFormDetectedCallback) {
                        DynamicFormDetectionService.onFormDetectedCallback();
                    }
                }, 100);
            }
        });

        // Start observing the document body for changes
        if (document.body) {
            DynamicFormDetectionService.mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
            console.log("enabled mutation observer");
        }
    }

    /**
     * Disables MutationObserver detection
     */
    public static disableMutationObserver = () => {
        if (!DynamicFormDetectionService.mutationObserverEnabled) {
            return; // Already disabled
        }

        DynamicFormDetectionService.mutationObserverEnabled = false;

        if (DynamicFormDetectionService.mutationObserver) {
            DynamicFormDetectionService.mutationObserver.disconnect();
            DynamicFormDetectionService.mutationObserver = null;
        }
    }

    /**
     * Enables periodic URL checking for SPA navigation (pushState/replaceState)
     * @param intervalMs - Interval in milliseconds (default: 1000)
     */
    public static enableUrlIntervalCheck = (intervalMs: number = 1000) => {
        if (DynamicFormDetectionService.urlIntervalCheckEnabled) {
            return; // Already enabled
        }

        DynamicFormDetectionService.urlIntervalCheckEnabled = true;

        // Stop existing interval if any
        if (DynamicFormDetectionService.urlCheckInterval !== null) {
            clearInterval(DynamicFormDetectionService.urlCheckInterval);
        }

        DynamicFormDetectionService.urlCheckInterval = window.setInterval(() => {
            DynamicFormDetectionService.checkUrlChange();
        }, intervalMs);
    }

    /**
     * Disables periodic URL checking
     */
    public static disableUrlIntervalCheck = () => {
        if (!DynamicFormDetectionService.urlIntervalCheckEnabled) {
            return; // Already disabled
        }

        DynamicFormDetectionService.urlIntervalCheckEnabled = false;

        if (DynamicFormDetectionService.urlCheckInterval !== null) {
            clearInterval(DynamicFormDetectionService.urlCheckInterval);
            DynamicFormDetectionService.urlCheckInterval = null;
        }
    }

    /**
     * Enables popstate event listener for back/forward navigation detection
     */
    public static enableUrlPopstateCheck = () => {
        if (DynamicFormDetectionService.urlPopstateCheckEnabled) {
            return; // Already enabled
        }

        DynamicFormDetectionService.urlPopstateCheckEnabled = true;

        // Remove existing handler if any
        if (DynamicFormDetectionService.popstateHandler) {
            window.removeEventListener('popstate', DynamicFormDetectionService.popstateHandler);
        }

        DynamicFormDetectionService.popstateHandler = () => {
            DynamicFormDetectionService.checkUrlChange();
        };

        window.addEventListener('popstate', DynamicFormDetectionService.popstateHandler);
        console.log("enabled url popstate check");
    }

    /**
     * Disables popstate event listener
     */
    public static disableUrlPopstateCheck = () => {
        if (!DynamicFormDetectionService.urlPopstateCheckEnabled) {
            return; // Already disabled
        }

        DynamicFormDetectionService.urlPopstateCheckEnabled = false;

        if (DynamicFormDetectionService.popstateHandler) {
            window.removeEventListener('popstate', DynamicFormDetectionService.popstateHandler);
            DynamicFormDetectionService.popstateHandler = null;
        }
    }

    /**
     * Checks if URL has changed and triggers callback if it has
     */
    private static checkUrlChange = () => {
        const currentUrl = window.location.href;
        if (DynamicFormDetectionService.currentUrl !== currentUrl) {
            const oldUrl = DynamicFormDetectionService.currentUrl;
            DynamicFormDetectionService.currentUrl = currentUrl;
            
            if (DynamicFormDetectionService.onUrlChangedCallback) {
                DynamicFormDetectionService.onUrlChangedCallback(currentUrl, oldUrl);
            }
        }
    }

    /**
     * Marks a form as processed
     */
    public static markFormAsProcessed = (form: HTMLFormElement) => {
        DynamicFormDetectionService.processedForms.add(form);
    }

    /**
     * Checks if a form has been processed
     */
    public static isFormProcessed = (form: HTMLFormElement): boolean => {
        return DynamicFormDetectionService.processedForms.has(form);
    }

    /**
     * Resets the processed forms tracking
     */
    public static resetProcessedForms = () => {
        DynamicFormDetectionService.processedForms = new WeakSet();
    }

    /**
     * Gets the current tracked URL
     */
    public static getCurrentUrl = (): string => {
        return DynamicFormDetectionService.currentUrl;
    }

    /**
     * Sets the current URL (useful for initialization)
     */
    public static setCurrentUrl = (url: string) => {
        DynamicFormDetectionService.currentUrl = url;
    }

    /**
     * Enables all detection features
     * @param urlCheckIntervalMs - Interval in milliseconds for URL checking (default: 1000)
     */
    public static enableAll = (urlCheckIntervalMs: number = 1000) => {
        DynamicFormDetectionService.enableMutationObserver();
        DynamicFormDetectionService.enableUrlIntervalCheck(urlCheckIntervalMs);
        DynamicFormDetectionService.enableUrlPopstateCheck();
    }

    /**
     * Disables all detection features
     */
    public static disableAll = () => {
        DynamicFormDetectionService.disableMutationObserver();
        DynamicFormDetectionService.disableUrlIntervalCheck();
        DynamicFormDetectionService.disableUrlPopstateCheck();
    }

    /**
     * Completely cleans up all resources and resets state
     */
    public static cleanup = () => {
        DynamicFormDetectionService.disableAll();
        DynamicFormDetectionService.resetProcessedForms();
        DynamicFormDetectionService.currentUrl = '';
        DynamicFormDetectionService.onFormDetectedCallback = null;
        DynamicFormDetectionService.onUrlChangedCallback = null;
    }

    /**
     * Gets the current state of all features
     */
    public static getState = () => {
        return {
            mutationObserverEnabled: DynamicFormDetectionService.mutationObserverEnabled,
            urlIntervalCheckEnabled: DynamicFormDetectionService.urlIntervalCheckEnabled,
            urlPopstateCheckEnabled: DynamicFormDetectionService.urlPopstateCheckEnabled,
            currentUrl: DynamicFormDetectionService.currentUrl,
            hasFormDetectedCallback: DynamicFormDetectionService.onFormDetectedCallback !== null,
            hasUrlChangedCallback: DynamicFormDetectionService.onUrlChangedCallback !== null
        };
    }
}

