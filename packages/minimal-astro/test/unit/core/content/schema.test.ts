import { describe, expect, it } from 'bun:test';
import { 
  createSchemaValidator,
  validateContentEntry,
  z
} from '../../../../src/core/content/schema.js';

describe('Content Schema', () => {
  describe('z object', () => {
    it('should provide zod-like validation functions', () => {
      expect(z.string).toBeDefined();
      expect(z.number).toBeDefined();
      expect(z.boolean).toBeDefined();
      expect(z.date).toBeDefined();
      expect(z.array).toBeDefined();
      expect(z.object).toBeDefined();
      // z.optional, z.union, z.literal might not exist in the simple implementation
    });
    
    it('should create string validators', () => {
      const validator = z.string();
      expect(validator).toBeDefined();
      expect(validator.type).toBe('string');
    });
    
    it('should create number validators', () => {
      const validator = z.number();
      expect(validator).toBeDefined();
      expect(validator.type).toBe('number');
    });
    
    it('should create object validators', () => {
      const validator = z.object({
        name: z.string(),
        age: z.number(),
      });
      expect(validator).toBeDefined();
      expect(validator.type).toBe('object');
      expect(validator.shape).toBeDefined();
    });
    
    it('should create array validators', () => {
      const validator = z.array(z.string());
      expect(validator).toBeDefined();
      expect(validator.type).toBe('array');
      expect(validator.element).toBeDefined();
    });
    
    it('should create optional validators', () => {
      const validator = z.optional(z.string());
      expect(validator).toBeDefined();
      expect(validator.type).toBe('optional');
      expect(validator.inner).toBeDefined();
    });
  });
  
  describe('createSchemaValidator', () => {
    it('should create a validator function', () => {
      const schema = z.object({
        title: z.string(),
        count: z.number(),
      });
      
      const validator = createSchemaValidator(schema);
      
      expect(typeof validator).toBe('function');
    });
    
    it('should validate valid data', () => {
      const schema = z.object({
        title: z.string(),
        count: z.number(),
      });
      
      const validator = createSchemaValidator(schema);
      const result = validator({ title: 'Test', count: 42 });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ title: 'Test', count: 42 });
    });
    
    it('should reject invalid data', () => {
      const schema = z.object({
        title: z.string(),
        count: z.number(),
      });
      
      const validator = createSchemaValidator(schema);
      const result = validator({ title: 123, count: 'not a number' });
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should handle optional fields', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.optional(z.string()),
      });
      
      const validator = createSchemaValidator(schema);
      const result = validator({ required: 'value' });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ required: 'value' });
    });
    
    it('should validate nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string(),
        }),
      });
      
      const validator = createSchemaValidator(schema);
      const result = validator({
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      });
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('validateContentEntry', () => {
    it('should validate content entry without schema', () => {
      const entry = {
        id: 'test-post',
        slug: 'test-post',
        collection: 'blog',
        data: {
          title: 'Test Post',
          date: new Date(),
        },
        body: 'Content here',
      };
      
      const result = validateContentEntry(entry);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(entry.data);
    });
    
    it('should validate content entry with schema', () => {
      const entry = {
        id: 'test-post',
        slug: 'test-post',
        collection: 'blog',
        data: {
          title: 'Test Post',
          pubDate: new Date(),
          draft: false,
        },
        body: 'Content here',
      };
      
      const schema = z.object({
        title: z.string(),
        pubDate: z.date(),
        draft: z.boolean(),
      });
      
      const result = validateContentEntry(entry, schema);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(entry.data);
    });
    
    it('should reject invalid content entry', () => {
      const entry = {
        id: 'test-post',
        slug: 'test-post',
        collection: 'blog',
        data: {
          title: 123, // Should be string
          pubDate: 'not a date',
        },
        body: 'Content here',
      };
      
      const schema = z.object({
        title: z.string(),
        pubDate: z.date(),
      });
      
      const result = validateContentEntry(entry, schema);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
    
    it('should provide detailed error messages', () => {
      const entry = {
        id: 'test-post',
        slug: 'test-post',
        collection: 'blog',
        data: {
          title: null,
          count: 'not a number',
          nested: {
            value: 123,
          },
        },
        body: 'Content',
      };
      
      const schema = z.object({
        title: z.string(),
        count: z.number(),
        nested: z.object({
          value: z.string(),
        }),
      });
      
      const result = validateContentEntry(entry, schema);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check error structure
      result.errors.forEach(error => {
        expect(error.path).toBeDefined();
        expect(error.message).toBeDefined();
      });
    });
    
    it('should handle union types', () => {
      const schema = z.object({
        status: z.union([
          z.literal('draft'),
          z.literal('published'),
          z.literal('archived'),
        ]),
      });
      
      const validEntry = {
        id: 'test',
        slug: 'test',
        collection: 'posts',
        data: { status: 'published' },
        body: '',
      };
      
      const invalidEntry = {
        id: 'test',
        slug: 'test',
        collection: 'posts',
        data: { status: 'deleted' },
        body: '',
      };
      
      const validResult = validateContentEntry(validEntry, schema);
      const invalidResult = validateContentEntry(invalidEntry, schema);
      
      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });
  });
});