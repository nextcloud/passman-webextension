<script lang="ts">
    import passmanImage from "~/assets/images/passman.svg";
    import passmanBlueWhiteImage from "~/assets/images/passman-blue-white.svg";

    export let show: boolean = true;
</script>

{#if show}
    <div class="ring w-[50vw] md:w-[15em] md:h-[15em] h-[50vw] flex justify-center items-center dark:!bg-gray-600">
        <img src="{passmanBlueWhiteImage}" class="text-center opacity-20 w-4/6 pt-8 absolute dark:hidden" alt="">
        <img src="{passmanImage}" class="text-center opacity-20 w-4/6 pt-8 absolute hidden dark:inline-block" alt="">
        <span></span>
    </div>
{/if}

<style>
    .ring {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: transparent;
        /* border:3px solid #3c3c3c; */
        border-radius: 50%;
        text-align: center;
        line-height: 150px;
        font-family: sans-serif;
        font-size: 20px;
        color: #007ac7;
        letter-spacing: 4px;
        text-transform: uppercase;
        text-shadow: 0 0 10px #007ac7;
        box-shadow: 0 0 20px rgba(0, 0, 0, .5);
    }

    .ring:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 3px solid transparent;
        border-top: 3px solid #007ac7;
        border-right: 3px solid #007ac7;
        border-radius: 50%;
        animation: animateC 3s linear infinite;
    }

    span {
        display: block;
        position: absolute;
        top: calc(50% - 2px);
        left: 50%;
        width: 50%;
        height: 4px;
        background: transparent;
        transform-origin: left;
        animation: animate 3s linear infinite;
    }

    span:before {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #007ac7;
        top: -6px;
        right: -8px;
        box-shadow: 0 0 20px #007ac7;
    }

    @keyframes animateC {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes animate {
        0% {
            transform: rotate(45deg);
        }
        100% {
            transform: rotate(405deg);
        }
    }
</style>
