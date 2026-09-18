/**
 * Shared date/time formatting utilities
 * Centralized locale-aware formatting for consistent display across the app
 */

/**
 * Format a date for display (short US format with abbreviated month)
 * @example formatDateShort(new Date('2024-12-25')) → "Dec 25, 2024"
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date without year (for compact display)
 * @example formatDateCompact(new Date('2024-12-25')) → "Dec 25"
 */
export function formatDateCompact(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format a date with full month name
 * @example formatDateLong(new Date('2024-12-25')) → "December 2024"
 */
export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a date with weekday
 * @example formatDateWithWeekday(new Date('2024-12-25')) → "Wednesday"
 */
export function formatDateWithWeekday(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
  });
}

/**
 * Format a date/time with full details
 * @example formatDateTime(new Date('2024-12-25T14:30:00')) → "12/25/2024, 2:30:00 PM"
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format a number with ID locale thousand separators
 * Used for non-currency numeric displays (counts, lengths, etc)
 * @example formatNumber(1500000) → "1.500.000"
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('id-ID');
}
