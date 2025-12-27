/**
 * Currency Helper Utilities
 * Functions untuk formatting currency (Rupiah)
 */

/**
 * Format number ke format Rupiah
 * @param amount - Jumlah dalam number
 * @param withSymbol - Include symbol Rp atau tidak
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, withSymbol: boolean = true): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: withSymbol ? 'currency' : 'decimal',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  
  return formatted;
}

/**
 * Parse currency string ke number
 * @param currencyString - String currency (e.g., "Rp 1.000.000")
 * @returns Number value
 */
export function parseCurrency(currencyString: string): number {
  // Remove non-numeric characters except minus
  const cleaned = currencyString.replace(/[^\d-]/g, '');
  return parseInt(cleaned) || 0;
}

/**
 * Format number dengan ribuan separator
 * @param num - Number to format
 * @returns Formatted string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('id-ID');
}

/**
 * Abbreviate large numbers (e.g., 1000000 -> "1jt")
 * @param num - Number to abbreviate
 * @returns Abbreviated string
 */
export function abbreviateNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}jt`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}rb`;
  }
  return num.toString();
}