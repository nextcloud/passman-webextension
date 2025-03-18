<script lang="ts">
    import Icon from "svelte-awesome/components/Icon.svelte";
    import InternalHrefLinkButton from "~spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import { circleONotch, cogs, search } from "svelte-awesome/package/icons";
    import OnClickButton from "./InteractionElements/OnClickButton.svelte";
    import gitlabImage from "data-base64:~../assets/images/gitlab.svg";

    const i18n = chrome.i18n;
</script>

<div class="flex flex-nowrap items-center justify-center space-x-4 border-t py-2">
    <InternalHrefLinkButton href="/home" title="{i18n.getMessage('credentials')}" small={true}
                            additionalClasses="flex flex-col items-center min-w-24 h-[52px]">
        <Icon data={search} scale={1.4}/>
        <span class="text-xs mt-1">
            {i18n.getMessage('credentials')}
        </span>
    </InternalHrefLinkButton>
    <InternalHrefLinkButton href="/generator" title="{i18n.getMessage('password_generator')}" small={true}
                            additionalClasses="flex flex-col items-center min-w-24 h-[52px]">
        <Icon data={circleONotch} scale={1.5}/>
        <span class="text-xs mt-1">
            {i18n.getMessage('generator')}
        </span>
    </InternalHrefLinkButton>
    <InternalHrefLinkButton href="/settings" title="{i18n.getMessage('settings')}" small={true}
                            additionalClasses="flex flex-col items-center min-w-24 h-[52px]">
        <Icon data={cogs} scale={1.5}/>
        <span class="text-xs mt-1">
            {i18n.getMessage('settings')}
        </span>
    </InternalHrefLinkButton>
    <OnClickButton callback={() => {
        window.open('https://gitlab.com/binsky08/passman-webextension-v3/-/issues', '_blank');
    }} title="Report an issue" small={true} additionalClasses="flex flex-col items-center min-w-24 py-1 h-[52px]">
        <img src="{gitlabImage}" alt="GitLab" class="w-6 object-center" />
        <!-- no translation needed; will be removed in the future -->
        <span class="text-xs mt-1">
            Issues
        </span>
    </OnClickButton>
</div>
