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
