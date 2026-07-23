<script lang="ts">
    import Icon from "svelte-awesome/components/Icon.svelte";
    import InternalHrefLinkButton from "~/spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import { circleONotch, cogs, github, search } from "svelte-awesome/icons";
    import OnClickButton from "./InteractionElements/OnClickButton.svelte";
    import { i18n } from "~/lib/i18n";
</script>

<div class="twp-passman-webextension flex flex-nowrap items-center justify-center space-x-4 border-t border-gray-200 dark:border-gray-500 py-2">
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
        window.open('https://github.com/nextcloud/passman-webextension/issues', '_blank');
    }} title="{i18n.getMessage('report_an_issue')}" small={true} additionalClasses="flex flex-col items-center min-w-24 py-1 h-[52px]">
        <Icon data={github} scale={1.5}/>
        <span class="text-xs mt-1">
            {i18n.getMessage('issues')}
        </span>
    </OnClickButton>
</div>
