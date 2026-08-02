<script lang="ts" module>
    import { Toaster } from "@binsky/melt/builders";

    export type ToastType = "success" | "error" | "info" | "warning";
    export type ToastPosition =
        | "top-left"
        | "top-right"
        | "top-center"
        | "bottom-left"
        | "bottom-right"
        | "bottom-center";

    export type ToastData = {
        message: string;
        title?: string;
        type?: ToastType;
        duration?: number;  // milliseconds, default 5000; use `0` for a pinned (sticky) toast
        showIcon?: boolean; // defaults to true
    };

    const defaultCloseDelay = 3000;
    const toaster = new Toaster<ToastData>({
        closeDelay: defaultCloseDelay,
    });

    export const addToast = (data: ToastData) => {
        const toastData = {
            ...data,
            type: data.type || "info" as ToastType,
        };

        return toaster.addToast({
            data: toastData,
            // nullish: duration 0 (pinned) must stay sticky (|| would fall back to default)
            closeDelay: data.duration ?? defaultCloseDelay,
        });
    };
</script>

<script lang="ts">
    import { Progress } from "@binsky/melt/components";
    import { i18n } from "~/lib/i18n";

    type Props = {
        position?: ToastPosition;
        width?: string; // CSS width value (e.g., "400px", "20rem", "100%")
        rootExtraClasses?: string;
        contentExtraClasses?: string;
        itemPadding?: string; // CSS padding class (e.g., "p-4", "p-2", "px-4 py-3"), defaults to "p-4"
    };

    let {
        position = "bottom-center",
        width = "20rem",
        rootExtraClasses = "",
        contentExtraClasses = "",
        itemPadding = "p-4"
    }: Props = $props();

    const getPositionClasses = (pos: ToastPosition) => {
        const positions = {
            "top-left": "!top-4 !left-4",
            "top-right": "!top-4 !right-4",
            "top-center": "!top-4 !left-1/2 -translate-x-1/2",
            "bottom-left": "!bottom-4 !left-4",
            "bottom-right": "!bottom-4 !right-4",
            "bottom-center": "!bottom-4 !left-1/2 -translate-x-1/2",
        };
        return positions[pos];
    };

    const getAnimationClasses = (pos: ToastPosition) => {
        const isTop = pos.startsWith("top");
        const isLeft = pos.includes("left");
        const isCenter = pos.includes("center");

        let slideIn = "slide-in-from-top";
        let slideOut = "slide-out-to-right";

        if (!isTop) {
            slideIn = "slide-in-from-bottom";
        }

        if (isLeft) {
            slideOut = "slide-out-to-left";
        } else if (isCenter) {
            slideOut = isTop ? "slide-out-to-top" : "slide-out-to-bottom";
        }

        return { slideIn, slideOut };
    };

    const getToastStyles = (type: ToastType = "info") => {
        const styles = {
            success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
            error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
            info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
            warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
        };
        return styles[type] || styles.info;
    };

    const getIconStyles = (type: ToastType = "info") => {
        const styles = {
            success: "text-green-600 dark:text-green-400",
            error: "text-red-600 dark:text-red-400",
            info: "text-blue-600 dark:text-blue-400",
            warning: "text-yellow-600 dark:text-yellow-400",
        };
        return styles[type] || styles.info;
    };

    const getIcon = (type: ToastType = "info") => {
        const icons = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
            error: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
            info: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>`,
            warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>`,
        };
        return icons[type] || icons.info;
    };

    const getTitleStyles = (type: ToastType = "info") => {
        const styles = {
            success: "text-green-900",
            error: "text-red-900",
            info: "text-blue-900",
            warning: "text-yellow-900",
        };
        return styles[type] || styles.info;
    };

    const getDescriptionStyles = (type: ToastType = "info") => {
        const styles = {
            success: "text-green-700",
            error: "text-red-700",
            info: "text-blue-700",
            warning: "text-yellow-700",
        };
        return styles[type] || styles.info;
    };
</script>

<div
        {...toaster.root}
        class="fixed z-9999 flex flex-col gap-2 pointer-events-none {getPositionClasses(position)} {rootExtraClasses}"
        style="width: {width}; max-width: calc(100vw - 2rem);"
