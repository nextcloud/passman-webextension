<script lang="ts">
    import { sendToBackground } from "@plasmohq/messaging";
    import { onMount } from "svelte";
    import { SecureStorage } from "@plasmohq/storage/dist/secure";
    import { push } from "~Router.svelte";
    import { externalLink, lock, plus } from "svelte-awesome/package/icons";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import extensionUnlockStateStore, { ExtensionUnlockState } from "~stores/extensionUnlockStateStore";

    let storage: SecureStorage = null;
    let searchInput = '';
    let count = 0;
    //export let route: string;

    let action: string = null;
    let resp;

    const lockExtension = () => {
        sendToBackground({
            name: "lockExtension"
        }).then(() => {
            $extensionUnlockStateStore = ExtensionUnlockState.LOCKED;
            push('/unlock');
        });
    }

    const increment = async () => {
        count += 1;
        action = "increment";
        await storage.set('count', count);
    }

    const decrement = () => {
        count -= 1;
        action = "decrement";
        storage.set('count', count);
    }

    function openOptionsPage() {
        chrome.runtime.openOptionsPage();
    }

    function openHome2() {
        //route = '/home2'
        push('/home2');
    }

    const updateRespFromBackground = () => {
        sendToBackground({
            name: "ping",
            body: {
                id: count
            }
        }).then((value: { message: string }) => {
            console.log(value.message);
            resp = value.message;
        });
    }

    $: count && updateRespFromBackground();

    onMount(() => {

    })
</script>

<div class="h-full overflow-y-hidden flex flex-col">
    <div class="w-full flex flex-nowrap items-center justify-center space-x-4 border-b p-2 bg-white">
        <OnClickButton callback={openOptionsPage} title="Refresh credential list" additionalClasses="w-12">
            <Icon data={refresh} scale={1.3}/>
        </OnClickButton>
        <OnClickButton callback={openOptionsPage} title="Create new credential" additionalClasses="w-12">
            <Icon data={plus} scale={1.3}/>
        </OnClickButton>
        <div class="">
            <input bind:value={searchInput} placeholder="Type to search"
                   class="block border-1 border-b-2 border-gray-200 p-2 focus:outline-none focus:border-primary-focus
        bg-blue-50 shadow-sm w-full dark:bg-neutral"
            />
        </div>
        <OnClickButton callback={lockExtension} title="Lock" additionalClasses="w-12">
            <Icon data={lock} scale={1.3}/>
        </OnClickButton>
        <OnClickButton callback={openOptionsPage} title="Open options page" additionalClasses="w-12">
            <Icon data={externalLink} scale={1.2}/>
        </OnClickButton>
    </div>

    <div class="overflow-y-auto pt-2">
        <div class="flex flex-col items-center justify-center space-y-4">
            <h2 class="text-2xl font-semibold text-gray-700 text-center">
                {chrome.i18n.getMessage("welcome_to_passman")}
            </h2>

        </div>
    </div>
</div>
