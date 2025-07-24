<template>
  <button @click="toggleTheme" class="theme-toggle" :aria-label="`Switch to ${isDark ? 'light' : 'dark'} theme`">
    <span v-if="isDark">🌞</span>
    <span v-else>🌙</span>
    <span class="label">{{ isDark ? 'Light' : 'Dark' }} Mode</span>
  </button>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const isDark = ref(false);

const _toggleTheme = () => {
  isDark.value = !isDark.value;

  if (isDark.value) {
    document.documentElement.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
  }
};

onMounted(() => {
  const savedTheme = localStorage.getItem('theme');
  if (
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true;
    document.documentElement.classList.add('dark-theme');
  }
});
</script>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-toggle:hover {
  background-color: #e5e7eb;
  transform: translateY(-1px);
}

.theme-toggle span {
  font-size: 1.25rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 500;
}

:global(.dark-theme) {
  background-color: #1a1a1a;
  color: #e5e5e5;
}

:global(.dark-theme) .theme-toggle {
  background-color: #374151;
  border-color: #4b5563;
  color: #e5e5e5;
}

:global(.dark-theme) .theme-toggle:hover {
  background-color: #4b5563;
}
</style>