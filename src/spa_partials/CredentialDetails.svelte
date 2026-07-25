<script lang="ts">
    import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import SecretField from "~/spa_partials/FormElements/SecretField.svelte";
    import CopyClipboardButton from "~/spa_partials/InteractionElements/CopyClipboardButton.svelte";
    import Time from "svelte-time";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import externalLink from "svelte-awesome/icons/externalLink";
    import exclamationCircle from "svelte-awesome/icons/exclamationCircle";
    import TagsView from "~/spa_partials/TagsView.svelte";
    import OTPGenerator from "~/spa_partials/InteractionElements/OTPGenerator.svelte";
    import { CustomMathsService } from "@binsky/passman-client-ts/lib/Service/CustomMathsService";
    import type { FileInterface } from "@binsky/passman-client-ts/lib/Interfaces/File/FileInterface";
    import { SharingACL } from "@binsky/passman-client-ts/lib/Model/SharingACL";
    import InlineMiniLoading from "~/spa_components/LineLoading.svelte";
    import { i18n } from "~/lib/i18n";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import NotyService from "~/services/frontend/NotyService";
    import refresh from "svelte-awesome/icons/refresh";
    import { logger } from "~/services/ConsoleLoggingService";

    export let credential: Credential;
    export let hideDefaultDatetimeFields: boolean = true;
    export let onCredChangedCallback: () => void;

    let expire_time_formatted: string;
    let created_formatted: string;
    let changed_formatted: string;
    let otp_token: string;
    let show_loading_for_file_id: number | undefined = undefined;
    let deletion_in_progress = false;

    const downloadFile = async (file: FileInterface) => {
        if (!show_loading_for_file_id) {
            show_loading_for_file_id = file.file_id;
            try {
                await credential.downloadFile(file);
            } catch (e) {
                logger.error('Unexpected error during file download', e);
            }
            show_loading_for_file_id = undefined;
        }
    }

    const markAsDeleted = () => {
        deletion_in_progress = true;
        credential.delete_time = new Date().getTime() / 1000;
        credential.update().then(value => {
            if (value) {
                NotyService.notySuccess(i18n.getMessage('credential_deleted'));
                if (onCredChangedCallback) {
                    onCredChangedCallback();
                }
            } else {
                const msg = i18n.getMessage('credential_delete_unknown_error');
                NotyService.notyError(msg);
                logger.error(msg);
            }
        }, rejectionReason => {
            const msg = i18n.getMessage('credential_delete_error');
            NotyService.notyError(msg);
            logger.error(msg, rejectionReason);
        }).finally(() => {
            deletion_in_progress = false;
        });
    }

    const addProtocolIfMissing = (url: string) => {
        if (!/^https?:\/\//i.test(url)) {
            url = "https://" + url;
        }
        return url;
    }
</script>

