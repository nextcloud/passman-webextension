<script lang="ts">
    import { onMount } from "svelte";
    import { PASSWORD_PICKER_SECTIONS, PasswordPickerService } from "~/services/frontend/PasswordPickerService";
    import { ExtensionUnlockState } from "~/stores/extensionUnlockStateStore";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { sliders, list, plus, search, times, circleONotch } from "svelte-awesome/icons";
    import PickerTabAdd from "~/spa_partials/PasswordPickerSections/PickerTabAdd.svelte";
    import PickerTabList from "~/spa_partials/PasswordPickerSections/PickerTabList.svelte";
    import PickerTabSearch from "~/spa_partials/PasswordPickerSections/PickerTabSearch.svelte";
    import PickerTabGenerate from "~/spa_partials/PasswordPickerSections/PickerTabGenerate.svelte";
    import PickerTabPageRules from "~/spa_partials/PasswordPickerSections/PickerTabPageRules.svelte";
    import Doorhanger from "./Doorhanger.svelte";
    import { LegacyFormManagerService } from "~/services/frontend/LegacyFormManagerService";
    import { DoorhangerService, type DoorhangerShowPayload } from "~/services/frontend/DoorhangerService";
    import { i18n } from "~/lib/i18n";
    import { sendMessage } from "@/entrypoints/background/messaging";
    import type {
        DecryptedPartialCredentialData
    } from "@/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import { RemoteCallableFunctions } from "@/entrypoints/content/remoteCallableFunctions";
    import type { GetPickerPageSettingsResponse } from "@/entrypoints/background/messages/getPickerPageSettings";
    import {
        DEFAULT_DOORHANGER_SETTINGS,
        type DoorhangerSettings
    } from "~/lib/doorhanger/doorhangerSettings";

    let shadowRootContainerId: string;

    /**
     * State whether the password picker (in place overlay popup) is open or not.
     * Required to remove picker popup content from shadow dom when the popup gets closed
     */
    let pickerPopupIsOpen = false;
    // todo: backend should notify using messaging api to update this lock state
    let extensionIsUnlocked = false;
    let customPickerStyle = "display: none;";
    let selectedSection: PASSWORD_PICKER_SECTIONS = PASSWORD_PICKER_SECTIONS.LIST;

    let decryptedPartialCredentialData: DecryptedPartialCredentialData[] = [];
    let enableEmailAsUsernameFallbackFilling: boolean = true;

    let doorhangerOffer: DoorhangerShowPayload['offer'] | null = null;
    let doorhangerSettings: DoorhangerSettings = { ...DEFAULT_DOORHANGER_SETTINGS };

    const showPickerCallback = (left: number, top: number, maxZ: any) => {
        decryptedPartialCredentialData = PasswordPickerService.decryptedPartialCredentialData;
        customPickerStyle = 'position: absolute; left: ' + left + 'px; top: ' + top + 'px; z-index: ' + maxZ + 10 + ';';
        pickerPopupIsOpen = true;
    };

    const hidePickerCallback = () => {
        customPickerStyle = "display: none;";
        pickerPopupIsOpen = false;
    }

    const showDoorhanger = (payload: DoorhangerShowPayload) => {
        doorhangerSettings = payload.settings;
        doorhangerOffer = payload.offer;
    };

    const hideDoorhanger = () => {
        doorhangerOffer = null;
    };

    export const setShadowRootContainerId = (_shadowRootContainerId: string) => {
        shadowRootContainerId = _shadowRootContainerId;
    }

    export const loadPickerForCurrentTab = () => {
        console.debug("picker svelte initialized");

        sendMessage('getExtensionUnlockState').then((value) => {
            extensionIsUnlocked = false;
            if (value.status === ExtensionUnlockState.UNLOCKED) {
                extensionIsUnlocked = true;
                console.debug("is unlocked");

                DoorhangerService.setOnOfferCallback(showDoorhanger);

                document.addEventListener('click', function (event) {
                    if (!pickerPopupIsOpen) {
                        return;
                    }

                    // Get the composed path of the click event
                    const path = event.composedPath();

                    // Check if the click was inside our root container
                    const wasInsidePicker = path.some(node => {
                        // Avoid instanceof Element across realms (Firefox Xray)
                        return (node as Node)?.nodeType === Node.ELEMENT_NODE &&
                               (node as Element).id === shadowRootContainerId;
                    });

                    if (!wasInsidePicker) {
                        // Click was outside
                        hidePickerCallback();
                    }
                });

                sendMessage('getPickerPageSettings').then(async (value: GetPickerPageSettingsResponse) => {
                    PasswordPickerService.initPickerForPage(
                        showPickerCallback,
                        hidePickerCallback,
                        value
                    );
                    console.debug("skippedInvisibleFieldsDetected", LegacyFormManagerService.skippedInvisibleFieldsDetected);
                });
            } else {
                hideDoorhanger();
                // DoorhangerService.unload();
                DoorhangerService.setOnOfferCallback(null);

                // unload password picker icons in input fields
                PasswordPickerService.unloadPicker();
            }
        });
    }

    // this is injected and executed on every page / tab load
    onMount(() => {
        RemoteCallableFunctions.setReloadPickerCallback(loadPickerForCurrentTab);

        document.addEventListener('visibilitychange', function (event) {
            if (!document.hidden && !extensionIsUnlocked) {
                // tab is now visible and extension was not unlocked before current visibility change
                loadPickerForCurrentTab();
            }
        });

        loadPickerForCurrentTab();
    })
