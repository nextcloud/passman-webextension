<script lang="ts">
    // @ts-expect-error
    import { link } from "~/Router.svelte";

    export let additionalClasses = '';
    export let href = '';
    export let target = undefined;
    export let title = '';
    export let small = false;
    export let disabled = false;
</script>

<a
        {href}
        use:link
        {disabled}
        {target}
        {title}
        class="text-primary-light-button-text border border-gray-300 hover:bg-base-200 dark:hover:bg-neutral font-medium rounded-lg
	text-sm {small
		? 'px-2 py-1'
		: 'px-3 py-2'} text-center w-auto disabled:opacity-70 disabled:pointer-events-none {additionalClasses}"
>
    <slot/>
</a>
