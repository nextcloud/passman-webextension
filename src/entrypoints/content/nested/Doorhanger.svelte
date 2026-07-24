<script lang="ts">
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { times, plus } from "svelte-awesome/icons";
    import { i18n } from "~/lib/i18n";
    import { DoorhangerService } from "~/services/frontend/DoorhangerService";
    import type { DoorhangerOffer } from "~/services/frontend/DoorhangerMatchService";
    import {
        DEFAULT_DOORHANGER_SETTINGS,
        type DoorhangerSettings
    } from "~/lib/doorhanger/doorhangerSettings";

    type Props = {
        offer: Extract<DoorhangerOffer, { show: true }>;
        settings?: DoorhangerSettings;
        onClose: () => void;
    };

    let {
        offer,
        settings = DEFAULT_DOORHANGER_SETTINGS,
        onClose
    }: Props = $props();

    let selectedGuid = $state<string | null>(null);
    let isBusy = $state(false);
    let errorMessage = $state("");

    // or may hide it entirely? keept it for now as a middle ground
    const maskPassword = (password: string): string => {
        if (!password) {
            return "";
        }
        if (password.length <= 2) {
            return "•".repeat(password.length);
        }
        return `${password[0]}${"•".repeat(Math.min(password.length - 2, 10))}${password[password.length - 1]}`;
    };

    const candidateLabel = (guid: string): string => {
        const candidate = offer.updateCandidates.find((c) => c.guid === guid);
        if (!candidate) {
            return guid;
        }
        const identity = [candidate.username, candidate.email].filter(Boolean).join(" / ");
        const label = candidate.label?.trim() || i18n.getMessage("doorhanger_unnamed_credential");
        return identity ? `${label} — ${identity}` : label;
    };

    // sync selection whenever a new offer is shown
    $effect(() => {
        selectedGuid = offer.preselectedGuid;
        errorMessage = "";
    });

    const hasUpdateCandidates = $derived(offer.updateCandidates.length > 0);
    const title = $derived(
        hasUpdateCandidates
            ? i18n.getMessage("doorhanger_update_title")
            : i18n.getMessage("doorhanger_save_title")
    );
    const identityPreview = $derived(
        [offer.pending.username, offer.pending.email].filter(Boolean).join(" · ")
    );
    const maskedPassword = $derived(maskPassword(offer.pending.password));
    const layout = $derived(settings.layout ?? DEFAULT_DOORHANGER_SETTINGS.layout);
    const gravity = $derived(settings.gravity ?? DEFAULT_DOORHANGER_SETTINGS.gravity);

    const dismiss = async () => {
        if (isBusy) {
            return;
        }
        await DoorhangerService.clearPending();
        onClose();
    };

    const saveNew = async () => {
        if (isBusy) {
            return;
        }
        isBusy = true;
        errorMessage = "";
        try {
            const result = await DoorhangerService.addFromPending(offer.pending);
            if (result.status) {
                onClose();
            } else {
                errorMessage = result.errorMessage || i18n.getMessage("failed_to_save_credential");
            }
        } catch (error) {
            console.error("[Doorhanger] add failed", error);
            errorMessage = i18n.getMessage("failed_to_save_credential");
        }
        isBusy = false;
    };

    const updateSelected = async () => {
        if (isBusy || !selectedGuid) {
            return;
        }
        isBusy = true;
        errorMessage = "";
        try {
            const result = await DoorhangerService.updateFromPending(offer.pending, selectedGuid);
            if (result.status) {
                onClose();
            } else {
                errorMessage = result.errorMessage || i18n.getMessage("failed_to_save_credential");
            }
        } catch (error) {
            console.error("[Doorhanger] update failed", error);
            errorMessage = i18n.getMessage("failed_to_save_credential");
        }
        isBusy = false;
    };
</script>

<div
    id="passman_doorhanger"
    class:layout-card={layout === "card"}
    class:layout-topRow={layout === "topRow"}
    class:gravity-top-right={gravity === "top-right"}
    class:gravity-top-left={gravity === "top-left"}
    class:gravity-bottom-right={gravity === "bottom-right"}
    class:gravity-bottom-left={gravity === "bottom-left"}
    role="dialog"
    aria-label={title}
>
    <div class="doorhanger-inner">
        <div class="doorhanger-body">
            <div class="doorhanger-header">
                <div>
                    <h2 class="doorhanger-title">{title}</h2>
                    <p class="doorhanger-subtitle" title={offer.pending.url}>{offer.pending.label}</p>
                </div>
                <button
                    type="button"
                    class="doorhanger-close"
                    title={i18n.getMessage("doorhanger_dismiss")}
                    aria-label={i18n.getMessage("doorhanger_dismiss")}
                    onclick={dismiss}
                    disabled={isBusy}
                >
                    <Icon data={times} scale={1.0}/>
                </button>
            </div>

            <div class="doorhanger-preview">
                {#if identityPreview}
                    <div class="doorhanger-preview-identity">{identityPreview}</div>
                {/if}
                <div class="doorhanger-preview-password">{maskedPassword}</div>
            </div>

            {#if hasUpdateCandidates}
                <label class="doorhanger-select-label" for="doorhanger-credential-select">
                    {i18n.getMessage("doorhanger_select_credential")}
                </label>
                <select
                    id="doorhanger-credential-select"
                    class="doorhanger-select"
                    bind:value={selectedGuid}
                    disabled={isBusy || offer.updateCandidates.length === 1}
                >
                    {#each offer.updateCandidates as candidate (candidate.guid)}
                        <option value={candidate.guid}>{candidateLabel(candidate.guid)}</option>
                    {/each}
                </select>
            {/if}

            {#if errorMessage}
                <p class="doorhanger-error">{errorMessage}</p>
            {/if}
        </div>

        <div class="doorhanger-actions">
            {#if hasUpdateCandidates}
                <button
                    type="button"
                    class="doorhanger-btn primary"
                    onclick={updateSelected}
                    disabled={isBusy || !selectedGuid}
                >
                    {i18n.getMessage("update")}
                </button>
            {/if}
            <button
                type="button"
                class="doorhanger-btn {hasUpdateCandidates ? 'secondary' : 'primary'}"
                onclick={saveNew}
                disabled={isBusy}
            >
                {#if hasUpdateCandidates}
                    <Icon data={plus} scale={1.3}/>
                {:else}
                    {i18n.getMessage("save")}
                {/if}
            </button>
            <button
                type="button"
                class="doorhanger-btn ghost"
                onclick={dismiss}
                disabled={isBusy}
            >
                {i18n.getMessage("doorhanger_dismiss")}
            </button>
        </div>
    </div>
</div>
