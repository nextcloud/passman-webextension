/**
 * Service for detecting dynamically added forms and input fields in SPAs
 * Provides configurable detection mechanisms that can be enabled/disabled individually
 *
 * After a successful login, DoorhangerService calls disableAll() to reduce overhead.
 */
export class DynamicFormDetectionService {
    private static mutationObserver: MutationObserver | null = null;
    private static urlCheckInterval: number | null = null;
    private static popstateHandler: ((event: PopStateEvent) => void) | null = null;
    private static currentUrl: string = '';
    private static processedForms: WeakSet<HTMLFormElement> = new WeakSet();
    private static globalEventUnsubscribers: (() => void)[] = [];
    
    // Feature flags
    private static mutationObserverEnabled: boolean = false;
    private static urlIntervalCheckEnabled: boolean = false;
    private static urlPopstateCheckEnabled: boolean = false;
    private static userEventDetectionEnabled: boolean = false;
    
    // Callbacks
    private static onFormDetectedCallback: (() => void) | null = null;
    private static onUrlChangedCallback: ((newUrl: string, oldUrl: string) => void) | null = null;
    
    // Throttling and debouncing
    private static formCheckTimeout: number | null = null;
    private static lastFormCheckTime: number = 0;
    private static readonly FORM_CHECK_THROTTLE_MS = 2000; // Maximum time between checks, no matter the debounce delay
    private static readonly FORM_CHECK_DEBOUNCE_MS = 500; // Debounce delay

    /**
     * Sets the callback to be invoked when new forms are detected
     */
    public static setFormDetectedCallback = (callback: (() => void) | null) => {
        DynamicFormDetectionService.onFormDetectedCallback = callback;
    }

    /**
     * Public trigger that reuses internal throttling/debouncing for manual form detection
     * (e.g. from button/input/submit events when MutationObserver is disabled)
     */
    public static triggerManualFormDetection = () => {
        // If no callback is registered, there is nothing to do
        if (!DynamicFormDetectionService.onFormDetectedCallback) {
            return;
        }
        DynamicFormDetectionService.throttledFormCheck();
    }

    /**
     * Sets the callback to be invoked when URL changes are detected
     */
    public static setUrlChangedCallback = (callback: ((newUrl: string, oldUrl: string) => void) | null) => {
        DynamicFormDetectionService.onUrlChangedCallback = callback;
    }

    /**
     * Checks if an event is a plausible form interaction as a form detection trigger
     */
    public static isPlausibleFormInteraction = (event: Event): boolean => {
        const target = event.target as Element | null;
        if (!target || target.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        // Ignore synthetic events (including those dispatched by our own autofill logic)
        // Only user-generated events have isTrusted === true
        if (!event.isTrusted) {
            return false;
        }

        // Ignore interactions inside our own picker UI
        const path = (event as any).composedPath?.() as (EventTarget[] | undefined);
        if (path && path.some(node =>
            node instanceof Element &&
            ((node as Element).id === 'password_picker')
        )) {
            return false;
        }

        // Find the first relevant element in the path
        const relevant = (path ?? [target]).find(node =>
            node instanceof HTMLInputElement ||
            node instanceof HTMLButtonElement ||
            node instanceof HTMLFormElement
        ) as Element | undefined;

        if (!relevant) {
            return false;
        }

        // For inputs, only react to typical login-related field types
        if (relevant instanceof HTMLInputElement) {
            const type = relevant.type?.toLowerCase?.() ?? '';
            const allowedTypes = ['text', 'email', 'password', 'number', 'tel', 'search'];
            if (!allowedTypes.includes(type)) {
                return false;
            }
        }

        return true;
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
                // Only care about childList changes (nodes being added), ignore attribute/text changes
                // This prevents triggering on every click that changes classes/attributes
                if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
                    continue;
                }

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

                // Also check if input fields were added to existing forms
                if (mutation.target && mutation.target instanceof HTMLFormElement) {
                    // Only trigger if actual input elements were added
                    const addedInputs = Array.from(mutation.addedNodes).some(node => 
                        node.nodeType === Node.ELEMENT_NODE && 
                        (node as Element).tagName === 'INPUT'
                    );
                    if (addedInputs) {
                        shouldCheckForms = true;
                    }
                }
            }

