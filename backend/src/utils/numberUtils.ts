/**
 * Number utility functions for data validation and normalization
 */

/**
 * Normalizes a value to a positive integer within specified bounds
 * @param value - The value to normalize
 * @param min - Minimum allowed value (default: 1)
 * @param max - Maximum allowed value (default: Number.MAX_SAFE_INTEGER)
 * @returns Normalized positive integer within bounds
 */
export function normalizePositiveInteger(
  value: unknown,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return min;
  }
  const normalized = Math.floor(num);
  if (normalized < min) {
    return min;
  }
  if (normalized > max) {
    return max;
  }
  return normalized;
}

/**
 * Checks if a value is a valid positive integer
 * @param value - The value to check
 * @returns True if value is a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

/**
 * Checks if a value is a valid non-negative integer
 * @param value - The value to check
 * @returns True if value is a non-negative integer
 */
export function isNonNegativeInteger(value: unknown): value is number {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0;
}
