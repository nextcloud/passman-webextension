<script lang="ts">

    let {
        callback = () => {},
        additionalClasses = '',
        tabindex = undefined,
        title = '',
        disabled = false,
        small = false,
        noPadding = false,
    }: {
        callback: () => void,
        additionalClasses?: string,
        tabindex?: number,
        title?: string,
        disabled?: boolean,
        small?: boolean,
        noPadding?: boolean
    } = $props();
    

    let padding = $derived(noPadding ? '' : small ? 'px-2 py-1' : 'px-3 py-2');

    // Create a wrapper function that doesn't pass the callback into the button event
    const handleClick = (event: Event) => {
        event.preventDefault(); // Optional: prevent default behavior
        callback();
    };
</script>

<button
        {title}
        onclick={handleClick}
        {disabled}
        {tabindex}
        class="text-primary-light-button-text border border-gray-300 hover:bg-base-200 hover:shadow-sm font-medium rounded-lg
	        text-sm dark:hover:bg-neutral cursor-pointer {padding} text-center w-auto disabled:opacity-70 disabled:pointer-events-none {additionalClasses}"
>
    <slot/>
</button>

<style>
    .red-blinking {
        animation: red-blinking-pulse 2s ease-in infinite;
    }

    @keyframes red-blinking-pulse {
        0% {
            color: red;
        }
        100% {
            color: inherit;
        }
    }
</style>
