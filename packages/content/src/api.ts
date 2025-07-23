import { z } from 'zod';

// Content collection exports
export function defineCollection(config: any) {
  return config;
}

export function defineConfig(config: unknown) {
  return config;
}

export async function getCollection(_collectionName: string) {
  // Mock implementation for now
  return [];
}

export async function getEntry(collectionName: string, entryId: string) {
  // Mock implementation for now
  return null;
}

// Re-export zod
export { z };

// Types
export const collections = {};
export const queries = {};

export type ContentManagerOptions = unknown;

export function createContentManager(_options?: ContentManagerOptions) {
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
