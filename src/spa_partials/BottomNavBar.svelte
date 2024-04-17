<script lang="ts">
    import Icon from "svelte-awesome/components/Icon.svelte";
    import InternalHrefLinkButton from "~spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import { circleONotch, cogs, search } from "svelte-awesome/package/icons";
</script>

<div class="flex flex-nowrap items-center justify-center space-x-4 border-t py-2">
    <InternalHrefLinkButton href="/home" title="Credentials" small={true}
                            additionalClasses="flex flex-col items-center min-w-24">
        <Icon data={search} scale={1.4}/>
        <span class="text-xs mt-1">
            Credentials
        </span>
    </InternalHrefLinkButton>
    <InternalHrefLinkButton href="/setup/server" title="Settings" small={true}
                            additionalClasses="flex flex-col items-center min-w-24">
        <Icon data={circleONotch} scale={1.5}/>
        <span class="text-xs mt-1">
            Generator
        </span>
    </InternalHrefLinkButton>
    <InternalHrefLinkButton href="/settings" title="Settings" small={true}
                            additionalClasses="flex flex-col items-center min-w-24">
        <Icon data={cogs} scale={1.5}/>
        <span class="text-xs mt-1">
            Settings
        </span>
    </InternalHrefLinkButton>
</div>
