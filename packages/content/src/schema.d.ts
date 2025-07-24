/**
 * Schema validation for content collections
 * Provides runtime validation and type generation
 */
import type { ContentEntry, Schema } from './types.js';
export interface ValidationResult {
    /**
     * Whether validation passed
     */
    valid: boolean;
    /**
     * Validation errors
     */
    errors: ValidationError[];
    /**
     * Validated and coerced data
     */
    data?: unknown;
}
export interface ValidationError {
    /**
     * Error path
     */
    path: string;
    /**
     * Error message
     */
    message: string;
    /**
     * Expected type/value
     */
    expected?: string;
    /**
     * Actual value
     */
    actual?: unknown;
}
/**
 * Create a schema validator
 */
export declare function createSchemaValidator(schema: Schema): {
    validate(data: unknown): ValidationResult;
};
/**
 * Built-in schema helpers
 */
export declare const z: {
    string(): Schema;
    number(): Schema;
    boolean(): Schema;
    date(): Schema;
    array(items: Schema): Schema;
    object(properties: Record<string, Schema>, required?: string[]): Schema;
    optional(schema: Schema): Schema;
    enum(values: string[]): Schema;
    min(minValue: number): (schema: Schema) => Schema;
    max(maxValue: number): (schema: Schema) => Schema;
    email(): Schema;
    url(): Schema;
};
/**
 * Validate content entry against schema
 */
export declare function validateContentEntry(entry: ContentEntry, schema?: Schema): ValidationResult;
//# sourceMappingURL=schema.d.ts.map