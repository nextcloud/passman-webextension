<script lang="ts">
    import ShowFieldErrors from './ShowFieldErrors.svelte';
    import type { IFormFieldError } from "@binsky/passman-client-ts/lib/Exception/FormFieldError";
    import eyeSlash from "svelte-awesome/icons/eyeSlash";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import eye from "svelte-awesome/icons/eye";

    export let required = false;
    export let readonly = false;
    export let disabled = false;
    export let onfocusout: (event: Event) => void = () => {};
    export let onchange: (event: Event) => void = () => {};

    // options only required for type=password
    export let showHiddenToggleIfTypePassword: boolean = true;
    let showPasswordValue = false;

    export let ref = undefined;
    export let id: string | undefined = undefined;
    export let tabindex: number | null | undefined = undefined;
    export let value: string | null | undefined = undefined;
    export let name = '';
    export let placeholder = '';
    export let label: string | undefined = undefined;
    export let type = 'text';
    export let errors: IFormFieldError[] = [];

    function typeAction(node: HTMLInputElement) {
        node.type = type;
    }
</script>

{#if label !== undefined}
    <label
            for={id}
            class="text-sm font-medium text-primary-light-text dark:text-primary-dark-text block mb-2"
    >{label}</label
    >
{/if}
{#if type === 'textarea'}
	<textarea on:focusout={onfocusout} on:change={onchange} {name} {id} bind:value
              class="block border-0 border-b-2 border-gray-200 focus:outline-none focus:border-primary-focus
	shadow-sm w-full dark:bg-neutral" rows="3"></textarea>
{:else}
    {#key type}
        {#if !showPasswordValue}
            <div class="flex">
                <input
                        on:focusout={onfocusout}
                        on:change={onchange}
                        use:typeAction
                        {name}
                        {id}
                        bind:value
                        bind:this={ref}
                        class="block border-0 border-b-2 border-gray-200 focus:outline-none focus:border-primary-focus
        shadow-sm w-full read-only:cursor-default disabled:bg-gray-200 disabled:cursor-not-allowed dark:bg-neutral"
                        {placeholder}
                        {required}
                        {readonly}
                        {disabled}
                        {tabindex}
                />
                {#if showHiddenToggleIfTypePassword && type === 'password'}
                    <button type="button" on:click={() => {
                    showPasswordValue = true;
                }}
                            class="cursor-pointer px-0.5 transition-opacity opacity-20 hover:opacity-100">
                        <Icon data={eyeSlash} scale={1.0}/>
                    </button>
                {/if}
            </div>
        {:else}
            <div class="flex">
                <input
                        on:focusout={onfocusout}
                        on:change={onchange}
                        type="text"
                        {name}
                        {id}
                        bind:value
                        class="block border-0 border-b-2 border-gray-200 focus:outline-none focus:border-primary-focus
        shadow-sm w-full read-only:cursor-default disabled:bg-gray-200 disabled:cursor-not-allowed dark:bg-neutral"
                        {placeholder}
                        {required}
                        {readonly}
                        {disabled}
                        {tabindex}
                />
                {#if showHiddenToggleIfTypePassword && type === 'password'}
                    <button type="button" on:click={() => {
                    showPasswordValue = false;
                }}
                            class="cursor-pointer px-0.5 transition-opacity opacity-20 hover:opacity-100">
                        <Icon data={eye} scale={1.0}/>
                    </button>
                {/if}
            </div>
        {/if}
    {/key}
{/if}
<ShowFieldErrors bind:errors showForName={name}/>
