<script lang="ts">
    import { onMount } from "svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import InternalHrefLinkButton from "~/spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import CustomInputField from "~/spa_partials/FormElements/CustomInputField.svelte";
    import ExtensionUnlockService from "~/services/ExtensionUnlockService";
    import LegacySettingsMigrationService from "~/services/LegacySettingsMigrationService";
    import OfflineCachePersistenceService from "~/services/OfflineCachePersistenceService";
    import OfflineCacheStorageService from "~/services/OfflineCacheStorageService";
    import { sendMessage } from "@/entrypoints/background/messaging";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import { i18n } from "~/lib/i18n";
    import browser from "webextension-polyfill";
    import passmanBlueWhiteImage from "~/assets/images/passman-blue-white.svg";
    import passmanImage from "~/assets/images/passman.svg";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { warning } from "svelte-awesome/icons";

    export let params: { isInPopup: string };

    let newExtensionUnlockPassword = '';
    let isExtensionUnlocked = false;
    let processNewUnlockPassword = false;
    let showLegacyImport = false;

    const ensurePersistenceService = async (syncBackground = false) => {
        try {
            await OfflineCachePersistenceService.get();
            if (syncBackground) {
                // probe/init background persistence after unlock password exists
                await sendMessage("recreateOfflineCachePersistence", {});
            }
        } catch {
        }
    };

    onMount(() => {
        // Popup only offers "open options"; migrate UI lives on the options setup screen.
        if (params && params.isInPopup === '1') {
            return;
        }
        LegacySettingsMigrationService.hasLegacyData().then((hasLegacy) => {
            showLegacyImport = hasLegacy;
        });
        void ExtensionUnlockService.isUnlocked().then(async (unlocked) => {
            if (unlocked) {
                // do not ask to setup a new unlock password if the extension is already unlocked
                isExtensionUnlocked = true;
                await ensurePersistenceService(false);
            }
        });
    });

    async function setUnlockPassword() {
        processNewUnlockPassword = true;
        await ExtensionUnlockService.setUpExtensionPassword(newExtensionUnlockPassword);
        isExtensionUnlocked = true;
        await ensurePersistenceService(true);
        processNewUnlockPassword = false;
        push('/setup/server');
    }

    function openOptionsPage() {
        browser.runtime.openOptionsPage();
    }
</script>

<div class="flex h-full flex-col items-center justify-center px-6 py-8">
    <div class="setup-fancy flex w-full max-w-sm flex-col items-center text-center">
        <div class="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#007ac7] shadow-md shadow-[#007ac7]/25">
            <!-- <img src="{passmanImage}" class="h-12 w-12 dark:hidden" alt="{i18n.getMessage('extName')}"/>
            <img src="{passmanBlueWhiteImage}" class="hidden h-12 w-12 dark:block" alt="{i18n.getMessage('extName')}"/> -->
            <img src="{passmanImage}" class="h-12 w-12" alt="{i18n.getMessage('extName')}"/>
        </div>

        <h2 class="text-2xl font-bold tracking-tight text-gray-800">
            {i18n.getMessage("welcome_to_passman")}
        </h2>
        <p class="mt-3 text-sm leading-relaxed text-gray-600">
            {i18n.getMessage("intro_text")}
        </p>

        <div class="mt-6 w-full">
            <!-- Popup closes too easily for multi-step setup — send users to the options page. -->
            {#if (params && params.isInPopup === '1')}
                <OnClickButton
                    callback={openOptionsPage}
                    title="{i18n.getMessage('begin')}"
                    additionalClasses="w-full border-primary text-primary hover:bg-primary hover:text-white"
                >
                    {i18n.getMessage("begin")}
                </OnClickButton>
            {:else if isExtensionUnlocked}
                <InternalHrefLinkButton
                    href="/setup/server"
                    additionalClasses="inline-flex w-full justify-center border-primary text-primary hover:bg-primary hover:text-white"
                >
                    {i18n.getMessage("begin")}
                </InternalHrefLinkButton>
            {:else}
                <form on:submit|preventDefault={setUnlockPassword}>
                    <div class="w-full space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm">
                        <CustomInputField
                            label="{i18n.getMessage('set_extension_unlock_password')}"
                            bind:value={newExtensionUnlockPassword}
                            tabindex={1}
                            type="password"
                        />
                        <p class="text-xs leading-snug text-gray-500">
                            {i18n.getMessage('setup_unlock_password_hint')}
                        </p>
                        <OnClickButton
                            callback={setUnlockPassword}
                            title="{i18n.getMessage('save_password_and_unlock')}"
                            disabled={newExtensionUnlockPassword === '' || processNewUnlockPassword}
                            additionalClasses="w-full border-primary text-primary hover:bg-primary hover:text-white"
                        >
                            {i18n.getMessage('save_password_and_unlock')}
                        </OnClickButton>
                    </div>
                </form>

                {#if showLegacyImport}
                    <div class="mt-4 w-full space-y-3 rounded-xl border border-primary/25 bg-sky-50/60 p-4 text-left shadow-sm">
                        <h3 class="text-sm font-semibold text-gray-800">
                            {i18n.getMessage('migrate_legacy_title')}
                        </h3>
                        <p class="text-xs leading-snug text-gray-600">
                            {i18n.getMessage('migrate_legacy_setup_teaser')}
                        </p>
                        <p class="text-xs leading-snug text-red-600">
                            <span class="font-medium">{i18n.getMessage('experimental')}</span>
                        </p>
                        <InternalHrefLinkButton
                            href="/setup/migrate"
                            additionalClasses="inline-flex w-full justify-center border-primary text-primary hover:bg-primary hover:text-white"
                        >
                            {i18n.getMessage('migrate_legacy_button')}
                        </InternalHrefLinkButton>
                    </div>
                {/if}
            {/if}
        </div>

        <div class="mt-5 w-full rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-left">
            <div class="flex gap-2.5">
                <Icon data={warning} scale={1.0} class="mt-0.5 h-4 w-4 shrink-0 text-amber-500"/>
                <p class="text-xs leading-relaxed text-amber-800">
                    {@html i18n.getMessage('setup_dev_warning', [
                        '<br>',
                        '<a href="https://github.com/nextcloud/passman-webextension/issues" target="_blank" class="font-medium underline underline-offset-2 hover:text-amber-950 transition-colors">',
                        '</a>'
                    ])}
                </p>
            </div>
        </div>
    </div>
</div>

<style>
    .setup-fancy {
        animation: setup-fancy-in 420ms ease-out both;
    }

    @keyframes setup-fancy-in {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
