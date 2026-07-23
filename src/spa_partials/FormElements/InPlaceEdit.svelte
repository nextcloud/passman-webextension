<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import SecretField from "./SecretField.svelte";
    import { i18n } from "~/lib/i18n";

    export let value: any, required = true, forceDblClick = false;
    export let isSecret: boolean = false;

    const dispatch = createEventDispatcher();
    let editing = false;
    let original: any;
    let valueToEdit: any;

    onMount(() => {
        valueToEdit = value;
        original = value;
    })

    function editOnClick() {
        if (!forceDblClick) {
            editing = true;
        }
    }

    function editOnDblClick() {
        editing = true;
    }

    function submit() {
        if (valueToEdit != original) {
            value = valueToEdit;
            original = valueToEdit;
            dispatch('submit', value);
        }

        editing = false;
    }

    function keydown(event: KeyboardEvent) {
        if (event.key == 'Escape') {
            event.preventDefault();
            valueToEdit = original;
            editing = false;
        }
    }

    function focus(element: HTMLInputElement) {
        element.focus();
    }
</script>

{#if editing}
    <form on:submit|preventDefault={submit} class="w-full">
        <input class="w-full" bind:value={valueToEdit} on:blur={submit} on:keydown={keydown} {required} use:focus/>
    </form>
{:else}
    <button on:click={editOnClick} on:dblclick={editOnDblClick} class="cursor-pointer text-left">
        {#if isSecret}
            <SecretField bind:value={valueToEdit}/>
        {:else}
            {!valueToEdit || valueToEdit === '' ? i18n.getMessage('click_to_add') : valueToEdit}
        {/if}
    </button>
{/if}

<style>
    input {
        border: none;
        background: none;
        font-size: inherit;
        color: inherit;
        font-weight: inherit;
        text-align: inherit;
        box-shadow: none;
    }
</style>
