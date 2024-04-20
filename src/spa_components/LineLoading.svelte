<script lang="ts">
    export let show: boolean = true;
    export let additionalStyle = '';
</script>

{#if show}
    <div class="loader-line" style="{additionalStyle}"></div>
{/if}

<style>
    .loader-line {
        width: auto;
        height: 3px;
        position: relative;
        overflow: hidden;
        background-color: #ddd;
        -webkit-border-radius: 20px;
        -moz-border-radius: 20px;
        border-radius: 20px;
    }

    .loader-line:before {
        content: "";
        position: absolute;
        left: -50%;
        height: 3px;
        width: 40%;
        background-color: #0082c9;
        -webkit-animation: lineAnim 1s linear infinite;
        -moz-animation: lineAnim 1s linear infinite;
        animation: lineAnim 1s linear infinite;
        -webkit-border-radius: 20px;
        -moz-border-radius: 20px;
        border-radius: 20px;
    }

    @keyframes lineAnim {
        0% {
            left: -40%;
        }
        50% {
            left: 20%;
            width: 80%;
        }
        100% {
            left: 100%;
            width: 100%;
        }
    }
</style>
