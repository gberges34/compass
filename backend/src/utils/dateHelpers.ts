/**
 * Backend date helper utilities
 * Standardizes timestamp creation across the API
 */

/**
 * Get current timestamp in ISO 8601 format (UTC)
 * Replaces: new Date().toISOString()
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Convert Date to ISO string
 * Replaces: date.toISOString()
 */
export function dateToISO(date: Date): string {
  return date.toISOString();
}
