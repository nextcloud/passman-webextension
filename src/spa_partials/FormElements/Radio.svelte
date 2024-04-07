<script>
    export let options;
    export let legend;
    export let userSelected = options[0].value;

    const uniqueID = Math.floor(Math.random() * 100)
</script>

<div role="radiogroup"
     class="group-container"
     aria-labelledby={`label-${uniqueID}`}
     id={`group-${uniqueID}`}>
    <div class="legend"
         id={`label-${uniqueID}`}>{legend}
    </div>
    {#each options as { value, label }}
        <label class="label cursor-pointer justify-start space-x-3">
            <input class="radio dark:border-white"
                   type="radio"
                   bind:group={userSelected}
                   value={value}/>
            <span class="label-text dark:text-white">{label}</span>
        </label>
    {/each}
</div>
