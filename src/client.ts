import { hydrateIslands, registerIsland } from './core/island';
import { Counter } from './islands/Counter';

// Register islands
registerIsland('Counter', Counter);

// Hydrate when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateIslands);
} else {
    hydrateIslands();
}