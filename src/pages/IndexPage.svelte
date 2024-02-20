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
</script>

<div class="flex min-h-screen flex-col items-center justify-center space-y-4">
    <h2 class="text-2xl font-semibold text-gray-700 text-center">
        Passman Webextension v3
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
</div>