</script>

{#if extensionIsUnlocked}
    {#if doorhangerOffer}
        <Doorhanger
            offer={doorhangerOffer}
            settings={doorhangerSettings}
            onClose={hideDoorhanger}
        />
    {/if}

    <div id="password_picker" style="{customPickerStyle}">
        <div class="tabs">
            <div class="tab add" data-name="add" aria-hidden="true"
                 on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.ADD}>
                <span class="picker-fa" title={i18n.getMessage("add_account")}>
                    <Icon data={plus} scale={1.0}/>
                </span>
            </div>
            <div class="tab list" data-name="list" aria-hidden="true"
                 on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.LIST}>
                <span class="picker-fa" title={i18n.getMessage("accounts")}>
                    <Icon data={list} scale={1.0}/>
                </span>
            </div>
            <div class="tab search" data-name="search" aria-hidden="true"
                 on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.SEARCH}>
                <span class="picker-fa" title={i18n.getMessage("search")} style="padding-bottom: 7px;">
                    <Icon data={search} scale={1.0}/>
                </span>
            </div>
            <div class="tab generate" data-name="generate" aria-hidden="true"
                 on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.GENERATE}>
                <span class="picker-fa" title={i18n.getMessage("password_generator")} style="padding-bottom: 7px;">
                    <Icon data={circleONotch} scale={1.0}/>
                </span>
            </div>
            <div class="tab page-rules" data-name="page-rules" aria-hidden="true"
                 on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.PAGE_RULES}>
                <span class="picker-fa" title={i18n.getMessage("page_rules")} style="padding-bottom: 7px;">
                    <Icon data={sliders} scale={1.0}/>
                </span>
            </div>
            <div class="tab close pull-right" aria-hidden="true" on:click={hidePickerCallback}>
                <span class="picker-fa" title={i18n.getMessage("close")} style="padding-bottom: 7px;">
                    <Icon data={times} scale={1.0}/>
                </span>
            </div>
        </div>
        <div class="tab-content p-2">
            {#if pickerPopupIsOpen}
                {#if selectedSection === PASSWORD_PICKER_SECTIONS.ADD}
                    <PickerTabAdd bind:selectedSection/>
                {:else if selectedSection === PASSWORD_PICKER_SECTIONS.LIST}
                    <PickerTabList bind:selectedSection bind:enableEmailAsUsernameFallbackFilling/>
                {:else if selectedSection === PASSWORD_PICKER_SECTIONS.SEARCH}
                    <PickerTabSearch bind:enableEmailAsUsernameFallbackFilling/>
                {:else if selectedSection === PASSWORD_PICKER_SECTIONS.GENERATE}
                    <PickerTabGenerate/>
                {:else if selectedSection === PASSWORD_PICKER_SECTIONS.PAGE_RULES}
                    <PickerTabPageRules/>
                {/if}
            {/if}
        </div>
    </div>
{/if}

<style>
    @import "../../../../public/content_styles/content.scss";
</style>
