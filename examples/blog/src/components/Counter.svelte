<script>
const _count = 0;
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