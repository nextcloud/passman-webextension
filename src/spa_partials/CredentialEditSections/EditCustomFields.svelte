<script lang="ts">
    import type { DecryptedCredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
    import type {
        CustomFieldInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/Credential/CustomFieldInterface";
    import Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import trashO from "svelte-awesome/icons/trashO";
    import InPlaceEdit from "../FormElements/InPlaceEdit.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import plus from "svelte-awesome/icons/plus";
    import CustomInputField from "../FormElements/CustomInputField.svelte";
    import OnClickButton from "../InteractionElements/OnClickButton.svelte";
    import type { FileInterface } from "@binsky/passman-client-ts/lib/Interfaces/File/FileInterface";
    import NotyService from "~/services/frontend/NotyService";
    import Select from 'svelte-select';
    import Utils from "~/lib/Utils";
    import { i18n } from "~/lib/i18n";

    export let credentialData: DecryptedCredentialInterface;
    export let credential: Credential | null;  // only used for file encryption and upload

    const isInPopup = Utils.isInPopup();
    let newFieldLabel = '';
    let newFieldValueText = '';
    let newFieldType = 'text';
    let newSelectedLocalFile: File | undefined;
    let lockAddButton = false;
    let customFieldReactivityCounter = 0;

    const customFieldTypes = {
        "text": i18n.getMessage('custom_fields_types_text'),
        "password": i18n.getMessage('custom_fields_types_password'),
        "file": i18n.getMessage('custom_fields_types_file')
    }
    const customFieldTypesArray = [
        { label: customFieldTypes.text, value: 'text' },
        { label: customFieldTypes.password, value: 'password' },
        { label: customFieldTypes.file, value: 'file' }
    ];

    const getCustomFieldTypeLabel = (type: string) => {
        return customFieldTypes[type as keyof typeof customFieldTypes];
    }

    const resetNewFieldInputs = () => {
        newFieldLabel = '';
        newFieldValueText = '';
        newFieldType = 'text';
        newSelectedLocalFile = undefined;
        lockAddButton = false;
        customFieldReactivityCounter++;
    }

    const selectFile = (changeEvent: Event) => {
        const input = changeEvent.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            newSelectedLocalFile = input.files[0];
        }
    }

    const addNewField = () => {
        if (newFieldType === 'file' && credential) {
            if (newSelectedLocalFile) {
                lockAddButton = true;
                const reader = new FileReader();

                const _newSelectedLocalFile = newSelectedLocalFile;
                reader.onload = async (event) => {
                    if (!event.target?.result) {
                        console.error("No result from FileReader");
                        NotyService.notyError(i18n.getMessage("files_upload_failed"));
                        return;
                    }

                    // triggers if the selected file is successfully loaded from disk (for every reader.readAsDataURL(file) call)
                    const plainFile: FileInterface = {
                        data: event.target.result.toString(),
                        filename: _newSelectedLocalFile.name,
                        mimetype: _newSelectedLocalFile.type,
                        size: _newSelectedLocalFile.size
                    };
                    const uploadResponse = await credential.encryptUploadFile(plainFile);
                    if (uploadResponse) {
                        plainFile.file_id = uploadResponse.file_id;
                        plainFile.guid = uploadResponse.guid;
                        plainFile.created = uploadResponse.created;
                        NotyService.notySuccess(i18n.getMessage("files_upload_succeeded"));

                        const { data, ...plainFileForNewField } = plainFile;
                        const newField: CustomFieldInterface = {
                            label: newFieldLabel,
                            secret: false,
                            field_type: newFieldType,
                            value: plainFileForNewField
                        };
                        credentialData.custom_fields.push(newField);
                    } else {
                        NotyService.notyError(i18n.getMessage("files_upload_failed"));
                    }
                    resetNewFieldInputs();
                };

                reader.readAsDataURL(newSelectedLocalFile);
            } else {
                NotyService.notyError(i18n.getMessage("custom_fields_error_no_file_selected"));
            }
        } else {
            lockAddButton = true;
            const newField: CustomFieldInterface = {
                label: newFieldLabel,
                secret: (newFieldType === 'password'),
                field_type: newFieldType,
                value: newFieldValueText
            };
            credentialData.custom_fields.push(newField);
            resetNewFieldInputs();
        }
    }

    const deleteField = async (field: CustomFieldInterface) => {
        if (field.field_type === 'file' && credential) {
            const deleteResponse = await credential.deleteFile(field.value);
            if (deleteResponse) {
                NotyService.notySuccess(i18n.getMessage("files_deletion_succeeded"));
            } else {
                NotyService.notyError(i18n.getMessage("files_deletion_failed"));
            }
        }
        const pos = credentialData.custom_fields.indexOf(field);
        credentialData.custom_fields.splice(pos, 1);
        customFieldReactivityCounter++;
    }
</script>

{#if credentialData && credential}
    <div class="flex flex-col space-y-2">
        {#key customFieldReactivityCounter}
            {#each credentialData.custom_fields as custom_field}
                <div class="flex flex-wrap hover dark:hover:!bg-neutral border border-gray-200 rounded-md p-2">
                    <div class="basis-11/12 flex flex-col space-y-2">
                        <div class="text-start break-all">
                            <CustomInputField bind:value={custom_field.label}/>
                        </div>
                        <div class="">
                            {#if custom_field.field_type === 'file'}
                                <InPlaceEdit bind:value={custom_field.value.filename}/>
                            {:else}
                                <CustomInputField bind:value={custom_field.value} bind:type={custom_field.field_type}/>
                            {/if}
                        </div>
                    </div>
                    <div class="basis-1/12 flex flex-wrap justify-end">
                        <button on:click={() => deleteField(custom_field)}
                                title="{i18n.getMessage('delete')}"
                                class="cursor-pointer px-0.5 hover:text-red-600">
                            <Icon data={trashO} scale={1.0}/>
                        </button>
                    </div>
                </div>
            {/each}
        {/key}
    </div>
    <div class="mt-2 mb-8 space-y-2 border border-gray-200 rounded-md p-2">
        <div class="flex flex-wrap justify-between">
            <span class="font-bold text-primary-light-text dark:text-primary-dark-text">
                {i18n.getMessage('add_custom_field')}
            </span>
            <Select
                    multiple={false}
                    items={customFieldTypesArray}
                    clearable={false}
                    searchable={false}
                    showChevron={true}
                    value={newFieldType}
                    on:change={(e) => {
                        console.log(e);
                        newFieldType = e.detail.value;
                    }}
                    id="custom_field_type_select"
                    class="!w-auto min-w-24"
                    --height="32px"
                    --chevron-height="30px"
                />
        </div>
        {#if isInPopup && newFieldType === 'file'}
            <div class="space-y-2">
                <p class="text-sm text-gray-500">
                    {i18n.getMessage('error_file_upload_popup')}
                </p>
                <p class="text-sm text-gray-500">
                    {i18n.getMessage('error_file_upload_popup_2')}
                </p>
            </div>
        {:else}
            <div class="pr-2">
                <CustomInputField label="{i18n.getMessage('custom_fields_header_label')}"
                                    bind:value={newFieldLabel}/>
            </div>
            <div class="pr-2">
                {#if newFieldType === 'file'}
                    <input type="file" on:change={selectFile}/>
                {:else}
                    <CustomInputField label="{i18n.getMessage('custom_fields_header_value')}"
                                        bind:value={newFieldValueText} bind:type={newFieldType}/>
                {/if}
            </div>
            <div class="space-x-2">
                <OnClickButton callback={addNewField} title="{i18n.getMessage('custom_fields_header_add')}"
                                disabled={
                                    lockAddButton ||
                                    (
                                        newFieldType !== 'file' &&
                                        (newFieldLabel === '' || newFieldValueText === '')
                                    ) ||
                                    (
                                        newFieldType === 'file' &&
                                        (newFieldLabel === '' || !newSelectedLocalFile)
                                    )
                                }>
                    {#if lockAddButton}
                        <Icon data={refresh} scale={1.3} spin="{true}"/>
                    {:else}
                        <Icon data={plus} scale={1.3}/>
                    {/if}
                </OnClickButton>
            </div>
        {/if}
    </div>
{/if}
