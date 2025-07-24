export { defineCollection, defineConfig, getCollection, getEntry, createContentManager, initializeContentAPI, getContentAPI, z, } from './api.js';
export type { ContentManagerOptions } from './api.js';
export { z as schema, createSchemaValidator, validateContentEntry, } from './schema.js';
export type { CollectionConfig, ContentEntry, ContentEntry as CollectionEntry, // Alias for backward compatibility
ContentConfig, ContentModule, } from './types.js';
export { loadContentModule, loadCollection, loadEntry, resolveContentPath, } from './loader.js';
//# sourceMappingURL=index.d.ts.map