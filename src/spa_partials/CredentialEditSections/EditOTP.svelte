<script lang="ts">
    import type {
        DecryptedCredentialInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
    import OtpGenerator from "~/spa_partials/InteractionElements/OTPGenerator.svelte";
    import CopyClipboardButton from "../InteractionElements/CopyClipboardButton.svelte";
    import CustomInputField from "../FormElements/CustomInputField.svelte";
    import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";
    import { onMount } from "svelte";
    import NotyService from "~/services/frontend/NotyService";
    import OnClickButton from "../InteractionElements/OnClickButton.svelte";
    import InPlaceEdit from "../FormElements/InPlaceEdit.svelte";
    import SimpleDropdownSelectBox from "~/spa_partials/FormElements/SimpleDropdownSelectBox.svelte";
    import { OTPAlgorithmOptions } from "@binsky/passman-client-ts/lib/Interfaces/Credential/OTPConfigInterface";
    import type { ChangeEventHandler } from "svelte/elements";
    import { i18n } from "~/lib/i18n";
    import Utils from "~/lib/Utils";
    import { logger } from "~/services/ConsoleLoggingService";

    export let credentialData: DecryptedCredentialInterface;
    let otpToken: string;
    const isInPopup = Utils.isInPopup();

    const syncSecret: ChangeEventHandler<HTMLInputElement|HTMLTextAreaElement> = (event) => {
        if (credentialData.otp == null || (credentialData.otp as string) === '{}' || Object.keys(credentialData.otp).length === 0) {
            credentialData.otp = {};
            OTPService.mergeDefaultOTPConfig(credentialData.otp);
        }
        if (event.target && event.target instanceof HTMLInputElement && event.target.value !== undefined && credentialData.otp.secret !== event.target.value) {
            const secret = event.target.value as string;
            credentialData.otp = {
                ...credentialData.otp,
                secret: secret
            };
            updateGenerateQRCode();
        }
    }

    const updateGenerateQRCode = () => {
        try {
            OTPService.updateQRFromCurrentOTPValues(credentialData.otp);
            // in-place nested mutation — reassign so Svelte invalidates
            credentialData.otp = credentialData.otp;
        } catch (e) {
            logger.error(e);
            NotyService.notyError(i18n.getMessage("otp_configuration_invalid"));
        }
    }

    const readQRFromInput: ChangeEventHandler<HTMLInputElement> = (changeEvent) => {
        if (changeEvent.target !== null && changeEvent.target instanceof HTMLInputElement && changeEvent.target.files !== null) {
            const reader = new FileReader(), file = changeEvent.target.files[0];
            reader.readAsDataURL(file);
            reader.onload = (() => {
                return async (e) => {
                    if (e.target !== null) {
                        credentialData.otp = await OTPService.parseOTPQrCodeFromInputFileData(e.target.result)
                    }
                };
            })();
        }
    }

    const clearOTPConfig = () => {
        credentialData.otp = {};
    }

    const getOtpQrImage = (otp: typeof credentialData.otp) => {
        const qrUri = otp?.qr_uri;
        return typeof qrUri === 'object' && qrUri != null ? qrUri.image : undefined;
    }

    onMount(() => {
        if (credentialData?.otp?.secret && !getOtpQrImage(credentialData.otp)) {
            updateGenerateQRCode();
        }
    });
</script>

{#if credentialData}
    <div class="basis-1/2 pr-2">
        <div class="mt-2 mb-4">
            <CustomInputField label="{i18n.getMessage('otp_secret')}" value={OTPService.getSecretString(credentialData.otp.secret)}
                              onchange={syncSecret}/>
        </div>
        {#if isInPopup}
            <div class="space-y-2">
                <p class="text-sm text-gray-500">
                    {i18n.getMessage('error_file_upload_popup')}
                </p>
                <p class="text-sm text-gray-500">
                    {i18n.getMessage('error_file_upload_popup_2')}
                </p>
            </div>
        {:else}
            <div class="mt-2 mb-4">
                <input type="file" on:change={readQRFromInput}/>
            </div>
        {/if}
        {#if credentialData.otp != null}
            {@const qrImage = getOtpQrImage(credentialData.otp)}
            {#if qrImage != null}
                <div class="mt-2">
                    <img src={qrImage} class="border-white border-2 bg-white"
                         alt="{i18n.getMessage('otp_qr_code')}"/>
                </div>
            {/if}
            {#if credentialData.otp.secret}
                <div class="flex flex-wrap text-sm mt-4">
                    <div class="basis-3/12 grow">{i18n.getMessage('label')}:</div>
                    <div class="basis-9/12 break-all">
                        <InPlaceEdit bind:value={credentialData.otp.label} on:submit={updateGenerateQRCode}/>
                    </div>
                </div>
                <div class="flex flex-wrap text-sm mt-2">
                    <div class="basis-3/12 grow">{i18n.getMessage('issuer')}:</div>
                    <div class="basis-9/12 break-all">
                        <InPlaceEdit bind:value={credentialData.otp.issuer} on:submit={updateGenerateQRCode}/>
                    </div>
                </div>
            {/if}
            {#if credentialData.otp.type != null}
                <div class="flex flex-wrap text-sm mt-2">
                    <div class="basis-3/12 grow">{i18n.getMessage('type')}:</div>
                    <div class="basis-9/12 break-all">
                        {credentialData.otp.type}
                    </div>
                </div>
            {/if}
            {#if credentialData.otp.digits != null}
                <div class="flex flex-wrap text-sm mt-2">
                    <div class="basis-3/12 grow">{i18n.getMessage('digits')}:</div>
                    <div class="basis-9/12 break-all">
                        <input type="number" bind:value={credentialData.otp.digits} min="6"
                               on:change={updateGenerateQRCode} class="dark:bg-neutral"
                               style="-moz-appearance: initial; -webkit-appearance: initial;">
                    </div>
                </div>
            {/if}
            {#if credentialData.otp.period != null}
                <div class="flex flex-wrap text-sm mt-2">
                    <div class="basis-3/12 grow">{i18n.getMessage('period')}:</div>
                    <div class="basis-9/12 break-all">
                        <input type="number" bind:value={credentialData.otp.period} min="30"
                               on:change={updateGenerateQRCode} class="dark:bg-neutral"
                               style="-moz-appearance: initial; -webkit-appearance: initial;">
                    </div>
                </div>
            {/if}
            {#if credentialData.otp.algorithm != null}
                <div class="flex flex-wrap text-sm mt-2">
                    <div class="basis-3/12 grow">{i18n.getMessage('algorithm')}:</div>
                    <div class="basis-9/12 break-all">
                        <SimpleDropdownSelectBox bind:value={credentialData.otp.algorithm} options={OTPAlgorithmOptions}
                                                 small={true} onChangeCallback={updateGenerateQRCode}/>
                    </div>
                </div>
            {/if}
            {#if credentialData.otp.secret != null}
                <div class="flex flex-wrap text-sm mt-2">
                    <div class="basis-3/12 grow">{i18n.getMessage('one_time_password')}:</div>
                    <div class="basis-9/12 break-all">
                        <OtpGenerator bind:otp={credentialData.otp} bind:token={otpToken} hideHiddenToggle={true}/>
                        <CopyClipboardButton bind:value={otpToken} fieldTitle="{i18n.getMessage('one_time_password')}"/>
                    </div>
                </div>
            {/if}
        {/if}

        <OnClickButton title="{i18n.getMessage('otp_clear_all')}" callback={clearOTPConfig}
                       additionalClasses="mt-4 bg-red-600 hover:bg-red-500">
            {i18n.getMessage('otp_clear_all')}
        </OnClickButton>
    </div>
{/if}
