import { z } from 'zod';
export interface CollectionConfig {
    schema?: unknown;
    [key: string]: unknown;
}
export declare function defineCollection(config: CollectionConfig): CollectionConfig;
export declare function defineConfig(config: unknown): unknown;
export declare function getCollection(_collectionName: string): Promise<any[]>;
export declare function getEntry(_collectionName: string, _entryId: string): Promise<any>;
export { z };
export declare const collections: {};
export declare const queries: {};
export type ContentManagerOptions = unknown;
export declare function createContentManager(_options?: ContentManagerOptions): {};
export declare function initializeContentAPI(): {};
export declare function getContentAPI(): {
    getCollection: typeof getCollection;
    getEntry: typeof getEntry;
};
//# sourceMappingURL=api.d.ts.map