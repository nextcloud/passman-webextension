<script lang="ts">
    import { onMount } from "svelte";
    import NextcloudServerSettings from "~/spa_components/Settings/NextcloudServerSettings.svelte";
    import OfflineCachePersistenceService from "~/services/OfflineCachePersistenceService";
    import OfflineCacheStorageService from "~/services/OfflineCacheStorageService";
    import { i18n } from "~/lib/i18n";
    import passmanBlueWhiteImage from "~/assets/images/passman-blue-white.svg";
    import passmanImage from "~/assets/images/passman.svg";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { warning } from "svelte-awesome/icons";

    let showOfflineCacheFallbackNotice = $state(false);

    onMount(() => {
        void OfflineCachePersistenceService.get()
            .then(() => {
                showOfflineCacheFallbackNotice = !OfflineCacheStorageService.isNativeAvailable();
            })
            .catch(() => {
                showOfflineCacheFallbackNotice = false;
            });
    });
</script>

<div class="flex h-full flex-col items-center px-6 py-8">
    <div class="setup-fancy flex w-full max-w-md flex-col items-center">
        <div class="mb-5 flex flex-col items-center text-center">
            <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#007ac7] shadow-md shadow-[#007ac7]/25">
                <!-- <img src="{passmanImage}" class="h-9 w-9 dark:hidden" alt="{i18n.getMessage('extName')}"/>
                <img src="{passmanBlueWhiteImage}" class="hidden h-9 w-9 dark:block" alt="{i18n.getMessage('extName')}"/> -->
                <img src="{passmanImage}" class="h-9 w-9" alt="{i18n.getMessage('extName')}"/>
            </div>
            <h2 class="text-2xl font-bold tracking-tight text-gray-800">
                {i18n.getMessage('setup_server_step_title')}
            </h2>
            <p class="mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
                {i18n.getMessage('setup_server_step_intro')}
            </p>
        </div>

        {#if showOfflineCacheFallbackNotice}
            <div class="mb-4 w-full rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-left">
                <div class="flex gap-2.5">
                    <Icon data={warning} scale={1.0} class="mt-0.5 h-4 w-4 shrink-0 text-amber-500"/>
                    <div class="text-xs leading-relaxed text-amber-800">
                        <p>
                            {i18n.getMessage('setup_offline_cache_fallback_notice')}
                        </p>
                        <p class="mt-1">
                            * {i18n.getMessage('experimental')}
                        </p>
                    </div>
                </div>
            </div>
        {/if}

        <div class="w-full">
            <NextcloudServerSettings/>
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
