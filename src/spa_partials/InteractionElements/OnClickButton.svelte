<script>
    export let callback = () => {
        undefined;
    };
    export let additionalClasses = '';
    export let tabindex = undefined;
    export let title = '';
    export let disabled = false;

    export let small = false;
</script>

<button
        {title}
        on:click={callback}
        {disabled}
        {tabindex}
        class="self-end text-primary-light-button-text border border-gray-300 hover:bg-base-200 font-medium rounded-lg
	text-sm dark:hover:bg-neutral {small
		? 'px-2 pb-1'
		: 'px-3 py-2'} text-center w-auto disabled:opacity-70 disabled:pointer-events-none {additionalClasses}"
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
