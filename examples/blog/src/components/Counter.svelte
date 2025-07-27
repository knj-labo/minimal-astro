<script>
// biome-ignore lint/style/useConst: Svelte reactive variable
// biome-ignore lint/correctness/noUnusedVariables: Used in template
let count = 0;
</script>

<div style="padding: 10px">
    <p>Svelte Counter: {count}</p>
    <button on:click={() => count++}>
        Increment
    </button>
    <button on:click={() => count--}>
        Decrement
    </button>
</div>