{#if credential}
    {#if credential.acl === undefined || credential.acl.permissions.hasPermission(SharingACL.permissions.READ)}
        {#if credential.compromised}
            <div class="text-sm text-red-600 !mb-4">
                <Icon data={exclamationCircle} scale={1.0}/>
                {i18n.getMessage('compromised_notice')}
            </div>
        {/if}
        {#if credential.username != null && credential.username !== ''}
            <div class="flex flex-wrap text-sm">
                <div class="basis-3/12 grow font-semibold">{i18n.getMessage('username')}</div>
                <div class="basis-8/12 break-all">
                    {credential.username}
                </div>
                <div class="basis-1/12 grow text-end">
                    <CopyClipboardButton bind:value={credential.username}
                                         fieldTitle="{i18n.getMessage('username')}"/>
                </div>
            </div>
        {/if}
        {#if credential.password != null && credential.password !== ''}
            <div class="flex flex-wrap text-sm">
                <div class="basis-3/12 grow font-semibold">{i18n.getMessage('password')}</div>
                <div class="basis-8/12 break-all">
                    <SecretField bind:value={credential.password}/>
                </div>
                <div class="basis-1/12 grow text-end">
                    <CopyClipboardButton bind:value={credential.password}
                                         fieldTitle="{i18n.getMessage('password')}"/>
                </div>
            </div>
        {/if}
        {#if credential.otp != null && credential.otp.secret != null}
            <div class="flex flex-wrap text-sm">
                <div class="basis-3/12 grow font-semibold">{i18n.getMessage('one_time_password')}</div>
                <div class="basis-8/12 break-all">
                    <OTPGenerator bind:otp={credential.otp} bind:token={otp_token}/>
                </div>
                <div class="basis-1/12 grow text-end">
                    <CopyClipboardButton bind:value={otp_token}
                                         fieldTitle="{i18n.getMessage('one_time_password')}"/>
                </div>
            </div>
        {/if}
        {#if credential.email != null && credential.email !== ''}
            <div class="flex flex-wrap text-sm">
                <div class="basis-3/12 grow font-semibold">{i18n.getMessage('email')}</div>
                <div class="basis-8/12 break-all">
                    {credential.email}
                </div>
                <div class="basis-1/12 grow text-end">
                    <CopyClipboardButton bind:value={credential.email} fieldTitle="{i18n.getMessage('email')}"/>
                </div>
            </div>
        {/if}
        {#if credential.url != null && credential.url !== ''}
            <div class="flex flex-wrap text-sm">
                <div class="basis-3/12 grow font-semibold">{i18n.getMessage('url')}</div>
                <div class="basis-8/12 break-all">
                    {credential.url}
                    <a href="{addProtocolIfMissing(credential.url)}" title="{addProtocolIfMissing(credential.url)}"
                       target="_blank" class="cursor-pointer px-0.5">
                        <Icon data={externalLink} scale={1.0}/>
                    </a>
                </div>
                <div class="basis-1/12 grow text-end">
                    <CopyClipboardButton bind:value={credential.url} fieldTitle="{i18n.getMessage('url')}"/>
                </div>
            </div>
        {/if}
        {#if credential.description != null && credential.description !== ''}
            <div class="flex flex-wrap text-sm">
                <div class="basis-3/12 grow font-semibold">{i18n.getMessage('description')}</div>
                <div class="basis-8/12 break-all">
                    {credential.description}
                </div>
                <div class="basis-1/12 grow text-end">
                    <CopyClipboardButton bind:value={credential.description}
                                         fieldTitle="{i18n.getMessage('description')}"/>
                </div>
            </div>
        {/if}
        {#if credential.acl === undefined || credential.acl.permissions.hasPermission(SharingACL.permissions.FILES)}
            {#if credential.files != null && credential.files.length > 0}
                <div class="flex flex-wrap text-sm">
                    <div class="basis-3/12 grow font-semibold">{i18n.getMessage('files')}</div>
                    <div class="basis-9/12 break-all space-y-2">
                        {#each credential.files as file, index}
                            <p>
                                <button class="link link-hover text-primary text-left"
                                        on:click={() => downloadFile(file)}>
                                    {file.filename} ({CustomMathsService.calculateFromByte(file.size)})
                                    <InlineMiniLoading show={show_loading_for_file_id === file.file_id}/>
                                </button>
                            </p>
                        {/each}
                    </div>
                </div>
            {/if}
        {/if}
        {#if credential.custom_fields != null && credential.custom_fields.length > 0}
            {#each credential.custom_fields as field, index}
                <div class="flex flex-wrap text-sm">
                    <div class="basis-3/12 grow font-semibold">{field.label}</div>
                    {#if field.field_type === 'file'}
                        <div class="basis-9/12 break-all">
                            <p>
                                <button class="link link-hover text-primary text-left"
                                        on:click={() => downloadFile(field.value)}>
                                    {field.value.filename} ({CustomMathsService.calculateFromByte(field.value.size)})
                                    <InlineMiniLoading show={show_loading_for_file_id === field.value.file_id}/>
                                </button>
                            </p>
                        </div>
                    {:else}
                        <div class="basis-8/12 break-all">
                            {#if field.field_type === 'password'}
                                <SecretField bind:value={field.value}/>
                            {:else}
                                <p>
                                    {field.value}
                                </p>
                            {/if}
                        </div>
                        <div class="basis-1/12 grow text-end">
                            <CopyClipboardButton bind:value={field.value}
                                                 fieldTitle="{field.label}"/>
                        </div>
                    {/if}
                </div>
            {/each}
        {/if}
    {/if}
    {#if credential.expire_time != null && credential.expire_time > 0}
        <div class="flex flex-wrap text-sm">
            <div class="basis-3/12 grow font-semibold">{i18n.getMessage('credentials_expires')}</div>
            <div class="basis-8/12">
                <Time timestamp={credential.expire_time * 1000} format="YYYY-MM-DD HH:mm:ss"
                      bind:formatted={expire_time_formatted}/>
            </div>
            <div class="basis-1/12 grow text-end">
                <CopyClipboardButton bind:value={expire_time_formatted}
                                     fieldTitle="{i18n.getMessage('credentials_expires')}"/>
            </div>
        </div>
    {/if}
    {#if !hideDefaultDatetimeFields && credential.created != null}
        <div class="flex flex-wrap text-sm">
            <div class="basis-3/12 grow font-semibold">{i18n.getMessage('credential_created')}</div>
            <div class="basis-8/12">
                <Time timestamp={credential.created * 1000} format="YYYY-MM-DD HH:mm:ss"
                      bind:formatted={created_formatted}/>
            </div>
            <div class="basis-1/12 grow text-end">
                <CopyClipboardButton bind:value={created_formatted}
                                     fieldTitle="{i18n.getMessage('credential_created')}"/>
            </div>
        </div>
    {/if}
    {#if !hideDefaultDatetimeFields && credential.changed != null}
        <div class="flex flex-wrap text-sm">
            <div class="basis-3/12 grow font-semibold">{i18n.getMessage('credential_changed')}</div>
            <div class="basis-8/12">
                <Time timestamp={credential.changed * 1000} format="YYYY-MM-DD HH:mm:ss"
                      bind:formatted={changed_formatted}/>
            </div>
            <div class="basis-1/12 grow text-end">
                <CopyClipboardButton bind:value={changed_formatted}
                                     fieldTitle="{i18n.getMessage('credential_changed')}"/>
            </div>
        </div>
    {/if}
    {#if credential.tags != null && credential.tags.length > 0}
        <div class="flex flex-wrap text-sm">
            <div class="basis-3/12 grow font-semibold">{i18n.getMessage('tags')}</div>
            <div class="basis-9/12">
                <TagsView tags={credential.tags}/>
            </div>
        </div>
    {/if}
    <div>
        <OnClickButton callback={markAsDeleted} title={i18n.getMessage('mark_credential_deleted')} small={true}
                       additionalClasses="bg-red-600 text-white" disabled={deletion_in_progress}>
            <span>
                {#if deletion_in_progress}
                    <Icon data={refresh} scale={1.3} spin="{true}"/>
                {/if}
                {i18n.getMessage('delete')}
            </span>
        </OnClickButton>
    </div>
{/if}
