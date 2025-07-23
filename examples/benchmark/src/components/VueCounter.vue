<template>
  <div style="padding: 10px">
    <p>Vue Counter: {{ count }}</p>
    <button @click="count++">Increment</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const count = ref(0);
</script>