<script lang="ts">
    import Icon, { type IconData } from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";

    let {
        title = $bindable(''),
        label = $bindable(''),
        ariaLabel = $bindable(''),
        disabled = $bindable(false),
        icon = $bindable<IconData>(),
        onSave = $bindable(async () => {}),
    } = $props();

    let isSaving = $state(false);

    const save = async () => {
        isSaving = true;
        try {
            await onSave();
        } catch (error) {
            // ignore errors, just prevent the button from being stuck in the saving state
        } finally {
            isSaving = false;
        }
    };
</script>

<div class="save-fab-anchor">
    <button
        type="button"
        class="save-fab"
        class:is-saving={isSaving}
        class:has-pending={!disabled}
        title={title}
        aria-label={ariaLabel}
        disabled={disabled}
        onclick={(event) => {
            event.preventDefault();
            save();
        }}
    >
        {#if isSaving}
            <Icon data={refresh} scale={1.3} spin={true}/>
        {:else}
            <span class="save-fab-icon" aria-hidden="true">
                <Icon data={icon} scale={1.3}/>
            </span>
            <span class="save-fab-label">{label}</span>
        {/if}
    </button>
</div>

<style>
    /* stick near the bottom of the scrollport while this section is in view */
    .save-fab-anchor {
        position: sticky;
        /* top: calc(100% - 4.75rem); */
        bottom: 4.5rem;
        z-index: 40;
        display: flex;
        justify-content: flex-end;
        height: 0;
        width: stretch;
        padding-right: 0.2rem;
        pointer-events: none;
    }

    .save-fab {
        pointer-events: auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 3.5rem;
        min-width: 3.5rem;
        width: 3.5rem;
        padding: 0 0.95rem;
        overflow: hidden;
        border: none;
        border-radius: 9999px;
        background: #9ca3af;
        color: #fff;
        box-shadow: none;
        cursor: not-allowed;
        opacity: 0.75;
        transition:
            width 0.28s ease,
            max-width 0.28s ease,
            background-color 0.2s ease,
            box-shadow 0.2s ease,
            opacity 0.2s ease;
    }

    .save-fab.has-pending,
    .save-fab.is-saving {
        background: var(--color-primary);
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        opacity: 1;
        cursor: pointer;
    }

    .save-fab.is-saving {
        cursor: wait;
        pointer-events: none;
    }

    .save-fab.has-pending:hover:not(.is-saving) {
        width: max-content;
        max-width: 20rem;
        box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
    }

    .save-fab-icon,
    .save-fab-label {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        transition:
            max-width 0.28s ease,
            opacity 0.2s ease,
            margin 0.28s ease,
            transform 0.2s ease;
    }

    .save-fab-icon {
        max-width: 1.5rem;
        opacity: 1;
    }

    .save-fab-label {
        max-width: 0;
        margin-left: 0;
        overflow: hidden;
        opacity: 0;
        font-size: 0.875rem;
        font-weight: 500;
        transform: translateX(0.25rem);
    }

    .save-fab.has-pending:hover:not(.is-saving) .save-fab-icon {
        max-width: 0;
        opacity: 0;
        overflow: hidden;
        transform: scale(0.6);
    }

    .save-fab.has-pending:hover:not(.is-saving) .save-fab-label {
        max-width: 16rem;
        margin-left: 0;
        opacity: 1;
        transform: translateX(0);
    }
</style>
