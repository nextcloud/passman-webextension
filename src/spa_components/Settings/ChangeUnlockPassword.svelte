<script lang="ts">
    import Card from "~/spa_partials/Card.svelte";
    import CustomInputField from "~/spa_partials/FormElements/CustomInputField.svelte";
    import ShowGenericErrors from "~/spa_partials/FormElements/ShowGenericErrors.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import { i18n } from "~/lib/i18n";
    import { sendMessage } from "@/entrypoints/background/messaging";
    import CustomStorageService from "~/services/CustomStorageService";
    import NotyService from "~/services/frontend/NotyService";

    let currentPassword = $state('');
    let newPassword = $state('');
    let newPasswordRepeat = $state('');
    let errors = $state<string[]>([]);
    let inFlight = $state(false);
    let expanded = $state(false);

    const canSubmit = $derived(
        !inFlight
        && currentPassword !== ''
        && newPassword !== ''
        && newPasswordRepeat !== ''
    );

    const changePassword = async () => {
        if (inFlight) {
            return;
        }

        errors = [];

        if (newPassword !== newPasswordRepeat) {
            errors = [i18n.getMessage('no_password_match')];
            return;
        }

        inFlight = true;
        try {
            const result = await sendMessage('changeExtensionPassword', {
                oldPassword: currentPassword,
                newPassword,
            });

            if (result.status) {
                CustomStorageService.closeSecureStorage();
                currentPassword = '';
                newPassword = '';
                newPasswordRepeat = '';
                NotyService.notySuccess(i18n.getMessage('unlock_password_changed_successfully'));
            } else {
                errors = [i18n.getMessage('unlock_password_change_failed')];
            }
        } catch {
            errors = [i18n.getMessage('unlock_password_change_failed')];
        } finally {
            inFlight = false;
        }
    };

    const onSubmit = (event: Event) => {
        event.preventDefault();
        void changePassword();
    };
</script>

<Card additionalClasses="text-left mb-6 w-full" paddingClasses="p-2">
    <button
        type="button"
        class="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
        aria-expanded={expanded}
        onclick={() => expanded = !expanded}
    >
        <h4 class="text-md font-semibold">{i18n.getMessage('change_unlock_password')}</h4>
        <span
            class="inline-block shrink-0 text-gray-500 transition-transform {expanded ? 'rotate-180' : ''}"
            aria-hidden="true"
        >▾</span>
    </button>

    {#if expanded}
        <div class="mt-3 space-y-3">
            <p class="text-xs text-gray-500">{i18n.getMessage('setup_unlock_password_hint')}</p>

            <form onsubmit={onSubmit} class="space-y-3">
                <CustomInputField
                    id="currentUnlockPassword"
                    label={i18n.getMessage('current_unlock_password')}
                    bind:value={currentPassword}
                    type="password"
                    tabindex={1}
                />
                <CustomInputField
                    id="newUnlockPassword"
                    label={i18n.getMessage('new_unlock_password')}
                    bind:value={newPassword}
                    type="password"
                    tabindex={2}
                />
                <CustomInputField
                    id="newUnlockPasswordRepeat"
                    label={i18n.getMessage('password_repeat')}
                    bind:value={newPasswordRepeat}
                    type="password"
                    tabindex={3}
                />
                <ShowGenericErrors bind:errors/>
                <OnClickButton
                    callback={changePassword}
                    disabled={!canSubmit}
                    title={i18n.getMessage('change_unlock_password_button')}
                >
                    {#if inFlight}
                        <Icon data={refresh} scale={1.3} spin={true}/>
                    {:else}
                        {i18n.getMessage('change_unlock_password_button')}
                    {/if}
                </OnClickButton>
            </form>
        </div>
    {/if}
</Card>
