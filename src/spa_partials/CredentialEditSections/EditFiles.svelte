<script lang="ts">
    import type {
        DecryptedCredentialInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
    import Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import type { FileInterface } from "@binsky/passman-client-ts/lib/Interfaces/File/FileInterface";
    import NotyService from "~/services/frontend/NotyService";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import Time from "svelte-time";
    import { CustomMathsService } from "@binsky/passman-client-ts/lib/Service/CustomMathsService";
    import InPlaceEdit from "../FormElements/InPlaceEdit.svelte";
    import Utils from "~/lib/Utils";
    import { i18n } from "~/lib/i18n";
    import { logger } from "~/services/ConsoleLoggingService";
    import { externalLink, trashO } from "svelte-awesome/icons";
    import OnClickButton from "../InteractionElements/OnClickButton.svelte";

    export let credentialData: DecryptedCredentialInterface;
    export let credential: Credential | null;  // only used for file encryption and upload

    const isInPopup = Utils.isInPopup();

    let isUploading = false;

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const files = event.dataTransfer?.files;
        if (files && files.length > 0 && credential) {
            const input = document.getElementById('file-upload') as HTMLInputElement;
            if (input) {
                input.files = files;
                readFile({ target: input } as unknown as Event);
            }
        }
    };

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDragEnter = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDragLeave = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const readFile = (changeEvent: Event) => {
        const reader = new FileReader();
        const input = changeEvent.target as HTMLInputElement;
        if (input.files && input.files.length > 0 && credential) {
            const localFile: File = input.files[0];
            isUploading = true;

            reader.onload = async (event) => {
                if (!event.target?.result) {
                    logger.error("No result from FileReader");
                    NotyService.notyError(i18n.getMessage("files_upload_failed"));
                    isUploading = false;
                    return;
                }

                // triggers if the selected file is successfully loaded from disk (for every reader.readAsDataURL(file) call)
                const plainFile: FileInterface = {
                    data: event.target.result.toString(),
                    filename: localFile.name,
                    mimetype: localFile.type,
                    size: localFile.size
                };
                const uploadResponse = await credential.encryptUploadFile(plainFile);

                if (uploadResponse) {
                    plainFile.file_id = uploadResponse.file_id;
                    plainFile.guid = uploadResponse.guid;
                    plainFile.created = uploadResponse.created;
                    NotyService.notySuccess(i18n.getMessage("files_upload_succeeded"));

                    const { data, ...plainFileForNewField } = plainFile;
                    credentialData.files.push(plainFileForNewField as FileInterface);

                    // clear file selection input
                    input.files = new DataTransfer().files;
                } else {
                    NotyService.notyError(i18n.getMessage("files_upload_failed"));
                }
                isUploading = false;
            };

            reader.onerror = () => {
                isUploading = false;
                NotyService.notyError(i18n.getMessage("files_upload_failed"));
            };

            reader.readAsDataURL(localFile);
        }
    }

    const deleteFile = async (file: FileInterface) => {
        const deleteResponse = await credential?.deleteFile(file);
        if (deleteResponse) {
            const pos = credentialData.files.indexOf(file);
            credentialData.files.splice(pos, 1);
            credentialData.files = credentialData.files;
            NotyService.notySuccess(i18n.getMessage("files_deletion_succeeded"));
        } else {
            NotyService.notyError(i18n.getMessage("files_deletion_failed"));
        }
    }

    const openSameOptionsPage = () => {
        const url = '/options.html' + window.location.hash;
        // @ts-ignore
        window.open(browser.runtime.getURL(url), '_blank');
    }
</script>

{#if credentialData}
    <div class="w-full space-y-4">
        {#if isInPopup}
            <div class="space-y-2">
                <p class="text-sm text-gray-500">
                    {i18n.getMessage('error_file_upload_popup')}
                </p>
                <p class="text-sm text-gray-500">
                    {i18n.getMessage('error_file_upload_popup_2')}
                </p>
                <OnClickButton callback={openSameOptionsPage} title="{i18n.getMessage('open_options_page')}" small={true}
                        additionalClasses="shrink-0"
                        disabled={!credential}>
                    <Icon data={externalLink} scale={1.3}/>
                </OnClickButton>
            </div>
        {:else}
            <div class="flex flex-col items-center justify-center w-full">
                <label for="file-upload"
                    class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    on:dragenter={handleDragEnter}
                    on:dragover={handleDragOver}
                    on:dragleave={handleDragLeave}
                    on:drop={handleDrop}>
                    <div class="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg class="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p class="mb-2 text-sm text-gray-500">
                            {@html i18n.getMessage('files_upload_box_text', ['<span class="font-semibold">', '</span>'])}
                        </p>
                        <p class="text-xs text-gray-500">
                            {i18n.getMessage('files_any_type_info')}
                        </p>
                    </div>
                    <input id="file-upload" type="file" class="hidden" on:change={readFile}/>
                </label>

                {#if isUploading}
                    <div class="w-full mt-4 space-y-2">
                        <div class="flex justify-center">
                            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
            <table class="w-full text-sm text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 w-5/12">{i18n.getMessage("files_header_name")}</th>
                        <th scope="col" class="px-6 py-3 w-3/12 whitespace-nowrap">{i18n.getMessage("files_header_created")}</th>
                        <th scope="col" class="px-6 py-3 w-2/12">{i18n.getMessage("files_header_size")}</th>
                        <th scope="col" class="px-6 py-3 w-2/12"></th>
                    </tr>
                </thead>
                <tbody>
                    {#key isUploading}
                        {#each credentialData.files as file (file.file_id)}
                            <tr class="bg-white border-b hover:bg-gray-50">
                                <td class="px-3 py-2 font-medium text-gray-900">
                                    <InPlaceEdit bind:value={file.filename}/>
                                </td>
                                <td class="px-3 py-2">
                                    <Time timestamp={(file.created ?? 0) * 1000} format="YYYY-MM-DD HH:mm:ss"/>
                                </td>
                                <td class="px-3 py-2">
                                    <span class="whitespace-nowrap">{CustomMathsService.calculateFromByte(file.size)}</span>
                                </td>
                                <td class="px-3 py-2 text-right">
                                    <button on:click={() => deleteFile(file)}
                                            title="{i18n.getMessage('delete')}"
                                            class="font-medium text-red-600 hover:underline cursor-pointer">
                                        <Icon data={trashO} scale={1.0}/>
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    {/key}
                </tbody>
            </table>
        </div>
    </div>
{/if}
