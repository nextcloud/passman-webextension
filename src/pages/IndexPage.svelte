<script lang="ts">
    export let count = 0;
    let action: string = null;

    function increment() {
        count += 1;
        action = "increment";
    }

    function decrement() {
        count -= 1;
        action = "decrement";
    }

    function openOptionsPage() {
        chrome.runtime.openOptionsPage();
    }
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
