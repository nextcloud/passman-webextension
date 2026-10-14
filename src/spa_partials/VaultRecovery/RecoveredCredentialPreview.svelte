<script lang="ts">
    import type { DecryptedCredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
    import type { FileInterface } from "@binsky/passman-client-ts/lib/Interfaces/File/FileInterface";
    import { CustomMathsService } from "@binsky/passman-client-ts/lib/Service/CustomMathsService";
    import SecretField from "~/spa_partials/FormElements/SecretField.svelte";
    import CopyClipboardButton from "~/spa_partials/InteractionElements/CopyClipboardButton.svelte";
    import TagsView from "~/spa_partials/TagsView.svelte";
    import OTPGenerator from "~/spa_partials/InteractionElements/OTPGenerator.svelte";
    import OriginalCredentialJson from "~/spa_partials/VaultRecovery/OriginalCredentialJson.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import externalLink from "svelte-awesome/icons/externalLink";
    import exclamationCircle from "svelte-awesome/icons/exclamationCircle";
    import { i18n } from "~/lib/i18n";

    export let preview: Partial<DecryptedCredentialInterface> = {};
    export let brokenFields: string[] = [];
    export let originalJson: string | undefined = undefined;

    let otpToken = "";
    let showOriginalJson = false;

    const hasText = (value: unknown): value is string =>
        typeof value === "string" && value !== "";

    const isFile = (value: unknown): value is FileInterface =>
        typeof value === "object" && value !== null && "filename" in value;

    const previewIsEmpty = (): boolean =>
        !hasText(preview.username)
        && !hasText(preview.password)
        && !hasText(preview.email)
        && !hasText(preview.url)
        && !hasText(preview.description)
        && !preview.otp?.secret
        && !(preview.files?.length)
        && !(preview.custom_fields?.length)
        && !(preview.tags?.length);
</script>

<p class="text-xs text-gray-500 mb-3">{i18n.getMessage('vault_recovery_readonly_notice')}</p>

{#if brokenFields.length > 0}
    <p class="text-xs text-amber-700 dark:text-amber-300 mb-3">
        {i18n.getMessage('vault_recovery_broken_fields', [brokenFields.join(', ')])}
    </p>
{/if}

{#if preview.compromised}
    <div class="text-sm text-red-600 mb-3">
        <Icon data={exclamationCircle} scale={1.0}/>
        {i18n.getMessage('compromised_notice')}
    </div>
{/if}

{#if hasText(preview.username)}
    <div class="flex flex-wrap text-sm">
        <div class="basis-3/12 grow font-semibold">{i18n.getMessage('username')}</div>
        <div class="basis-8/12 break-all">{preview.username}</div>
        <div class="basis-1/12 grow text-end">
            <CopyClipboardButton value={preview.username} fieldTitle={i18n.getMessage('username')}/>
        </div>
    </div>
{/if}

{#if hasText(preview.password)}
    <div class="flex flex-wrap text-sm">
        <div class="basis-3/12 grow font-semibold">{i18n.getMessage('password')}</div>
        <div class="basis-8/12 break-all">
            <SecretField value={preview.password}/>
        </div>
        <div class="basis-1/12 grow text-end">
            <CopyClipboardButton value={preview.password} fieldTitle={i18n.getMessage('password')}/>
        </div>
    </div>
{/if}

{#if preview.otp != null && preview.otp.secret}
    <div class="flex flex-wrap text-sm">
        <div class="basis-3/12 grow font-semibold">{i18n.getMessage('one_time_password')}</div>
        <div class="basis-8/12 break-all">
            <OTPGenerator otp={preview.otp} bind:token={otpToken}/>
        </div>
        <div class="basis-1/12 grow text-end">
            <CopyClipboardButton bind:value={otpToken} fieldTitle={i18n.getMessage('one_time_password')}/>
        </div>
    </div>
{/if}

{#if hasText(preview.email)}
    <div class="flex flex-wrap text-sm">
        <div class="basis-3/12 grow font-semibold">{i18n.getMessage('email')}</div>
        <div class="basis-8/12 break-all">{preview.email}</div>
        <div class="basis-1/12 grow text-end">
            <CopyClipboardButton value={preview.email} fieldTitle={i18n.getMessage('email')}/>
        </div>
    </div>
{/if}

{#if hasText(preview.url)}
    <div class="flex flex-wrap text-sm">
        <div class="basis-3/12 grow font-semibold">{i18n.getMessage('url')}</div>
        <div class="basis-8/12 break-all">
            {preview.url}
            <a href={preview.url} target="_blank" rel="noopener noreferrer" class="cursor-pointer px-0.5">
                <Icon data={externalLink} scale={1.0}/>
            </a>
        </div>
        <div class="basis-1/12 grow text-end">
            <CopyClipboardButton value={preview.url} fieldTitle={i18n.getMessage('url')}/>
        </div>
    </div>
{/if}

{#if hasText(preview.description)}
    <div class="flex flex-wrap text-sm">
        <div class="basis-3/12 grow font-semibold">{i18n.getMessage('description')}</div>
        <div class="basis-8/12 break-all">{preview.description}</div>
        <div class="basis-1/12 grow text-end">
            <CopyClipboardButton value={preview.description} fieldTitle={i18n.getMessage('description')}/>
        </div>
    </div>
{/if}

{#if preview.files != null && preview.files.length > 0}
    <div class="flex flex-wrap text-sm">
        <div class="basis-3/12 grow font-semibold">{i18n.getMessage('files')}</div>
        <div class="basis-9/12 break-all space-y-1">
            {#each preview.files as file}
                <p>{file.filename} ({CustomMathsService.calculateFromByte(file.size)})</p>
            {/each}
        </div>
    </div>
{/if}

{#if preview.custom_fields != null && preview.custom_fields.length > 0}
    {#each preview.custom_fields as field}
        <div class="flex flex-wrap text-sm">
            <div class="basis-3/12 grow font-semibold">{field.label}</div>
            {#if field.field_type === 'file' && isFile(field.value)}
                <div class="basis-9/12 break-all">
                    {field.value.filename} ({CustomMathsService.calculateFromByte(field.value.size)})
                </div>
            {:else if field.field_type === 'password' && hasText(field.value)}
                <div class="basis-8/12 break-all">
                    <SecretField value={field.value}/>
                </div>
                <div class="basis-1/12 grow text-end">
                    <CopyClipboardButton value={field.value} fieldTitle={field.label}/>
                </div>
            {:else}
                <div class="basis-8/12 break-all">
                    <p>{field.value}</p>
                </div>
                {#if hasText(field.value)}
                    <div class="basis-1/12 grow text-end">
                        <CopyClipboardButton value={field.value} fieldTitle={field.label}/>
                    </div>
                {/if}
            {/if}
        </div>
    {/each}
{/if}

{#if preview.tags != null && preview.tags.length > 0}
    <div class="flex flex-wrap text-sm">
        <div class="basis-3/12 grow font-semibold">{i18n.getMessage('tags')}</div>
        <div class="basis-9/12">
            <TagsView tags={preview.tags}/>
        </div>
    </div>
{/if}

{#if previewIsEmpty()}
    <p class="text-sm text-gray-500">{i18n.getMessage('vault_recovery_preview_empty')}</p>
{/if}

{#if originalJson}
    <button type="button" class="text-xs text-primary hover:underline mt-2 cursor-pointer" onclick={() => showOriginalJson = !showOriginalJson}>
        {i18n.getMessage('vault_recovery_show_original_json')}
    </button>
    {#if showOriginalJson}
        <OriginalCredentialJson originalJson={originalJson}/>
    {/if}
{/if}