>
    {#each toaster.toasts as toast (toast.id)}
        {@const type = toast.data.type || "info"}
        {@const animations = getAnimationClasses(position)}
        <div
                {...toast.content}
                class="pointer-events-auto relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm
                   transform transition-all duration-300 ease-out
                   animate-in {animations.slideIn} fade-in
                   data-[state=closed]:animate-out data-[state=closed]:{animations.slideOut} data-[state=closed]:fade-out
                   {getToastStyles(type)} {contentExtraClasses}"
        >
            <div class="flex items-center gap-3 {itemPadding}">
                {#if (toast.data.showIcon !== false)}
                    <!-- Icon -->
                    <div class="shrink-0 {getIconStyles(type)}">
                        {@html getIcon(type)}
                    </div>
                {/if}

                <!-- Content -->
                <div class="flex-1 min-w-0">
                    {#if toast.data.title}
                        <h3
                                {...toast.title}
                                class="text-sm font-semibold mb-1 {getTitleStyles(type)}"
                        >
                            {toast.data.title}
                        </h3>
                    {/if}
                    <div
                            {...toast.description}
                            class="text-sm {getDescriptionStyles(type)}"
                    >
                        {toast.data.message}
                    </div>
                </div>

                <!-- Close Button -->
                <button
                        {...toast.close}
                        aria-label="{i18n.getMessage('dismiss_alert')}"
                        class="shrink-0 rounded-md p-1 transition-colors
                           hover:bg-black/5 dark:hover:bg-white/10
                           focus:outline-none focus:ring-2 focus:ring-offset-2
                           {getIconStyles(type)}"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                         class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Progress Bar indicator -->
            {#if toast.closeDelay !== 0}
                <div class="h-1">
                    <Progress value={toast.percentage}>
                        {#snippet children(progress)}
                            <div
                                    {...progress.root}
                                    class="relative h-full w-full overflow-hidden bg-gray-200 dark:bg-gray-950"
                            >
                                <div
                                        {...progress.progress}
                                        class="h-full w-full -translate-x-[var(--progress)]"
                                        class:bg-blue-400={toast.data.type === "info"}
                                        class:bg-green-400={toast.data.type === "success"}
                                        class:bg-orange-400={toast.data.type === "warning"}
                                        class:bg-red-500={toast.data.type === "error"}
                                ></div>
                            </div>
                        {/snippet}
                    </Progress>
                </div>
            {/if}
        </div>
    {/each}
</div>

<style>
    /* Slide in animations */
    @keyframes slide-in-from-top {
        from {
            transform: translateY(-1.25rem);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes slide-in-from-bottom {
        from {
            transform: translateY(1.25rem);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    /* Slide out animations */
    @keyframes slide-out-to-right {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    @keyframes slide-out-to-left {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(-100%);
            opacity: 0;
        }
    }

    @keyframes slide-out-to-top {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(-1.25rem);
            opacity: 0;
        }
    }

    @keyframes slide-out-to-bottom {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(1.25rem);
            opacity: 0;
        }
    }

    /* Fade animations */
    @keyframes fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes fade-out {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }

    /* Progress bar animation */
    @keyframes progress {
        from {
            width: 100%;
        }
        to {
            width: 0%;
        }
    }

    :global([popover]) {
        inset: unset;
    }

    /* Animation classes */
    .animate-in {
        animation-duration: 0.3s;
        animation-timing-function: ease-out;
        animation-fill-mode: both;
    }

    .slide-in-from-top {
        animation-name: slide-in-from-top, fade-in;
    }

    .slide-in-from-bottom {
        animation-name: slide-in-from-bottom, fade-in;
    }

    [data-state="closed"] {
        animation-duration: 0.3s;
        animation-timing-function: ease-out;
        animation-fill-mode: forwards;
    }

    [data-state="closed"].slide-out-to-right {
        animation-name: slide-out-to-right, fade-out;
    }

    [data-state="closed"].slide-out-to-left {
        animation-name: slide-out-to-left, fade-out;
    }

    [data-state="closed"].slide-out-to-top {
        animation-name: slide-out-to-top, fade-out;
    }

    [data-state="closed"].slide-out-to-bottom {
        animation-name: slide-out-to-bottom, fade-out;
    }
</style>
