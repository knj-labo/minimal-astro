// Content Collections exports
export {
  defineCollection,
  defineConfig,
  getCollection,
  getEntry,
  createContentManager,
  initializeContentAPI,
  getContentAPI,
  z,
} from './api.js';

export type { ContentManagerOptions } from './api.js';

// Schema exports
export {
  z as schema,
  createSchemaValidator,
  validateContentEntry,
} from './schema.js';

// Type exports
export type {
  CollectionConfig,
  ContentEntry,
  ContentEntry as CollectionEntry, // Alias for backward compatibility
  ContentConfig,
  ContentModule,
} from './types.js';

// Loader exports
export {
  loadContentModule,
  loadCollection,
  loadEntry,
  resolveContentPath,
} from './loader.js';
