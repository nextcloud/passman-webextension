<script lang="ts">
    import ShowFieldErrors from './ShowFieldErrors.svelte';
    import type { IFormFieldError } from "@binsky/passman-client-ts/lib/Exception/FormFieldError";
    import eyeSlash from "svelte-awesome/icons/eyeSlash";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import eye from "svelte-awesome/icons/eye";
    import type {
        PasswordGeneratorConfigurationInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/PasswordGeneratorService/PasswordGeneratorConfigurationInterface";
    import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
    import refresh from "svelte-awesome/icons/refresh";
    import CopyClipboardButton from "../InteractionElements/CopyClipboardButton.svelte";

    export let required = false;
    export let readonly = false;
    export let disabled = false;
    export let afterPWGenCallback: (generated: string) => void = undefined;
    export let showCopyClipboardButton: boolean = true;
    export let showHiddenToggle: boolean = true;
    export let id = undefined;
    export let value;
    export let name = '';
    export let placeholder = '';
    export let label;
    export let errors: IFormFieldError[] = [];
    export let passwordGeneratorConfiguration: PasswordGeneratorConfigurationInterface = undefined;

    let showPasswordValue = false;
</script>

{#if label !== undefined}
    <label
            for={id}
            class="text-sm font-medium text-primary-light-text dark:text-primary-dark-text block mb-2"
    >{label}</label
    >
{/if}


<div class="flex">
    {#if !showPasswordValue}
        <input
                type="password"
                {name}
                {id}
                bind:value
                class="block border-0 border-b-2 border-gray-200 focus:outline-none focus:border-primary-focus
        shadow-sm w-full read-only:cursor-default disabled:bg-gray-200 disabled:cursor-not-allowed dark:bg-neutral"
                {placeholder}
                {required}
                {readonly}
                {disabled}
        />
        {#if showHiddenToggle}
            <button on:click={() => {
                    showPasswordValue = true;
                }}
                    class="cursor-pointer px-0.5 transition-opacity opacity-20 hover:opacity-100">
                <Icon data={eyeSlash} scale={1.0}/>
            </button>
        {/if}
    {:else}
        <input
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
        />
        {#if showHiddenToggle}
            <button on:click={() => {
                    showPasswordValue = false;
                }}
                    class="cursor-pointer px-0.5 transition-opacity opacity-20 hover:opacity-100">
                <Icon data={eye} scale={1.0}/>
            </button>
        {/if}
    {/if}

    {#if passwordGeneratorConfiguration !== undefined}
        <button on:click={() => {
                    value = PasswordGeneratorService.generate(passwordGeneratorConfiguration);
                    if (afterPWGenCallback !== undefined) {
                        afterPWGenCallback(value);
                    }
                }}
                class="cursor-pointer px-0.5 transition-opacity opacity-20 hover:opacity-100">
            <Icon data={refresh} scale={1.0}/>
        </button>
    {/if}
    {#if showCopyClipboardButton}
        <CopyClipboardButton bind:value buttonTitle="{chrome.i18n.getMessage('copy_to_clipboard')}"
                             fieldTitle="{chrome.i18n.getMessage('password')}"
                             additionalClasses="transition-opacity opacity-20 hover:opacity-100"/>
    {/if}
</div>

<ShowFieldErrors bind:errors showForName={name}/>
