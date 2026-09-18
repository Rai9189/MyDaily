/**
 * Shared numeric input utilities for amount/balance fields
 * Centralized formatting and parsing logic used across detail pages
 */

/**
 * Format a number for display in input fields (ID locale with dot separators)
 * @example formatNumericDisplay(1500000) → "1.500.000"
 * @example formatNumericDisplay(1500.5) → "1.500,5"
 */
export function formatNumericDisplay(value: number): string {
  if (!value || value === 0) return '';
  const [intPart, decPart] = value.toString().split('.');
  const formattedInt = Number(intPart).toLocaleString('id-ID');
  return decPart ? `${formattedInt},${decPart}` : formattedInt;
}

/**
 * Parse formatted input back to numeric value
 * Reverses dot/comma formatting to get the actual number
 * @example parseNumericInput("1.500.000") → 1500000
 * @example parseNumericInput("1.500,5") → 1500.5
 */
export function parseNumericInput(display: string): number {
  const normalized = display
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Handle keyboard input for numeric fields with ID locale formatting
 * Enforces single comma, max 2 decimal places, applies dot thousand separators
 * @example handleNumericKeyInput("1500") → "1.500"
 * @example handleNumericKeyInput("1500,5") → "1.500,5"
 */
export function handleNumericKeyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  const hasComma = cleaned.includes(',');
  const commaIndex = cleaned.indexOf(',');
  const afterComma = hasComma ? cleaned.slice(commaIndex + 1) : '';

  // Reject multiple commas
  if ((cleaned.match(/,/g) || []).length > 1) return raw.slice(0, -1);

  // Reject more than 2 decimal places
  if (hasComma && afterComma.length > 2) return raw.slice(0, -1);

  const intRaw = hasComma
    ? cleaned.slice(0, commaIndex).replace(/\./g, '')
    : cleaned.replace(/\./g, '');

  if (!intRaw && !hasComma) return '';

  const formattedInt = intRaw ? Number(intRaw).toLocaleString('id-ID') : '0';
  if (hasComma) return `${formattedInt},${afterComma}`;
  return formattedInt;
}
