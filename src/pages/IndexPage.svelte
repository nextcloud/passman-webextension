<script lang="ts">
    import { sendToBackground } from "@plasmohq/messaging";
    import { onMount } from "svelte";
    import { SecureStorage } from "@plasmohq/storage/dist/secure";

    export let storage: SecureStorage;
    export let count = 0;
    let action: string = null;
    let resp;

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

    const updateRespFromBackground = () => {
        sendToBackground({
            name: "ping",
            body: {
                id: count
            }
        }).then((value: {message: string}) => {
            console.log(value.message);
            resp = value.message;
        });
    }

    $: count && updateRespFromBackground();

    onMount(() => {
        console.log("indexpage isSecureContext", isSecureContext);
        storage.get<number>('count').then((value) => {
            console.log("got from storage", value);
            if (value) {
                count = value;
            }
            updateRespFromBackground();
        });
    })
</script>

<div class="flex min-h-screen flex-col items-center justify-center space-y-4">
    <h2 class="text-2xl font-semibold text-gray-700 text-center">
        {chrome.i18n.getMessage("welcome_to_passman")}
    </h2>
    <div class="flex w-60 items-center justify-center gap-12">
        <button on:click={decrement}>-</button>
        <p class="text-xs text-gray-600">
            Current count: <b>{count}</b>
        </p>
        <button on:click={increment}>+</button>

        {resp}
    </div>
    {#if action}<p class="text-center font-bold text-green-600">{action}</p>{/if}
    <a href="https://docs.plasmo.com" target="_blank"> View Docs </a>

    <button
            on:click={openOptionsPage}
            class="inline-flex items-center space-x-2 rounded-md border px-3 py-1 text-gray-600 hover:bg-gray-100 focus:border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200">
        <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-6 w-6">
            <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        <span>Settings</span>
    </button>
</div>
