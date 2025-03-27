<script lang="ts">
    import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import lock from "svelte-awesome/icons/lock";
    import shareAlt from "svelte-awesome/icons/shareAlt";
    import shareAltSquare from "svelte-awesome/icons/shareAltSquare";

    export let credential: Credential;
    export let isSmall = "true";
    export let additionalClasses = '';
    export let bigScaleIconNumber = 3;
    export let smallScaleIconNumber = 1.4;

    let iconUrl = '';

    const reloadIcon = () => {
        iconUrl = '';
        if (credential) {
            if (credential.icon != null && credential.icon.type != null && credential.icon.type !== false && !credential.acl && !credential.shared_key) {
                iconUrl = 'data:image/' + credential.icon.type + ';base64,' + credential.icon.content;
            } else if (credential.url) {
                /*var url = window.btoa(angular.copy(scope.credential.url)).replace('/', '_');
                scope.iconUrl = OC.generateUrl('apps/passman/api/v2/icon/') + url + '/' +
                        scope.credential.credential_id;*/
            }
        }
    }

    $: {
        credential && reloadIcon();
    }
</script>

{#if credential}
    {#if iconUrl !== ''}
        <img alt="icon" src="{iconUrl}" class="{isSmall === 'true' ? 'w-[16px]' : 'w-12'} h-fit inline-block {additionalClasses}">
    {:else}
        <div class="{isSmall === 'true' ? 'w-[16px]' : 'w-12'} inline-block text-center {additionalClasses}">
            {#if credential.acl}
                <Icon data={shareAlt} scale="{isSmall === 'true' ? smallScaleIconNumber : bigScaleIconNumber}"/>
            {:else if credential.shared_key}
                <Icon data={shareAltSquare} scale="{isSmall === 'true' ? smallScaleIconNumber : bigScaleIconNumber}"/>
            {:else}
                <Icon data={lock} scale="{isSmall === 'true' ? smallScaleIconNumber : bigScaleIconNumber}"/>
            {/if}
        </div>
    {/if}
{/if}
