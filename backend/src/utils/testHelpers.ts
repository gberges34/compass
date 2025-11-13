/**
 * Test utilities for generating valid test data.
 */

/**
 * Generate a deterministic test UUID from a seed number.
 *
 * This creates valid UUIDs that are predictable and readable in tests.
 * Uses UUID v4 format with the seed in the first segment.
 *
 * @param seed - Integer seed (0-4294967295)
 * @returns Valid UUID string
 *
 * @example
 * createTestUUID(1)  // "00000001-0000-4000-a000-000000000000"
 * createTestUUID(29) // "0000001d-0000-4000-a000-000000000000"
 * createTestUUID(100) // "00000064-0000-4000-a000-000000000000"
 */
export function createTestUUID(seed: number): string {
  const hex = seed.toString(16).padStart(8, '0');
  return `${hex}-0000-4000-a000-000000000000`;
}
