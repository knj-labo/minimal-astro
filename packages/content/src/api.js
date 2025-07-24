import { z } from 'zod';
export function defineCollection(config) {
  return config;
}
export function defineConfig(config) {
  return config;
}
export async function getCollection(_collectionName) {
  // Mock implementation for now
  return [];
}
export async function getEntry(_collectionName, _entryId) {
  // Mock implementation for now
  return null;
}
// Re-export zod
export { z };
// Types
export const collections = {};
export const queries = {};
export function createContentManager(_options) {
  return {};
}
export function initializeContentAPI() {
  return {};
}
export function getContentAPI() {
  return {
    getCollection,
    getEntry,
  };
}
//# sourceMappingURL=api.js.map
