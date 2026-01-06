/**
 * Mongoose Schema plugins for common functionality
 */

import { Schema } from 'mongoose';

/**
 * Plugin to remove MongoDB-specific fields from JSON output
 * Removes: _id, __v
 */
export function cleanMongooseDocument(schema: Schema): void {
  schema.set('toJSON', {
    transform: function(_doc: any, ret: any) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  });
}

/**
 * Plugin to add virtual properties for camelCase field names
 * Useful for providing both snake_case and camelCase versions of fields
 */
export function addCamelCaseVirtuals(schema: Schema, fieldMappings: Record<string, string>): void {
  for (const [snakeCase, camelCase] of Object.entries(fieldMappings)) {
    schema.virtual(camelCase).get(function(this: any) {
      return this[snakeCase];
    });
  }
}
