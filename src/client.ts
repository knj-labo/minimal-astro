import { hydrateIslands } from './core/island';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateIslands);
} else {
    hydrateIslands();
}