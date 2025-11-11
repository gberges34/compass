import {
  format,
  parse,
  formatISO,
  startOfDay,
  addMinutes,
  differenceInMinutes,
  isValid as dateFnsIsValid,
  parseISO
} from 'date-fns';

// ============================================================================
// TIMESTAMP CREATION
// ============================================================================

/**
 * Get current timestamp in ISO 8601 format (UTC)
 * Replaces: new Date().toISOString()
 * @returns ISO timestamp string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Convert Date to ISO string
 * Replaces: date.toISOString()
 * @param date - Date to convert
 * @returns ISO timestamp string
 */
export function dateToISO(date: Date): string {
  return date.toISOString();
}

// ============================================================================
// DATE STRING FORMATTING
// ============================================================================

/**
 * Get today's date as YYYY-MM-DD string
 * Replaces: new Date().toISOString().split('T')[0]
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return format(startOfDay(new Date()), 'yyyy-MM-dd');
}

/**
 * Format date for datetime-local input (YYYY-MM-DDTHH:mm)
 * Replaces: date.toISOString().slice(0, 16)
 * @param date - Date to format
 * @returns Datetime string for HTML5 inputs
 */
export function formatForDatetimeInput(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Format date for display (e.g., "Nov 10, 2025")
 * Replaces: moment(date).format('MMM D, YYYY')
 * @param date - Date or ISO string
 * @returns Formatted date string
 */
export function formatDisplayDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy');
}

/**
 * Format datetime for display (e.g., "Nov 10, 2025 2:30 PM")
 * Replaces: moment(date).format('MMM D, YYYY h:mm A')
 * @param date - Date or ISO string
 * @returns Formatted datetime string
 */
export function formatDisplayDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy h:mm a');
}

/**
 * Format time for display (e.g., "2:30 PM")
 * Replaces: moment(date).format('h:mm A')
 * @param date - Date or ISO string
 * @returns Formatted time string
 */
export function formatDisplayTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'h:mm a');
}

/**
 * Format date for long display with weekday (e.g., "Monday, November 10, 2025")
 * Replaces: date.toLocaleDateString('en-US', { weekday: 'long', ... })
 * @param date - Date to format
 * @returns Long formatted date string
 */
export function formatLongDate(date: Date = new Date()): string {
  return format(date, 'EEEE, MMMM d, yyyy');
}

// ============================================================================
// DATE/TIME COMBINING
// ============================================================================

/**
 * Combine ISO date string with time string
 * Replaces: new Date(`${isoDate}T${timeString}`)
 * @param isoDate - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:mm format
 * @returns Combined Date object
 */
export function combineISODateAndTime(isoDate: string, timeString: string): Date {
  return new Date(`${isoDate}T${timeString}`);
}

/**
 * Parse time string (flexible formats: "2:30 PM", "14:30", etc.)
 * Replaces: moment(timeString, ['h:mm A', 'HH:mm']).toDate()
 * @param timeString - Time string to parse
 * @returns Date object with parsed time (date portion is today)
 */
export function parseTimeString(timeString: string): Date {
  // Try 12-hour format first (e.g., "2:30 PM")
  const twelveHourResult = parse(timeString, 'h:mm a', new Date());
  if (dateFnsIsValid(twelveHourResult)) {
    return twelveHourResult;
  }

  // Try 24-hour format (e.g., "14:30")
  const twentyFourHourResult = parse(timeString, 'HH:mm', new Date());
  if (dateFnsIsValid(twentyFourHourResult)) {
    return twentyFourHourResult;
  }

  // Return invalid date if neither format matches
  return new Date('Invalid Date');
}

// ============================================================================
// DURATION CALCULATIONS
// ============================================================================

/**
 * Add minutes to a date
 * Replaces: new Date(start.getTime() + minutes * 60000)
 * @param date - Starting date
 * @param minutes - Minutes to add
 * @returns New date with added minutes
 */
export function addMinutesToDate(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

/**
 * Calculate duration between two dates in minutes
 * Replaces: Math.round((end.getTime() - start.getTime()) / 60000)
 * @param start - Start date
 * @param end - End date
 * @returns Duration in minutes
 */
export function calculateDurationMinutes(start: Date, end: Date): number {
  return differenceInMinutes(end, start);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a value is a valid date
 * Replaces: !isNaN(date.getTime())
 * @param date - Value to check
 * @returns True if valid date
 */
export function isValidDate(date: any): boolean {
  if (date instanceof Date) {
    return dateFnsIsValid(date);
  }
  if (typeof date === 'string') {
    return dateFnsIsValid(parseISO(date));
  }
  return false;
}
