<script lang="ts">
    import './style.css';
    import { onMount } from "svelte";

    onMount(async () => {
        console.log("isSecureContext", isSecureContext);
        // todo: see popup.svelte for storage init example
    });
</script>

<div>
    should always show setup or settings
</div>