            if (shouldCheckForms && DynamicFormDetectionService.onFormDetectedCallback) {
                // Use throttling + debouncing to prevent rapid-fire calls
                DynamicFormDetectionService.throttledFormCheck();
            }
        });

        // Start observing the document body for changes
        // Only observe childList changes (nodes being added/removed)
        // Don't observe attributes or characterData - these fire too often on clicks
        if (document.body) {
            DynamicFormDetectionService.mutationObserver.observe(document.body, {
                childList: true,    // Only watch for nodes being added/removed
                subtree: true,      // Watch all descendants
                // Explicitly don't observe attributes or characterData to reduce noise
            });
            console.debug("enabled mutation observer");
        }
    }

    /**
     * Throttled and debounced form check to prevent rapid-fire calls
     */
    private static throttledFormCheck = () => {
        const now = Date.now();
        const timeSinceLastCheck = now - DynamicFormDetectionService.lastFormCheckTime;
        
        // Clear existing timeout
        if (DynamicFormDetectionService.formCheckTimeout !== null) {
            clearTimeout(DynamicFormDetectionService.formCheckTimeout);
            DynamicFormDetectionService.formCheckTimeout = null;
        }
        
        // If enough time has passed since last check, execute immediately
        if (timeSinceLastCheck >= DynamicFormDetectionService.FORM_CHECK_THROTTLE_MS) {
            DynamicFormDetectionService.lastFormCheckTime = now;
            if (DynamicFormDetectionService.onFormDetectedCallback) {
                DynamicFormDetectionService.onFormDetectedCallback();
            }
        } else {
            // Otherwise, debounce and wait
            DynamicFormDetectionService.formCheckTimeout = window.setTimeout(() => {
                DynamicFormDetectionService.lastFormCheckTime = Date.now();
                if (DynamicFormDetectionService.onFormDetectedCallback) {
                    DynamicFormDetectionService.onFormDetectedCallback();
                }
                DynamicFormDetectionService.formCheckTimeout = null;
            }, DynamicFormDetectionService.FORM_CHECK_DEBOUNCE_MS);
        }
    }

    /**
     * Disables MutationObserver detection
     */
    public static disableMutationObserver = () => {
        if (!DynamicFormDetectionService.mutationObserverEnabled) {
            return; // Already disabled
        }

        if (DynamicFormDetectionService.mutationObserver) {
            DynamicFormDetectionService.mutationObserver.disconnect();
            DynamicFormDetectionService.mutationObserver = null;
        }

        // Clear any pending form check timeout
        if (DynamicFormDetectionService.formCheckTimeout !== null) {
            clearTimeout(DynamicFormDetectionService.formCheckTimeout);
            DynamicFormDetectionService.formCheckTimeout = null;
        }

        DynamicFormDetectionService.mutationObserverEnabled = false;
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

        if (DynamicFormDetectionService.urlCheckInterval !== null) {
            clearInterval(DynamicFormDetectionService.urlCheckInterval);
            DynamicFormDetectionService.urlCheckInterval = null;
        }

        DynamicFormDetectionService.urlIntervalCheckEnabled = false;
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
        console.debug("enabled url popstate check");
    }

    /**
     * Disables popstate event listener
     */
    public static disableUrlPopstateCheck = () => {
        if (!DynamicFormDetectionService.urlPopstateCheckEnabled) {
            return; // Already disabled
        }

        if (DynamicFormDetectionService.popstateHandler) {
            window.removeEventListener('popstate', DynamicFormDetectionService.popstateHandler);
            DynamicFormDetectionService.popstateHandler = null;
        }

        DynamicFormDetectionService.urlPopstateCheckEnabled = false;
    }

    public static enableUserEventDetection = () => {
        if (DynamicFormDetectionService.userEventDetectionEnabled) {
            return; // Already enabled
        }

        DynamicFormDetectionService.userEventDetectionEnabled = true;

        // Hook into button and input events to trigger form detection when MutationObserver is not used
        const manualDetectionHandler = (event: Event) => {
            // Only trigger manual detection when the mutation observer is currently disabled and the event is a plausible form interaction
            const state = DynamicFormDetectionService.getState();
            if (!state.mutationObserverEnabled && DynamicFormDetectionService.isPlausibleFormInteraction(event)) {
                console.debug("triggering manual form detection for event", event);
                DynamicFormDetectionService.triggerManualFormDetection();
            }
        };
        const eventTypes: (keyof DocumentEventMap)[] = [
            'click',
            'submit',
            /* 'change', // disable change and input events to prevent rapid-fire calls during user typing
            'input' */
        ];
        for (const type of eventTypes) {
            document.addEventListener(type, manualDetectionHandler, true);
            DynamicFormDetectionService.globalEventUnsubscribers.push(() => {
                document.removeEventListener(type, manualDetectionHandler, true);
            });
        }
    }

    public static disableUserEventDetection = () => {
        if (!DynamicFormDetectionService.userEventDetectionEnabled) {
            return; // Already disabled
        }

        // Remove global event listeners
        DynamicFormDetectionService.globalEventUnsubscribers.forEach(cb => cb());
        DynamicFormDetectionService.globalEventUnsubscribers = [];

        DynamicFormDetectionService.userEventDetectionEnabled = false;
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
     * Enables all detection features.
     * Tip: don't do it! If you wanna go crazy just use the mutation observer. Enabling all features is stupid! Trust me.
     * @param urlCheckIntervalMs - Interval in milliseconds for URL checking (default: 1000)
     */
    public static enableAll = (urlCheckIntervalMs: number = 1000) => {
        DynamicFormDetectionService.enableMutationObserver();
        DynamicFormDetectionService.enableUrlIntervalCheck(urlCheckIntervalMs);
        DynamicFormDetectionService.enableUrlPopstateCheck();
        DynamicFormDetectionService.enableUserEventDetection();
    }

    /**
     * Disables all detection features
     */
    public static disableAll = () => {
        DynamicFormDetectionService.disableMutationObserver();
        DynamicFormDetectionService.disableUrlIntervalCheck();
        DynamicFormDetectionService.disableUrlPopstateCheck();
        DynamicFormDetectionService.disableUserEventDetection();
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

        // Reset throttling state
        DynamicFormDetectionService.lastFormCheckTime = 0;
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

