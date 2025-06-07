<script lang="ts">
    import SecretField from "../FormElements/SecretField.svelte";
    import { onDestroy, onMount } from "svelte";
    import type { OTPConfigInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/OTPConfigInterface";
    import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";
    import NotyService from "~services/frontend/NotyService";

    export let otp: OTPConfigInterface;
    export let token: string;
    export let hideHiddenToggle: boolean = false;
    let timeLeft: number;
    let intervalID: number;

    // todo: atm it seems we have 1 second delay somewhere, so the token currently changes when the timeLeft changes from 30 to 29 instead of 01 to 30 what would be correct
    const updateTimer = (forceUpdateCurrentToken: boolean = false) => {
        if (otp && otp.period) {
            const epoch = Math.round(new Date().getTime() / 1000.0);
            timeLeft = otp.period - (epoch % otp.period);
            if (epoch % otp.period === 1 || forceUpdateCurrentToken) {
                try {
                    token = OTPService.updateOTP(otp);
                } catch (e) {
                    console.error(e);
                    NotyService.notyError(chrome.i18n.getMessage('otp_configuration_invalid'));
                }
            }
        }
    };
    const createTimer = () => {
        if (intervalID) {
            return;
        }
        updateTimer(true);
        intervalID = window.setInterval(updateTimer, 1000);
    }

    const clearTimer = () => {
        clearInterval(intervalID);
    }

    $: otp && updateTimer(true);

    onMount(createTimer);
    onDestroy(clearTimer);
</script>

<span>
    <SecretField bind:value={token} bind:hideHiddenToggle/>
    {#if timeLeft}
        <span>({timeLeft})</span>
    {/if}
</span>
