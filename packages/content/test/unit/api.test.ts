import { describe, expect, test } from 'vitest';
import {
  createContentManager,
  defineCollection,
  defineConfig,
  getCollection,
  getContentAPI,
  getEntry,
  initializeContentAPI,
  z,
} from '../../src/api.js';

describe('Content API', () => {
  describe('defineCollection', () => {
    test('returns config as-is', () => {
      const config = {
        schema: z.object({
          title: z.string(),
          date: z.date(),
        }),
      };
      const result = defineCollection(config);
      expect(result).toBe(config);
    });

    test('handles empty config', () => {
      const result = defineCollection({});
      expect(result).toEqual({});
    });
  });

  describe('defineConfig', () => {
    test('returns config as-is', () => {
      const config = {
        collections: {
          blog: { schema: z.object({ title: z.string() }) },
        },
      };
      const result = defineConfig(config);
      expect(result).toBe(config);
    });
  });

  describe('getCollection', () => {
    test('returns empty array for any collection', async () => {
      const result = await getCollection('blog');
      expect(result).toEqual([]);
    });

    test('handles different collection names', async () => {
      const result1 = await getCollection('posts');
      const result2 = await getCollection('pages');
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });

  describe('getEntry', () => {
    test('returns null for any entry', async () => {
      const result = await getEntry('blog', 'post-1');
      expect(result).toBeNull();
    });

    test('handles different collection and entry combinations', async () => {
      const result1 = await getEntry('posts', 'hello-world');
      const result2 = await getEntry('pages', 'about');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('createContentManager', () => {
    test('returns empty object', () => {
      const result = createContentManager();
      expect(result).toEqual({});
    });

    test('accepts options', () => {
      const result = createContentManager({ root: '/test' });
      expect(result).toEqual({});
    });
  });

  describe('initializeContentAPI', () => {
    test('returns empty object', () => {
      const result = initializeContentAPI();
      expect(result).toEqual({});
    });
  });

  describe('getContentAPI', () => {
    test('returns API object with getCollection and getEntry', () => {
      const api = getContentAPI();
      expect(api).toHaveProperty('getCollection');
      expect(api).toHaveProperty('getEntry');
      expect(typeof api.getCollection).toBe('function');
      expect(typeof api.getEntry).toBe('function');
    });

    test('API methods work correctly', async () => {
      const api = getContentAPI();
      const collection = await api.getCollection('test');
      const entry = await api.getEntry('test', 'id');
      expect(collection).toEqual([]);
      expect(entry).toBeNull();
    });
  });

  describe('z export', () => {
    test('exports zod instance', () => {
      expect(z).toBeDefined();
      expect(z.string).toBeDefined();
      expect(z.object).toBeDefined();
    });

    test('zod works correctly', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const valid = { name: 'Test', age: 25 };
      const result = schema.parse(valid);
      expect(result).toEqual(valid);
    });
  });
});
