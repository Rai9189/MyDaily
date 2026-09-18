/**
 * Currency formatting utilities for IDR (Indonesian Rupiah)
 * Centralized formatters to replace duplicated logic across components
 */

/**
 * Format number as full IDR currency with symbol
 * @example fmtIDR(1500000) → "Rp 1.500.000"
 */
export function fmtIDR(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Format number as compact IDR (no symbol, thousand/million notation)
 * @example fmtIDRCompact(1500000) → "1.5M"
 * @example fmtIDRCompact(15000) → "15K"
 */
export function fmtIDRCompact(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);
}
