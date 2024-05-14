<script lang="ts">
    import { onMount } from "svelte";
    import { PasswordPickerService } from "~services/frontend/PasswordPickerService";
    import { sendToBackground } from "@plasmohq/messaging";
    import { ExtensionUnlockState } from "~stores/extensionUnlockStateStore";
    import Icon from "svelte-awesome/package/components/Icon.svelte";
    import { ban, list, plus, search, times } from "svelte-awesome/package/icons";
    import refresh from "svelte-awesome/icons/refresh";
    import PickerTabAdd from "~spa_partials/PasswordPickerSections/PickerTabAdd.svelte";
    import PickerTabList from "~spa_partials/PasswordPickerSections/PickerTabList.svelte";
    import PickerTabSearch from "~spa_partials/PasswordPickerSections/PickerTabSearch.svelte";
    import PickerTabGenerate from "~spa_partials/PasswordPickerSections/PickerTabGenerate.svelte";
    import PickerTabIgnore from "~spa_partials/PasswordPickerSections/PickerTabIgnore.svelte";
    import type {
        DecryptedPartialCredentialData
    } from "~background/messages/getPartiallyDecryptedFilteredCredentialsList";

    enum PASSWORD_PICKER_SECTIONS {
        ADD,
        LIST,
        SEARCH,
        GENERATE,
        IGNORE
    }

    /**
     * State whether the password picker (in place overlay popup) is open or not.
     * Required to remove picker popup contents from shadow dom when the popup gets closed
     */
    let pickerPopupIsOpen = false;
    // todo: backend should notify using messaging api to update this lock state
    let extensionIsUnlocked = false;
    let customPickerStyle = "display: none;";
    let selectedSection: PASSWORD_PICKER_SECTIONS = PASSWORD_PICKER_SECTIONS.LIST;

    let decryptedPartialCredentialData: DecryptedPartialCredentialData[] = [];

    const showPickerCallback = (left: number, top: number, maxZ: any) => {
        decryptedPartialCredentialData = PasswordPickerService.decryptedPartialCredentialData;
        console.log(decryptedPartialCredentialData);
        /*const picker = document.getElementById('password_picker');
        console.log(picker);
        picker.style.position = 'absolute';
        picker.style.left = left + 'px';
        picker.style.zIndex = "" + maxZ + 10;
        picker.style.top = top + 'px';*/
        customPickerStyle = 'position: absolute; left: ' + left + 'px; top: ' + top + 'px; z-index: ' + maxZ + 10 + ';';
        pickerPopupIsOpen = true;
    };

    const hidePickerCallback = () => {
        customPickerStyle = "display: none;";
        pickerPopupIsOpen = false;
    }

    const loadPickerForCurrentTab = () => {
        console.debug("picker svelte initialized");

        sendToBackground({
            name: "getExtensionUnlockState"
        }).then((value) => {
            extensionIsUnlocked = false;
            if (value.status === ExtensionUnlockState.UNLOCKED) {
                extensionIsUnlocked = true;
                console.debug("is unlocked");

                document.addEventListener('click', function (event) {
                    let shadowRootContainer = document.getElementsByTagName('plasmo-csui').item(0);
                    let targetEl = event.target as Element; // clicked element
                    do {
                        if (targetEl == shadowRootContainer) {
                            // This is a click inside, does nothing, just return.
                            // console.debug("Clicked inside!");
                            return;
                        }
                        // Go up the DOM
                        targetEl = targetEl.parentNode as Element;
                    } while (targetEl);
                    // console.debug("Clicked outside!");
                    hidePickerCallback();
                });

                PasswordPickerService.initPickerForPage(showPickerCallback, hidePickerCallback);
            }
        });
    }

    // this is injected and executed on every page / tab load
    onMount(() => {
        document.addEventListener('visibilitychange', function (event) {
            if (!document.hidden && !extensionIsUnlocked) {
                // tab is now visible and extension was not unlocked before current visibility change
                loadPickerForCurrentTab();
            }
        });

        loadPickerForCurrentTab();
    })
</script>

<link rel="stylesheet" type="text/css" href="{chrome.runtime.getURL('/assets/content_styles/password_picker.css')}"/>


{#if extensionIsUnlocked}
    <div id="password_picker" style="{customPickerStyle}">
        <div class="tabs">
            <div class="tab add" data-name="add" aria-hidden="true"
                 on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.ADD}>
                <span class="fa" title="[add_account, title]">
                    <Icon data={plus} scale={1.0}/>
                </span>
            </div>
            <div class="tab list" data-name="list" aria-hidden="true"
                 on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.LIST}>
                <span class="fa" title="[accounts, title]">
                    <Icon data={list} scale={1.0}/>
                </span>
            </div>
            <div class="tab search" data-name="search" aria-hidden="true"
                 on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.SEARCH}>
                <span class="fa" title="[search, title]">
                    <Icon data={search} scale={1.0}/>
                </span>
            </div>
            <div class="tab generate" data-name="generate" aria-hidden="true"
                 on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.GENERATE}>
                <span class="fa" title="[password_generator, title]">
                    <Icon data={refresh} scale={1.0}/>
                </span>
            </div>
            <div class="tab ignore" data-name="ignore" aria-hidden="true"
                 on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.IGNORE}>
                <span class="fa" title="[ignore_site_tab, title]">
                    <Icon data={ban} scale={1.0}/>
                </span>
            </div>
            <div class="tab close pull-right" aria-hidden="true" on:click={hidePickerCallback}>
                <span class="fa" title="[close, title]">
                    <Icon data={times} scale={1.0}/>
                </span>
            </div>
        </div>
        <div class="tab-content">
            {#if pickerPopupIsOpen}
                {#if selectedSection === PASSWORD_PICKER_SECTIONS.ADD}
                    add section
                    <PickerTabAdd/>
                {:else if selectedSection === PASSWORD_PICKER_SECTIONS.LIST}
                    <PickerTabList/>
                {:else if selectedSection === PASSWORD_PICKER_SECTIONS.SEARCH}
                    search section
                    <PickerTabSearch/>
                {:else if selectedSection === PASSWORD_PICKER_SECTIONS.GENERATE}
                    generate section
                    <PickerTabGenerate/>
                {:else if selectedSection === PASSWORD_PICKER_SECTIONS.IGNORE}
                    ignore section
                    <PickerTabIgnore/>
                {/if}
            {/if}
        </div>
    </div>
{/if}
